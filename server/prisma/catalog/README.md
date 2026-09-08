# Phase-1 Catalogue (course / session / class / subject / book / chapter)

Seed data for the six supported courses. **Only real, verified information is
preloaded.** Book/chapter rows may only exist when they were confirmed against
an official or authorized source recorded in `sources.json`; anything not yet
verified is stored as a row with `verified = false` and/or a `dataNotes`
"pending" note — never invented content.

## Files

| File | Purpose |
| --- | --- |
| `sources.json` | Source registry (official / publisher / corroborating pages). Everything in the catalogue references a source via URL + label. |
| `courses.json` | Platform courses (PTB, FBISE, OUP, AFAQ, GOHAR, BAPU), academic sessions 2024‑25 → 2027‑28, per-course session status (one `current` per course), valid class/program lists. |
| `ptb.json`, `federal.json`, `oxford.json`, `afaq.json`, `gohar.json`, `bapu.json` | Per-course subject → book → chapter catalogue. |
| `loadCatalog.ts` | Pure validation (`validateCatalogFiles`, no DB) + idempotent raw-SQL loader (`applyCatalog`). |
| `seed.ts` | CLI entry: validates first, then applies everything in ONE transaction. |

## Commands (from `server/`)

```bash
# validate the JSON files only — no database access
npm run db:catalog:validate

# apply to a database (one transaction, idempotent)
DATABASE_URL=postgres://user:pass@host:5432/pak_test_db npm run db:catalog
```

Re-running the loader never duplicates rows (natural-key upserts) and never
touches lifecycle columns (`status`, `isActive`, file fields, …), so admin
edits such as archiving a book survive a re-seed.

## Writing rules

1. **Provenance is a first-class column.** `Book.verified` and
   `Chapter.verified` mean: the row was confirmed against an official /
   publisher source recorded in `sources.json` (kind `official` or
   `publisher`). A row whose only evidence is a secondary mirror
   (`secondary-mirror`) is seeded `verified = false` with a dataNotes line
   that says exactly that — never an invented claim, never a “Verified
   against …” note on an unofficial source.
2. **Every chapter list must name the exact consulted source**: an
   entry-level `chapterSource` (sources.json id) per subject. `Book.sourceRef`
   is the *book's own* anchor (entry `sourceRef` override, else the file
   `defaults.source`) — a mirror URL used for chapter corroboration never
   becomes the book's source. Verified book rows carry the confirming
   document as `sourceRef` (e.g. the NCC 2021 list) so the claim and the URL
   match.
3. **`{g}` / `{gMinus5}` placeholders** expand to the grade number
   (`Science Fact File {gMinus5}` → Book 1 for grade 6) to avoid repetition.
4. **Media** are `em` (English) or `urdu`; the loader maps them to the DB
   `Medium` enum (`english`/`urdu`).
5. **One subject row per (course, class, medium, name)** — duplicates inside
   one file are validation errors.
6. **Chapters** are numbered per book; a continuation book may legitimately
   start at a non‑1 number (e.g. Physics 10 units 10‑21) — the validator
   warns, and an explicit note explains why.
7. **Program-level courses** (BAPU) use Class `grade >= 100` rows; ordinary
   school classes use grades 1–12. Which classes are valid for a course is
   enforced by `CourseClass`.
8. Academic-session rows are **additive and versioned**: do not edit rows from
   an older session — add new rows for the new session and flip
   `CourseSession.status` in the Admin UI.

### `chapterMirrorOf` — considered, deliberately not implemented (yet)

A book entry may one day declare that its chapter list is identical to
another book's (e.g. a future Urdu-medium twin of an English-medium book, or
a reprint across sessions). That would be modelled by the loader copying the
canonical list and inheriting its `verified` flag instead of restating rows.
This is NOT implemented because no two catalogued books currently share a
chapter list, and copying English unit names onto Urdu-medium rows would
fabricate language-correct content. Revisit when a genuine duplicate exists.

## Verification status (as seeded)

`Book.verified` means the title row was confirmed against an official or
authorized source recorded in `sources.json`; `Chapter.verified` means the
unit/chapter list itself was confirmed against such a source. Everything
else that is known to exist but is not yet primary-confirmed stays
`verified = false` with a `dataNotes` note — never invented.

Verified rows in the seeded DB (all carry the NCC 2021 list as `sourceRef`):

| Course | verified | Anchor |
| --- | --- | --- |
| AFAQ | 24 | Sun Series (Mathematics 1‑5, General Science 4‑5, Social Studies 4‑5, Islamiyat 1‑5), Iqbal Series English/Urdu 1‑5 — NCC 2021 |
| FBISE (NBF) | 27 | English/Urdu/Mathematics/General Knowledge/Islamiyat 1‑3; + General Science, Social Studies (UM) 4‑5 — NCC 2021 federal set. Nazra Quran rows exist (federal primary scheme) but stay `verified=false`. |
| GOHAR | 16 | Gohar English / Nida-e-Urdu / Gohar Mathematics 1‑3; Gohar Science 4‑5; Gohar Islamiat 1‑5 — NCC 2021 |
| OUP | 14 | New Countdown 1‑5, Oxford Progressive English 1‑5, New Oxford Primary Science 4‑5, New Oxford Social Studies 4‑5 — NCC 2021 |
| PTB | 0 | harvested chapter lists are corroborated by secondary mirrors only — **awaiting confirmation against an official PCTB copy** |
| BAPU | 0 | subject pool from PU course outlines; no book rows (PU does not prescribe single textbooks); legacy annual-system classes archived |

Chapter rows seeded: 90, ALL `verified=false` (PTB Class 9/10 EM unit lists,
Federal/NBF Class 9 Physics) — each carries the corroborating URL in
`sourceRef` and a dataNotes line “corroborated by … (secondary-mirror) —
awaiting confirmation on an official copy”. Book rows in those same
subjects point at the official publisher portal (PCTB / NBF), never at the
mirror. Grades 6‑8 series rows anchor to publisher catalogues and are
`verified=false`.

Verify a seeded database with:

```sql
-- verified book ledger: expect AFAQ 24, FBISE 27, GOHAR 16, OUP 14, PTB 0, BAPU 0
SELECT c.code, count(*) FROM "Book" b JOIN "Course" c ON c.id = b."courseId"
WHERE b."verified" GROUP BY c.code ORDER BY c.code;

-- every verified row must carry the confirming NCC document URL; no book may
-- cite a secondary mirror as its source (expect 0 rows in each query)
SELECT count(*) FROM "Book" WHERE "verified" AND "sourceRef" NOT LIKE '%mofept.gov.pk%';
SELECT count(*) FROM "Book" WHERE "sourceRef" LIKE '%class9.pk%' OR "sourceRef" LIKE '%class10.pk%'
  OR "sourceRef" LIKE '%ilmkidunya%' OR "sourceRef" LIKE '%freeilm%' OR "sourceRef" LIKE '%studyplusplus%';

-- chapter honesty: expect 90 pending rows, 0 "Verified against …" overclaims
SELECT count(*) FROM "Chapter" WHERE "dataNotes" LIKE '%awaiting confirmation%';
SELECT count(*) FROM "Chapter" WHERE "dataNotes" LIKE 'Verified against%';
```
