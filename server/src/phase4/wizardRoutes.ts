/**
 * PHASE 4 — /api/v4 routes: 5-step wizard backend + role dashboards +
 * syllabus cleanup tooling.
 *
 * Auth: same Phase-2 JWT (authenticate) → resolvePerms. Scope enforcement is
 * repeated in the service layer (assertWizardScope / candidateService) so a
 * hand-crafted request can never escape the caller's assignments.
 *
 * Activity log (spec §D): paper.generation_started, paper.questions_selected,
 * paper.saved are recorded here; paper.download / paper.duplicate /
 * paper.<status> already are (Phase 3 routes + v2Governance).
 */
import { Router, Response, NextFunction, Request } from 'express';
import { authenticate } from '../phase2/auth';
import { resolvePerms, superOnly, V3AuthRequest } from '../phase3/perms';
import { ApiError, successResponse } from '../utils/apiResponse';
import { q } from '../phase2/db';
import { candidateService, assertWizardScope, chapterChecklist, TargetRow } from './candidatesService';
import { paperGeneratorV2 } from '../phase2/generatorService';
import { record } from '../phase3/audit';
import { analyticsService } from '../phase3/analyticsService';
import { schoolSnapshot } from '../phase3/schoolService';
import { runCleanup } from './catalogCleanup';

const router = Router();
router.use(authenticate as any);
router.use(resolvePerms as any);

const wrap =
  (fn: (req: V3AuthRequest, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try { await fn(req as V3AuthRequest, res); } catch (err) { next(err); }
  };

const me = (req: V3AuthRequest) => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};

const num = (v: any): number | undefined =>
  v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v);

/* ── STEP 2 data: chapter checklist (+ exercises + live counts) ──────────── */
router.get(
  '/wizard/chapters',
  wrap(async (req, res) => {
    const user = me(req);
    const rows = await chapterChecklist(user, {
      subjectId: num(req.query.subjectId) ?? 0,
      bookId: num(req.query.bookId) ?? null,
    });
    successResponse(res, rows, 'Chapters fetched');
  }),
);

/* ── STEP 4 data: paginated candidates + auto pre-selection ──────────────── */
router.post(
  '/wizard/candidates',
  wrap(async (req, res) => {
    const user = me(req);
    const b = req.body ?? {};
    const scope = await assertWizardScope(user, b);
    const result = await candidateService.buildCandidateSet(user, scope, {
      distribution: (b.distribution ?? []) as TargetRow[],
      seed: num(b.seed),
      page: num(b.page),
      limit: num(b.limit),
      search: typeof b.search === 'string' ? b.search : undefined,
    });
    successResponse(res, result, 'Candidates fetched');
  }),
);

/* ── STEP 4 helper: in-scope manual search (paginated) ───────────────────── */
router.post(
  '/wizard/search',
  wrap(async (req, res) => {
    const user = me(req);
    const b = req.body ?? {};
    const scope = await assertWizardScope(user, b);
    const result = await candidateService.listCandidates(user, scope, {
      type: typeof b.type === 'string' ? b.type : undefined,
      page: num(b.page), limit: num(b.limit),
      search: typeof b.search === 'string' ? b.search : undefined,
    });
    successResponse(res, result, 'Search results');
  }),
);

/* ── STEP 5: finalize (server revalidates everything, then persists) ─────── */
router.post(
  '/wizard/generate',
  wrap(async (req, res) => {
    const user = me(req);
    const b = req.body ?? {};
    const scope = await assertWizardScope(user, b);

    await record(user, {
      action: 'paper.generation_started', entity: 'Paper',
      meta: {
        courseId: scope.courseId, classId: scope.classId, subjectId: scope.subjectId,
        bookId: scope.bookId, chapters: scope.chapterIds.length, exercises: scope.exerciseIds.length,
        paperType: scope.paperType, wizard: 'v4-5step',
      },
    });

    const rawIds: unknown[] = Array.isArray(b.questionIds) ? b.questionIds : [];
    const questionIds = rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    await record(user, {
      action: 'paper.questions_selected', entity: 'Paper',
      meta: { count: questionIds.length, distribution: b.distribution ?? [] },
    });

    const generated = await paperGeneratorV2.generate(user, {
      title: typeof b.title === 'string' ? b.title : undefined,
      examTitle: typeof b.examTitle === 'string' ? b.examTitle : undefined,
      courseId: scope.courseId ?? undefined,
      classId: scope.classId,
      subjectIds: [scope.subjectId],
      bookId: scope.bookId ?? undefined,
      chapterIds: scope.chapterIds,
      exerciseIds: scope.exerciseIds,
      paperType: scope.paperType,
      language: scope.language,
      totalMarks: Number(b.totalMarks),
      distribution: b.distribution ?? [],
      timeLimit: num(b.timeLimit),
      autoSelect: false,
      questionIds,
      schoolName: typeof b.schoolName === 'string' ? b.schoolName : undefined,
    });

    const paperId = generated.papers[0]?.id as number;
    const status = b.status === 'final' ? 'final' : 'draft';
    if (status === 'final') {
      await paperGeneratorV2.updateMeta(user, paperId, { status: 'final' });
    }
    await record(user, {
      action: 'paper.saved', entity: 'Paper', entityId: paperId,
      meta: { status, totalMarks: Number(b.totalMarks), questions: questionIds.length },
    });

    const paper = await paperGeneratorV2.getPaper(user, paperId);
    successResponse(res, { paper, warnings: generated.warnings }, 'Paper generated', 201);
  }),
);

/* ── Role-aware dashboards (Part A) ──────────────────────────────────────── */
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const user = me(req);

    if (user.role === 'teacher') {
      const [school, assignments, papers] = await Promise.all([
        user.schoolId ? schoolSnapshot(user.schoolId) : Promise.resolve(null),
        q(
          `SELECT s.id AS "subjectId", s.name AS "subjectName", s.medium, cl.id AS "classId", cl.name AS "className", cl.grade,
                  co.id AS "courseId", co.code AS "courseCode", co.name AS "courseName"
             FROM "TeacherSubject" ts
             JOIN "Subject" s ON s.id = ts."subjectId"
             JOIN "Class" cl ON cl.id = ts."classId"
             LEFT JOIN "Course" co ON co.id = s."courseId"
            WHERE ts."teacherId" = $1 AND s.status = 'active'
            ORDER BY cl.grade, s.name`,
          [user.id],
        ),
        paperGeneratorV2.list(user, { page: 1, limit: 5 }),
      ]);
      const counts = await q<{ status: string; n: string }>(
        `SELECT status, count(*)::int AS n FROM "Paper" WHERE "teacherId" = $1 GROUP BY status`, [user.id],
      );
      successResponse(res, {
        role: 'teacher',
        school: school ? { id: school.id, name: school.name, logoUrl: school.logoUrl, branding: school.branding ?? {} } : null,
        assignments,
        paperStats: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
        recentPapers: papers.rows,
      }, 'Dashboard fetched');
      return;
    }

    // admins: scoped analytics + teachers + recent papers (+ activity for super)
    const [stats, teachers, papers] = await Promise.all([
      analyticsService.overview(user),
      user.role === 'super_admin'
        ? Promise.resolve([] as any[])
        : q(
          `SELECT u.id, u.name, u.email, u."isActive",
                  (SELECT count(*) FROM "TeacherSubject" ts WHERE ts."teacherId" = u.id)::int AS "assignmentCount",
                  (SELECT count(*) FROM "Paper" p WHERE p."teacherId" = u.id)::int AS "paperCount"
             FROM "User" u WHERE u.role = 'teacher' AND u."schoolId" = $1 ORDER BY u.name`,
          [user.schoolId ?? -1],
        ),
      paperGeneratorV2.list(user, { page: 1, limit: 5 }),
    ]);
    const activity = user.role === 'super_admin'
      ? await q(
        `SELECT a.id, a.action, a.entity, a."entityId", a."createdAt", u.name AS "userName", s.name AS "schoolName"
           FROM "ActivityLog" a
           LEFT JOIN "User" u ON u.id = a."userId"
           LEFT JOIN "School" s ON s.id = a."schoolId"
          ORDER BY a."createdAt" DESC LIMIT 10`,
      )
      : await q(
        `SELECT a.id, a.action, a.entity, a."entityId", a."createdAt", u.name AS "userName"
           FROM "ActivityLog" a
           LEFT JOIN "User" u ON u.id = a."userId"
          WHERE a."schoolId" = $1 ORDER BY a."createdAt" DESC LIMIT 10`,
        [user.schoolId ?? -1],
      );
    const school = user.schoolId ? await schoolSnapshot(user.schoolId) : null;
    successResponse(res, {
      role: user.role,
      school: school ? { id: school.id, name: school.name, logoUrl: school.logoUrl, branding: school.branding ?? {} } : null,
      stats, teachers, recentPapers: papers.rows, activity,
    }, 'Dashboard fetched');
  }),
);

/* ── Part B cleanup tool (Super Admin only) ──────────────────────────────── */
router.post(
  '/catalog/cleanup',
  superOnly,
  wrap(async (req, res) => {
    const apply = req.query.apply === '1';
    const report = await runCleanup(apply);
    await record(me(req), {
      action: 'syllabus.cleanup', entity: 'Catalog',
      meta: { apply, archived: report.archivedCount ?? 0, orphans: report.db?.orphanedQuestionIds.length ?? 0 },
    });
    successResponse(res, report, apply ? 'Cleanup applied' : 'Cleanup analysed (dry run)');
  }),
);

export default router;
