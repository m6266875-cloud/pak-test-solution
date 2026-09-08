/**
 * PHASE 3 — Teacher & admin management (node-pg).
 *
 * Super Admin creates school admins (permission sets) and any school's
 * teachers. A school_admin can manage only teachers of their own school
 * (no permission editing, no role changes). Teachers are bound to a school
 * + subject assignments (TeacherSubject), which the Phase-2 scope engine
 * already enforces for catalog/question bank/paper generation.
 */
import bcrypt from 'bcrypt';
import { pool, q, q1, run } from '../phase2/db';
import { AuthUser } from '../phase2/types';
import { ApiError } from '../utils/apiResponse';
import { hasPerm, Permission, PERMISSIONS, dropPermCache } from './perms';
import { record } from './audit';

export interface AssignmentInput {
  classId: number;
  subjectIds: number[];
  courseId?: number | null; // validated when provided (must match the subject)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateTempPassword(len = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function cleanEmail(email: string) {
  const e = String(email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw ApiError.badRequest('A valid email is required');
  if (e.length > 200) throw ApiError.badRequest('Email too long');
  return e;
}

function cleanName(name: string) {
  const n = String(name ?? '').trim();
  if (!n) throw ApiError.badRequest('Name is required');
  if (n.length > 200) throw ApiError.badRequest('Name too long');
  return n;
}

async function assertEmailFree(email: string, exceptId?: number) {
  const dup = exceptId
    ? await q1(`SELECT id FROM "User" WHERE lower(email)=lower($1) AND id<>$2`, [email, exceptId])
    : await q1(`SELECT id FROM "User" WHERE lower(email)=lower($1)`, [email]);
  if (dup) throw ApiError.conflict('A user with this email already exists');
}

/** School boundary: which school may the actor manage? null = any (super). */
function manageScope(user: AuthUser): number | null {
  if (user.role === 'super_admin') return null;
  if (user.role === 'school_admin') return user.schoolId;
  throw ApiError.forbidden('Only admins can manage users');
}

function assertCanTouch(user: AuthUser, targetSchoolId: number | null) {
  const scope = manageScope(user);
  if (scope !== null && targetSchoolId !== scope) {
    throw ApiError.forbidden('You can only manage users of your own school');
  }
}

export async function validateAssignments(items: AssignmentInput[] | undefined | null) {
  if (!items || !items.length) return [];
  const out: Array<{ classId: number; subjectIds: number[] }> = [];
  for (const it of items) {
    const classId = Number(it.classId);
    if (!Number.isInteger(classId) || classId <= 0) throw ApiError.badRequest('Each assignment needs a valid classId');
    const klass = await q1<{ id: number; grade: number }>(`SELECT id, grade FROM "Class" WHERE id=$1`, [classId]);
    if (!klass) throw ApiError.badRequest(`Class ${classId} does not exist`);
    const subjectIds = [...new Set((it.subjectIds ?? []).map(Number))].filter((v) => Number.isInteger(v) && v > 0);
    if (!subjectIds.length) continue;
    const rows = await q<{ id: number; classId: number; courseId: number; name: string }>(
      `SELECT id, "classId", "courseId", name FROM "Subject" WHERE id = ANY($1::int[]) AND status='active'`, [subjectIds]
    );
    if (rows.length !== subjectIds.length) throw ApiError.badRequest('One or more subjects do not exist or are inactive');
    for (const s of rows) {
      if (s.classId !== classId) throw ApiError.badRequest(`Subject "${s.name}" does not belong to class ${classId}`);
      if (it.courseId != null && Number(it.courseId) !== s.courseId) {
        throw ApiError.badRequest(`Subject "${s.name}" does not belong to the chosen course`);
      }
    }
    out.push({ classId, subjectIds });
  }
  return out;
}

async function insertAssignments(teacherId: number, items: Array<{ classId: number; subjectIds: number[] }>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM "TeacherSubject" WHERE "teacherId"=$1`, [teacherId]);
    for (const it of items) {
      for (const sid of it.subjectIds) {
        await client.query(
          `INSERT INTO "TeacherSubject" ("teacherId","subjectId","classId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [teacherId, sid, it.classId]
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const LIST_COLS = `u.id, u.name, u.email, u.phone, u.role, u."schoolId", u."isActive", u."createdAt", u."updatedAt", u."lastLoginAt", u.permissions`;

export const userAdminService = {
  async list(user: AuthUser, f: { role?: string; schoolId?: number; search?: string; page?: number; limit?: number }) {
    const scope = manageScope(user);
    if (user.role === 'school_admin' && !(await hasPerm(user, 'users'))) {
      throw ApiError.forbidden('Your admin permissions do not include "users"');
    }
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 25));
    const where: string[] = [];
    const params: unknown[] = [];
    let p = 0;
    const add = (sql: string, vals: unknown[]) => {
      const parts = sql.split('?');
      let out = parts[0];
      for (let i = 0; i < parts.length - 1; i += 1) {
        p += 1;
        params.push(vals[i] ?? vals[vals.length - 1]);
        out += `$${p}` + parts[i + 1];
      }
      where.push(out);
    };
    if (scope !== null) add('u."schoolId" = ?', [scope]);
    if (f.role) {
      if (!['teacher', 'school_admin', 'super_admin'].includes(f.role)) throw ApiError.badRequest('Invalid role filter');
      add('u.role = ?', [f.role]);
    }
    if (f.schoolId && user.role === 'super_admin') add('u."schoolId" = ?', [Number(f.schoolId)]);
    if (f.search) add('(u.name ILIKE ? OR u.email ILIKE ?)', [`%${f.search}%`, `%${f.search}%`]);
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows, cnt] = await Promise.all([
      q<any>(
        `SELECT ${LIST_COLS}, s.name AS "schoolName",
                (SELECT count(*)::int FROM "TeacherSubject" ts WHERE ts."teacherId" = u.id) AS "assignmentCount",
                (SELECT json_agg(DISTINCT subj.name) FROM "TeacherSubject" ts2 JOIN "Subject" subj ON subj.id = ts2."subjectId" WHERE ts2."teacherId" = u.id) AS subjects
           FROM "User" u LEFT JOIN "School" s ON s.id = u."schoolId"
           ${w} ORDER BY u."createdAt" DESC, u.id DESC LIMIT $${p + 1} OFFSET $${p + 2}`,
        [...params, limit, (page - 1) * limit]
      ),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "User" u ${w}`, params),
    ]);
    return { rows, total: Number(cnt?.n ?? 0), page, limit };
  },

  async get(user: AuthUser, id: number) {
    const scope = manageScope(user);
    if (user.role === 'school_admin' && !(await hasPerm(user, 'users'))) {
      throw ApiError.forbidden('Your admin permissions do not include "users"');
    }
    const u = await q1<any>(
      `SELECT ${LIST_COLS}, s.name AS "schoolName" FROM "User" u LEFT JOIN "School" s ON s.id=u."schoolId" WHERE u.id=$1`, [id]
    );
    if (!u) throw ApiError.notFound('User not found');
    if (scope !== null && u.schoolId !== scope) throw ApiError.forbidden('User belongs to another school');
    const assignments = await q<any>(
      `SELECT ts."classId", cl.name AS "className", cl.grade, ts."subjectId", s.name AS "subjectName", s.medium, co.code AS "courseCode", co.name AS "courseName"
         FROM "TeacherSubject" ts JOIN "Subject" s ON s.id=ts."subjectId" JOIN "Class" cl ON cl.id=ts."classId" JOIN "Course" co ON co.id=s."courseId"
        WHERE ts."teacherId"=$1 ORDER BY cl.grade, s.name`, [id]
    );
    return { ...u, assignments };
  },

  /** Create a teacher (Super: any school; School admin: own school). */
  async createTeacher(user: AuthUser, body: any) {
    const scope = manageScope(user);
    if (user.role === 'school_admin' && !(await hasPerm(user, 'users'))) {
      throw ApiError.forbidden('Your admin permissions do not include "users"');
    }
    const name = cleanName(body.name);
    const email = cleanEmail(body.email);
    const schoolId = Number(body.schoolId ?? scope);
    if (!Number.isInteger(schoolId) || schoolId <= 0) throw ApiError.badRequest('A school is required for a teacher account');
    assertCanTouch(user, schoolId);
    const school = await q1<{ id: number; status: string }>(`SELECT id, status FROM "School" WHERE id=$1`, [schoolId]);
    if (!school) throw ApiError.badRequest('School not found');
    await assertEmailFree(email);

    const usePassword = String(body.password ?? '').trim();
    const tempPassword = usePassword ? '' : generateTempPassword();
    const password = usePassword || tempPassword;
    const hash = bcrypt.hashSync(password, 10);
    const assignments = await validateAssignments(body.assignments);

    const r = await q1<{ id: number }>(
      `INSERT INTO "User" (email, password, name, role, "schoolId", phone, "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,'teacher',$4,$5,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
      [email, hash, name, schoolId, body.phone ? String(body.phone).slice(0, 60) : null]
    );
    if (!r) throw ApiError.internal('Could not create the teacher account');
    if (assignments.length) await insertAssignments(r.id, assignments);
    await record(user, { action: 'user.teacher.create', entity: 'User', entityId: r.id, meta: { name, email, schoolId, assignments: assignments.length } });
    const created = await this.get(user, r.id);
    return { user: created, tempPassword: tempPassword || null };
  },

  /** Create an admin (Super Admin only) with a permission set. */
  async createAdmin(user: AuthUser, body: any) {
    if (user.role !== 'super_admin') throw ApiError.forbidden('Only Super Admins can create admin accounts');
    const name = cleanName(body.name);
    const email = cleanEmail(body.email);
    const schoolId = body.schoolId == null ? null : Number(body.schoolId);
    if (schoolId !== null && (!Number.isInteger(schoolId) || schoolId <= 0)) throw ApiError.badRequest('Invalid schoolId');
    const role = body.role === 'super_admin' ? 'super_admin' : 'school_admin';
    if (role === 'school_admin' && schoolId == null) {
      throw ApiError.badRequest('A school_admin account must belong to a school');
    }
    const perms: Permission[] = role === 'school_admin' ? (body.permissions ?? []) : [];
    for (const perm of perms) {
      if (!(PERMISSIONS as readonly string[]).includes(perm)) throw ApiError.badRequest(`Unknown permission "${perm}"`);
    }
    await assertEmailFree(email);
    const usePassword = String(body.password ?? '').trim();
    const tempPassword = usePassword ? '' : generateTempPassword();
    const hash = bcrypt.hashSync(usePassword || tempPassword, 10);
    const r = await q1<{ id: number }>(
      `INSERT INTO "User" (email, password, name, role, "schoolId", permissions, "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
      [email, hash, name, role, schoolId, JSON.stringify([...new Set(perms)])]
    );
    if (!r) throw ApiError.internal('Could not create the admin account');
    await record(user, { action: 'user.admin.create', entity: 'User', entityId: r.id, meta: { name, email, role, schoolId, permissions: perms } });
    const created = await this.get(user, r.id);
    return { user: created, tempPassword: tempPassword || null };
  },

  async update(user: AuthUser, id: number, body: any) {
    const scope = manageScope(user);
    if (user.role === 'school_admin' && !(await hasPerm(user, 'users'))) {
      throw ApiError.forbidden('Your admin permissions do not include "users"');
    }
    const target = await q1<any>(`SELECT id, email, name, role, "schoolId", phone, "isActive" FROM "User" WHERE id=$1`, [id]);
    if (!target) throw ApiError.notFound('User not found');
    if (scope !== null && target.schoolId !== scope) throw ApiError.forbidden('User belongs to another school');

    const sets: string[] = []; const params: unknown[] = []; let p = 1;
    const push = (col: string, v: unknown) => { sets.push(`${col} = $${p++}`); params.push(v); };
    if (body.name !== undefined) push('name', cleanName(body.name));
    if (body.phone !== undefined) push('phone', body.phone ? String(body.phone).slice(0, 60) : null);
    if (body.isActive !== undefined) push('"isActive"', Boolean(body.isActive));

    if (body.email !== undefined) {
      const email = cleanEmail(body.email);
      await assertEmailFree(email, id);
      push('email', email);
    }

    if (user.role === 'super_admin') {
      if (body.role !== undefined) {
        if (!['teacher', 'school_admin', 'super_admin'].includes(body.role)) throw ApiError.badRequest('Invalid role');
        push('role', body.role);
        if (body.role === 'school_admin' && !body.schoolId && target.schoolId == null) {
          throw ApiError.badRequest('A school_admin account must belong to a school');
        }
      }
      if (body.schoolId !== undefined) {
        const sid = body.schoolId === null ? null : Number(body.schoolId);
        if (sid !== null && !(await q1(`SELECT id FROM "School" WHERE id=$1`, [sid]))) throw ApiError.badRequest('School not found');
        push('"schoolId"', sid);
      }
      if (body.permissions !== undefined) {
        const perms: Permission[] = body.permissions ?? [];
        for (const perm of perms) {
          if (!(PERMISSIONS as readonly string[]).includes(perm)) throw ApiError.badRequest(`Unknown permission "${perm}"`);
        }
        push('permissions', JSON.stringify([...new Set(perms)]));
        dropPermCache(id);
      }
    }

    if (sets.length) {
      params.push(id);
      await run(`UPDATE "User" SET ${sets.join(', ')}, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$${params.length}`, params);
    }
    if (user.role === 'super_admin' && target.role === 'teacher' && body.assignments !== undefined) {
      const assignments = await validateAssignments(body.assignments);
      await insertAssignments(id, assignments);
      await record(user, { action: 'user.teacher.assignments', entity: 'User', entityId: id, meta: { assignments: assignments.length } });
    }
    await record(user, { action: 'user.update', entity: 'User', entityId: id, meta: { fields: sets.map((s) => s.split(' ')[0]) } });
    return this.get(user, id);
  },

  /** Reset password → returns the new temporary password exactly once. */
  async resetPassword(user: AuthUser, id: number) {
    const scope = manageScope(user);
    if (user.role === 'school_admin' && !(await hasPerm(user, 'users'))) {
      throw ApiError.forbidden('Your admin permissions do not include "users"');
    }
    const target = await q1<{ id: number; schoolId: number | null; role: string; email: string }>(
      `SELECT id, "schoolId", role, email FROM "User" WHERE id=$1`, [id]
    );
    if (!target) throw ApiError.notFound('User not found');
    if (scope !== null && target.schoolId !== scope) throw ApiError.forbidden('User belongs to another school');
    const temp = generateTempPassword();
    await run(`UPDATE "User" SET password=$1, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$2`, [bcrypt.hashSync(temp, 10), id]);
    dropPermCache(id);
    await record(user, { action: 'user.password-reset', entity: 'User', entityId: id, meta: { email: target.email } });
    return { id, email: target.email, tempPassword: temp };
  },
};
