/**
 * PHASE 4 — candidate engine PURE unit tests (no database needed).
 *
 * Covers the seeded auto pre-selection used by Step 4:
 *   • hits the requested count when the pool allows
 *   • never duplicates a question inside one pre-select
 *   • spreads chapter-even across the selected chapters
 *   • is deterministic per seed and differs across seeds (shuffle/regenerate)
 *   • caps gracefully when the pool is smaller than the request
 *
 * Usage (from server/): npx ts-node --transpile-only scripts/phase4-candidates.test.ts
 */
import { mulberry32, preselectEven, shuffleWith, TYPE_GROUPS } from '../src/phase4/candidatesService';

let pass = 0, fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) { pass++; console.log(`  ✔ ${label}`); }
  else { fail++; console.error(`  ✖ FAIL: ${label}`); }
};

interface Row { id: number; chapterId: number }
const pool: Row[] = [];
let id = 1;
for (let ch = 1; ch <= 4; ch++) for (let i = 0; i < 10; i++) pool.push({ id: id++, chapterId: ch });

// 1. exact count + uniqueness
const pick1 = preselectEven(pool, 12, mulberry32(1));
ok(pick1.length === 12, 'preselect returns exactly the requested count');
ok(new Set(pick1.map((p) => p.id)).size === 12, 'no duplicate questions in one pre-select');

// 2. chapter-even spread (12 over 4 chapters ⇒ 3 each)
const perChapter = new Map<number, number>();
pick1.forEach((p) => perChapter.set(p.chapterId, (perChapter.get(p.chapterId) ?? 0) + 1));
ok([...perChapter.values()].every((n) => n === 3), 'spread is chapter-even (3 per chapter for 12/4)');

// 3. determinism per seed + variation across seeds
const a1 = preselectEven(pool, 10, mulberry32(42)).map((p) => p.id).join(',');
const a2 = preselectEven(pool, 10, mulberry32(42)).map((p) => p.id).join(',');
const b1 = preselectEven(pool, 10, mulberry32(43)).map((p) => p.id).join(',');
ok(a1 === a2, 'same seed ⇒ same pre-select (reproducible)');
ok(a1 !== b1, 'different seed ⇒ different pre-select (shuffle works)');

// 4. small pool caps gracefully
const tiny = pool.slice(0, 5);
ok(preselectEven(tiny, 12, mulberry32(1)).length === 5, 'pool smaller than request ⇒ returns whole pool, no crash');

// 5. shuffleWith: permutation, no loss
const src = [1, 2, 3, 4, 5, 6, 7, 8];
const sh = shuffleWith(src, mulberry32(7));
ok(sh.length === src.length && src.every((x) => sh.includes(x)), 'shuffleWith is a lossless permutation');

// 6. type groups match the wizard paper types
ok(TYPE_GROUPS.objective.every((t) => ['mcq', 'true_false', 'fill_blank', 'matching'].includes(t)), 'objective = MCQ-family only');
ok(TYPE_GROUPS.subjective.every((t) => ['short', 'essay', 'numerical', 'conceptual'].includes(t)), 'subjective = short/long family only');
ok(TYPE_GROUPS.mixed.length === 8, 'mixed allows all eight types');

console.log(`\nphase4-candidates: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
