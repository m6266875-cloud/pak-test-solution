/**
 * PHASE 2 — Paper patterns service (node-pg).
 * Teachers save their own patterns; admins may pin shared patterns.
 */
import { q, q1, run } from './db';
import { ApiError } from '../utils/apiResponse';
import { isAdminRole } from './scope';
import { AuthUser } from './types';

interface PatternRow {
  id: number;
  name: string;
  description: string | null;
  config: any;
  isShared: boolean;
  createdById: number;
  createdAt: Date;
  ownerName?: string;
}

export class PatternService {
  async list(user: AuthUser): Promise<PatternRow[]> {
    return q(
      `SELECT pp.id, pp.name, pp.description, pp.config, pp."isShared", pp."createdById", pp."createdAt", u.name AS "ownerName"
         FROM "PaperPattern" pp JOIN "User" u ON u.id = pp."createdById"
        WHERE pp."createdById" = $1 OR pp."isShared" = true
        ORDER BY pp."isShared" DESC, pp."updatedAt" DESC`,
      [user.id]
    );
  }

  async create(user: AuthUser, body: { name?: string; description?: string; config?: any; isShared?: boolean }) {
    const name = (body.name ?? '').trim();
    if (!name) throw ApiError.badRequest('Pattern name is required');
    if (!body.config || typeof body.config !== 'object') throw ApiError.badRequest('Pattern config is required');
    this.validateConfig(body.config);
    const isShared = body.isShared === true && isAdminRole(user.role);
    const ins = await q1<{ id: number }>(
      `INSERT INTO "PaperPattern" ("name","description","config","isShared","createdById","updatedAt")
       VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP) RETURNING id`,
      [name, body.description?.trim() ?? null, JSON.stringify(body.config), isShared, user.id]
    );
    const row = await q1<PatternRow>(
      `SELECT pp.*, u.name AS "ownerName" FROM "PaperPattern" pp JOIN "User" u ON u.id = pp."createdById" WHERE pp.id = $1`,
      [ins!.id]
    );
    return row;
  }

  async update(user: AuthUser, id: number, body: { name?: string; description?: string; config?: any; isShared?: boolean }) {
    const pattern = await this.getOwnedOrAdmin(user, id);
    const sets: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (body.name !== undefined) {
      if (!String(body.name).trim()) throw ApiError.badRequest('Pattern name is required');
      sets.push(`name = $${p++}`);
      params.push(String(body.name).trim());
    }
    if (body.description !== undefined) {
      sets.push(`description = $${p++}`);
      params.push(body.description == null ? null : String(body.description).trim());
    }
    if (body.config !== undefined) {
      this.validateConfig(body.config);
      sets.push(`config = $${p++}`);
      params.push(JSON.stringify(body.config));
    }
    if (body.isShared !== undefined) {
      if (!isAdminRole(user.role) && body.isShared === true) {
        throw ApiError.forbidden('Only an admin can share a pattern');
      }
      sets.push(`"isShared" = $${p++}`);
      params.push(body.isShared === true);
    }
    if (!sets.length) return pattern;
    params.push(id);
    await run(`UPDATE "PaperPattern" SET ${sets.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    return q1<PatternRow>(`SELECT * FROM "PaperPattern" WHERE id = $1`, [id]);
  }

  async delete(user: AuthUser, id: number) {
    await this.getOwnedOrAdmin(user, id);
    await run(`DELETE FROM "PaperPattern" WHERE id = $1`, [id]);
    return { id };
  }

  /** Fetch a pattern the user may apply (own or shared). */
  async apply(user: AuthUser, id: number) {
    const row = await q1<PatternRow>(`SELECT * FROM "PaperPattern" WHERE id = $1`, [id]);
    if (!row) throw ApiError.notFound('Pattern not found');
    if (row.createdById !== user.id && !row.isShared) {
      throw ApiError.forbidden('Pattern not visible to you');
    }
    return { id: row.id, name: row.name, description: row.description, config: row.config };
  }

  private async getOwnedOrAdmin(user: AuthUser, id: number): Promise<PatternRow> {
    const row = await q1<PatternRow>(`SELECT * FROM "PaperPattern" WHERE id = $1`, [id]);
    if (!row) throw ApiError.notFound('Pattern not found');
    if (row.createdById !== user.id && !isAdminRole(user.role)) {
      throw ApiError.forbidden('You can only manage your own patterns');
    }
    return row;
  }

  private validateConfig(cfg: any) {
    if (!Number.isInteger(cfg.classId)) throw ApiError.badRequest('Pattern config needs classId');
    if (!Array.isArray(cfg.subjectIds) || !cfg.subjectIds.length) throw ApiError.badRequest('Pattern config needs subjectIds');
    if (!Array.isArray(cfg.distribution) || !cfg.distribution.length) throw ApiError.badRequest('Pattern config needs distribution');
    if (!Number.isInteger(cfg.totalMarks)) throw ApiError.badRequest('Pattern config needs totalMarks');
  }
}

export const patternService = new PatternService();
