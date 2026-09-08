/**
 * PHASE 3 — Paper-level branding (formatting + watermark + template).
 *
 * A generated paper already snapshots its school (name, logo, watermark
 * defaults, template choice) into PaperFormatting at generation time. This
 * module lets a teacher (paper owner) or an admin adjust that branding and
 * persist a template's configuration into the paper's own snapshot so the
 * document history stays self-contained.
 */
import { q, q1, run } from '../phase2/db';
import { AuthUser } from '../phase2/types';
import { ApiError } from '../utils/apiResponse';
import { hasPerm } from './perms';
import { record } from './audit';
import { schoolSnapshot } from './schoolService';
import { templateService } from './templateService';

export interface BrandingInput {
  templateId?: number | null;
  schoolName?: string | null;
  headerNote?: string | null;
  footerNote?: string | null;
  instructions?: string | null;
  date?: string | null;
  showLogo?: boolean;
  showSchoolName?: boolean;
  showContact?: boolean;
  watermark?: {
    enabled?: boolean;
    opacity?: number;
    size?: number;
    position?: string;
  } | null;
  fontFamily?: string | null;
  fontSize?: number | null;
  lineHeight?: number | null;
  layoutType?: string | null;
  showBorder?: boolean;
  color?: string | null;
}

const clamp = (v: any, min: number, max: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

export async function canTouchPaper(user: AuthUser, paper: { id: number; teacherId: number; schoolId: number | null }) {
  if (user.role === 'teacher') {
    if (paper.teacherId !== user.id) throw ApiError.forbidden('You do not own this paper');
    return;
  }
  if (user.role === 'super_admin') return;
  if (user.role === 'school_admin') {
    if (!(await hasPerm(user, 'generatedPapers'))) {
      throw ApiError.forbidden('Your admin permissions do not include "generatedPapers"');
    }
    if (paper.schoolId !== user.schoolId) throw ApiError.forbidden('This paper belongs to another school');
    return;
  }
}

/** Resolve template to use: explicit → school default → none. */
export async function resolveTemplate(
  school: any,
  templateId?: number | null,
  actorSchoolId?: number | null
): Promise<any | null> {
  let id = templateId ?? null;
  if (id == null && school?.branding?.defaultTemplateId) id = school.branding.defaultTemplateId;
  if (id == null) return null;
  const t = await q1<any>(`SELECT * FROM "PaperTemplate" WHERE id=$1 AND "isActive"=true`, [id]);
  if (!t) return null;
  // scope: template must be system-level or belong to the paper's school
  if (t.schoolId != null && t.schoolId !== (school?.id ?? actorSchoolId)) return null;
  return t;
}

export async function saveBranding(user: AuthUser, paperId: number, input: BrandingInput) {
  const paper = await q1<any>(
    `SELECT p.id, p."teacherId", p."schoolId", p."examTitle", p.medium FROM "Paper" p WHERE p.id=$1`, [paperId]
  );
  if (!paper) throw ApiError.notFound('Paper not found');
  await canTouchPaper(user, paper);

  const fmt = await q1<any>(`SELECT * FROM "PaperFormatting" WHERE "paperId"=$1`, [paperId]);
  const school = paper.schoolId ? await schoolSnapshot(paper.schoolId) : null;

  const tpl = await resolveTemplate(school, input.templateId);
  const tplConfig = tpl?.config ?? null;

  const baseWm = (school?.branding?.watermark ?? {}) as any;
  const wmIn = (input.watermark ?? (tplConfig as any)?.watermark ?? null) as any;
  const watermark = {
    enabled: wmIn && wmIn.enabled !== undefined ? Boolean(wmIn.enabled) : Boolean(baseWm.enabled),
    opacity: wmIn && wmIn.opacity !== undefined ? clamp(wmIn.opacity, 0.02, 0.5, 0.07) : clamp(baseWm.opacity, 0.02, 0.5, 0.07),
    size: wmIn && wmIn.size !== undefined ? clamp(wmIn.size, 10, 90, 45) : clamp(baseWm.size, 10, 90, 45),
    position: wmIn && wmIn.position ? wmIn.position : (baseWm.position ?? 'center'),
  };

  const tplH = (tplConfig as any)?.header ?? {};
  const schH = (school?.branding as any)?.header ?? {};
  const header = {
    showSchoolName: input.showSchoolName ?? tplH.showSchoolName ?? schH.showSchoolName ?? true,
    showLogo: input.showLogo ?? tplH.showLogo ?? schH.showLogo ?? true,
    showContact: input.showContact ?? tplH.showContact ?? schH.showContact ?? false,
    schoolNameSize: tplH.schoolNameSize ?? schH.schoolNameSize ?? 18,
  };

  const schoolName = input.schoolName !== undefined
    ? (String(input.schoolName ?? '').trim().slice(0, 200) || null)
    : (fmt?.schoolName ?? school?.name ?? null);
  const headerNote = input.headerNote !== undefined ? (String(input.headerNote ?? '').trim().slice(0, 500) || null) : (fmt?.headerNote ?? null);
  const footerNote = input.footerNote !== undefined ? (String(input.footerNote ?? '').trim().slice(0, 300) || null) : (fmt?.footerNote ?? (tplConfig?.footer?.note ?? null));
  const instructions = input.instructions !== undefined ? (String(input.instructions ?? '').trim().slice(0, 1000) || null) : (tplConfig?.instructions ?? null);
  const date = input.date !== undefined ? (String(input.date ?? '').trim().slice(0, 40) || null) : null;
  const templateId = tpl?.id ?? null;

  const branding = {
    watermark,
    header,
    templateId,
    templateName: tpl?.name ?? null,
    templateKind: tpl?.kind ?? null,
    instructions,
    date,
    footerNote,
    numbering: tplConfig?.numbering ?? 'global',
    pageNumbers: tplConfig?.pageNumbers !== false,
  };

  const exists = fmt;
  const sets: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  const setCol = (col: string, v: unknown, type = '') => { sets.push(`${col} = $${p++}${type}`); params.push(v); };
  setCol('"schoolName"', schoolName);
  setCol('"headerNote"', headerNote);
  setCol('"footerNote"', footerNote);
  setCol('"branding"', JSON.stringify(branding), '::jsonb');
  if (school?.logoUrl) setCol('"schoolLogoUrl"', school.logoUrl);
  const style = (col: string, v: any) => { if (v !== undefined && v !== null) setCol(col, v); };
  style('"fontFamily"', input.fontFamily);
  style('"fontSize"', input.fontSize);
  style('"lineHeight"', input.lineHeight);
  style('"layoutType"', input.layoutType);
  style('"color"', input.color);
  if (input.showBorder !== undefined) setCol('"showBorder"', Boolean(input.showBorder));

  if (exists) {
    params.push(paperId);
    await run(`UPDATE "PaperFormatting" SET ${sets.join(', ')}, "updatedAt"=CURRENT_TIMESTAMP WHERE "paperId"=$${params.length}`, params);
  } else {
    // v1 papers without formatting row: create one
    await run(
      `INSERT INTO "PaperFormatting" ("paperId","schoolName","headerNote","footerNote","schoolLogoUrl","branding","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [paperId, schoolName, headerNote, footerNote, school?.logoUrl ?? null, JSON.stringify(branding)]
    );
  }
  await record(user, { action: 'paper.branding', entity: 'Paper', entityId: paperId, meta: { templateId, schoolName } });

  const { paperGeneratorV2 } = await import('../phase2/generatorService');
  return paperGeneratorV2.getPaper(user, paperId);
}

/** Build render context for a paper (used by preview data + PDF). */
export async function renderContext(user: AuthUser, paperId: number, opts: { watermark?: 'on' | 'off' | undefined } = {}) {
  const meta = await q1<{ id: number; teacherId: number; schoolId: number | null }>(
    `SELECT id, "teacherId", "schoolId" FROM "Paper" WHERE id=$1`, [paperId]
  );
  if (!meta) throw ApiError.notFound('Paper not found');
  await canTouchPaper(user, meta);
  const { paperGeneratorV2 } = await import('../phase2/generatorService');
  const paper = await paperGeneratorV2.getPaper(user, paperId);
  const school = paper.schoolId ? await schoolSnapshot(paper.schoolId) : null;
  const fmt = paper.formatting ?? {};
  const branding = fmt.branding ?? {};
  let watermark = branding.watermark ?? null;
  if (opts.watermark === 'on') watermark = { ...(watermark ?? { enabled: true }), enabled: true };
  if (opts.watermark === 'off') watermark = { ...(watermark ?? {}), enabled: false };
  return { paper, school, fmt, branding, watermark };
}

/** Templates the paper owner may apply (system list + own school list). */
export async function applicableTemplates(user: AuthUser) {
  return templateService.forSchool(user.role === 'super_admin' ? null : user.schoolId);
}
