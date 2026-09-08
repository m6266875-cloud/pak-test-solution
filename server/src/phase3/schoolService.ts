/**
 * PHASE 3 — Schools service (node-pg).
 *
 * Full CRUD + status workflow + logo uploads + branding (watermark/header/
 * footer defaults) + school dashboard aggregates. School boundaries are
 * enforced here in SQL for every read: super_admin = all schools,
 * school_admin = own school only, teacher = own school basic info only.
 */
import { pool, q, q1, run } from '../phase2/db';
import { AuthUser } from '../phase2/types';
import { ApiError } from '../utils/apiResponse';
import { hasPerm, schoolWhere, Permission } from './perms';
import { record } from './audit';
import { deleteLogo, saveLogo, readLogo, LOGO_CONTENT_TYPE, MAX_LOGO_BYTES } from './logoStore';

export const SCHOOL_STATUSES = ['active', 'pending', 'suspended', 'archived'] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export interface SchoolBody {
  name?: string;
  code?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  principal?: string | null; // principal/head name
}

const BASE = `SELECT s.id, s.name, s.code, s.email, s.phone, s.address, s.city,
       s.principal AS "principalName", s."logoUrl", s.status, s.branding, s."createdAt", s."updatedAt"`;

const clean = (s: string, max: number, field: string) => {
  const v = String(s ?? '').trim();
  if (v.length > max) throw ApiError.badRequest(`${field} must be at most ${max} characters`);
  return v;
};

async function assertCanSchool(user: AuthUser, schoolId: number, perm: Permission, mode: 'read' | 'write' = 'read') {
  if (user.role === 'super_admin') return;
  if (user.role === 'teacher') {
    if (user.schoolId === schoolId && mode === 'read') return;
    throw ApiError.forbidden('Teachers cannot modify school records');
  }
  if (user.role === 'school_admin') {
    if (!(await hasPerm(user, perm))) {
      throw ApiError.forbidden(`Your admin permissions do not include "${perm}"`);
    }
    if (user.schoolId === schoolId) return;
    throw ApiError.forbidden('School admins can only manage their own school');
  }
}

const DEFAULT_BRANDING = {
  watermark: { enabled: false, opacity: 0.07, size: 45, position: 'center' },
  header: { showSchoolName: true, showLogo: true, showContact: false },
  footer: { enabled: true, note: '' },
  defaultTemplateId: null as number | null,
};

export function normalizeBranding(input: any) {
  const b = { ...DEFAULT_BRANDING };
  if (!input || typeof input !== 'object') return b;
  const num = (v: any, min: number, max: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };
  const wm = input.watermark ?? {};
  b.watermark = {
    enabled: Boolean(wm.enabled),
    opacity: num(wm.opacity, 0.02, 0.5, DEFAULT_BRANDING.watermark.opacity),
    size: num(wm.size, 10, 90, DEFAULT_BRANDING.watermark.size),
    position: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(wm.position)
      ? wm.position : DEFAULT_BRANDING.watermark.position,
  };
  const hd = input.header ?? {};
  b.header = {
    showSchoolName: hd.showSchoolName !== false,
    showLogo: hd.showLogo !== false,
    showContact: Boolean(hd.showContact),
  };
  const ft = input.footer ?? {};
  b.footer = {
    enabled: ft.enabled !== false,
    note: String(ft.note ?? '').slice(0, 300),
  };
  if (input.defaultTemplateId === null || input.defaultTemplateId === undefined) b.defaultTemplateId = null;
  else {
    const id = Number(input.defaultTemplateId);
    b.defaultTemplateId = Number.isInteger(id) && id > 0 ? id : null;
  }
  return b;
}

const rowToApi = (r: any) => ({ ...r, branding: r.branding ?? {} });

export const schoolService = {
  async list(user: AuthUser, f: { search?: string; status?: string; page?: number; limit?: number }) {
    if (user.role === 'teacher') throw ApiError.forbidden('Teachers cannot list schools');
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
    if (user.role === 'school_admin') {
      if (!user.schoolId) throw ApiError.forbidden('No school attached to your account');
      add('s.id = ?', [user.schoolId]);
    }
    if (f.status) add('s.status = ?', [f.status]);
    if (f.search) add('(s.name ILIKE ? OR s.code ILIKE ? OR COALESCE(s.city,\'\') ILIKE ?)', [`%${f.search}%`, `%${f.search}%`, `%${f.search}%`]);
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows, cnt] = await Promise.all([
      q<any>(`${BASE}, (SELECT count(*)::int FROM "User" u WHERE u."schoolId" = s.id AND u.role='teacher') AS "teacherCount",
                     (SELECT count(*)::int FROM "Paper" pp WHERE pp."schoolId" = s.id) AS "paperCount"
                FROM "School" s ${w} ORDER BY s."createdAt" DESC, s.id DESC
                LIMIT $${p + 1} OFFSET $${p + 2}`, [...params, limit, (page - 1) * limit]),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "School" s ${w}`, params),
    ]);
    return { rows: rows.map(rowToApi), total: Number(cnt?.n ?? 0), page, limit };
  },

  async get(user: AuthUser, id: number, withBranding = false) {
    await assertCanSchool(user, id, 'schools');
    const r = await q1<any>(`${BASE} FROM "School" s WHERE s.id = $1`, [id]);
    if (!r) throw ApiError.notFound('School not found');
    if (user.role === 'teacher') {
      // teachers only ever see their own school basic info
      return { ...rowToApi(r), branding: undefined, teacherCount: undefined, paperCount: undefined };
    }
    if (withBranding && user.role === 'school_admin' && !(await hasPerm(user, 'schools'))) {
      throw ApiError.forbidden('Your admin permissions do not include "schools"');
    }
    const [teacherCount, paperCount] = await Promise.all([
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "User" WHERE "schoolId"=$1 AND role='teacher'`, [id]),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Paper" WHERE "schoolId"=$1`, [id]),
    ]);
    return { ...rowToApi(r), teacherCount: Number(teacherCount?.n ?? 0), paperCount: Number(paperCount?.n ?? 0) };
  },

  async create(user: AuthUser, body: SchoolBody) {
    if (user.role === 'school_admin') throw ApiError.forbidden('Only Super Admins can create schools');
    const name = clean(body.name ?? '', 200, 'School name');
    const code = clean(body.code ?? '', 40, 'School code').toUpperCase().replace(/\s+/g, '-');
    if (!name) throw ApiError.badRequest('School name is required');
    if (!code) throw ApiError.badRequest('School code is required');
    const dup = await q1<{ id: number }>(`SELECT id FROM "School" WHERE lower(code) = lower($1)`, [code]);
    if (dup) throw ApiError.conflict(`School code "${code}" already exists`);
    const r = await q1<any>(
      `INSERT INTO "School" (name, code, email, phone, address, city, principal, status, branding, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
      [name, code, body.email || null, body.phone || null, body.address || null, body.city || null, body.principal || null, JSON.stringify(DEFAULT_BRANDING)]
    );
    await record(user, { action: 'school.create', entity: 'School', entityId: r.id, meta: { name, code } });
    return this.get(user, r.id, true);
  },

  async update(user: AuthUser, id: number, body: SchoolBody) {
    await assertCanSchool(user, id, 'schools', 'write');
    const exists = await q1<{ id: number }>(`SELECT id FROM "School" WHERE id=$1`, [id]);
    if (!exists) throw ApiError.notFound('School not found');
    const sets: string[] = []; const params: unknown[] = []; let p = 1;
    const setCol = (col: string, v: unknown) => { sets.push(`${col} = $${p++}`); params.push(v); };
    if (body.name !== undefined) setCol('name', clean(body.name, 200, 'School name') || (await q1(`SELECT name FROM "School" WHERE id=$1`,[id]))!.name);
    if (user.role === 'super_admin' && body.code !== undefined) {
      const code = clean(body.code, 40, 'School code').toUpperCase().replace(/\s+/g, '-');
      if (!code) throw ApiError.badRequest('School code is required');
      const dup = await q1(`SELECT id FROM "School" WHERE lower(code)=lower($1) AND id <> $2`, [code, id]);
      if (dup) throw ApiError.conflict(`School code "${code}" already exists`);
      setCol('code', code);
    }
    const scalar = (col: string, v: any, max: number) => {
      if (v === undefined) return;
      setCol(col, v === null || String(v).trim() === '' ? null : String(v).trim().slice(0, max));
    };
    scalar('email', body.email, 200); scalar('phone', body.phone, 60); scalar('address', body.address, 400);
    scalar('city', body.city, 120); scalar('principal', body.principal, 200);
    if (sets.length) {
      params.push(id);
      await run(`UPDATE "School" SET ${sets.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    }
    await record(user, { action: 'school.update', entity: 'School', entityId: id, meta: { fields: sets.map((s) => s.split(' ')[0]) } });
    return this.get(user, id, await hasPerm(user, 'schools'));
  },

  async setStatus(user: AuthUser, id: number, status: string) {
    if (user.role !== 'super_admin') throw ApiError.forbidden('Only Super Admins can change school status');
    if (!(SCHOOL_STATUSES as readonly string[]).includes(status)) {
      throw ApiError.badRequest(`Invalid status. Allowed: ${SCHOOL_STATUSES.join(', ')}`);
    }
    const r = await q1<{ id: number }>(`UPDATE "School" SET status=$1, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id`, [status, id]);
    if (!r) throw ApiError.notFound('School not found');
    await record(user, { action: `school.${status}`, entity: 'School', entityId: id });
    return this.get(user, id, true);
  },

  // ── logo ─────────────────────────────────────────────────────────────────
  async uploadLogo(user: AuthUser, id: number, buffer: Buffer) {
    await assertCanSchool(user, id, 'schools', 'write');
    const exists = await q1<{ id: number }>(`SELECT id FROM "School" WHERE id=$1`, [id]);
    if (!exists) throw ApiError.notFound('School not found');
    const saved = await saveLogo(id, buffer);
    await run(`UPDATE "School" SET "logoUrl"=$1, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$2`, [`${id}.${saved.ext}`, id]);
    await record(user, { action: 'school.logo', entity: 'School', entityId: id, meta: { ext: saved.ext, bytes: saved.bytes } });
    return this.get(user, id, await hasPerm(user, 'schools'));
  },

  async removeLogo(user: AuthUser, id: number) {
    await assertCanSchool(user, id, 'schools', 'write');
    deleteLogo(id);
    await run(`UPDATE "School" SET "logoUrl"=NULL, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$1`, [id]);
    await record(user, { action: 'school.logo-remove', entity: 'School', entityId: id });
    return this.get(user, id, true);
  },

  /** Serve the stored logo file (auth + school boundary checked by caller). */
  logoFile(schoolId: number): { buffer: Buffer; ext: string } | null {
    const row = null; // ext comes from DB logoUrl token; caller resolves
    void row;
    // look for any stored file for the school
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const dir = path.join(process.cwd(), 'uploads', 'school-logos');
    if (!fs.existsSync(dir)) return null;
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(`${schoolId}.`)) {
        const ext = f.split('.').pop() ?? '';
        return { buffer: fs.readFileSync(path.join(dir, f)), ext };
      }
    }
    return null;
  },

  // ── branding ─────────────────────────────────────────────────────────────
  async getBranding(user: AuthUser, id: number) {
    await assertCanSchool(user, id, 'schools');
    const r = await q1<any>(`SELECT branding, "logoUrl" FROM "School" WHERE id=$1`, [id]);
    if (!r) throw ApiError.notFound('School not found');
    return normalizeBranding(r.branding);
  },

  async setBranding(user: AuthUser, id: number, input: any) {
    await assertCanSchool(user, id, 'schools', 'write');
    const branding = normalizeBranding(input);
    await run(`UPDATE "School" SET branding=$1::jsonb, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$2`, [JSON.stringify(branding), id]);
    await record(user, { action: 'school.branding', entity: 'School', entityId: id });
    return branding;
  },

  // ── dashboard aggregates ─────────────────────────────────────────────────
  async dashboard(user: AuthUser, id: number) {
    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      throw ApiError.forbidden('Only admins can view the school dashboard');
    }
    await assertCanSchool(user, id, 'analytics');
    const school = await this.get(user, id, false);
    const [teachers, papersRow, courses, classes, statuses, recent] = await Promise.all([
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "User" WHERE "schoolId"=$1 AND role='teacher'`, [id]),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Paper" WHERE "schoolId"=$1`, [id]),
      q1<{ n: string }>(`SELECT count(DISTINCT "courseId")::int AS n FROM "Paper" WHERE "schoolId"=$1 AND "courseId" IS NOT NULL`, [id]),
      q1<{ n: string }>(`SELECT count(DISTINCT "classId")::int AS n FROM "Paper" WHERE "schoolId"=$1`, [id]),
      q<any>(`SELECT status, count(*)::int AS n FROM "Paper" WHERE "schoolId"=$1 GROUP BY status`, [id]),
      q<any>(
        `SELECT p.id, p.title, p.status, p."totalMarks", p."examTitle", p."createdAt",
                u.name AS "teacherName", cl.name AS "className", cl.grade,
                (SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
                   FROM "PaperSubject" ps JOIN "Subject" s ON s.id=ps."subjectId" WHERE ps."paperId"=p.id) AS subjects
           FROM "Paper" p JOIN "User" u ON u.id=p."teacherId" JOIN "Class" cl ON cl.id=p."classId"
          WHERE p."schoolId" = $1 ORDER BY p."createdAt" DESC, p.id DESC LIMIT 10`,
        [id]
      ),
    ]);
    return {
      school: { id: school.id, name: school.name, code: school.code, status: school.status, logoUrl: school.logoUrl },
      counts: {
        teachers: Number(teachers?.n ?? 0),
        papers: Number(papersRow?.n ?? 0),
        courses: Number(courses?.n ?? 0),
        classes: Number(classes?.n ?? 0),
        byStatus: statuses,
      },
      recentPapers: recent,
    };
  },
};

/** Resolve a school id → { id,name,email,phone,address,city,principal,logoUrl } */
export async function schoolSnapshot(schoolId: number) {
  const r = await q1<any>(`SELECT id, name, code, email, phone, address, city, principal, "logoUrl", branding
                            FROM "School" WHERE id=$1`, [schoolId]);
  if (!r) return null;
  return {
    id: r.id, name: r.name, code: r.code,
    email: r.email, phone: r.phone, address: r.address, city: r.city,
    principalName: r.principal,
    logoUrl: r.logoUrl ? `/api/v3/schools/${r.id}/logo?v=${r.logoUrl.split('.').pop()}` : null,
    branding: normalizeBranding(r.branding),
  };
}
