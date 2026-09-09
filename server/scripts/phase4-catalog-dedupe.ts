/**
 * PHASE 4 — Catalog single-copy dedupe (Part B).
 *
 * Finds ACTIVE Book rows that share one (course, subject, class) — i.e. the
 * duplicate session/year copies the spec asks to remove — and archives every
 * copy except the keeper. NOTHING is deleted; superseded rows are flipped to
 * status='archived' with a dataNotes trail, and every decision is printed
 * (and optionally written as JSON) for review — never a silent deletion.
 *
 * Keeper rule: the copy on the course's CURRENT session wins; ties break by
 * latest year, then lowest id (deterministic).
 *
 * Safety: groups whose active copies carry DIFFERENT titles (e.g. Oxford
 * Social Studies 6–8 = History + Geography, two genuinely different books)
 * are flagged `review` and NEVER auto-archived.
 *
 * Usage (from server/):
 *   DATABASE_URL=... npm run db:dedupe                  # dry run (default)
 *   DATABASE_URL=... npm run db:dedupe -- --apply        # archive in ONE transaction
 *   DATABASE_URL=... npm run db:dedupe -- --apply --out=report.json
 */
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice('--out='.length) : null;

interface Sibling {
  id: number;
  title: string;
  edition: string | null;
  year: number | null;
  session: string | null;
  sessionStatus: string | null;
  questions: number;
}
interface Group {
  courseCode: string;
  subjectName: string;
  className: string;
  books: Sibling[];
  keeperId: number | null;
  action: 'archive-siblings' | 'review';
  archived: number[];
  note: string;
}

function pickKeeper(books: Sibling[]): Sibling {
  const rank = (b: Sibling): [number, number, number] => [
    b.sessionStatus === 'current' ? 0 : 1,
    -(b.year ?? -1),
    b.id,
  ];
  return [...books].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < 3; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return 0;
  })[0];
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required (see server/.env.example)');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT b."courseId", co.code AS "courseCode", b."subjectId", s.name AS "subjectName",
              b."classId", cl.name AS "className",
              json_agg(json_build_object(
                'id', b.id, 'title', b.title, 'edition', b.edition, 'year', b.year,
                'session', a.code, 'sessionStatus', cs.status,
                'questions', (SELECT count(*) FROM "Question" x WHERE x."bookId" = b.id)
              ) ORDER BY b.id) AS books
         FROM "Book" b
         JOIN "Course" co ON co.id = b."courseId"
         JOIN "Subject" s ON s.id = b."subjectId"
         JOIN "Class" cl ON cl.id = b."classId"
         LEFT JOIN "AcademicSession" a ON a.id = b."sessionId"
         LEFT JOIN "CourseSession" cs ON cs."courseId" = b."courseId" AND cs."sessionId" = b."sessionId"
        WHERE b.status = 'active'
          AND b."courseId" IS NOT NULL AND b."subjectId" IS NOT NULL AND b."classId" IS NOT NULL
        GROUP BY b."courseId", co.code, b."subjectId", s.name, b."classId", cl.name
       HAVING count(*) > 1
        ORDER BY co.code, cl.name, s.name`
    );

    const groups: Group[] = [];
    for (const row of res.rows) {
      const books = row.books as Sibling[];
      const titles = new Set(books.map((b) => b.title));
      const keeper = pickKeeper(books);
      if (titles.size > 1) {
        groups.push({
          courseCode: row.courseCode, subjectName: row.subjectName, className: row.className,
          books, keeperId: null, action: 'review', archived: [],
          note: `MULTI-BOOK subject (${titles.size} distinct titles) — left untouched for manual review`,
        });
      } else {
        groups.push({
          courseCode: row.courseCode, subjectName: row.subjectName, className: row.className,
          books, keeperId: keeper.id, action: 'archive-siblings',
          archived: books.map((b) => b.id).filter((id) => id !== keeper.id),
          note: `keeper Book#${keeper.id} (session ${keeper.session ?? 'none'}${keeper.sessionStatus ? `/${keeper.sessionStatus}` : ''})`,
        });
      }
    }

    const archivable = groups.filter((g) => g.action === 'archive-siblings');
    const toArchive = archivable.flatMap((g) => g.archived);

    console.log(`── Phase-4 catalog dedupe ${APPLY ? '(APPLY)' : '(dry run — no writes)'} ──`);
    console.log(`Multi-copy active groups: ${groups.length} (${archivable.length} auto-archivable, ${groups.length - archivable.length} need review)`);
    for (const g of groups) {
      console.log(`\n[${g.action.toUpperCase()}] ${g.courseCode} · ${g.className} · ${g.subjectName} — ${g.note}`);
      for (const b of g.books) {
        const mark = b.id === g.keeperId ? 'KEEP   ' : g.action === 'review' ? 'REVIEW ' : 'ARCHIVE';
        console.log(`  ${mark} Book#${b.id} "${b.title}" (${b.edition ?? 'no edition'}${b.year ? `, ${b.year}` : ''}, session ${b.session ?? 'none'}${b.sessionStatus ? `/${b.sessionStatus}` : ''}, ${b.questions} questions)`);
      }
    }

    if (APPLY && toArchive.length) {
      await client.query('BEGIN');
      try {
        for (const g of archivable) {
          const keeper = g.books.find((b) => b.id === g.keeperId)!;
          const note = `Phase-4 dedupe: superseded by Book#${keeper.id} (session ${keeper.session ?? 'none'}).`;
          await client.query(
            `UPDATE "Book"
                SET status = 'archived',
                    "dataNotes" = NULLIF(TRIM(COALESCE("dataNotes", '') || ' ' || $2), ''),
                    "updatedAt" = CURRENT_TIMESTAMP
              WHERE id = ANY($1::int[]) AND status = 'active'`,
            [g.archived, note]
          );
        }
        await client.query('COMMIT');
        console.log(`\n✔ Archived ${toArchive.length} superseded Book row(s) in one transaction (nothing deleted).`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    } else if (APPLY) {
      console.log('\n✔ Nothing to archive — catalog is already single-copy.');
    } else {
      console.log(`\nDry run: ${toArchive.length} Book row(s) would be archived. Re-run with --apply to execute.`);
    }

    if (OUT) {
      fs.writeFileSync(OUT, JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', groups }, null, 2));
      console.log(`Report written to ${OUT}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
