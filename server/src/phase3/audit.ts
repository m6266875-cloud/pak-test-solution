/**
 * PHASE 3 — Activity log (append-only).
 *
 * Writes into the Phase-1 ActivityLog table (extended by the Phase-3
 * migration with role/schoolId/entity/entityId) so the existing audit page
 * contract keeps working while Phase-3 filters gain school/entity scope.
 */
import { ApiError } from '../utils/apiResponse';
import { pool, q, q1 } from '../phase2/db';
import { AuthUser } from '../phase2/types';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | number | null;
  meta?: Record<string, unknown>;
}

export async function record(user: AuthUser | null | undefined, entry: AuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO "ActivityLog" ("userId","role","schoolId","action","entity","entityId","details","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)`,
      [
        user?.id ?? null,
        user?.role ?? null,
        user?.schoolId ?? null,
        String(entry.action).slice(0, 100),
        String(entry.entity).slice(0, 100),
        entry.entityId == null ? null : String(entry.entityId).slice(0, 100),
        JSON.stringify(entry.meta ?? {}),
      ]
    );
  } catch (e) {
    // Logging must never break the primary request.
    console.warn('[activity] record failed:', (e as Error).message);
  }
}

/** @deprecated shorthand kept for readability at call sites */
export const audit = record;

export interface AuditFilter {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  userId?: number;
  schoolId?: number;
  from?: string;
  to?: string;
  search?: string;
}

export async function listLogs(user: AuthUser, f: AuditFilter) {
  const page = Math.max(1, f.page ?? 1);
  const limit = Math.min(200, Math.max(1, f.limit ?? 50));
  const where: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  const add = (sql: string, v: unknown) => { where.push(sql.replace('?', `$${p++}`)); params.push(v); };

  if (user.role === 'school_admin') {
    add('a."schoolId" = ?', user.schoolId ?? -1);
  }
  if (f.schoolId && user.role === 'super_admin') add('a."schoolId" = ?', f.schoolId);
  if (f.action) add('a.action = ?', f.action);
  if (f.entity) add('a.entity = ?', f.entity);
  if (f.userId) add('a."userId" = ?', f.userId);
  if (f.from) add('a."createdAt" >= ?', new Date(f.from));
  if (f.to) add('a."createdAt" <= ?', new Date(f.to));
  if (f.search) add('(a.entity ILIKE ? OR a.action ILIKE ? OR COALESCE(a."entityId",\'\') ILIKE ?)', `%${f.search}%`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows, cnt] = await Promise.all([
    q<any>(
      `SELECT a.id, a."userId", a.role, a."schoolId", a.action, a.entity, a."entityId", a.details, a."createdAt",
              u.name AS "userName", u.email AS "userEmail", s.name AS "schoolName"
         FROM "ActivityLog" a
         LEFT JOIN "User" u ON u.id = a."userId"
         LEFT JOIN "School" s ON s.id = a."schoolId"
         ${whereSql}
         ORDER BY a."createdAt" DESC, a.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    ),
    q1<{ n: string }>(`SELECT count(*)::int AS n FROM "ActivityLog" a ${whereSql}`, params),
  ]);
  return { rows, total: Number(cnt?.n ?? 0), page, limit };
}

export async function distinctActions(): Promise<string[]> {
  const rows = await q<{ action: string }>(`SELECT DISTINCT action FROM "ActivityLog" ORDER BY action`);
  return rows.map((r) => r.action);
}

export async function assertLogPerm(user: AuthUser) {
  if (user.role === 'teacher') throw ApiError.forbidden('No access to activity log');
  // school_admin needs the audit permission; super admins implicit (superOnly not required)
}
