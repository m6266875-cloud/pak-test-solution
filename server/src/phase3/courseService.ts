/**
 * PHASE 4 — Course master administration (Part A).
 *
 * The Super Admin owns the master Course system: add/edit/archive courses,
 * per-course session status, and the valid class links (CourseClass) that
 * decide which classes exist for a course. Reads are available to admins
 * holding the `courses` permission; every write is super_admin-only.
 *
 * Courses are never hard-deleted (subjects, books, questions and papers
 * reference them) — removing a course means archiving it. Class links are
 * deactivated rather than deleted so history stays intact.
 */
import { q, q1, withTx } from '../phase2/db';
import { AuthUser } from '../phase2/types';
import { ApiError } from '../utils/apiResponse';
import { record } from './audit';

const STATUSES = new Set(['active', 'inactive', 'archived']);
const TYPES = new Set(['board', 'publisher', 'program']);
const SESSION_STATUSES = new Set(['upcoming', 'current', 'previous', 'archived']);

export class CourseAdminService {
  /** All academic sessions (global list for the course-master session picker). */
  async listSessions() {
    return q<any>(
      `SELECT id, code, name, "startYear", "endYear" FROM "AcademicSession" ORDER BY "startYear" DESC, id DESC`
    );
  }

  /** All courses with catalog counts + current session (global catalog, no school scope). */
  async list(_user: AuthUser) {
    const rows = await q<any>(
      `SELECT c.id, c.code, c.name, c."shortName", c.type, c.region, c.website, c.description,
              c."logoUrl", c.status, c."displayOrder",
              (SELECT count(*) FROM "CourseClass" cc WHERE cc."courseId" = c.id AND cc."isActive")::int AS "classCount",
              (SELECT count(*) FROM "Subject" s WHERE s."courseId" = c.id AND s.status = 'active')::int AS "subjectCount",
              (SELECT count(*) FROM "Book" b WHERE b."courseId" = c.id AND b.status = 'active')::int AS "bookCount"
         FROM "Course" c ORDER BY c."displayOrder", c.name`
    );
    const out: any[] = [];
    for (const r of rows) {
      const cur = await q1(
        `SELECT cs.status, a.id AS "sessionId", a.code, a.name FROM "CourseSession" cs
           JOIN "AcademicSession" a ON a.id = cs."sessionId"
          WHERE cs."courseId" = $1 ORDER BY (cs.status = 'current') DESC, a."startYear" DESC LIMIT 1`,
        [r.id]
      );
      out.push({ ...r, currentSession: cur ?? null });
    }
    return out;
  }

  /** One course with its session links and class links. */
  async get(_user: AuthUser, id: number) {
    const course = await q1<any>(`SELECT * FROM "Course" WHERE id = $1`, [id]);
    if (!course) throw ApiError.notFound('Course not found');
    const [sessions, classes] = await Promise.all([
      q<any>(
        `SELECT a.id AS "sessionId", a.code, a.name, a."startYear", a."endYear", cs.status, cs.notes
           FROM "CourseSession" cs JOIN "AcademicSession" a ON a.id = cs."sessionId"
          WHERE cs."courseId" = $1 ORDER BY a."startYear" DESC`,
        [id]
      ),
      q<any>(
        `SELECT cl.id AS "classId", cl.grade, cl.name,
                (SELECT count(*) FROM "Subject" s WHERE s."courseId" = cc."courseId" AND s."classId" = cl.id AND s.status = 'active')::int AS "subjectCount"
           FROM "CourseClass" cc JOIN "Class" cl ON cl.id = cc."classId"
          WHERE cc."courseId" = $1 AND cc."isActive" ORDER BY cl.grade`,
        [id]
      ),
    ]);
    return { ...course, sessions, classes };
  }

  /** Create a course (code is the immutable natural key used by the seeder). */
  async create(user: AuthUser, body: Record<string, any>) {
    const code = String(body.code ?? '').trim().toUpperCase();
    const name = String(body.name ?? '').trim();
    if (!code) throw ApiError.badRequest('Course code is required');
    if (!name) throw ApiError.badRequest('Course name is required');
    const type = String(body.type ?? 'board');
    if (!TYPES.has(type)) throw ApiError.badRequest(`Invalid course type '${body.type}'`);
    const dup = await q1(`SELECT id FROM "Course" WHERE UPPER(code) = $1`, [code]);
    if (dup) throw ApiError.badRequest(`Course code '${code}' already exists`);
    const ins = await q1<{ id: number }>(
      `INSERT INTO "Course" ("code","name","shortName","type","region","website","description","status","displayOrder","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
      [code, name, strOrNull(body.shortName), type, strOrNull(body.region), strOrNull(body.website),
       strOrNull(body.description), numOr(body.displayOrder, 0)]
    );
    await record(user, { action: 'course.create', entity: 'Course', entityId: ins!.id, meta: { code } });
    return this.get(user, ins!.id);
  }

  /** Edit course metadata (code is immutable — the seeder keys on it). */
  async update(user: AuthUser, id: number, body: Record<string, any>) {
    const course = await q1<any>(`SELECT * FROM "Course" WHERE id = $1`, [id]);
    if (!course) throw ApiError.notFound('Course not found');
    if (body.code != null && String(body.code).trim().toUpperCase() !== course.code) {
      throw ApiError.badRequest('Course code cannot be changed (catalog natural key)');
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    const putStr = (col: string, v: unknown, max: number) => {
      if (v === undefined) return;
      const s = v == null || String(v).trim() === '' ? null : String(v).trim().slice(0, max);
      sets.push(`"${col}" = $${p++}`);
      params.push(s);
    };
    if (body.name !== undefined) {
      if (!String(body.name).trim()) throw ApiError.badRequest('Course name is required');
      sets.push(`"name" = $${p++}`);
      params.push(String(body.name).trim());
    }
    putStr('shortName', body.shortName, 200);
    if (body.type !== undefined) {
      if (!TYPES.has(String(body.type))) throw ApiError.badRequest(`Invalid course type '${body.type}'`);
      sets.push(`"type" = $${p++}`);
      params.push(String(body.type));
    }
    putStr('region', body.region, 200);
    putStr('website', body.website, 300);
    putStr('description', body.description, 2000);
    if (body.status !== undefined) {
      if (!STATUSES.has(String(body.status))) throw ApiError.badRequest(`Invalid status '${body.status}'`);
      sets.push(`"status" = $${p++}`);
      params.push(String(body.status));
    }
    if (body.displayOrder !== undefined) {
      sets.push(`"displayOrder" = $${p++}`);
      params.push(numOr(body.displayOrder, 0));
    }
    if (sets.length) {
      params.push(id);
      await q(`UPDATE "Course" SET ${sets.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
      await record(user, { action: 'course.update', entity: 'Course', entityId: id, meta: { fields: Object.keys(body) } });
    }
    return this.get(user, id);
  }

  /** Set a session link status (exactly one `current` per course is enforced). */
  async setSession(user: AuthUser, id: number, body: Record<string, any>) {
    const course = await q1(`SELECT id FROM "Course" WHERE id = $1`, [id]);
    if (!course) throw ApiError.notFound('Course not found');
    const sessionId = Number(body.sessionId);
    const status = String(body.status ?? '');
    if (!Number.isInteger(sessionId) || sessionId < 1) throw ApiError.badRequest('sessionId is required');
    if (!SESSION_STATUSES.has(status)) throw ApiError.badRequest(`Invalid session status '${body.status}'`);
    const sess = await q1(`SELECT id FROM "AcademicSession" WHERE id = $1`, [sessionId]);
    if (!sess) throw ApiError.notFound('Academic session not found');
    await withTx(async (tx) => {
      if (status === 'current') {
        await tx.query(`UPDATE "CourseSession" SET status = 'previous' WHERE "courseId" = $1 AND status = 'current'`, [id]);
      }
      await tx.query(
        `INSERT INTO "CourseSession" ("courseId","sessionId","status","notes","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         ON CONFLICT ("courseId","sessionId") DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, "updatedAt" = CURRENT_TIMESTAMP`,
        [id, sessionId, status, strOrNull(body.notes)]
      );
    });
    await record(user, { action: 'course.session', entity: 'Course', entityId: id, meta: { sessionId, status } });
    return this.get(user, id);
  }

  /** Link a class as valid for this course. */
  async linkClass(user: AuthUser, id: number, classId: number) {
    const course = await q1(`SELECT id FROM "Course" WHERE id = $1`, [id]);
    if (!course) throw ApiError.notFound('Course not found');
    const klass = await q1(`SELECT id FROM "Class" WHERE id = $1`, [classId]);
    if (!klass) throw ApiError.notFound('Class not found');
    await q(
      `INSERT INTO "CourseClass" ("courseId","classId","isActive","createdAt","updatedAt")
       VALUES ($1,$2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("courseId","classId") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP`,
      [id, classId]
    );
    await record(user, { action: 'course.class.link', entity: 'Course', entityId: id, meta: { classId } });
    return this.get(user, id);
  }

  /** Unlink a class (refused while active subjects exist for the pair). */
  async unlinkClass(user: AuthUser, id: number, classId: number) {
    const course = await q1(`SELECT id FROM "Course" WHERE id = $1`, [id]);
    if (!course) throw ApiError.notFound('Course not found');
    const n = await q1<{ n: string }>(
      `SELECT count(*)::int AS n FROM "Subject" WHERE "courseId" = $1 AND "classId" = $2 AND status = 'active'`,
      [id, classId]
    );
    if (Number(n?.n ?? 0) > 0) {
      throw ApiError.conflict(`Class still has ${n!.n} active subject(s) in this course — archive them first`);
    }
    await q(`UPDATE "CourseClass" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "courseId" = $1 AND "classId" = $2`, [id, classId]);
    await record(user, { action: 'course.class.unlink', entity: 'Course', entityId: id, meta: { classId } });
    return this.get(user, id);
  }
}

const strOrNull = (v: unknown): string | null =>
  v == null || String(v).trim() === '' ? null : String(v).trim();
const numOr = (v: unknown, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const courseAdminService = new CourseAdminService();
