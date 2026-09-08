/**
 * PHASE 3 — /api/v3 routes (schools, users/admins, templates, analytics,
 * activity log, generated-papers management, preview & PDF).
 *
 * Auth: Phase-2 JWT authenticate (same tokens as /api/v2) → resolvePerms
 * attaches the admin permission list. Every route is additionally guarded by
 * guardPerm/superOnly and the service layer re-checks school/ownership
 * boundaries with SQL — never trust the client.
 */
import { Router, Response, NextFunction, Request } from 'express';
import multer from 'multer';
import { authenticate } from '../phase2/auth';
import { resolvePerms, guardPerm, superOnly, V3AuthRequest } from './perms';
import { ApiError, successResponse } from '../utils/apiResponse';
import { q } from '../phase2/db';
import { schoolService, schoolSnapshot } from './schoolService';
import { MAX_LOGO_BYTES, LOGO_CONTENT_TYPE, readLogo } from './logoStore';
import { userAdminService } from './userAdminService';
import { templateService } from './templateService';
import { analyticsService } from './analyticsService';
import { listLogs, distinctActions } from './audit';
import { record } from './audit';
import { saveBranding, renderContext, applicableTemplates, canTouchPaper } from './paperBranding';
import { paperGeneratorV2 } from '../phase2/generatorService';
import { buildPaperHtml, renderPdf } from './pdf';
import { q1 } from '../phase2/db';

const router = Router();
router.use(authenticate as any);
router.use(resolvePerms as any);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES, files: 1 },
});

// ─── helpers ────────────────────────────────────────────────────────────────
const idOf = (v: any): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest('Invalid id');
  return n;
};

const num = (v: any, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const wrap =
  (fn: (req: V3AuthRequest, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req as V3AuthRequest, res);
    } catch (err) {
      next(err);
    }
  };

const me = (req: V3AuthRequest) => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};

// ─── Schools ────────────────────────────────────────────────────────────────
router.get(
  '/schools/mine',
  wrap(async (req, res) => {
    const user = me(req);
    if (!user.schoolId) throw ApiError.notFound('No school is attached to this account');
    const school = await schoolSnapshot(user.schoolId);
    if (!school) throw ApiError.notFound('School not found');
    successResponse(res, { school }, 'School fetched');
  })
);

router.get(
  '/schools',
  guardPerm('schools'),
  wrap(async (req, res) => {
    const rows = await schoolService.list(me(req), {
      search: String(req.query.search ?? ''),
      status: String(req.query.status ?? ''),
      page: num(req.query.page, 1),
      limit: num(req.query.limit, 25),
    });
    successResponse(res, rows, 'Schools fetched');
  })
);

router.post(
  '/schools',
  superOnly,
  guardPerm('schools'),
  wrap(async (req, res) => {
    const created = await schoolService.create(me(req), req.body ?? {});
    successResponse(res, created, 'School created', 201);
  })
);

router.get(
  '/schools/:id',
  guardPerm('schools'),
  wrap(async (req, res) => {
    const school = await schoolService.get(me(req), idOf(req.params.id), req.query.branding === '1');
    successResponse(res, school, 'School fetched');
  })
);

router.put(
  '/schools/:id',
  guardPerm('schools'),
  wrap(async (req, res) => {
    const updated = await schoolService.update(me(req), idOf(req.params.id), req.body ?? {});
    successResponse(res, updated, 'School updated');
  })
);

router.patch(
  '/schools/:id/status',
  superOnly,
  guardPerm('schools'),
  wrap(async (req, res) => {
    const updated = await schoolService.setStatus(me(req), idOf(req.params.id), String(req.body?.status ?? ''));
    successResponse(res, updated, 'School status updated');
  })
);

router.post(
  '/schools/:id/logo',
  guardPerm('schools'),
  (req: Request, res: Response, next: NextFunction) =>
    upload.single('logo')(req, res, (err: any) => {
      if (err) {
        if (err?.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Logo file must be at most 2 MB'));
        return next(ApiError.badRequest(`Logo upload failed: ${err?.message ?? 'unknown error'}`));
      }
      next();
    }),
  wrap(async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw ApiError.badRequest('Attach a logo file (PNG, JPG, JPEG or SVG) as field "logo"');
    const updated = await schoolService.uploadLogo(me(req as any), idOf(req.params.id), file.buffer);
    successResponse(res, updated, 'Logo uploaded');
  })
);

router.delete(
  '/schools/:id/logo',
  guardPerm('schools'),
  wrap(async (req, res) => {
    const updated = await schoolService.removeLogo(me(req), idOf(req.params.id));
    successResponse(res, updated, 'Logo removed');
  })
);

// Logo bytes — any authenticated user who belongs to the school may fetch it
// (teachers render it in previews/PDFs). Admins may fetch their own school;
// super admin any school.
router.get(
  '/schools/:id/logo',
  wrap(async (req, res) => {
    const user = me(req);
    const id = idOf(req.params.id);
    if (user.role === 'school_admin' && user.schoolId !== id) throw ApiError.forbidden('You can only view your own school logo');
    if (user.role === 'teacher' && user.schoolId !== id) throw ApiError.forbidden('You can only view your own school logo');
    const row = await q1<{ logoUrl: string | null }>(`SELECT "logoUrl" FROM "School" WHERE id=$1`, [id]);
    if (!row || !row.logoUrl) throw ApiError.notFound('This school has no logo');
    const ext = String(row.logoUrl.split('.').pop() ?? '').toLowerCase();
    const buf = readLogo(id, ext);
    if (!buf) throw ApiError.notFound('Logo file missing on disk');
    res.setHeader('Content-Type', LOGO_CONTENT_TYPE[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  })
);

router.get(
  '/schools/:id/branding',
  guardPerm('schools'),
  wrap(async (req, res) => {
    successResponse(res, await schoolService.getBranding(me(req), idOf(req.params.id)), 'Branding fetched');
  })
);

router.put(
  '/schools/:id/branding',
  guardPerm('schools'),
  wrap(async (req, res) => {
    const branding = await schoolService.setBranding(me(req), idOf(req.params.id), req.body ?? {});
    successResponse(res, branding, 'Branding saved');
  })
);

router.get(
  '/schools/:id/dashboard',
  guardPerm('analytics'),
  wrap(async (req, res) => {
    successResponse(res, await schoolService.dashboard(me(req), idOf(req.params.id)), 'School dashboard fetched');
  })
);

// ─── User administration (teachers + admins) ───────────────────────────────
router.get(
  '/users',
  guardPerm('users'),
  wrap(async (req, res) => {
    const rows = await userAdminService.list(me(req), {
      role: String(req.query.role ?? ''),
      schoolId: req.query.schoolId ? num(req.query.schoolId, 0) : undefined,
      search: String(req.query.search ?? ''),
      page: num(req.query.page, 1),
      limit: num(req.query.limit, 25),
    });
    successResponse(res, rows, 'Users fetched');
  })
);

router.get(
  '/users/:id',
  guardPerm('users'),
  wrap(async (req, res) => {
    successResponse(res, await userAdminService.get(me(req), idOf(req.params.id)), 'User fetched');
  })
);

router.post(
  '/users/teachers',
  guardPerm('users'),
  wrap(async (req, res) => {
    const out = await userAdminService.createTeacher(me(req), req.body ?? {});
    successResponse(res, out, 'Teacher created — share the temporary password', 201);
  })
);

router.post(
  '/users/admins',
  superOnly,
  guardPerm('users'),
  wrap(async (req, res) => {
    const out = await userAdminService.createAdmin(me(req), req.body ?? {});
    successResponse(res, out, 'Admin created — share the temporary password', 201);
  })
);

router.put(
  '/users/:id',
  guardPerm('users'),
  wrap(async (req, res) => {
    successResponse(res, await userAdminService.update(me(req), idOf(req.params.id), req.body ?? {}), 'User updated');
  })
);

router.post(
  '/users/:id/password-reset',
  guardPerm('users'),
  wrap(async (req, res) => {
    successResponse(res, await userAdminService.resetPassword(me(req), idOf(req.params.id)), 'Password reset — new password returned once');
  })
);

// ─── Admin catalog options (real DB rows for the teacher form) ─────────────
router.get(
  '/catalog/options',
  guardPerm('users'),
  wrap(async (req, res) => {
    const user = me(req);
    const isSchool = user.role === 'school_admin';
    const scopeParams = isSchool ? [user.schoolId ?? -1] : [];
    const subjectScope = isSchool
      ? `AND (s."schoolId" IS NULL OR s."schoolId" = $1)`
      : `AND s."schoolId" IS NULL`;
    const [courses, classes] = await Promise.all([
      q<any>(`SELECT id, code, name FROM "Course" WHERE status='active' ORDER BY code, name`),
      q<any>(
        `SELECT cl.id, cl.grade, cl.name AS "className", s."courseId", co.code AS "courseCode",
                COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name, 'medium', s.medium)
                        ORDER BY s.name) FILTER (WHERE s.id IS NOT NULL), '[]') AS subjects
           FROM "Subject" s
           JOIN "Class" cl ON cl.id = s."classId"
           JOIN "Course" co ON co.id = s."courseId"
          WHERE s.status='active' AND co.status='active' ${subjectScope}
          GROUP BY cl.id, s."courseId", co.code
          ORDER BY cl.grade, co.code, cl.name`,
        scopeParams
      ),
    ]);
    successResponse(res, { courses, classes }, 'Catalog options fetched');
  })
);

// ─── Templates ──────────────────────────────────────────────────────────────
router.get(
  '/templates',
  guardPerm('settings'),
  wrap(async (req, res) => {
    const rows = await templateService.list(me(req), req.query.schoolId ? Number(req.query.schoolId) : undefined);
    successResponse(res, rows, 'Templates fetched');
  })
);

router.post(
  '/templates',
  guardPerm('settings'),
  wrap(async (req, res) => {
    const created = await templateService.create(me(req), req.body ?? {});
    successResponse(res, created, 'Template created', 201);
  })
);

router.get(
  '/templates/forSchool',
  wrap(async (req, res) => {
    const user = me(req);
    const schoolId = user.role === 'super_admin' && req.query.schoolId ? Number(req.query.schoolId) : user.schoolId;
    const rows = await templateService.forSchool(schoolId);
    successResponse(res, rows, 'Templates fetched');
  })
);

router.get(
  '/templates/:id',
  guardPerm('settings'),
  wrap(async (req, res) => {
    successResponse(res, await templateService.get(me(req), idOf(req.params.id)), 'Template fetched');
  })
);

router.put(
  '/templates/:id',
  guardPerm('settings'),
  wrap(async (req, res) => {
    const updated = await templateService.update(me(req), idOf(req.params.id), req.body ?? {});
    successResponse(res, updated, 'Template updated');
  })
);

router.delete(
  '/templates/:id',
  guardPerm('settings'),
  wrap(async (req, res) => {
    successResponse(res, await templateService.remove(me(req), idOf(req.params.id)), 'Template deleted');
  })
);

// ─── Analytics ──────────────────────────────────────────────────────────────
router.get(
  '/analytics/overview',
  guardPerm('analytics'),
  wrap(async (req, res) => {
    successResponse(res, await analyticsService.overview(me(req)), 'Analytics overview fetched');
  })
);

router.get(
  '/analytics/activity',
  guardPerm('analytics'),
  wrap(async (req, res) => {
    successResponse(res, await analyticsService.paperActivity(me(req)), 'Paper activity fetched');
  })
);

router.get(
  '/analytics/top',
  guardPerm('analytics'),
  wrap(async (req, res) => {
    successResponse(res, await analyticsService.topLists(me(req)), 'Top lists fetched');
  })
);

// ─── Activity log ───────────────────────────────────────────────────────────
router.get(
  '/audit',
  guardPerm('audit'),
  wrap(async (req, res) => {
    const rows = await listLogs(me(req), {
      page: num(req.query.page, 1),
      limit: num(req.query.limit, 50),
      action: String(req.query.action ?? ''),
      entity: String(req.query.entity ?? ''),
      userId: req.query.userId ? num(req.query.userId, 0) : undefined,
      schoolId: req.query.schoolId ? num(req.query.schoolId, 0) : undefined,
      from: String(req.query.from ?? ''),
      to: String(req.query.to ?? ''),
      search: String(req.query.search ?? ''),
    });
    successResponse(res, rows, 'Activity log fetched');
  })
);

router.get(
  '/audit/actions',
  guardPerm('audit'),
  wrap(async (_req, res) => {
    successResponse(res, await distinctActions(), 'Audit actions fetched');
  })
);

// ─── Generated papers: admin management (view/download/archive) ────────────
router.get(
  '/papers',
  guardPerm('generatedPapers'),
  wrap(async (req, res) => {
    const rows = await paperGeneratorV2.list(me(req), {
      page: num(req.query.page, 1),
      limit: num(req.query.limit, 10),
      status: String(req.query.status ?? ''),
      courseId: req.query.courseId ? num(req.query.courseId, 0) : undefined,
      classId: req.query.classId ? num(req.query.classId, 0) : undefined,
      subjectId: req.query.subjectId ? num(req.query.subjectId, 0) : undefined,
      schoolId: req.query.schoolId ? num(req.query.schoolId, 0) : undefined,
      teacherId: req.query.teacherId ? num(req.query.teacherId, 0) : undefined,
      search: String(req.query.search ?? ''),
      from: String(req.query.from ?? ''),
      to: String(req.query.to ?? ''),
    });
    successResponse(res, rows, 'Papers fetched');
  })
);

// Templates a paper owner can apply (system + school defaults).
router.get(
  '/papers/templates',
  wrap(async (req, res) => {
    successResponse(res, await applicableTemplates(me(req)), 'Applicable templates fetched');
  })
);

// Preview context (branding + watermark + full paper) for the v3 UI.
router.get(
  '/papers/:id/preview',
  wrap(async (req, res) => {
    const user = me(req);
    const wm = req.query.watermark === 'on' ? 'on' : req.query.watermark === 'off' ? 'off' : undefined;
    const ctx = await renderContext(user, idOf(req.params.id), { watermark: wm });
    successResponse(res, {
      paper: ctx.paper,
      school: ctx.school,
      formatting: {
        schoolName: ctx.fmt.schoolName ?? null,
        headerNote: ctx.fmt.headerNote ?? null,
        footerNote: ctx.fmt.footerNote ?? null,
        schoolLogoUrl: ctx.fmt.schoolLogoUrl ?? null,
        branding: ctx.branding,
      },
      watermark: ctx.watermark,
    }, 'Paper preview fetched');
  })
);

// Paper branding editor (teacher-owner or admin with generatedPapers).
router.put(
  '/papers/:id/branding',
  wrap(async (req, res) => {
    const updated = await saveBranding(me(req), idOf(req.params.id), req.body ?? {});
    successResponse(res, updated, 'Paper branding saved');
  })
);

// Branded A4 PDF download (graceful 501 when the Chromium engine is absent).
router.get(
  '/papers/:id/pdf',
  wrap(async (req, res) => {
    const user = me(req);
    const paperId = idOf(req.params.id);
    const ctx = await renderContext(user, paperId, {
      watermark: req.query.watermark === 'on' ? 'on' : req.query.watermark === 'off' ? 'off' : undefined,
    });
    const fmt = ctx.paper.formatting ?? {};
    const branding = ctx.branding ?? {};
    const baseUrl = `${req.protocol}://${req.get('host') ?? ''}`;
    const html = buildPaperHtml({
      paper: ctx.paper,
      baseUrl,
      school: ctx.school,
      answers: req.query.answers === '1' || req.query.answers === 'true',
      watermark: ctx.watermark,
      header: branding.header,
      instructions: branding.instructions ?? null,
      footerNote: fmt.footerNote ?? branding.footerNote ?? null,
      numbering: branding.numbering ?? 'global',
    });
    const pdf = await renderPdf(html);
    const title = String(ctx.paper.title || ctx.paper.examTitle || `paper-${paperId}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await record(user, { action: 'paper.download', entity: 'Paper', entityId: paperId, meta: { answers: Boolean(req.query.answers) } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title || 'paper'}.pdf"`);
    res.send(pdf);
  })
);

// Duplicate & archive helpers for the management UI reuse v2 endpoints; the
// v3 duplicates go through paperBranding so school isolation is enforced.
router.post(
  '/papers/:id/duplicate',
  wrap(async (req, res) => {
    const user = me(req);
    const paperId = idOf(req.params.id);
    const meta = await q1<{ id: number; teacherId: number; schoolId: number | null }>(
      `SELECT id, "teacherId", "schoolId" FROM "Paper" WHERE id=$1`, [paperId]
    );
    if (!meta) throw ApiError.notFound('Paper not found');
    await canTouchPaper(user, meta);
    const dup = await paperGeneratorV2.duplicate(user, paperId);
    await record(user, { action: 'paper.duplicate', entity: 'Paper', entityId: dup.paper?.id ?? paperId });
    successResponse(res, dup, 'Paper duplicated', 201);
  })
);

router.patch(
  '/papers/:id/status',
  wrap(async (req, res) => {
    const user = me(req);
    const paperId = idOf(req.params.id);
    const status = String(req.body?.status ?? '');
    const meta = await q1<{ id: number; teacherId: number; schoolId: number | null }>(
      `SELECT id, "teacherId", "schoolId" FROM "Paper" WHERE id=$1`, [paperId]
    );
    if (!meta) throw ApiError.notFound('Paper not found');
    await canTouchPaper(user, meta);
    const updated = await paperGeneratorV2.updateMeta(user, paperId, { status });
    await record(user, { action: status === 'archived' ? 'paper.archive' : `paper.${status}`, entity: 'Paper', entityId: paperId });
    successResponse(res, updated, 'Paper status updated');
  })
);

export default router;
