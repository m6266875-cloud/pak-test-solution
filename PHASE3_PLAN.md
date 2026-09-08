# PAK TEST SOFTWARE — PHASE 3 KICKOFF PROPOSAL (draft, awaiting scope confirmation)

Everything in Phases 1–2 is green and demoable in the sandbox. Phase 3 has no
written spec yet in the repo, so this document proposes candidate modules
(ordered by recommended delivery) derived from what Phases 1–2 deferred plus
what the app naturally needs next. **Nothing here is built until you pick the
scope** — this file is the proposal, not a plan of record.

---

## Where we stand (end of Phase 2, 2026-09-09)

- Central question bank v2 (admin approve/reject workflow, filters, CSV export).
- Catalog-scope engine: teacher ↔ subject/class assignments enforced in SQL.
- Premium 15-step paper generator wizard (auto + manual, patterns, multi-paper,
  live preview/print), My Papers / Paper detail editor / Papers (All) admin.
- Demo: one login per subject — Math, English, Physics, Chemistry, Biology —
  each teacher locked to their own subject (catalog + generation verified).
- Test suites green (27 question-bank + 52 generator assertions, delta-based).

## Candidate modules for Phase 3

### A. Teacher & assignment management in the UI (recommended first)
School admins currently can't create teachers or assign subjects from the app
(the demo teachers are seeded by the dev gateway). Phase 3 would add a
first-class admin area: invite/create teacher accounts, pick course → class →
subject(s), list/revoke assignments, reset passwords. This also makes the
"one teacher per subject" story a runtime feature rather than a seed.

### B. Server-side PDF + OMR answer sheets
Phase 2 ships paper documents through the browser print pipeline. Phase 3
option: real server-side PDF endpoint (paper → PDF via headless renderer) for
batched board-style printing, plus optional MCQ bubble/OMR answer sheets and
answer-key booklets. (Requires deciding the rendering dependency; sandbox
chromium availability is a constraint to verify first.)

### C. Exam runs & paper distribution
Take generated papers into "exam batches": bundle papers by class/date/session,
print packs with cover sheets, track draft→final→distributed state, per-paper
QR/barcode for verification. Fits schools that print many variants per exam.

### D. Reports & analytics
Teacher: subject usage, chapter coverage, paper history. Admin: question-bank
health, per-subject generation volumes, most-used patterns, duplicate-content
spot checks. Urdu/bilingual rendering polish included here if needed.

### E. Content pipelines
Phase-2 note already defers this: soft-copy PDF/Word ingestion with
extraction → question draft queue for admin review (respects the “no invented
content” rule). Large effort, independent of A–D.

## Recommended order
1. A (admin self-service for teachers/assignments) — completes the user
   story “every teacher has their own subject” end to end.
2. C or B (distribution/print depth) depending on whether the product is a
   school-paper tool (C) or a print/prep tool (B).
3. D analytics, then E content ingestion whenever real content is available.

## Open questions for you
- Which modules make up Phase 3 for you (any of A–E, or something else)?
- Does the app target individual schools (admin per school) or a board-level
  SaaS (admin across many schools)? This changes tenancy work in Phase 3.
- Urdu medium: do you want Urdu-medium subject variants (teacher accounts,
  bilingual paper previews) included in Phase 3?
