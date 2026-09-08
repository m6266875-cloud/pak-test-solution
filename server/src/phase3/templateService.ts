/**
 * PHASE 3 — Paper templates.
 *
 * A template is a named header/footer/branding configuration. schoolId NULL
 * = system template (Super Admin); otherwise school-level (school admins).
 * Templates are referenced by PaperFormatting.branding.templateId and used
 * at print/PDF render time to shape the document.
 */
import { q, q1, run, pool } from '../phase2/db';
import { AuthUser } from '../phase2/types';
import { ApiError } from '../utils/apiResponse';
import { record } from './audit';

export const TEMPLATE_KINDS = [
  'school_exam',
  'monthly_test',
  'mid_term',
  'final_term',
  'practice_test',
  'board_pattern',
] as const;

export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export interface TemplateInput {
  name?: string;
  kind?: string;
  config?: any;
  isActive?: boolean;
  isDefault?: boolean;
}

/** Whitelist-merge template config so clients cannot smuggle arbitrary JSON. */
export function normalizeTemplateConfig(input: any): Record<string, unknown> {
  const src = input && typeof input === 'object' ? input : {};
  const out: Record<string, unknown> = {
    numbering: src.numbering === 'per-section' ? 'per-section' : 'global',
    pageNumbers: src.pageNumbers !== false,
    showInstructions: src.showInstructions !== false,
    instructions: String(src.instructions ?? '').slice(0, 1000),
    header: {
      showSchoolName: src.header?.showSchoolName !== false,
      showLogo: src.header?.showLogo !== false,
      showContact: Boolean(src.header?.showContact),
      schoolNameSize: Number.isFinite(Number(src.header?.schoolNameSize)) ? Math.min(28, Math.max(12, Number(src.header?.schoolNameSize))) : 18,
    },
    footer: {
      enabled: src.footer?.enabled !== false,
      note: String(src.footer?.note ?? '').slice(0, 300),
    },
    watermark: src.watermark == null
      ? null
      : {
          enabled: Boolean(src.watermark.enabled),
          opacity: Number.isFinite(Number(src.watermark.opacity)) ? Math.min(0.5, Math.max(0.02, Number(src.watermark.opacity))) : 0.07,
          size: Number.isFinite(Number(src.watermark.size)) ? Math.min(90, Math.max(10, Number(src.watermark.size))) : 45,
          position: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(src.watermark.position)
            ? src.watermark.position : 'center',
        },
    paperFooter: String(src.paperFooter ?? '').slice(0, 200), // e.g. "— Best of luck —"
  };
  return out;
}

function scopeOf(user: AuthUser): { allowSystem: boolean; schoolId: number | null } {
  if (user.role === 'super_admin') return { allowSystem: true, schoolId: null };
  if (user.role === 'school_admin') return { allowSystem: false, schoolId: user.schoolId };
  throw ApiError.forbidden('Only admins can manage templates');
}

async function rowCan(user: AuthUser, id: number) {
  const t = await q1<any>(`SELECT * FROM "PaperTemplate" WHERE id=$1`, [id]);
  if (!t) throw ApiError.notFound('Template not found');
  if (user.role === 'school_admin' && t.schoolId !== user.schoolId) {
    throw ApiError.forbidden('You can only manage your own school templates');
  }
  if (user.role === 'teacher') throw ApiError.forbidden('Teachers cannot manage templates');
  return t;
}

async function clearOtherDefaults(scopeSchool: number | null, exceptId?: number) {
  await run(
    `UPDATE "PaperTemplate" SET "isDefault"=false, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "schoolId" IS NOT DISTINCT FROM $1 AND id <> COALESCE($2, -1)`,
    [scopeSchool, exceptId ?? -1]
  );
}

export const templateService = {
  /** Single template for editing (rowCan enforces school boundaries). */
  async get(user: AuthUser, id: number) {
    return rowCan(user, id);
  },

  async list(user: AuthUser, schoolId?: number) {
    if (user.role === 'teacher') throw ApiError.forbidden('Teachers cannot list templates');
    const scope = scopeOf(user);
    let rows: any[];
    if (user.role === 'super_admin') {
      rows = await q<any>(
        `SELECT t.*, s.name AS "schoolName" FROM "PaperTemplate" t
         LEFT JOIN "School" s ON s.id = t."schoolId"
         WHERE ($1::int IS NULL OR t."schoolId" = $1) ORDER BY t."isDefault" DESC, t.id`,
        [schoolId ? Number(schoolId) : null]
      );
    } else {
      rows = await q<any>(
        `SELECT t.*, s.name AS "schoolName" FROM "PaperTemplate" t
         LEFT JOIN "School" s ON s.id = t."schoolId"
         WHERE t."schoolId" IS NOT DISTINCT FROM $1 ORDER BY t."isDefault" DESC, t.id`,
        [scope.schoolId]
      );
    }
    return rows;
  },

  async create(user: AuthUser, body: TemplateInput) {
    if (user.role === 'teacher') throw ApiError.forbidden('Only admins can create templates');
    const name = String(body.name ?? '').trim();
    if (!name) throw ApiError.badRequest('Template name is required');
    const kind = String(body.kind ?? 'school_exam');
    if (!(TEMPLATE_KINDS as readonly string[]).includes(kind)) {
      throw ApiError.badRequest(`Invalid kind. Allowed: ${TEMPLATE_KINDS.join(', ')}`);
    }
    let schoolId: number | null = null;
    if (user.role === 'school_admin') {
      schoolId = user.schoolId;
      if (!schoolId) throw ApiError.forbidden('No school attached to your account');
    } else if (body.config && typeof body.config === 'object' && Number(body.config.schoolId)) {
      schoolId = Number(body.config.schoolId); // super admin: allow attaching to a school
    }
    const config = normalizeTemplateConfig(body.config);
    const isDefault = Boolean(body.isDefault);
    if (isDefault) await clearOtherDefaults(schoolId);
    const r = await q1<{ id: number }>(
      `INSERT INTO "PaperTemplate" ("schoolId","name","kind","config","isDefault","isActive","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4::jsonb,$5,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
      [schoolId, name, kind, JSON.stringify(config), isDefault]
    );
    if (!r) throw ApiError.internal('Could not create the template');
    await record(user, { action: 'template.create', entity: 'PaperTemplate', entityId: r.id, meta: { name, kind, schoolId } });
    return rowCan(user, r.id);
  },

  async update(user: AuthUser, id: number, body: TemplateInput) {
    const t = await rowCan(user, id);
    const sets: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (body.name !== undefined) { const n = String(body.name).trim(); if (!n) throw ApiError.badRequest('Name required'); sets.push(`name=$${p++}`); params.push(n); }
    if (body.kind !== undefined) {
      if (!(TEMPLATE_KINDS as readonly string[]).includes(body.kind)) throw ApiError.badRequest('Invalid kind');
      sets.push(`kind=$${p++}`); params.push(body.kind);
    }
    if (body.config !== undefined) { sets.push(`config=$2::jsonb`); params.push(JSON.stringify(normalizeTemplateConfig(body.config))); }
    if (body.isActive !== undefined) { sets.push(`"isActive"=$${p++}`); params.push(Boolean(body.isActive)); }
    if (body.isDefault !== undefined && Boolean(body.isDefault) && !t.isDefault) {
      await clearOtherDefaults(t.schoolId ?? null, id);
      sets.push(`"isDefault"=$${p++}`); params.push(true);
    }
    if (sets.length) {
      params.push(id);
      await run(`UPDATE "PaperTemplate" SET ${sets.join(', ')}, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$${params.length}`, params);
    }
    await record(user, { action: 'template.update', entity: 'PaperTemplate', entityId: id });
    return rowCan(user, id);
  },

  async remove(user: AuthUser, id: number) {
    const t = await rowCan(user, id);
    // detach school default references before deleting
    await pool.query(
      `UPDATE "School" SET branding = jsonb_set(branding, '{defaultTemplateId}', 'null'::jsonb), "updatedAt"=CURRENT_TIMESTAMP
        WHERE branding->>'defaultTemplateId' = $1`, [String(id)]
    );
    await run(`DELETE FROM "PaperTemplate" WHERE id=$1`, [id]);
    await record(user, { action: 'template.delete', entity: 'PaperTemplate', entityId: id, meta: { name: t.name } });
    return { success: true, id };
  },

  /** System + school templates usable by a teacher's school (no auth needed
   * beyond schoolId). Returns a picker-friendly list. */
  async forSchool(schoolId: number | null | undefined) {
    if (!schoolId) {
      return q<any>(`SELECT * FROM "PaperTemplate" WHERE "schoolId" IS NULL AND "isActive"=true ORDER BY "isDefault" DESC, id`);
    }
    return q<any>(
      `SELECT * FROM "PaperTemplate" WHERE "isActive"=true AND ("schoolId" IS NULL OR "schoolId"=$1)
       ORDER BY ("schoolId" = $1) DESC, "isDefault" DESC, id`, [schoolId]
    );
  },
};
