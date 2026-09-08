# PHASE 3 — Technical Summary (§27 deliverable)

Companion to `PHASE3_SPEC.md` and `PHASE3_PLAN.md`. All Phase-3 backend code
lives in `server/src/phase3/` (node-pg, same stack as Phase 2), mounted under
`/api/v3` in `server/src/app.ts` and in the sandbox dev gateway
(`server/scripts/dev-gateway.ts`). Client code is in `client/src` (api/v3,
types, pages/Admin/*, components/papers/PaperBrandingModal).

Status: **backend verified end-to-end against the live gateway; client UI
wired, type-checked and production-built green.** Sandbox limitations (no
Chromium) are stated honestly at the end of each relevant section.

---

## 1. DB changes

No schema migrations were added in Phase 3; Phase-2's node-pg tables already
had the needed columns (`User.schoolId`, `TeacherSubject`, `Paper`,
`PaperFormatting`, `PaperQuestion`, `PaperTemplate`, `School`,
`SchoolLogo`-free logo storage as files). Phase 3 adds **no Prisma changes**;
the schema stays identical (`server/prisma/schema.prisma` untouched by this
phase).

All Phase-3 reads/writes are raw parameterized SQL (`q`/`q1`/`run` in
`src/phase2/db.ts`) — never string-concatenated user input.

Demo seed (`server/scripts/dev-gateway.ts` `ensureFixtures`) creates, when
absent: `PTB Demo` school (id 1), the super admin, demo school admins, and
subject teachers (math/english/physics/chemistry/biology). Seed runs only on
an empty demo database (`SKIP_SEED` respected).

## 2. New backend modules (`server/src/phase3/`)

| File | Purpose |
|---|---|
| `perms.ts` | JWT → permission resolution; `guardPerm`, `superOnly`, module keys `users schools courses books syllabus questionBank paperGeneration generatedPapers analytics settings audit` |
| `schoolService.ts` | School CRUD, status workflow, branding (watermark/header/footer), logo bytes, per-school dashboard counts + recent papers, `schoolSnapshot` |
| `logoStore.ts` | Logo upload validation (PNG/JPG/SVG, ≤2 MB), detection via magic bytes, `schools/:id/logo` GET byte serving with content-type + cache headers |
| `userAdminService.ts` | Paginated user lists w/ SQL school isolation, teacher creation w/ assignment validation, school-admin creation w/ permission set, password reset w/ temp password |
| `templateService.ts` | `PaperTemplate` CRUD: system-level (schoolId null) vs school-level; kind enum; default-flag handling; `forSchool` applicable-list |
| `paperBranding.ts` | Paper-level branding editor (schoolName/headerNote/footerNote/instructions/date/logo-name-contact toggles/watermark/template); persists into `PaperFormatting.branding` snapshot; ownership + `generatedPapers` checks (`canTouchPaper`); `renderContext` for preview/PDF |
| `pdf.ts` | A4 branded HTML builder (school header + logo, watermark, instructions, footer, numbering) + `renderPdf` |
| `audit.ts` | Append-only activity log (user/action/entity/entityId/details JSONB) + scoped list + distinct actions |
| `analyticsService.ts` | SQL aggregates (never ships rows): overview totals, papers-by-status, questions by type/status, activity series (today/week/month/14-day), top schools/teachers/subjects |
| `routes.ts` | The `/api/v3` router (all above exposed) |
| `v2Governance.ts` | Mount-time guard: wraps legacy Phase-1/2 routers so every request still authenticates and Phase-1 admin routes keep old role checks (additive, no rebuild) |

## 3. API surface (`/api/v3`, all Bearer-authenticated)

Schools: `GET/POST /schools`, `GET/PUT/DELETE /schools/:id`, `PATCH
/schools/:id/status`, `POST/DELETE /schools/:id/logo`, `GET/PUT
/schools/:id/branding`, `GET /schools/:id/dashboard`, `GET /schools/mine`.

Users: `GET /users?role=&schoolId=&search=&page=&limit=`, `GET
/users/:id`, `POST /users/teachers` (assignments validated), `POST
/users/admins` (permission set), `PUT /users/:id`, `POST
/users/:id/password-reset` (temp password returned once).

Catalog: `GET /catalog/options` (courses + classes w/ subjects — scoped:
admins see their school, super admin all).

Templates: `GET/POST /templates`, `GET/PUT/DELETE /templates/:id`, `GET
/templates/forSchool`.

Analytics: `GET /analytics/overview`, `/analytics/activity`,
`/analytics/top` (school-scoped for school admins, system-wide for super).

Audit: `GET /audit` (filters: page/limit/action/entity/userId/schoolId/
from/to/search; school admins see only their school's rows — enforced in
SQL), `GET /audit/actions`.

Papers (admin `generatedPapers`; preview also for the owning teacher):
`GET /papers` (filters status/search/schoolId/teacherId/courseId/classId/
subjectId/from/to), `GET /papers/:id/preview` (paper + school + resolved
watermark + branding), `PUT /papers/:id/branding`, `GET /papers/:id/pdf`
(branded A4), `POST /papers/:id/duplicate`, `PATCH /papers/:id/status`.

Response envelope everywhere: `{ success, message, data }` (axios client
reads `res.data.data`).

## 4. Auth / authorization changes

- `GET /api/auth/profile` now returns the **enriched profile** the whole
  client uses: `id, name, email, role, schoolId, schoolName,
  school:{id,name,code,status,logoUrl}, phone, isActive, permissions[],
  subjects[]` (teacher subjects). Verified live via curl for super admin and
  a subject teacher.
- Phase-1 `requireRole('admin'|'super_admin')` middleware unchanged and
  still used by Phase-1 routes (additive). Phase-2 v2 router is wrapped by
  `createV2Governance()`: every request authenticated, teacher scope kept.
- Phase-3 uses `guardPerm(module)`: super_admin passes all modules; a
  school_admin passes only modules in their `permissions[]` (from
  `User.permissions` jsonb); teacher has none of the admin modules. `audit`
  and `analytics` lists are additionally school-filtered in SQL for school
  admins — never trust the client IDs.
- Paper branding/PDF/download/preview: teacher = paper owner only; school
  admin = own school + `generatedPapers`; super admin = all.

## 5. Client changes

New: `client/src/api/v3.ts` (typed client incl. fetch-with-Bearer PDF blob
download so the graceful-501 JSON error surfaces in the toast); Phase-3
types in `types/index.ts` (SchoolV3, UserRowV3, TemplateV3, AuditRowV3,
PaperRowV3, Analytics* payloads, catalog option types, permission labels).

Pages (all wired to real endpoints, filters server-side):
- `SchoolsPage` — list/search/status filter, create/edit modal, status
  workflow chips (active/pending/suspended/archived), logo upload/remove,
  branding defaults, per-school dashboard modal (counts + recent papers).
- `AdminUsersPage` — Teachers/Admins tabs; teacher create with real
  catalog-driven class→subject assignment; admin create with permission-set
  grid; school filter (super only); deactivate/activate; one-time password
  reset prompt.
- `AdminPapersPage` — school(scope)/status/date/search filters; status
  changes, duplicate, branded-PDF download actions.
- `TemplatesPage` — kinds School Exam/Monthly/Mid/Final/Practice/Board,
  system vs school scope, instructions/footer/watermark/header/numbering/
  page-numbers config.
- `AnalyticsPage` — totals, papers-by-status bars, generation activity
  today/week/month + 14-day chart, top schools/teachers/subjects.
- `AdminAuditPage` — activity log w/ action+entity+search filters.
- `PaperDetailPage` — added **Branding** action (opens `PaperBrandingModal`,
  seeded from server preview context incl. school logo/templates), watermark
  overlay rendering when the paper's branding has it enabled, brand saves
  refresh the doc (schoolName/headerNote etc. persist into the paper
  snapshot).
- `DashboardLayout` — permission-aware nav ("Administration" section shows
  only modules the school admin holds; super admin sees all) +
  `RequirePerm` route guard in `App.tsx` per module.

## 6. PDF / print implementation

Server: `pdf.ts` builds the branded A4 document (school name/logo header,
instructions block, per-question marks, watermark via absolute-positioned
logo at configurable opacity/size/position, footers) and calls `renderPdf`.
`renderPdf` requires a Chromium engine (`puppeteer`). In this sandbox no
Chromium can be downloaded (network to storage.googleapis.com is blocked),
so the endpoint answers a **graceful HTTP 501** with a clear JSON message
after fully validating permission/branding, and the client toasts it.
Audit event `paper.download` is recorded only on a real successful render.

Client print path (works everywhere, and what the in-app "Print / PDF"
button uses): `PaperDoc` + `PrintSheet` window.print() with A4 @page print
CSS — format-preserving for English/Urdu/bilingual papers, incl. the
watermark overlay now shown on detail pages when enabled.

Honest statement per §26: in this environment PDF verification covers the
client print path and the server endpoint's authorization/branding handling
+ 501 fallback; real binary PDF output must be exercised where Chromium is
installable (no code path stubs are involved — `renderPdf` genuinely
attempts puppeteer first).

## 7. Storage & uploads

Logos: memory-buffer upload → magic-byte type detection (png/jpeg/svg) →
size cap 2 MB → saved under the server data dir; `logoUrl` on school =
`/api/v3/schools/:id/logo?v=<ext>`; GET serves bytes with correct
Content-Type. No client-supplied extension or path is ever trusted.

## 8. Security notes (§23)

- Every v3 route authenticates; admin modules additionally check
  `permissions[]`; school isolation re-checked in SQL for users/schools/
  templates/analytics/audit/papers/branding.
- Paper actions validate ownership/school before read or write.
- Parameterized SQL everywhere; logo content-type/limit enforced
  server-side; passwords hashed; temp passwords returned once over TLS.
- QA checks run (see below) include negative tests: teacher hitting
  `/v3/users` → 403; school admin seeing another school's rows → empty/403.

## 9. Performance (§24)

All lists paginated server-side (`page/limit`, default ≤ 25), filters pushed
into SQL, dashboard/analytics = COUNT/GROUP BY aggregates; the question bank
continues to never dump rows to the browser. Client sends no unbounded
queries.

## 10. Tests / QA (§26)

- Backend: phase2 regression suites still green (question-bank 27 checks,
  generator 52 checks, pattern 9 fixed, `JWT_SECRET=test-secret` suites),
  `/tmp/v3smoke.mjs` 23/23 backend assertions pass (auth contract, schools,
  users, catalog, templates, analytics, audit, papers list/preview/status,
  permission denials incl. cross-school).
- Live API chain checks: super-admin create school admin w/ permission
  subset → login → scoped schools/users lists → creates teacher w/ real
  class/subject assignment → teacher login → v3 blocked where it should be,
  v2 scope intact. Test users removed after the run.
- Client: `tsc --noEmit` clean; `vite build` production build green
  (2199 modules). E2E UI smoke on the live preview is the remaining
  human-pass (browser automation unavailable in sandbox).

## 11. Demo accounts

Super admin `admin@paktestsolution.com` / `Admin@123456`; subject teachers
`{math|english|physics|chemistry|biology}.teacher@demo.test` /
`Teacher@123456` (school 1, PTB Demo). School-admin accounts are created via
the UI (Users → Admins) with chosen module permissions.
