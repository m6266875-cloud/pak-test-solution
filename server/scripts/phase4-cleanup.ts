/**
 * PHASE 4 — Part B syllabus/book cleanup runner.
 *
 * Usage (from server/):
 *   npx ts-node --transpile-only scripts/phase4-cleanup.ts              # dry run (needs DB)
 *   npx ts-node --transpile-only scripts/phase4-cleanup.ts --apply      # archive duplicates
 *   npx ts-node --transpile-only scripts/phase4-cleanup.ts --offline    # JSON-level analysis only (no DB)
 *
 * Never deletes rows: duplicate session/year books are archived and every
 * kept/removed/orphaned row is written to prisma/catalog/cleanup-report.json.
 */
import { runCleanup } from '../src/phase4/catalogCleanup';

const apply = process.argv.includes('--apply');
const offline = process.argv.includes('--offline');

async function main() {
  const r = await runCleanup(apply, { offline });
  console.log('PHASE-4 CATALOG CLEANUP', offline ? '(offline: JSON level only)' : apply ? '(APPLIED)' : '(dry run)');
  console.log(`  subjects scanned (json): ${r.jsonLevel.subjectsScanned}`);
  console.log(`  json single-copy:        ${r.jsonLevel.singleCopy}`);
  for (const d of r.jsonLevel.decisions) {
    console.log(`  - ${d.course} g${d.grade} ${d.subject} (${d.medium}) [${d.action}] kept: ${d.kept.join(' + ')}`);
    for (const x of d.removed) console.log(`      removed: ${x.title} (${x.year ?? 'n/a'}) — ${x.reason}`);
  }
  if (r.db) {
    console.log(`  db duplicate books archived: ${r.archivedCount ?? r.db.archivedBookIds.length}${apply ? '' : ' (planned)'}`);
    for (const x of r.db.removed.slice(0, 40)) {
      console.log(`      archive book#${x.bookId} ${x.title} session=${x.sessionCode ?? 'n/a'} year=${x.year ?? 'n/a'}`);
    }
    console.log(`  orphaned questions flagged for review: ${r.db.orphanedQuestionIds.length}`);
  }
  console.log('  report → prisma/catalog/cleanup-report.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
