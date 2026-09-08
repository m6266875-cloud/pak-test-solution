/**
 * PHASE 3 — Governance middleware for the existing /api/v2 endpoints.
 *
 * Adds two layers without touching Phase-2 route internals:
 *  1. PERMISSIONS — when a school_admin calls v2 endpoints that belong to a
 *     permission module (question bank writes, paper generation tooling,
 *     generated paper actions), the module permission is required. Teachers
 *     and super admins keep their Phase-2 behavior.
 *  2. AUDIT — records key v2 events (question created/approved/rejected,
 *     paper generated/duplicated/finalized/archived, pattern changes) in the
 *     activity log after the response finishes.
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiResponse';
import { authenticate } from '../phase2/auth';
import { hasPerm, Permission } from './perms';
import { record } from './audit';
import type { AuthUser } from '../phase2/types';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | number;
}

interface GuardRule {
  perm: Permission;
  test: (method: string, path: string) => boolean;
}

const guards: GuardRule[] = [
  // Paper generation tooling (only direct pattern writes; teacher-facing
  // paper creation is allowed when the admin also has teacher content rights).
  { perm: 'paperGeneration', test: (m, p) => /^\/patterns/.test(p) && (m === 'POST' || m === 'PUT' || m === 'DELETE') },
  // Question bank writes by admins
  { perm: 'questionBank', test: (m, p) => /^\/questions/.test(p) && (m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE') },
  // Generated-papers module: reads/writes on specific papers
  { perm: 'generatedPapers', test: (m, p) => /^\/papers\/\d+(\/|$)/.test(p) && (m === 'GET' || m === 'PUT' || m === 'POST' || m === 'DELETE') },
  { perm: 'generatedPapers', test: (m, p) => m === 'GET' && /^\/papers\/?$/.test(p) },
];

function moduleNeeded(user: AuthUser, method: string, path: string): Permission | null {
  if (user.role !== 'school_admin') return null;
  for (const g of guards) if (g.test(method, path)) return g.perm;
  return null;
}

function auditEntry(user: AuthUser, m: string, p: string, body: any): AuditEntry | null {
  void user; void body;
  if (m === 'POST' && /^\/papers$/.test(p)) return { action: 'paper.generate', entity: 'Paper' };
  const dup = p.match(/^\/papers\/(\d+)\/duplicate$/);
  if (m === 'POST' && dup) return { action: 'paper.duplicate', entity: 'Paper', entityId: dup[1] };
  const fmt = p.match(/^\/papers\/(\d+)\/formatting$/);
  if (m === 'PUT' && fmt) return { action: 'paper.formatting', entity: 'Paper', entityId: fmt[1] };
  const upd = p.match(/^\/papers\/(\d+)$/);
  if (m === 'PUT' && upd) {
    const status = body?.status;
    return {
      action: status === 'final' ? 'paper.finalize' : status === 'archived' ? 'paper.archive' : 'paper.update',
      entity: 'Paper',
      entityId: upd[1],
    };
  }
  const del = p.match(/^\/papers\/(\d+)$/);
  if (m === 'DELETE' && del) return { action: 'paper.archive', entity: 'Paper', entityId: del[1] };
  const status = p.match(/^\/papers\/(\d+)\/status$/);
  if (m === 'PATCH' && status) return { action: 'paper.status', entity: 'Paper', entityId: status[1] };
  if (m === 'POST' && /^\/questions$/.test(p)) return { action: 'question.create', entity: 'Question' };
  const ap = p.match(/^\/questions\/(\d+)\/(approve|reject)$/);
  if (m === 'POST' && ap) return { action: `question.${ap[2]}`, entity: 'Question', entityId: ap[1] };
  const qDel = p.match(/^\/questions\/(\d+)$/);
  if (m === 'DELETE' && qDel) return { action: 'question.remove', entity: 'Question', entityId: qDel[1] };
  if (m === 'POST' && /^\/patterns$/.test(p)) return { action: 'pattern.create', entity: 'PaperPattern' };
  const pat = p.match(/^\/patterns\/(\d+)$/);
  if (m === 'PUT' && pat) return { action: 'pattern.update', entity: 'PaperPattern', entityId: pat[1] };
  if (m === 'DELETE' && pat) return { action: 'pattern.delete', entity: 'PaperPattern', entityId: pat[1] };
  return null;
}

export function createV2Governance() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authenticate(req as any, res as any, async (err?: any) => {
        if (err) return next(err);
        const user = (req as any).user as AuthUser | undefined;
        if (!user) return next(ApiError.unauthorized());

        const method = (req.method || 'GET').toUpperCase();
        const path = (req.path || '/').replace(/^\/api\/v2/, '');

        // 1) permission layer for school admins
        if (user.role === 'school_admin') {
          const need = moduleNeeded(user, method, path);
          if (need && !(await hasPerm(user, need))) {
            return next(ApiError.forbidden(`Your admin permissions do not include “${need}”. Ask a Super Admin to grant it.`));
          }
        }

        // 2) audit layer (fire after the response, never block it)
        res.on('finish', () => {
          try {
            const entry = auditEntry(user, method, path, (req as any).body ?? {});
            if (entry && res.statusCode < 400) void record(user, entry);
          } catch {
            /* activity logging must never break the request */
          }
        });

        next();
      });
    } catch (err) {
      next(err);
    }
  };
}
