# PHASE 4 — Technical Summary

The 15-step paper wizard is replaced by a 5-step flow, the dashboard splits
into three role homes, the Super Admin gets a course master + a verified-only
syllabus-structure import, and the catalog tooling guarantees the single-copy
rule (loader guard + prod-DB dedupe + question retag/orphan report).

Status: **client type-checked + production-built green; owned server code
type-clean; catalog JSON valid. DB-gated steps (migrations already applied in
Phase 3, `test:phase4`, dedupe/retag `--apply`) remain CI/prod-only — the DB
was unreachable from this sandbox.**

Branch: `arena/01a086ea-pak-test-solution` (uncommitted Phase-4 tree at time
of writing; see §10).

---

## 1. DB changes

No new migrations. Phase 4 adds **no Prisma schema changes** — the working
tree's `schema.prisma` diff (User.permissions, Paper.schoolId,
PaperFormatting.branding) belongs to migration `20260910000001` from Phase 3.

All new reads/writes are raw parameterized SQL (`q`/`q1`/`run`/`withTx` in
`src/phase2/db.ts`) — never string-concatenated user input.

## 2. New backend modules

| File | Purpose |
|---|---|
| `server/src/phase3/courseService.ts` | Course master: list/get/create/update, per-course session status (exactly one `current` enforced in-tx), class link/unlink; code immutable; archive-not-delete; unlink refused (409) while active subjects exist; every write audited |
| `server/src/phase3/syllabusService.ts` | Chapter/exercise structure import: verified-books-only gate (422 otherwise), exact-content upsert matched by number-else-name, new chapters land `verified=false`, one transaction, audited as `syllabus.import` |
| `server/src/phase2/generatorService.ts` (§preview-pool) | `previewPool()` — paginated candidate pool for wizard Step 4: scope-filtered rows + `total` + `countsByType` + `suggestedIds` + `suggestedRows` (unique exact-count suggestion honoring language/difficulty/breakdown) |
| `server/scripts/phase4-catalog-dedupe.ts` | Prod-DB dedupe (Part B): archives superseded ACTIVE Book copies per (course, subject, class); current-session copy wins; different-title groups flagged `review` and never auto-archived; dry-run default, `--apply` in one tx, `--out=report.json` |
| `server/scripts/phase4-question-retag.ts` | Backfills Question catalog chain (subject/class/course from Chapter, session from Book) + orphan report (chapter/subject missing/inactive — listed, never auto-deleted/moved); dry-run default, `--apply` in one tx |
| `server/scripts/phase4.test.ts` | Behavioral suite (see §9); `npm run test:phase4` |

`server/prisma/catalog/loadCatalog.ts` gained the **single-copy guard**: when
seeding, active Book siblings sharing one (course, subject, class) are
collapsed to a single copy (current-session wins) and reported via
`singleCopyWarnings`/`singleCopyConflicts` (surfaced by `seed.ts` output and
`db:catalog:validate`).

`server/tsconfig.json` now includes `src/**/*` only (seeds/prisma helpers are
ts-node-only, type-checked standalone) — nothing in `src` imports from
`prisma/`, so this changes no build input.

## 3. API surface

v2 (all Bearer-authenticated, teacher scope enforced server-side — crafted
chapter/subject ids outside assignments 403):

- `POST /v2/papers/preview-pool` → `{ rows, total, page, limit, countsByType, suggestedIds, suggestedRows }`. Nothing persisted. Teachers see assigned scope only; admins unscoped.
- `POST /v2/papers` (generate) — unchanged contract, but the server stamps the course's **current session** when `sessionId` is omitted (the wizard no longer sends one) and logs `paper.generate`.

v3 course master (reads need `courses` perm; **all writes super_admin-only** + audited):

- `GET /v3/courses` (counts + current session), `GET /v3/courses/:id` (sessions + classes)
- `POST /v3/courses`, `PUT /v3/courses/:id` (code immutable)
- `PUT /v3/courses/:id/sessions` (`{ sessionId, status, notes? }`, upserts the link)
- `POST /v3/courses/:id/classes` (`{ classId }`), `DELETE /v3/courses/:id/classes/:classId` (soft-deactivate; 409 with active subjects)
- `GET /v3/sessions` (global session list for the picker)

v3 syllabus import (super_admin + `syllabus` perm):

- `POST /v3/syllabus/chapters/import` `{ bookId, subjectId?, chapters: [{ number?, name, description?, sourceRef?, exercises? }] }` → created/updated counts. 422 on unverified book, 400 on bad payload, one transaction.

## 4. Auth / authorization changes

No new roles or permission keys. Reuse: `guardPerm('courses' | 'syllabus' |
'analytics' …)` for reads, `superOnly` for course/syllabus writes. The client
mirrors the guards (write buttons hidden for non-super-admins; sections
degrade to quick links on 403) but the server is the source of truth.

## 5. Client changes

**5-step wizard** (`client/src/pages/Papers/Generate/`, route
`/app/papers/generate` preserved). Old 15-step page + `generate/` dir
deleted; `PaperDoc`/`wizUI` moved to `Papers/shared/` (with new
`shared/paperUtils.ts`: labels, distribution helpers, option/answer
helpers) and all consumers rewired.

| File | Step |
|---|---|
| `wizard5.ts` | State core: scope/chapters/build/selection/review, breakdown presets, payload builders (single subject, `paperCount: 1`, no sessionId), pattern save/apply (old pattern configs still apply) |
| `steps/ScopeStep5.tsx` | 1 — Course → Class → Subject → Book cascade; single book auto-picked; backfills lists when a pattern pre-fills the scope |
| `steps/ChaptersStep5.tsx` | 2 — chapter checkboxes + live counts, select-all, exercise drill-in (any selected exercise narrows scope) |
| `steps/TypeMarksStep5.tsx` | 3 — paper-type cards, language, marks/time steppers, titles/notes, breakdown rows + one-click presets with live Σ guard |
| `steps/QuestionsStep5.tsx` | 4 — auto-pick review, per-type tabs + caps, swap/add/remove, shuffle-a-fresh-mix, keyword search, paginated pool; teacher edits survive step revisits (fill-anchor in state) but rebuilds re-suggest |
| `steps/ReviewStep5.tsx` | 5 — branded `PaperDoc` preview, answer-key toggle, heading edits, duplicate, Print/PDF sheet, save details, mark final, adjust-selection |
| `GeneratePaperPage5.tsx` | Shell: 5-stop rail, patterns strip + save modal + `?pattern=` deep link, generate with shortage-aware errors |

Patterns saved by either wizard apply to the new one (multi-subject configs
take the first subject — the wizard is single-subject by design; the backend
keeps multi-subject support and topics stay in the API, hidden from the UI).

**Dashboards** (`/app/dashboard` routes by role; Phase-1 `adminApi` stats
removed):

- Teacher — unchanged per-subject home + recent papers + shortcuts.
- `SchoolAdminHome.tsx` — school strip (teachers/papers/activity), draft/final stats, recent school papers, perm-gated manage links; degrades gracefully without the analytics perm.
- `SuperAdminHome.tsx` — platform totals, catalog strip (links into the masters), generation activity chart, top schools/teachers, latest audit entries, papers-by-status + pending-approval nudge, full shortcut rail.
- `dashUI.tsx` — shared StatCard/QuickLink/SectionHead.

**Course master** (`pages/Admin/CoursesPage.tsx`, route
`/app/admin/courses`, `RequirePerm courses`, nav item): course list with
counts + current session; edit form (code immutable); session link/status
manager (one-current rule explained inline); class link/unlink with active-
subject guard messaging. School admins with the `courses` perm get a
read-only view; writes are super-admin-only.

**Syllabus import UI** (`SyllabusPage`, super-admin only): “Import structure”
opens a JSON modal targeting the selected book, with the verified-only /
no-invented-content rules stated inline; result toasts created/updated counts
and refreshes the chapter list.

**API/type additions**: `PreviewPoolPayload/Result/Candidate`,
`CourseAdminV3/DetailV3`, `AcademicSessionV3`, `ChapterImportResultV3`;
`v2.papers.previewPool`, `v3.courses.*` (+`sessions()`), `v3.syllabus.
importChapters`.

## 6. PDF / print

Unchanged mechanics: review Step 5 and the detail page reuse `PaperDoc` +
`PrintSheet` (print CSS, answer-key toggle). School branding/audit/PDF
pipelines from Phase 3 are untouched.

## 7. Storage & uploads

None added. Dedupe/retag reports are local JSON via `--out=` (never
committed).

## 8. Security notes

- Wizard sends no session and no trustable scope: chapters/subjects are
  re-validated against `TeacherSubject` on preview-pool and generate (403 on
  mismatch); tests cover crafted-id attacks.
- Course/syllabus writes are super-only at route + service level; the client
  only hides buttons.
- Syllabus import cannot fabricate catalog content: verified-book gate, exact-
  payload upsert, new rows unverified, single transaction, audit-logged.
- Dedupe/retag are dry-run by default, archive/backfill only (no hard
  deletes), single-transaction `--apply`, and print every decision.

## 9. Tests / QA

- `npm run test:phase4` (DB-gated, CI/prod-only): teacher scoped-catalog →
  pool counts/pagination/suggestion → session auto-attach → reselect → save;
  admin unscoped pool + cross-subject generate; scope-attack 403s; 400/422
  validation; `paper.generate / paper.questions.select / paper.save` audit;
  **new**: syllabus-import 200/idempotent-re-import/422-unverified/403-
  teacher/400-empty + `syllabus.import` audit. Fixtures self-clean (`P4FIX`
  band, verified by post-run count).
- `DATABASE_URL=dummy db:catalog:validate` → catalog valid (only the
  pre-existing secondary-mirror warnings).
- Client: `tsc --noEmit` clean; `npm run build` succeeds (pre-existing
  >500 kB chunk warning only).
- Server `tsc --noEmit`: 29 errors, all pre-existing legacy v1 files failing
  on the ungenerated `@prisma/client` stub (fresh offline install) — zero in
  `phase2/`, `phase3/`, or `scripts/` (verified by per-file error census).
  Fix is `prisma generate` with network in CI/prod, not code edits.
- `scripts/*` + catalog files additionally pass a standalone strict-ish tsc
  invocation (see §10 notes).

## 10. Sandbox notes / limits

- DB unreachable here: `test:phase4`, dedupe/retag `--apply`, and any live
  endpoint verification must run where `DATABASE_URL` resolves.
- No Chromium: wizard/dashboards/masters verified by type-check + production
  build only, not click-through.
- Standalone check used for DB-less files:
  `tsc --noEmit --skipLibCheck --esModuleInterop --target es2020 --module commonjs scripts/phase4*.ts prisma/catalog/loadCatalog.ts prisma/catalog/seed.ts` → exit 0.
