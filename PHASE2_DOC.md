# PHASE 2 — Route & Contract Documentation (question bank + paper generator v2)

Companion to `PHASE2_PLAN.md`. Everything below is implemented in
`server/src/phase2/` (node-pg, no Prisma) and mounted under `/api/v2` by the
same mount router used in production `src/app.ts` and the sandbox test app.

---

## Auth

All `/api/v2/*` routes require `Authorization: Bearer <JWT>` signed with
`JWT_SECRET` (see `src/phase2/auth.ts`). `req.user` = `{ id, email, name,
role, schoolId }`. Roles: `super_admin` | `school_admin` | `teacher`.

**Teacher scope (enforced in SQL everywhere, never only in UI):** teachers see
only rows belonging to subjects assigned via `TeacherSubject(teacherId,
subjectId, classId)` (+ `User.schoolId`). Out-of-scope reads 404/empty;
out-of-scope writes 403.

## Catalog scope (wizard data)

| Route | Notes |
|---|---|
| `GET /v2/catalog/courses` | teacher: assigned courses only; `currentSession` per course |
| `GET /v2/catalog/courses/:courseId/sessions` | session rows of the course |
| `GET /v2/catalog/courses/:courseId/classes` | classes valid for the course |
| `GET /v2/catalog/classes/:classId/subjects?courseId=` | teacher: assignments only |
| `GET /v2/catalog/subjects/:subjectId/books?sessionId=` | active books |
| `GET /v2/catalog/subjects/:subjectId/chapters?bookId=` | active chapters (+ approved/total counts) |
| `GET /v2/catalog/chapters/:chapterId/topics` | `[]` when none (UI shows skippable empty state) |
| `GET /v2/catalog/chapters/:chapterId/exercises` | `[]` when none |
| `GET /v2/catalog/availability?chapterIds=&topicIds=&exerciseIds=&language=&difficulty=` | `[{type, available}]` — approved, in-scope |

JSON keys are camelCase (SQL aliases double-quoted — unquoted camelCase
aliases fold to lowercase in PostgreSQL).

## Question bank

`GET /v2/questions` filters: `page, limit, search, courseId, sessionId,
classId, subjectId, bookId, chapterId, topicId, exerciseId, type, language,
marksEq, marksMin, marksMax, difficulty, status, category, source, tag,
sortBy, sortDir`. Teachers default to **approved only in their own scope**
(no status filter = approved); admins may pass any status.

`POST /v2/questions` body: chapter chain + `type` (mcq | short | essay |
true_false | fill_blank | matching | numerical | conceptual — `long` is
accepted as `essay`), `text`, `marks`, `options` (array or `{A:…}` for mcq,
`{pairs:[{left,right}]}` for matching), `answer`, `difficulty`, `language`,
`source`, `status` (admin), `tags`, `category`, `bankNo`, `hint`,
`explanation`, `images`, `pageRef`. Teacher-created rows always land as
`draft`; only admins approve/reject. Workflow: `draft → pending → approved /
rejected`, `archived` = soft delete.

Bulk/ops: `PATCH /v2/questions/bulk-status` `{ids, status, reason?}`,
`POST /v2/questions/bulk` (import, rows → `draft`), `GET /v2/questions/stats`,
`GET /v2/questions/export?format=csv|json`, `GET/PUT/DELETE /v2/questions/:id`,
`PATCH /v2/questions/:id/approve`, `PATCH /v2/questions/:id/reject`
(reason), `POST /v2/questions/:id/duplicate`.

## Paper generator v2

`POST /v2/papers` (generate 1..N in one transaction):

```jsonc
{
  "title?": string, "examTitle?": string, "description?": string,
  "courseId?": number, "sessionId?": number,
  "classId": number, "subjectIds": number[], "bookId?": number,
  "chapterIds": number[], "topicIds?": number[], "exerciseIds?": number[],
  "paperType": "objective"|"subjective"|"mixed",
  "language": "english"|"urdu"|"bilingual",
  "totalMarks": 1..500,
  "distribution": [{ "type": QuestionType, "count": number, "marks": number, "difficulty?": "easy"|"medium"|"hard"|"any" }],
  "timeLimit?": 10..240 (default 90), "paperCount?": 1..20 (default 1),
  "autoSelect": boolean,           // false ⇒ questionIds below
  "questionIds?": number[],        // manual; server re-validates scope+status+per-type counts+order
  "schoolName?": string            // stored on PaperFormatting
}
```

Validation: type groups per paperType; `Σ(count × marks) === totalMarks`
(400 with mismatch detail otherwise); chapters ⊆ subjects; topics/exercises ⊆
chapters; book ∈ subjects & session consistent; teacher scope pairwise.
Availability shortfall → **422** `{details:{shortages, available, required,
suggestions}}`. Auto-select = chapter-even round-robin, per-paper uniqueness
always, cross-paper disjointness while the pool allows (else honest reuse
warnings). Papers persist as `draft` with `PaperQuestion` snapshot columns
(type/difficulty/language), `PaperSetting.distribution/generationConfig`
(full wizard state) and `PaperFormatting`.

Other paper routes: `GET /v2/papers` (teacher: own only; admin: all +
filters `status/courseId/classId/subjectId/search/from/to`, paginated),
`GET /v2/papers/:id` (full: subjects/chapters/questions/settings/formatting),
`PUT /v2/papers/:id` (`title/examTitle/description/status/totalMarks`),
`PUT /v2/papers/:id/questions` (`{questionIds, marksByQuestion}` — replaces
set/order/marks with server re-validation), `PUT /v2/papers/:id/formatting`
(`schoolName/headerNote`), `POST /v2/papers/:id/duplicate` (draft copy incl.
children), `DELETE /v2/papers/:id`. Statuses: `draft | final | archived`;
final papers are read-only by UI convention.

## Patterns

`GET/POST /v2/patterns`, `GET/PUT/DELETE /v2/patterns/:id`. Teacher sees own
+ shared; private by default; admin may share/unshare any pattern. `config`
JSON stores the full wizard state so the UI can pre-fill all steps.

## PDF / print (v2)

Phase 2 exports PDFs **client-side**: `PaperDoc` renders the exact paper
document; the `PrintSheet` portal + `@media print` A4 stylesheet let the
browser “Save as PDF”. See PHASE2_PLAN §14.2 for the decision notes.

## Sandbox dev gateway (never for production)

`server/scripts/dev-gateway.ts` (node-pg re-implementation of the auth
contract) + real `/api/v2` mount. Seeds admin + two demo teachers + ~170
`DEMO`-prefixed questions into the local dev DB.

```bash
# gateway
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db \
JWT_SECRET=dev-gateway-secret-change-me \
npx ts-node --transpile-only scripts/dev-gateway.ts        # :5000
# client (proxies /api → :5000)
cd client && npm run dev                                    # :5173
```

| login | password | role / scope |
|---|---|---|
| admin@paktestsolution.com | Admin@123456 | super_admin (all subjects) |
| math.teacher@demo.test | Teacher@123456 | teacher · PTB Grade 9 Mathematics |
| eng.teacher@demo.test | Teacher@123456 | teacher · PTB Grade 9 English |
| physics.teacher@demo.test | Teacher@123456 | teacher · PTB Grade 9 Physics |
| chemistry.teacher@demo.test | Teacher@123456 | teacher · PTB Grade 9 Chemistry |
| biology.teacher@demo.test | Teacher@123456 | teacher · PTB Grade 9 Biology |

**One teacher per subject.** Teacher accounts are bound through
`TeacherSubject` and the Phase-2 scope engine, so each teacher's dashboard,
catalog, question bank and paper generator are limited to **their own subject
only** — e.g. the English teacher can only see English chapters/questions and
can only generate English papers (verified: cross-subject chapter reads return
empty and cross-subject generation is rejected with
“Some chapters do not belong to the selected subjects”). Urdu-medium
duplicates and subjects without chapter data yet (Urdu, Islamiyat, Pakistan
Studies, Computer Science, Tarjuma-tul-Quran) have no demo teacher until
their content exists — the seeder creates accounts per subject automatically.

Sandbox demo banks: Mathematics 96 + English 73 (rotating status mix incl.
pending/draft for the admin review demo) + Physics/Chemistry/Biology 75 each
(all approved), sourced from `server/scripts/demo-content.ts`. Re-seeding is
idempotent **per subject** (`count(*) WHERE "subjectId"=$1 AND text LIKE
'DEMO%'`); math/english already present are skipped, missing banks are
seeded on next boot.

Demo rows are sandbox-only; they never touch the production loader catalog.
Before re-running the Phase-2 API suites against a database that contains
them, no action is needed — the suites are delta-based since 2026-09-09
(27 question-bank + 52 generator assertions):

```bash
cd server && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db \
JWT_SECRET=test-secret npm run test:phase2
```
