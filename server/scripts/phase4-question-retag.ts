/**
 * PHASE 4 — Question-bank retag + orphan report (Part B).
 *
 * 1) Backfills the denormalised catalog chain on Question rows
 *    (subjectId/classId/courseId from Chapter→Subject, sessionId from Book)
 *    so every question is tagged Course → Class → Subject → Book → Chapter →
 *    (Exercise) exactly as the 5-step wizard and the generator expect.
 * 2) Flags ORPHANED questions (chapter missing/inactive, subject
 *    missing/inactive) for manual review. Orphans are NEVER auto-deleted or
 *    auto-moved — they are listed with enough context to fix by hand.
 *
 * Usage (from server/):
 *   DATABASE_URL=... npm run db:retag                  # dry run (default)
 *   DATABASE_URL=... npm run db:retag -- --apply        # backfill in ONE transaction
 *   DATABASE_URL=... npm run db:retag -- --apply --out=report.json
 */
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice('--out='.length) : null;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required (see server/.env.example)');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // ── 1) chain backfill candidates ──
    const chain = await client.query(
      `SELECT count(*)::int AS n
         FROM "Question" x
         JOIN "Chapter" ch ON ch.id = x."chapterId"
         JOIN "Subject" s ON s.id = ch."subjectId"
        WHERE x."subjectId" IS NULL OR x."classId" IS NULL OR x."courseId" IS NULL`
    );
    const sess = await client.query(
      `SELECT count(*)::int AS n
         FROM "Question" x
         JOIN "Book" b ON b.id = x."bookId"
        WHERE x."sessionId" IS NULL AND b."sessionId" IS NOT NULL`
    );
    const chainN = Number(chain.rows[0].n);
    const sessN = Number(sess.rows[0].n);
    console.log(`── Phase-4 question retag ${APPLY ? '(APPLY)' : '(dry run — no writes)'} ──`);
    console.log(`Chain backfill (subject/class/course from chapter): ${chainN} row(s)`);
    console.log(`Session backfill (from book): ${sessN} row(s)`);

    if (APPLY && (chainN > 0 || sessN > 0)) {
      await client.query('BEGIN');
      try {
        if (chainN > 0) {
          await client.query(
            `UPDATE "Question" x
                SET "subjectId" = ch."subjectId", "classId" = s."classId", "courseId" = s."courseId",
                    "updatedAt" = CURRENT_TIMESTAMP
               FROM "Chapter" ch
               JOIN "Subject" s ON s.id = ch."subjectId"
              WHERE x."chapterId" = ch.id
                AND (x."subjectId" IS NULL OR x."classId" IS NULL OR x."courseId" IS NULL)`
          );
        }
        if (sessN > 0) {
          await client.query(
            `UPDATE "Question" x
                SET "sessionId" = b."sessionId", "updatedAt" = CURRENT_TIMESTAMP
               FROM "Book" b
              WHERE x."bookId" = b.id AND x."sessionId" IS NULL AND b."sessionId" IS NOT NULL`
          );
        }
        await client.query('COMMIT');
        console.log(`✔ Backfilled ${chainN + sessN} Question row(s) in one transaction.`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    } else if (!APPLY) {
      console.log(`Dry run: ${chainN + sessN} row(s) would be backfilled. Re-run with --apply to execute.`);
    }

    // ── 2) orphans (report only, always) ──
    const orphans = await client.query(
      `SELECT x.id, x."bankNo", left(x.text, 90) AS excerpt, x.type, x.status,
              x."chapterId", ch.status AS "chapterStatus",
              ch."subjectId", s.status AS "subjectStatus"
         FROM "Question" x
         LEFT JOIN "Chapter" ch ON ch.id = x."chapterId"
         LEFT JOIN "Subject" s ON s.id = ch."subjectId"
        WHERE ch.id IS NULL OR ch.status <> 'active' OR s.id IS NULL OR s.status <> 'active'
        ORDER BY x.id
        LIMIT 500`
    );
    console.log(`\nOrphaned questions (missing/inactive chapter or subject): ${orphans.rows.length}${orphans.rows.length >= 500 ? ' (capped at 500 — see JSON for need to page)' : ''}`);
    for (const o of orphans.rows) {
      const why = o.chapterExists === null && o.chapterStatus == null && o.chapterId != null && !o.subjectId
        ? 'chapter row missing'
        : o.chapterStatus !== 'active'
          ? `chapter status=${o.chapterStatus ?? 'missing'}`
          : `subject status=${o.subjectStatus ?? 'missing'}`;
      console.log(`  #${o.id} [${o.bankNo ?? 'no-bankNo'}] (${o.type}/${o.status}) ch=${o.chapterId} — ${why} — ${(o.excerpt ?? '').replace(/\s+/g, ' ')}`);
    }
    if (!orphans.rows.length) console.log('  (none — every question resolves to an active chapter + subject)');

    if (OUT) {
      fs.writeFileSync(OUT, JSON.stringify({
        mode: APPLY ? 'apply' : 'dry-run',
        backfilled: APPLY ? { chain: chainN, session: sessN } : { chain: 0, session: 0 },
        orphans: orphans.rows,
      }, null, 2));
      console.log(`\nReport written to ${OUT}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
