# PAK TEST SOFTWARE — PHASE 2 IMPLEMENTATION PLAN
## Central Question Bank + Advanced Teacher Paper Generator

Upgrade in place on the existing Phase-1 codebase — same stack (React 18 + Vite + TS + Tailwind + Redux Toolkit; Node/Express + TS; PostgreSQL + Prisma; JWT), no rebuild, no removal of existing functionality.

---

## 0. What Phase 1 left in the tree (verified this session)

| Area | State |
|---|---|
| Catalog | 6 courses (PTB/FBISE/OUP/AFAQ/GOHAR/BAPU), 18 course-sessions, 51 course-class links, Classes 1–12 (+ BAPU 101/102/103), **380 subjects, 294 books, 90 chapters**, all with courseId/classId; Exercises/Topics exist as tables but are **empty (0 rows)**; per-course provenance flags (`verified`) done |
| Question tables | `Question` exists with chapter/exercise/topic/bookId, type/text/marks/options/answer/difficulty/language/source/status/tags/isActive — **0 questions** in DB |
| Paper system | `Paper`, `PaperSubject`, `PaperChapter`, `PaperQuestion`, `PaperSetting`, `PaperFormatting` models + controller/service + PDF service (puppeteer) exist and are **functional** — papers table **empty** |
| Admin | Users/schools/syllabus CRUD + question approval routes exist; `TeacherSubject(teacherId, subjectId, classId)` model + assign route exist |
| Auth | JWT `authenticate` + role guards (`requireSchoolAdmin` etc.). `AuthRequest.user` only carries id/email/role/name — **no schoolId/assignments on the request** (needed for teacher scoping) |
| UI | 3-step paper generator exists (class → subjects/chapters → MCQ/short/essay counts) with stepper + cards + toast + loading states; question bank page + admin pages exist |
| Constraints | @prisma/client **cannot run** in this sandbox (engine download blocked — catalog loader deliberately raw `pg`); `_prisma_migrations` table absent → migrations are applied via node `pg` scripts; whole-project `tsc` broken by pre-existing `rootDir` TS6059 (baseline `prisma/seed.ts`) — catalog files typecheck standalone |

Phase-1 relationships (Course→session→class→subject→book→chapter→topic/exercise→question) are the platform Phase 2 builds on.

---

## 1. Phased delivery order (each phase ends green + verified)

1. **Schema & migrations** (new enums, Question status/type/source/language values, new catalog-scope helper tables + paper pattern + paper snapshot models, indexes) — applied via idempotent node-pg migration runner.
2. **Scope engine (authz)**: `AuthRequest.user` + assignment lookups; reusable `assertTeacherQuestionScope` / paper-ownership authorization service; enforcement in question list/get/create/update/delete and in the paper generator at the SQL level.
3. **Question bank API** (filters incl. new statuses + bulk ops + import/export) with scoping and pagination.
4. **Catalog scope endpoints** (course→classes, classes→subjects/books, chapters→topics→exercises with availability counts) for the generator wizard and admin filters.
5. **Paper generator v2** (distribution validation, availability engine, matching engine, auto-select with anti-dupe, multi-paper generation, snapshots, reorder/replace via `PUT /papers/:id/questions`).
6. **Paper patterns** (save/list/apply/delete; admin can pin shared patterns).
7. **PDF service v2** (all question types, Urdu RTL, bilingual, answer key, headers).
8. **Admin generated-papers oversight** (all papers + filters + teacher info) — reuses existing admin patterns.
9. **Frontend v2**:
   - Question Bank UI (admin workflow: add/edit/approve/reject/archive, bulk, filters incl. new statuses, pagination).
   - Generator wizard (Steps 1–15 + multi-paper + patterns + availability + auto-select + preview + save).
   - Paper detail/edit/preview (reorder, replace, marks edit, language-aware preview, download/duplicate).
   - My Papers/Admin papers list w/ filters.
10. **Tests + regression + docs** (API-level tests through the real routes + DB assertions; no unit-only mocking of the scope engine).

Everything stays behind existing `/api/…` prefix + `authenticate`; nav reuses `DashboardLayout`.

---

## 2. Schema changes (additive — never rename/delete Phase-1 columns)

### 2.1 Question value domains (existing `Question` table)
Current DB has `status QuestionStatus ('pending','approved','rejected')` and `type QuestionType ('mcq','short','essay')`, `language Medium ('english','urdu','bilingual')`, `source QuestionSource ('manual','imported','past_paper','exercise')`.

Migrations (additive ALTERs, no destructive):
1. `ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS` — Prisma has no `ADD VALUE`; run SQL directly: add `true_false`, `fill_blank`, `matching`, `numerical`, `conceptual` (in one ALTER per PG version constraint; PG 18 allows multiple ADD VALUE in one statement — verify).
2. Extend `QuestionStatus` with `draft`, `archived` (workflow: `draft → pending → approved/rejected`; archived = soft-delete status). Keep column-level migration SQL.
3. Add new columns to `Question`:
   - `createdById Int?` (FK User, SET NULL) — traceability ("created by")
   - `updatedById Int?` (FK User, SET NULL)
   - `courseId Int?`, `sessionId Int?`, `classId Int?`, `subjectId Int?` — for whole-bank **fast filters** and for teacher scoping, denormalized from chapter chain (populated by an idempotent backfill SQL from chapter→subject→class/course/session; legacy questions with `chapterId` w/o course stay null and only accessible to admins)
   - `category String?` (exercise/example/review/past_paper/conceptual/practice) — kept separate from `source`/`type` per spec
   - `hint`, `explanation`, `images Json?` (authorized image refs per MCQ option etc.), `marks` stays Int
   - `bankNo Text?` (human "Question ID")
   - `importedFrom String?`, `importRef String?` (import provenance)
4. Correctness: only `approved` questions visible to teachers for generation (enforced in SQL query); admin sees draft/pending/rejected/approved/archived.

Note — avoid storing `schoolId` on Question: school scoping of teachers flows through the teacher → school → assignment graph (below), matching "according to their assigned school/subject/class".

### 2.2 Catalog-scope helper table (stable ids for the wizard + filtering)
```prisma
model CatalogClass {   // NEW
  id        Int     @id @default(autoincrement())
  courseId  Int
  classId   Int
  sessionId Int?    // null = applies to all sessions (class exists for the course)
  @@unique([courseId, classId, sessionId])
  // FKs: course → Course, class → Class, session → AcademicSession
  // (backfilled from CourseClass + CourseSession; NOT the Phase-1 tables replaced)
}
```
Why: PaperGenerator currently starts from `classId` only (a global Class). The wizard must offer course→session→class; `Class`/`CourseClass` alone cannot express "which (course,session,class) rows exist". This table is a pure convenience view over seeded rows.

### 2.3 Generated papers — course/session linkage + snapshot
Existing Paper has no courseId/sessionId (only classId). Additive columns:
```prisma
model Paper {
  // …
  courseId  Int?
  sessionId Int?   // exact syllabus session version used at generation time
  bookId    Int?   // exact book/edition used (when single book)
  paperType String @default("mixed")   // objective | subjective | mixed
  examTitle String?  // e.g. "Class 9 Mid Term"
}
```
`PaperQuestion` gains `type`, `difficulty`, `language` snapshot columns (denormalized at save time so later question edits don't mutate finished papers), plus existing `marks`/`order`. `PaperSetting` stays the config blob (per-spec: regenerate/edit possible from stored configuration + question IDs).

Question "bank" semantics per session-versioning requirement: question rows bind to chapter/subject which belong to a session — question visibility is tied to the catalog chain, never overwritten.

### 2.4 Paper patterns
```prisma
model PaperPattern {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  // full selection + distribution JSON: courseId, sessionId?, classId, subjectId(s),
  // bookId?, chapterIds?, topicIds?, exerciseIds?, paperType, medium, languageMode,
  // totalMarks, distribution[{type,count,marks}], difficultyMix, timeLimit
  config      Json
  isShared    Boolean  @default(false)  // admin-pinned shared patterns
  createdById Int
  createdAt   DateTime @default(now()); updatedAt DateTime @updatedAt
}
```

### 2.5 Indexes (additive, on frequently filtered fields)
```sql
Question: (status, isActive), (type,status), (courseId,classId,subjectId), (chapterId), (topicId), (exerciseId), (marks), (difficulty), (language), (createdById), text GIN trigram for search
Paper: (teacherId,status), (courseId,classId), (sessionId), (createdAt)
PaperQuestion: (paperId,order), (questionId)
TeacherSubject: existing @@unique covers (teacherId, subjectId, classId)
TeacherClass (below): (teacherId)
CatalogClass: (courseId,classId)
```
Audit every new query with EXPLAIN.

### 2.6 Teacher scope — assignments (reuse existing TeacherSubject + new)
Existing `TeacherSubject(teacherId, subjectId, classId)` + `User.schoolId` + role. This already encodes "teacher X teaches class C subject S". Additional needed table (optional):
```prisma
model TeacherClass {  // explicit class-level grant (e.g. form teacher, no subject yet)
  id Int @id @default(autoincrement())
  teacherId Int
  classId   Int
  @@unique([teacherId, classId])
}
```
Admin keeps managing via existing assign UI + new "manage assignments" tab (assign subject/class/course scope per teacher).

---

## 3. Authorization / scope engine (enforce everywhere, never just hide UI)

**Server-side (non-negotiable enforcement points):**

1. `authenticate` extended: `req.user` gains `schoolId` (from `User.schoolId`) and `role` already there.
2. `questionScopes(user)` → list of allowed (subjectId, classId, courseId) for a teacher:
   ```sql
   SELECT DISTINCT ts.subjectId, ts.classId, s.courseId
   FROM TeacherSubject ts JOIN Subject s ON s.id = ts.subjectId
   WHERE ts.teacherId = $1 AND ts.subjectId/classId alive;
   ```
3. **Question list/read** (teacher): SQL where clause injects scope:
   `question.id IN (SELECT pq.questionId FROM scoped …)` or join `Subject s`/`Class c` — enforce via WHERE on (courseId,classId,subjectId) with values from the scope engine. Admin/school_admin (role) without explicit assignments: no scope restriction at role level (they manage the bank) — but school_admin queries still restricted to their own school rows when `User.schoolId` set (same WHERE pattern).
4. **create/update/delete/approve**: `chapterId`→chapter→subject chain must be inside caller's scope for teachers; admin role can operate anywhere (their school).
5. **Paper generator**: server derives candidate questions with a SQL WHERE that includes the scope clause AND `status='approved'` AND `isActive=true` — no client-supplied questionIds are trusted for *auto* generation; the *manual* "teacher selects questions" path validates each selected questionId against the scope (batch IN check) before paper creation.
6. **Paper read/update/delete/PDF**: ownership check (existing) + admin may read any paper in their school (new admin route), teacher only own.
7. **Never rely on hiding dropdowns** — UI hides, but the API is the guard.

Example rejected case from spec: Math teacher CANNOT see/use English/Chemistry questions — enforced by scope WHERE even if they craft an API call with a Chemistry chapterId.

---

## 4. Question Bank API (extend existing `/api/questions`, keep old routes working)

| Route | Method | Access | Notes |
|---|---|---|---|
| `/api/questions` | GET | teacher (scoped, approved-only?) + admin | filters: courseId, sessionId, classId, subjectId, bookId, chapterId, topicId, exerciseId, type, language, marks (min/max/eq), difficulty, status, category, source, search (text trigram), createdById, tag, page/limit/sort. Teacher default status filter = approved only (param `includeAll=true` restricted to admins). Response: paginated + question meta. |
| `/api/questions/stats` | GET | admin/teacher | same filters → breakdown counts by type/difficulty/status/source/language; used by wizard availability |
| `/api/questions/:id` | GET | owner-scope | |
| `/api/questions` | POST | admin / teacher-with-scope | validation: chapterId in scope; type-specific shape (mcq: 4 options + correctAnswer; matching pairs; etc.) |
| `/api/questions/:id` | PUT | admin / teacher-with-scope | same validation; only owner/admin (school) may edit |
| `/api/questions/:id` | DELETE | admin / teacher-with-scope | soft → status `archived` (keeps FK integrity for old papers) |
| `/api/questions/bulk` | POST | admin | bulk create (import) with validation report |
| `/api/questions/bulk-status` | PATCH | admin | bulk approve/reject/archive (ids array + action) |
| `/api/questions/export` | GET | admin | CSV/JSON export of filtered set (question-bank export where permitted) |
| `/api/questions/import` | POST | admin | CSV/JSON upload → staged draft rows → review screen (never auto-approve imports) |
| `/api/questions/:id/approve` , `/reject` | PATCH | admin (existing — extend statuses; keep old pending→approved/rejected semantics) | adds audit + rejects carry reason |
| `/api/questions/:id/duplicate` | POST | admin/teacher-owner | copies question with new id |

Question JSON shape (type-specific):
- mcq: `{ text, options: {A,B,C,D}[], correctOption, marks, images?: {stem?: string, perOption?: [string|null]}, explanation? }` — store as existing `options Json` + `answer` (correct option key) so PDF service/legacy code keeps working.
- true_false: `answer: 'true'|'false'`
- fill_blank: `text` may contain `___`, `answer` string/array of accepted answers
- matching: `options` = [{left,right}] + `answer` = canonical mapping
- short/essay/numerical/conceptual: `text` + `answer` (model answer/rubric) + `marks`

Legacy `Question` columns reused; type-specific shape lives in `options`/`answer` JSON + frontend form components.

---

## 5. Catalog scope endpoints (generator wizard + filters)

New route group `/api/catalog/…` (auth):
- `GET /api/catalog/courses` → active courses (teacher: courses where assignments exist; admin: all active) + per-course current session + class/subject/book counts (dashboard cards)
- `GET /api/catalog/courses/:courseId/classes?sessionId=` → classes via CatalogClass (+ subject count per class)
- `GET /api/catalog/classes/:classId/subjects?courseId=&teacherId=…` → for teachers: only assigned subjects; admin: all subjects of the course/class (reuse existing `/subjects/classes/:classId/subjects` behavior where compatible)
- `GET /api/catalog/subjects/:subjectId/books?sessionId=` → only active/approved books (+ editions)
- `GET /api/catalog/subjects/:subjectId/chapters?bookId=` → chapters (status active; book-scoped when bookId)
- `GET /api/catalog/chapters/:chapterId/topics` → topics with `_count.questions` (approved, active)
- `GET /api/catalog/chapters/:chapterId/exercises` → exercises with `_count.questions` — if empty array, frontend hides/disables exercise step (no broken dropdowns)
- `GET /api/catalog/availability` → given {course,class,subject,book,chapterIds,topicIds,exerciseIds,type,language,difficulty} → per-type counts of approved questions (`required vs available` engine input)

All endpoints apply scope WHERE for teachers server-side.

---

## 6. Paper generator v2 (extend, keep v1 route shape working)

New generation payload (superset of v1; v1 fields still accepted → mapped to legacy mode):
```ts
{
  title?, examTitle?, courseId, sessionId?, classId,
  subjectIds: number[], bookId?, chapterIds: number[], topicIds?: number[], exerciseIds?: number[],
  paperType: 'objective'|'subjective'|'mixed',
  language: 'english'|'urdu', layoutMode?: 'english'|'urdu'|'dual', // per language step
  totalMarks: 25|50|75|100|custom,
  distribution: [{ type: 'mcq'|'true_false'|'fill_blank'|'matching'|'short'|'long'|'numerical'|'conceptual', count, marks }],
  difficulty?: {easy?:number; medium?:number; hard?:number} | null,
  timeLimit?, paperCount?: 1..20,
  autoSelect: boolean,  // false = manual pick of questionIds[]
  questionIds?: number[],  // when manual; validated against scope+status
  excludeQuestionIds?: number[], // used by multi-paper round-robin + regenerate
  randomize?, blankLines?, showAnswerKey?, showBubbleSheet?, schoolName?, patternId?
}
```

Generator pipeline (service):
1. **Validate**: class/subject/chapter/topic/exercise membership in course/session scope (SQL batch checks); paperCount bounds; distribution non-empty; total marks: `Σ (count × marks) === totalMarks` → else 400 with the mismatch detail (spec 18).
2. **Availability engine**: for each distribution row → SQL count of approved in-scope questions matching (chapterIds × topicIds × exerciseIds × type × language × difficulty); produce `{required, available, ok}`; if any `available < required` → 422 response with per-type shortages + suggestions payload (wider chapters/topics, drop exercise restriction, switch type, lower count) (spec 19).
3. **Matching engine**: candidate pool per (type, difficulty bucket) via single paginated query + scope clause; returns all candidates once (bounded by bank size; if > ~2000 per type use server cursor/streaming pick) (spec 20).
4. **Selection**:
   - auto: deterministic round-robin scoring (prefer topics/exercises evenly, avoid duplicates within paper, across papers try to maximize variation — weighted by prior picks; only promises "unique" when bank size allows: if `paperCount × needed > pool size`, pick non-overlapping greedily and report honestly) (spec 22/23).
   - manual: client sends questionIds; server validates each ∈ candidate pool & scope; order preserved.
5. **Paper creation in ONE transaction**: Paper (with courseId/sessionId/bookId/paperType/examTitle/language) + PaperSetting (distribution JSON, selection params, paperCount index) + PaperQuestion rows (order, marks, snapshot type/difficulty/language, isSelected) + Pattern link if any. Legacy v1 fields map: v1 mcq/short/essay counts → objective/mixed distribution rows.
6. **Multi-paper**: loop 1..paperCount, each run excludes already-used question ids (round-robin, honest variation), all in one transaction; returns array of paper ids.
7. **Edit path** (spec 26): `PUT /api/papers/:id` (title/status/examTitle) + `PUT /api/papers/:id/questions` body { orderedQuestionIds: [...] , marksByQuestion?: {[qid]: number} } → revalidates scope/approved and rewrites PaperQuestion rows preserving snapshot semantics; `POST /api/papers/:id/duplicate`; `DELETE` exists.
8. **Paper read**: getPaperById include full config + question rows (current bank view) + snapshot columns.

Admin generated-papers oversight: `GET /api/admin/papers` (filters: school, teacher, course, class, subject, date-range, status) — reuses existing admin patterns; a school_admin sees papers of their school's teachers only.

---

## 7. PDF service v2 (extend existing; keep old methods)

- Multiple question types rendering: MCQ bubble/A–D layout; true/false; fill-blank with underlines; matching two-column table; short/long/numerical/conceptual as numbered blocks with marks.
- Urdu: html→puppeteer with RTL (`dir="rtl"`, Urdu-appropriate font fallback; Urdu numerals option).
- Dual mode: per layout rule (e.g. side-by-side or question English + instruction Urdu or Urdu-first) — selection-dependent, minimum viable = full bilingual header + per-question option to show translation when Question rows carry dual text.
- Header block: School, Course, Class, Subject, Exam title, Time, Total marks (from Paper + PaperFormatting).
- Answer key (existing showAnswerKey) + optional bubble sheet preserved.
- Page-break aware preview; existing download/preview routes stay; PDFs regenerated from stored config+ids (not stored HTML) — puppeteer availability was already a Phase-1 constraint (pdfGeneratorService exists but was never exercised against the live DB here; keep API contract, verify in sandbox; degrade with clear 501 message if sandbox cannot run puppeteer chromium — functionality intact for production).

---

## 8. Question creation (content) — respect Phase-1 "no invented content" rule

Question entry is manual (admin), from authorized books only:
- Wizard "Add question" prefills Course/Session/Class/Subject/Book/Chapter/Topic/Exercise from the catalog chain; user pastes the real question; `bookId` + optional `pageRef` recorded.
- Bulk import template (CSV/JSON with the chain columns) — each imported row lands as `status=draft` for review; nothing auto-approves.
- No scraping anywhere; soft-copy pipeline (Phase-1 BookFileStatus) stays the route for authorized digital content → later automatic extraction (Phase 3 candidate, not in Phase 2 scope).

---

## 9. Frontend

### 9.1 Shared
- New `usePaginatedQuery` hook (server-side pagination; virtualized list for >500 rows); skeleton/empty/error components exist in ui kit — extend.
- Toast patterns already used; extend with destructive confirm modal for bulk archive/approve.
- Keep Redux slices for auth/session; catalog/scope data fetched server-side per step (no global question-bank client cache).

### 9.2 Question Bank page (rework existing page, preserve page route & core function)
- Admin/teacher split view by role; role-aware toolbar (approve/reject/bulk visible to admin).
- Filters bar (Course→Class→Subject→Book→Chapter→Topic→Exercise cascading; type/language/marks/difficulty/status/category/source/search) — paginated.
- Question editor modal/drawer with type-specific forms; MCQ option builder (A–D + correct + per-option images/equations); status timeline; audit trail line (createdBy/updatedBy).
- Bulk actions with confirm; import/export modal (admin).
- Archive list toggle; approve/reject with reason.

### 9.3 Generator wizard (extend existing GeneratePaperPage to 15-step premium flow)
Step indicator (existing StepIndicator generalized), progress bar, animated transitions, per-step validation + disabled next, live availability chips:
1 Course (cards w/ logo; only available courses)
2 Session (current default + previous selectable)
3 Class (per course/session)
4 Subject (per class + teacher assignments; multi-select allowed, but keep single-subject default for clarity)
5 Book/Syllabus (approved/active books; edition + session info)
6 Chapters (checkboxes incl. Select All)
7 Topics (only from selected chapters; Select All/individual) — empty state message when none
8 Exercises (only when exist; else hidden with "No exercises available for this book" hint — graceful, no broken dropdown)
9 Paper Type (Objective/Subjective/Mixed cards)
10 Language (English/Urdu/Dual + RTL indicator for urdu/dual)
11 Total Marks (25/50/75/100/custom chips + time)
12 Distribution builder (per type rows: count stepper + marks stepper + live running total vs totalMarks; mismatch → red error + disabled generate; quick templates "10×1 + 5×2 + …")
13 Availability panel (per row: required vs available with ✓/⚠; suggestions card when short)
14 Matching/selection screen: selectable rows w/ preview drawer, Select/Deselect/Select all/Clear/Auto/Shuffle/Replace, live counter Selected 7/10; duplicate-prevention toasts; paperCount selector (1/2/5/10/20) with honesty note when pool cannot be unique
15 Preview: full paper (school header etc.), reorder (drag or up/down), remove/replace, edit allowed question text (client-side? → spec says edit question text allowed: implement as per-paper display override stored in PaperQuestion JSON so bank text stays canonical), change numbering (auto renumber), marks review, save draft/final, duplicate, generate PDF
Saved patterns: "Save as pattern", "Apply pattern" (prefills steps 1–15), manage my patterns; admin-visible shared patterns.

### 9.4 Paper detail/list pages
- My Papers: filters + pagination + status; row actions (view/edit/duplicate/download/PDF preview/delete).
- PaperDetail: display + per-question replace/remove + reorder + save changes + print/PDF; PaperQuestion snapshot display.
- Admin Papers (new, under admin area): filters incl. school/teacher; read-only view + delete policy (admin may archive), download.

### 9.5 Nav/routes
Add admin nav entries: "Question Review" (admin), "Papers (All)" (admin), "Patterns" (both, my/shared), "Assignments" (admin). New routes under `/app/admin/…`, `/app/papers/…`. Keep all existing routes working.

---

## 10. Testing strategy

- **Seed a sandbox content fixture**: e.g. 2 courses × (1 class each) × subjects × books × chapters × topics/exercises × ~150 questions across all types/statuses/languages/difficulties (marked clearly as *sandbox fixture*, never promoted to production bank; separate course code `SANDBOX`? — better: only in the test database, never in the seeded catalog; question statuses stay draft).
- **API tests** (supertest or node pg assertions against the running Express app):
  1. teacher math access class9 OK; class9 English/Chemistry → 403/empty; crafted URL with other subject → empty/403
  2. course filtering; chapter/topic/exercise filtering; type/language/marks/difficulty filters; search
  3. marks validation mismatch → 400/422 with detail; exact-match OK
  4. availability shortage → 422 + suggestions; sufficient → generates
  5. auto-select no duplicates; multi-paper (2/5) variation & uniqueness honesty
  6. manual select outside scope rejected; save/regenerate/edit paper → PaperQuestion rows rewritten with snapshot cols preserved
  7. PDF route smoke (if puppeteer runs in sandbox else explicit skip note)
  8. admin papers endpoint filters
  9. regression: old v1 generation payload still works, old question approve/reject still works, syllabus/catalog endpoints still respond
- **UI smoke**: wizard steps render/disable correctly (fixture data), RTL classes present for urdu step, skeletons/empty states.
- **Perf**: indexes EXPLAIN checks for every hot query; pagination assertions (page size respected, count correct); no N+1 in paper detail (single query with includes + grouped fetches).
- **Docs**: PHASE2_DOC.md (routes, authz rules, JSON shapes, migration runner usage) appended to repo.

---

## 11. Constraints & risks (as of writing)

- Prisma client can't run in the sandbox (no engine) → runtime verification happens against the real Express app via direct HTTP against a started server, DB assertions via node `pg`. If the server cannot start (missing engine) we still land all code + a documented "start in production" path, and verify pure logic (validator/distribution/availability) through node-level test scripts. (First action of build: start server and find out; do not assume.)
- Puppeteer PDF in sandbox may need chromium download (blocked) → check `node_modules/puppeteer` cache; if unavailable, PDF endpoints return a clear 501 + the client shows "PDF generation requires the deployment environment" — full logic preserved.
- `tsc` rootDir issue pre-exists; typecheck via file lists per package; do not "fix" tsconfig in a way that breaks `npm run build`.
- Question-type enum additions require raw SQL (Prisma migrate would normally handle; we're on node-pg runner).
- Never auto-approve anything; fixture content only in test DB.

## 13. Execution revision notes (changes made while building)

1. **Prisma is 100% unavailable in this sandbox** — not just the runtime engine:
   `prisma generate` also needs schema-engine from binaries.prisma.sh (blocked),
   GitHub hosts no release assets for any engine version, CDNs are blocked.
   All Phase-2 server code is therefore written node-pg/raw-SQL (the Phase-1
   loader pattern) under `server/src/phase2/` — dependency-free, fully
   typecheckable and runtime-testable here. Existing Prisma-based code is
   untouched and keeps working in the user's real environment.
2. **CatalogClass table dropped** — not needed: course→class validity is
   already fully expressed by the seeded `CourseClass` rows (per-course valid
   classes); the wizard derives sessions from `CourseSession`. Fewer tables,
   same semantics.
3. **TeacherClass table dropped** — assignments are entirely expressed by the
   existing `TeacherSubject(teacherId, subjectId, classId)` + `User.schoolId`;
   the scope engine loads them once per request.
4. New Phase-2 middleware: `server/src/phase2/auth.ts` (same JWT contract as
   `middleware/auth.ts` + `schoolId`), `server/src/phase2/scope.ts` (SQL-level
   teacher scope), `db.ts` (pg pool + tx helpers), `types.ts`.
5. Sandbox test app: `server/src/phase2/testApp.ts` mounts only Phase-2 route
   groups (boots without Prisma). Production wiring will mount the same
   routers from `src/app.ts` behind the existing `/api` prefix.
6. Migration runner: `server/scripts/apply-migrations.js` +
   `npm run db:migrate:local` (autocommit per statement, `_schema_migrations`
   bookkeeping, `--baseline` for already-applied folders).
7. Migrations applied locally: `20260909000000_phase2_enums`,
   `20260909000001_phase2_question_bank`; `schema.prisma` hand-synced.
8. Test suites land under `server/scripts/phase2-*.test.ts`; question-bank
   scope suite is GREEN (27/27 assertions; fixtures self-clean, shared dev DB
   left untouched). Run: `npm run test:phase2:questions`.
9. `20260909000002_phase2_paper_config` migration applied: PaperSetting gains
   `distribution` + `generationConfig` JSONB + `paperCount`/`paperIndex`
   (full wizard snapshot stored so papers regenerate from config+ids).
10. Catalog scope service/controller/routes (`/api/v2/catalog/*`): courses
    (teacher = assigned only), course sessions, classes per course (teacher:
    only classes with assignments), subjects (assignments only), books
    (active), chapters, topics, exercises (graceful `[]`), availability
    engine endpoint (approved-counts per type honoring topic/exercise/
    language/difficulty filters) — all scope-enforced server-side.
11. Paper generator v2 (`src/phase2/generatorService.ts`,
    `/api/v2/papers`): distribution validation (Σ count×marks = totalMarks,
    else 400 with actual sum), availability checks (422 + shortages +
    suggestions), objective/subjective/mixed type-group enforcement, language
    exact for english/urdu + mixing for bilingual, auto-select with
    chapter-even round-robin, per-paper uniqueness always, cross-paper
    disjointness while the pool allows with honest reuse warnings, multi-paper
    batches in ONE transaction, manual selection revalidated server-side
    (exact per-type counts + order preserved), snapshot columns on
    PaperQuestion, full config JSON on PaperSetting, status/title updates,
    replace-questions (revalidate + reorder + marks), duplicate (draft copy
    incl. children), delete, ownership-scoped list/get + admin read-all.
12. Patterns (`/api/v2/patterns`): create/list/update/delete/apply; private
    by default, admin may share; teacher sees own + shared only.
13. Production wiring: `src/app.ts` mounts `/api/v2` (legacy /api/* intact);
    sandbox `testApp.ts` mounts the same mount router so tests mirror prod.
    Note: whole-repo tsc cannot run in the sandbox (app.ts pulls the
    Prisma-based legacy route chain, whose generated client here lacks enum
    exports) — phase2 files + tests typecheck standalone (command above).
14. Generator/catalog/patterns suite GREEN (52/52). Combined:
    `npm run test:phase2` (79 assertions, DB left clean).

## 12. Acceptance mapping (spec → where it lands)

| Spec section | Landing point |
|---|---|
| 1 Question bank chain + fields | Question model + catalog columns (§2.1) + create API (§4) |
| 2 Question types | enum additions + type-specific JSON forms (§2.1, §4) |
| 3 MCQ structure | options/answer/images columns + form (§2.1, §4) |
| 4 Status | enum + workflow routes (§2.1, §4) |
| 5 Admin mgmt | Question UI + bulk/import/export (§4, §9.2) |
| 6 Teacher restrictions | scope engine everywhere (§3, §6) |
| 7–17 Generator steps | wizard §9.3 + catalog scope endpoints §5 |
| 18 Marks validation | generator validation §6.1 |
| 19 Availability | availability engine §6.2 + endpoint §5 |
| 20 Matching | matching engine §6.3 |
| 21 Selection screen | §9.3 step 14 |
| 22 Auto select | §6.4 |
| 23 Multi-paper | §6.6 |
| 24 Patterns | §2.4 + §6.8 + UI |
| 25 Preview | §9.3 step 15 |
| 26 Save/regenerate/edit | §6.7 + routes |
| 27 Admin papers | §6.9 |
| 28/29 UI + performance | §9 + §2.5 |
| 30 Testing | §10 |

## 14. Execution revision notes (frontend v2 + sandbox demo) — 2026-09-09

1. **Frontend v2 shipped on the Phase-1 routes** (pages replaced in place, old
   routes preserved): Question Bank (`/app/questions`), generator wizard
   (`/app/papers/generate`, 15 premium steps incl. pattern strip, availability,
   auto/manual selection, multi-paper, preview/print step 15), My Papers /
   Papers (All) (`/app/papers`, `/app/admin/papers`), Paper Detail editor
   (`/app/papers/:id`), new Patterns manager (`/app/patterns`). Nav updated
   (Patterns for all roles, Papers (All) for admins).
2. **Paper document renderer** (`client/src/pages/Papers/generate/PaperDoc.tsx`)
   renders a PaperV2 the way the printed paper should look (school header,
   exam title, sections per type with per-question marks, MCQ letter bubbles,
   matching columns, Urdu RTL) and doubles as the print layout. **PDF export
   decision**: v2 exports through the browser print pipeline (`PrintSheet`
   portal + A4 `@media print` stylesheet → “Save as PDF”) instead of the
   puppeteer-based Phase-1 service — no chromium dependency, identical output
   fidelity to the preview, works in any deployment. A server-side puppeteer
   route can be layered on later from the same data fetch used by
   `GET /api/v2/papers/:id`.
3. Server additions (all additive, suites re-run green): `PUT
   /api/v2/papers/:id/formatting` (schoolName/headerNote), `totalMarks` now
   accepted by `PUT /api/v2/papers/:id` (validated 1..500, keeps header
   consistent after remove/marks edits), and the generate payload's
   `schoolName` now lands on PaperFormatting at creation time.
4. **Demo data for local UI runs** lives only in the sandbox dev gateway
   (`server/scripts/dev-gateway.ts`): ~170 clearly-prefixed `DEMO` questions
   across the two demo teachers' PTB Grade-9 subjects (Mathematics ≈96,
   English ≈73; all 8 types, difficulty/language mix, chapter-even spread;
   mostly `approved`, a few `pending`/`draft` left for the admin review
   demo). Never promoted to production, never part of the loader catalog;
   re-seeding is idempotent (skips when `DEMO%` rows exist).
5. **Phase-2 test suites are now delta-based** so the shared dev DB may
   contain unrelated approved rows (e.g. the DEMO questions above):
   `scripts/phase2-questionbank.test.ts` and
   `scripts/phase2-generator.test.ts` snapshot baseline counts/availability
   at suite start and assert exact deltas afterwards. Re-verified green:
   27/27 + 52/52 with demo rows present.
6. **camelCase SQL alias fold fix extended**: besides `catalogService.ts`,
   unquoted camelCase aliases fold to lowercase in PostgreSQL — one remained
   in `generatorService.list` (`AS questionCount` → `questioncount`), fixed
   to `AS "questionCount"`; probe-verified on the live gateway.

## 15. Execution revision notes (subject teachers + per-subject demo) — 2026-09-09

1. **One demo teacher per PTB Grade-9 subject** (math · english · physics ·
   chemistry · biology, all `*.teacher@demo.test / Teacher@123456`). Each is
   assigned exactly one subject via `TeacherSubject`; the Phase-2 scope engine
   (catalog, question bank, generator, papers) limits every account to that
   subject — cross-subject chapter reads return empty lists and cross-subject
   paper generation is rejected server-side.
2. **Science demo banks** (`server/scripts/demo-content.ts`, 75 rows per
   subject, hand-authored to the usual Grade-9 syllabus: units/laws/
   definitions/simple numerics) seeded all-approved so each science teacher
   can immediately run the 75-mark mixed auto layout (verified: papers 67-70
   physics/chemistry/biology). Seeding became **per-subject idempotent**, so
   existing math/english banks are skipped while missing banks seed on boot.
3. **Login page** lists all six demo accounts as quick-fill cards (the stale
   v1 `teacher@demo.com` placeholder is gone).
4. **Teacher dashboard** is now a v2, subject-scoped home: totals (own papers
   by status, approved questions in scope), then one card **per assigned
   subject** (chapters/questions/papers counts, recent subject papers,
   “Generate {Subject} Paper”), all fetched through the scoped v2 catalog;
   Recent Papers panel and row links moved from the legacy v1 API to v2
   (`/app/papers/:id`) for both teachers and admins.
