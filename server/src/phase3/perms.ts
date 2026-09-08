/**
 * PHASE 3 — Granular admin permissions.
 *
 * Permission model:
 *   super_admin  → every permission (stored list ignored)
 *   school_admin → permission list from User.permissions (JSONB text[])
 *   teacher      → no admin permissions (subject scope handled by Phase 2)
 *
 * Guarding happens here AND in every Phase-3 service query (SQL-level school
 * boundaries) — never only in the UI.
 */
import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiResponse';
import { q1 } from '../phase2/db';
import { AuthUser } from '../phase2/types';

/** Module permissions an admin account can hold (spec §6). */
export const PERMISSIONS = [
  'users',           // create/manage teachers + admins
  'schools',         // schools, logos, branding
  'courses',         // courses/sessions (Phase-1 syllabus admin areas)
  'books',           // books & soft-copy content
  'syllabus',        // classes/subjects/chapters/topics/exercises
  'questionBank',    // review/approve/reject questions
  'paperGeneration', // generate on behalf of / manage paper patterns/templates
  'generatedPapers', // view/archive any papers in scope
  'analytics',       // dashboards & statistics
  'settings',        // templates & general configuration
  'audit',           // activity log
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface PermUser extends AuthUser {
  permissions: Permission[];
}

const cache = new Map<number, { at: number; perms: Permission[] }>();

/** Read effective permissions for a user (cached 5s per request storm). */
export async function permsOf(user: AuthUser): Promise<Permission[]> {
  if (user.role === 'super_admin') return [...PERMISSIONS];
  if (user.role !== 'school_admin') return [];
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < 5000) return hit.perms;
  const row = await q1<{ permissions: string[] | null }>(`SELECT permissions FROM "User" WHERE id = $1`, [user.id]);
  const perms = (row?.permissions ?? []) as Permission[];
  cache.set(user.id, { at: Date.now(), perms });
  return perms;
}

export function dropPermCache(userId?: number) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export async function hasPerm(user: AuthUser, perm: Permission): Promise<boolean> {
  if (user.role === 'super_admin') return true;
  if (user.role !== 'school_admin') return false;
  return (await permsOf(user)).includes(perm);
}

export interface V3AuthRequest extends Request {
  user?: PermUser;
}

/** Middleware: attaches resolved permissions to req.user. */
export const resolvePerms = async (req: V3AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      req.user = { ...req.user, permissions: await permsOf(req.user) };
    }
    next();
  } catch (err) {
    next(err);
  }
};

/** Middleware factory: require one module permission (admins only). */
export const guardPerm =
  (perm: Permission) => (req: V3AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw ApiError.unauthorized();
      if (req.user.role === 'teacher') throw ApiError.forbidden('Teachers do not have access to this module');
      if (req.user.role === 'super_admin') return next();
      if (!(req.user.permissions ?? []).includes(perm)) {
        throw ApiError.forbidden(`Your admin permissions do not include “${perm}”. Ask a Super Admin to grant it.`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };

/** Middleware: super admin only. */
export const superOnly = (_req: V3AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!_req.user) throw ApiError.unauthorized();
    if (_req.user.role !== 'super_admin') throw ApiError.forbidden('Only Super Admins can perform this action');
    next();
  } catch (err) {
    next(err);
  }
};

/** SQL fragment helper for school boundaries of list endpoints. */
export const schoolWhere = (user: AuthUser, alias = 's'): { sql: string; params: unknown[] } => {
  if (user.role === 'super_admin') return { sql: 'TRUE', params: [] };
  if (user.role === 'school_admin') {
    if (!user.schoolId) return { sql: 'FALSE', params: [] };
    return { sql: `${alias}."schoolId" = $1`, params: [user.schoolId] };
  }
  // teachers may only read their own school's basic info
  return { sql: `${alias}."schoolId" = $1`, params: [user.schoolId ?? -1] };
};
