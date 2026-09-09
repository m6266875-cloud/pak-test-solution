# PHASE 4 — TECHNICAL SUMMARY

Companion docs: `PHASE4_AUDIT.md` (pre-change audit, deliverable 1) and
`server/prisma/catalog/cleanup-report.json` (Part-B cleanup report, deliverable 2).

---

## 1. DB / schema changes

**Migration `server/prisma/migrations/20260911000000_phase4_wizard/migration.sql`** (purely additive):
- `IF NOT EXISTS` re-assert of the Phase-3 columns (`User.permissions`,
  `Paper.schoolId`, `PaperFormatting.branding`) so a DB built from
  `schema.prisma` alone boots the raw-SQL services.
- New indexes for the Phase-4 engines:
  - `"Question" ("chapterId","type","status","isActive")` — candidate pool.
  - `"Chapter" ("bookId","status")` — book-scoped chapter checklist.
  - `"Book" ("courseId","classId","subjectId","language","status")` — cleanup grouping.

**`schema.prisma` sync (documentation of existing columns, no behaviour change):**
- `User.permissions Json?`
- `Paper.schoolId Int?` + `school School?` relation, `School.papers Paper[]`
- `PaperFormatting.branding Json?`

No table/model was removed or renamed; papers keep referencing their original
syllabus rows (Phase-1 versioning rule preserved).

## 2. New / changed APIs

### New — `/api/v4` (`server/src/phase4/*`, node-pg, same JWT as v2/v3)
| Method & path | Purpose | Guard |
|---|---|---|
| `GET  /v4/wizard/chapters?subjectId&bookId` | Step-2 checklist: chapters + exercises + live approved counts | teacher scope (403 outside assignments) |
| `POST /v4/wizard/candidates` | Step-4 core: paginated candidates + `availableByType` + seeded auto pre-selection hitting the marks breakdown; `seed` reshuffles | `assertWizardScope` server-side |
| `POST /v4/wizard/search` | Manual in-scope search/add (paginated, ≤100/page) | same |
| `POST /v4/wizard/generate` | Step-5 finalize: logs `paper.generation_started` + `paper.questions_selected`, delegates to `PaperGeneratorV2.generate` (manual selection re-validated), optional `status:'final'`, logs `paper.saved` | same |
| `GET  /v4/dashboard` | Role-aware dashboards: teacher (school+logo+branding, assignments, own stats/papers) · school_admin (school-scoped analytics, teacher list, school activity, recent papers) · super_admin (global stats + global activity feed) | authenticate |
| `POST /v4/catalog/cleanup?apply=0|1` | Part-B cleanup dry-run/apply; writes `cleanup-report.json`; logs `syllabus.cleanup` | `superOnly` |

Mounted in `src/app.ts` and `scripts/dev-gateway.ts` (`app.use('/api/v4', …)`).

### Changed
- `server/src/routes/syllabusRoutes.ts`: boards/books/chapter-attach/exercises/
  topics **writes** now `requireAdmin` (= super_admin only) — master
  Course/Book structure is Super-Admin-only per Part A. Reads unchanged.

### Unchanged (reused as-is)
`/api/v2` generator/catalog/bank/patterns, `/api/v3` schools/users/templates/
analytics/audit/paper preview+PDF, auth, branding, v2Governance audit.

## 3. Auth / permission changes
- No new role or token type. `PERMISSIONS` model untouched.
- Tightening only: master syllabus writes → super admin (above). Cleanup tool
  → super admin. Wizard endpoints re-enforce teacher scope in SQL
  (`loadTeacherScope` / `assertWizardScope`) — crafted ids yield 403/400.
- school_admin paper oversight remains school-isolated
  (`teacher.schoolId == admin.schoolId` in the paper service).

## 4. Question-generation service (deliverable 5)
`server/src/phase4/candidatesService.ts` — dedicated, controller-free, testable:
- `assertWizardScope(user, {courseId,classId,subjectId,bookId,chapterIds,exerciseIds,paperType,language})`
- `chapterChecklist(...)` (Book → Chapter → Exercise with counts; chapters
  without exercises handled — exercises optional per chapter)
- `buildCandidateSet(user, scope, {distribution, seed, page, limit, search})` →
  scored/randomised candidates + auto pre-select (`preselectEven`, seeded
  `mulberry32`, chapter-even round robin, exact per-type counts ⇒ marks target)
- `listCandidates(...)` — SQL `LIMIT/OFFSET` pagination; full bank never ships.
- Persistence still `PaperGeneratorV2` (stores the exact Phase-3 config:
  school, course, session, class, subject, book, chapters, exercises, selected
  ids, marks, language, time, lifecycle status in `PaperSetting.generationConfig`).

## 5. Part B cleanup + question-bank migration plan (deliverable 2)
- **JSON level**: `analyzeCatalogFiles()` (pure) verifies ONE book per
  (course, class, subject, medium); distinguishes *edition duplicates*
  (same title lineage, different year/edition → archive older) from
  *component books* (e.g. Oxford Social Studies = History + Geography → keep
  both). Current result: 308 subject rows scanned, no edition duplicates —
  dataset already single-copy; decisions logged in the report.
- **DB level**: `planCleanup()` groups active `Book` rows by
  (course, class, subject, language); keeper = book in the course's CURRENT
  `CourseSession` (fallback latest year); older copies are `status='archived'`
  in one transaction (`applyPlan`) — never deleted, papers keep working.
- **Orphans**: questions with incomplete Course→Class→Subject→Book→Chapter
  chain (or chapter on an archived book) are listed under
  `db.orphanedQuestionIds` for manual review — untouched automatically.
- Question tagging already denormalised (`Question.courseId/classId/subjectId/
  bookId/chapterId/exerciseId`); after archive, the wizard only offers active
  current books, so no data rewrite is required — migration = archive + report.
- Runners: `npm run db:cleanup [--apply|--offline]`, or the Syllabus page
  “Analyse / Archive” card (Super Admin).

## 6. Frontend changes
- **New 5-step wizard** `client/src/pages/Papers/wizard5/*`
  (`Wizard5Page`, `Step1Scope`, `Step2Chapters`, `Step3TypeMarks`,
  `Step4Select`, `Step5Review`, `state.ts`) at the existing route
  `/app/papers/generate` (App.tsx swap).
  - Step 1: scoped course/class/subject; book auto-selected when single,
    shown for confirmation.
  - Step 2: chapter checklist + optional exercise drill-down + live counts.
  - Step 3: Objective/Subjective/Mixed, language, marks + time, per-type
    breakdown (Σ validated), pattern auto-fill (existing Pattern system).
  - Step 4: server pre-select, editable checkboxes grouped by type, shuffle
    (new seed), in-scope search/add, “Load more” pagination, live marks meter
    with match indicator.
  - Step 5: branded `PaperDoc` preview; View / Edit (back to step 4, no
    restart — `replaceQuestions`) / Print (`PrintSheet`) / Download PDF
    (`/v3/papers/:id/pdf`) / Save Draft / Mark Final.
- **Retired** (replaced): `GeneratePaperPage.tsx`, `generate/state.ts`,
  `generate/stepsScope.tsx`, `generate/stepsBuild.tsx` (15-step flow).
  Kept & reused: `generate/PaperDoc.tsx`, `generate/wizUI.tsx`,
  `PrintSheet.tsx`; shared helpers moved to `Papers/paperUtils.ts`
  (imports updated in PaperDoc, PaperDetailPage, MyPapersPage, PatternsPage).
- **Dashboards** (`DashboardPage.tsx`): teacher gains school logo/name +
  branding preview + assigned-scope line; admins moved off the legacy
  Prisma `/api/admin/dashboard` onto `/v4/dashboard` (school-scoped or global
  stats, teacher list, activity feed, management quick links).
- **SyllabusPage**: Super-Admin cleanup card (analyse/apply + result summary).
- New API client `client/src/api/v4.ts`.

## 7. Tests
- `scripts/phase4-candidates.test.ts` — **DB-free unit tests** for the
  auto-selection core (exact counts, uniqueness, chapter-even spread,
  seed determinism/variation, small-pool cap, type groups). Runnable here:
  `npm run test:phase4:units` — **10/10 passing**.
- `scripts/phase4-wizard.test.ts` — DB-backed HTTP tests (`npm run
  test:phase4:wizard`, same pattern as Phase-2 tests): teacher chain
  (chapters → candidates → generate → read-back → dashboard), admin chain
  (generate + school dashboard + super dashboard + cleanup dry run), security
  (403 chapters/candidates outside scope, 400 cross-subject chapters and
  distribution mismatches), activity-log assertions
  (`paper.generation_started/questions_selected/saved`).
- Verification performed in this sandbox: `server tsc -p tsconfig.check.json`
  (new/changed files clean), `client tsc --noEmit` clean, `vite build` ✓
  (chunk-size warning is the known benign one), offline cleanup run ✓.

## 8. Activity-log coverage (spec §D)
generation started / questions selected / saved — new (`/v4/wizard/generate`);
PDF downloaded — existing `paper.download` (v3); duplicate/status changes —
existing v3 + v2Governance entries. All via the shared `record()`.
