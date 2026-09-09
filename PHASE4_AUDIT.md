# PHASE 4 — AUDIT REPORT (before changes)

Scope of audit: current paper-generation wizard (client + server), syllabus/book
catalog data, role/permission system, dashboards, activity logging, and the
pieces Phase 4 must replace or extend. Everything below is what **exists
today**; the "→ change" notes state what Phase 4 does about it.

---

## 1. Current paper-generation wizard (the thing being replaced)

### Frontend — 15 steps
| File | Role today |
|---|---|
| `client/src/pages/Papers/GeneratePaperPage.tsx` | Orchestrates all 15 steps, pattern save/apply modal, step-15 preview (View/Print/PDF/save/duplicate) |
| `client/src/pages/Papers/generate/state.ts` | `WizardState`, `STEPS` (15 `StepDef`s), distribution suggester, `optionEntries`/`answerLetter`/`TYPE_LABELS`/`TYPE_ORDER` helpers (also imported by `PaperDoc`, `PaperDetailPage`, `MyPapersPage`, `PatternsPage`) |
| `client/src/pages/Papers/generate/stepsScope.tsx` | Steps 1–8: Course → **Session** → Class → Subject → Book → Chapters → Topics → Exercises |
| `client/src/pages/Papers/generate/stepsBuild.tsx` | Steps 9–14: Type, Language, Marks & Time, Distribution builder, Availability, Selection |
| `client/src/pages/Papers/generate/wizUI.tsx` | Shared step chrome (`StepHeading`, option tiles) |
| `client/src/pages/Papers/generate/PaperDoc.tsx` | Read-only branded paper renderer (kept & reused) |
| `client/src/pages/Papers/PrintSheet.tsx` | Print overlay (kept & reused) |

Step list today: `1 Course, 2 Session, 3 Class, 4 Subject, 5 Book, 6 Chapters,
7 Topics, 8 Exercises, 9 Paper Type, 10 Language, 11 Marks & Time,
12 Distribution, 13 Availability, 14 Selection, 15 Preview & Save`.

Problems vs Phase-4 spec:
- **Session as a user step (step 2)** exposes session/year-based syllabus
  copies — the duplication the cleanup removes. → *Gone; session auto-resolves
  to the course's CURRENT `CourseSession` server-side.*
- **Topics step (7)** — Phase 4 scope is Book → Chapter → (Exercise). → *Gone
  as a step; exercises folded into step 2 drill-down.*
- **Availability (13) is its own step** → folded into live counts in step 2 and
  the running marks meter in step 4.
- **Step 14 downloads the pool into the browser**: `loadPool` pages
  `v2.questions.list` at 100/page per chapter per type up to 400 rows/type and
  keeps it in React state. → *Replaced by a server-side candidates endpoint
  (paginated, pre-selection computed server-side).*
- **Distribution builder (12)** is a free-form row editor; spec wants
  type-level marks breakdown auto-filled from templates. → Rebuilt in step 3.

### Backend — v2 generator (`server/src/phase2/`)
| File | What it does today (all kept; Phase 4 extends, not replaces) |
|---|---|
| `generatorService.ts` (`PaperGeneratorV2`) | `resolve()` = full server-side validation: distribution Σ(count×marks)===totalMarks; paperType→type-group allow-list; subjects∈class∈one course; **teacher scope check (403 on unassigned subjects)**; chapters∈subjects; topics/exercises∈chapters; book∈subject + session-consistency; manual `questionIds` re-validated against scope/approved/active; multi-paper batches in one tx; `PaperQuestion` snapshots; `PaperSetting.generationConfig` stores the **exact full config** (course, session, class, subjects, book, chapters, topics, exercises, paperType, language, totalMarks, distribution, timeLimit) — matches Phase-4 "full paper config" requirement already. Selection: chapter-even round-robin draw, cross-paper uniqueness while pool allows. |
| `scope.ts` | `loadTeacherScope`, `questionScopePredicate`, `assertChapterAllowed`, `assertSubjectAllowed`, `assertQuestionWritable` — SQL-enforced teacher scope ("never trust client IDs" already holds). |
| `catalogService.ts` | Wizard option endpoints, teacher-scoped (courses only from `TeacherSubject`; counts approved+active only). |
| `catalogRoutes.ts` | `/v2/catalog/*` (courses, sessions, classes, subjects, books, chapters, topics, exercises, availability). |
| `questionBankService.ts` | Paginated bank (limit ≤100), scoped where-builder, create/approve/reject etc. |
| `paperV2Controller.ts` + `paperV2Routes.ts` | `POST /v2/papers` generate; list/get/update/delete/duplicate/replaceQuestions/formatting. |
| `patternService.ts` + `patternRoutes.ts` | Saved patterns (`PaperPattern.config` = full wizard JSON; `isShared` admin-pinned). |

→ **Change**: add a dedicated, testable candidate/auto-select service
(`phase4/candidatesService.ts`) consumed by a new `/v4` wizard API; keep
`PaperGeneratorV2.generate()` as the persistence path (it already stores the
exact Phase-3/4 config shape).

## 2. Syllabus / book data (`server/prisma/catalog/*.json` + loader)

- `courses.json`: 4 sessions (2024-25…2027-28) + 6 courses (PTB, OUP/Oxford,
  AFAQ, GOHAR, FBISE/Federal, BAPU), each with `courseSessions` (exactly one
  `current` per course) and class ranges.
- Per-course files: class blocks (grade ranges) → subjects (em/urdu) → book(s)
  + optional harvested chapter lists (`verified=false` unless official source).
- **Duplicates today**:
  1. *JSON level*: essentially clean already — one book per (class, subject,
     medium); the only multi-book subject is Oxford Social Studies 6–8, which
     is two component textbooks (History + Geography), not edition duplicates.
     Urdu-medium mirror books (`chapterMirrorOf`) double the book count by
     design (medium variants).
  2. *Schema level*: `Book` is versioned by `(courseId, sessionId, …)` and the
     old wizard's Session step surfaces per-session copies — this is the
     "duplicate session/year books" bloat. DB may contain older-session active
     books from earlier seeds.
  3. *Wizard level*: steps 2 + 5 force the user to reason about sessions/books
     even when there is exactly one current book.
- `loadCatalog.ts`: pure `validateCatalogFiles()` + idempotent `applyCatalog()`
  (natural-key upserts; never touches lifecycle columns). → Reused; cleanup is
  additive (archive, never delete).

→ **Change (Part B)**: cleanup tool that (a) verifies JSON files hold a single
latest book per (course,class,subject,medium), (b) in DB archives every
non-current session Book per (course,class,subject,medium) keeping the latest
session's row active, re-pointing nothing (chapters belong to their book —
archived books simply stop being offered), (c) writes
`catalog/cleanup-report.json` listing kept/removed rows for review, (d) flags
orphaned questions (questions whose chapter's book is archived or whose
course/class/subject chain is null) into the same report.

## 3. Roles, permissions, dashboards

- Roles: `super_admin | school_admin | teacher` (enum). Admin module perms:
  `phase3/perms.ts` `PERMISSIONS` = users, schools, courses, books, syllabus,
  questionBank, paperGeneration, generatedPapers, analytics, settings, audit.
  Stored in DB column `User.permissions` JSONB (phase-3 migration) with
  `guardPerm`/`superOnly` middleware + SQL-level school boundaries
  (`schoolWhere`), and `v2Governance.ts` re-guards v2 routes for admins and
  audits key events.
- **Schema drift found**: `schema.prisma` does NOT declare `User.permissions`,
  `Paper.schoolId`, `PaperFormatting.branding` although the phase-3 migration
  created them and all phase-3 code uses them. → Phase-4 migration syncs the
  Prisma schema (additive fields only; `AdminPermission` model left in place).
- Dashboards today:
  - Teacher: `DashboardPage.tsx` subject-cards + stats (v2 data). Missing:
    school logo/branding preview, explicit assigned course/class list, quick
    generate CTA.
  - Admins: same page calls legacy `GET /api/admin/dashboard`
    (`controllers/adminController.ts`, **Prisma-based** — not mounted in the
    sandbox gateway), stats + syllabus counts. Missing: teacher list, recent
    papers, school scoping consistency with v3.
  - Super admin: same legacy endpoint; no global activity feed on dashboard.
→ **Change (Part A)**: new node-pg `/v4/dashboard` (role-aware: super = global
stats + activity feed; admin = school-scoped stats + teachers + recent papers;
teacher = school card + assignments + own papers) and dashboard UI per role.
Existing v3 analytics/audit endpoints stay and feed it.

## 4. Activity log coverage today
`phase3/audit.ts` `record()`; logged today: school/user/template CRUD,
`paper.download` (PDF route), `paper.duplicate`, `paper.<status>`,
v2 governance entries (`paper.generate`, question create/approve/reject,
pattern changes). **Missing** vs spec: "generation started" vs "saved"
distinction and "questions selected" — added by the Phase-4 wrapper.

## 5. PDF pipeline (reuse as-is)
`phase3/pdf.ts` + `paperBranding.ts`: branded A4 PDF, English/Urdu/bilingual,
watermark/header/footer/page numbers, school logo snapshot per paper
(`PaperFormatting.branding`), `GET /v3/papers/:id/pdf` (logged), preview HTML
route. Wizard step 5 reuses these endpoints.

## 6. What Phase 4 adds (summary of the delta)
1. `phase4/candidatesService.ts` — testable `buildCandidateSet(...)`:
   scoped, type-filtered, marks-targeted auto-selection + paginated candidates.
2. `phase4/wizardRoutes.ts` (`/api/v4`): `GET /wizard/scope`,
   `GET /wizard/chapters` (checklist + exercise drill + live counts),
   `POST /wizard/candidates` (paginated pool + server pre-select + shuffle),
   `POST /wizard/generate` (logs `paper.generation_started`,
   `paper.questions_selected`, then delegates to `PaperGeneratorV2`),
   `GET /dashboard` (3-role), plus `POST /catalog/cleanup` (super-only,
   dry-run/apply) driving the Part-B cleanup.
3. Migration `20260911000000_phase4_wizard`: schema sync
   (`User.permissions`, `Paper.schoolId`, `PaperFormatting.branding` into
   schema.prisma) + `Question(chapterId,type,status,isActive)` index for the
   candidates query.
4. Client: new 5-step wizard (`pages/Papers/wizard5/*`) replacing
   `GeneratePaperPage` on `/app/papers/generate`; role dashboards; `api/v4.ts`.
   `PaperDoc`/`PrintSheet` reused; shared helpers moved out of the deleted
   `generate/state.ts`.
5. Tests: `scripts/phase4-wizard.test.ts` (teacher chain, admin chain,
   scope-rejection security cases) + pure unit tests for the pre-select
   algorithm (`scripts/phase4-candidates.test.ts`, DB-free).

Nothing in auth, school management, branding, PDF, analytics or the question
bank is removed or behaviour-changed; all additions are additive and reuse the
existing node-pg + v2/v3 patterns.
