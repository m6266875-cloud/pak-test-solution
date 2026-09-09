/**
 * PHASE 4 — Part B syllabus/book cleanup.
 *
 * Goal: ONE current/latest syllabus copy per (course, class, subject, medium).
 *   • JSON level  — pure analysis of server/prisma/catalog/*.json; verifies a
 *     single authoritative book per (class, subject, medium) and records any
 *     multi-book subjects with the keep/remove decision (most recent / most
 *     complete wins).
 *   • DB level    — plans which Book rows to archive: per natural group
 *     (courseId, classId, subjectId, language) the keeper is the book whose
 *     session is the course's CURRENT CourseSession (fallback: latest year),
 *     everything older is set status='archived' (NEVER deleted — papers keep
 *     referencing their original rows, matching the Phase-1 versioning rule).
 *   • Orphans     — questions whose syllabus chain is incomplete
 *     (null courseId/subjectId, or chapter on an archived/missing book) are
 *     listed for manual review, untouched.
 *
 * Nothing is removed silently: the full keep/remove/orphan listing is written
 * to server/prisma/catalog/cleanup-report.json and summarised in the response
 * + activity log.
 */
import fs from 'fs';
import path from 'path';
import { q, run, withTx } from '../phase2/db';

const CATALOG_DIR = path.join(__dirname, '../../prisma/catalog');
export const REPORT_PATH = path.join(CATALOG_DIR, 'cleanup-report.json');
const COURSE_FILES = ['ptb.json', 'federal.json', 'oxford.json', 'afaq.json', 'gohar.json', 'bapu.json'];

interface BookJson { title?: string; edition?: string; year?: number; verify?: boolean; note?: string; sourceRef?: string }
interface SubjectJson { name: string; medium?: string; book?: BookJson | string; books?: BookEntryOrString[]; chapters?: unknown[]; chapterMirrorOf?: string }
type BookEntryOrString = BookJson | string;
interface ClassJson { grade?: number; grades?: number[]; subjects?: SubjectJson[] }
interface CourseJson { courseCode: string; defaults?: { session?: string }; classes?: ClassJson[] }

export interface JsonBookDecision {
  course: string; grade: number; subject: string; medium: string;
  /** keep-single: one book. keep-components: several DIFFERENT books that together
   * make up the subject (e.g. History + Geography) — all kept. archive-duplicates:
   * true session/year/edition copies of the SAME book — newest kept, rest removed. */
  action: 'keep-single' | 'keep-components' | 'archive-duplicates';
  kept: string[];
  removed: { title: string; edition?: string; year?: number; reason: string }[];
}

/** Normalised title core used to tell "same book, new edition" apart from
 * "different component books of one subject". */
const titleCore = (t: string): string =>
  t.toLowerCase().replace(/\{g(minus\d+)?\}/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

const LINEAGE_STOPWORDS = /^(edition|ed|new|reprint|session|volume|vol|part|urdu|medium|english)$/;
const titleTokens = (t: string): Set<string> =>
  new Set(titleCore(t).split(' ').filter((w) => w && !LINEAGE_STOPWORDS.test(w) && !/^(19|20)\d{2}$/.test(w)));

const sameBookLineage = (a: BookJson, b: BookJson): boolean => {
  const ta = titleTokens(a.title ?? ''); const tb = titleTokens(b.title ?? '');
  if (!ta.size || !tb.size) return false;
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  for (const w of small) if (!big.has(w)) return false;
  return true;
};

/* ── pure JSON analysis ──────────────────────────────────────────────────── */

export function analyzeCatalogFiles(): {
  singleCopy: boolean;
  decisions: JsonBookDecision[];
  subjectsScanned: number;
} {
  const decisions: JsonBookDecision[] = [];
  let subjectsScanned = 0;
  for (const file of COURSE_FILES) {
    const cat = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, file), 'utf8')) as CourseJson;
    for (const cls of cat.classes ?? []) {
      const grades = cls.grades ?? (cls.grade != null ? [cls.grade] : []);
      for (const subj of cls.subjects ?? []) {
        for (const g of grades) {
          subjectsScanned++;
          const books = (subj.books ?? (subj.book ? [subj.book] : []))
            .map((b) => (typeof b === 'string' ? { title: b } : b));
          if (books.length <= 1) continue;
          // Group books into "lineages" (same book across editions/years) vs
          // distinct component books (History + Geography etc.).
          const groups: BookJson[][] = [];
          for (const b of books) {
            const g0 = groups.find((grp) => grp.some((x) => sameBookLineage(x, b)));
            if (g0) g0.push(b); else groups.push([b]);
          }
          const removed: JsonBookDecision['removed'] = [];
          const kept: string[] = [];
          let archivedAny = false;
          for (const grp of groups) {
            const scored = grp
              .map((b, i) => ({ b, i, score: (b.year ?? 0) * 10 + (b.verify ? 5 : 0) }))
              .sort((a, z) => z.score - a.score || a.i - z.i);
            kept.push(scored[0].b.title ?? '(untitled)');
            for (const x of scored.slice(1)) {
              archivedAny = true;
              removed.push({
                title: x.b.title ?? '(untitled)', edition: x.b.edition, year: x.b.year,
                reason: 'superseded edition/year of the same book — kept the most recent copy',
              });
            }
          }
          decisions.push({
            course: cat.courseCode, grade: g, subject: subj.name, medium: subj.medium ?? 'em',
            action: archivedAny ? 'archive-duplicates' : 'keep-components',
            kept, removed,
          });
        }
      }
    }
  }
  return {
    singleCopy: !decisions.some((d) => d.action === 'archive-duplicates'),
    decisions, subjectsScanned,
  };
}

/* ── DB plan / apply ─────────────────────────────────────────────────────── */

interface DbBookRow {
  id: number; title: string; year: number | null; sessionId: number | null; language: string;
  courseId: number | null; classId: number | null; subjectId: number | null; status: string;
}

export interface CleanupPlan {
  archivedBookIds: number[];
  kept: { bookId: number; course: string | null; classId: number | null; subjectId: number | null; language: string; sessionCode: string | null; year: number | null; title: string }[];
  removed: { bookId: number; course: string | null; classId: number | null; subjectId: number | null; language: string; sessionCode: string | null; year: number | null; title: string; reason: string }[];
  orphanedQuestionIds: number[];
}

/** Pure planner: given book rows + session info, decide keeper per group. */
export function planCleanup(
  books: DbBookRow[],
  currentSessionByCourse: Map<number, number>,
  sessionCode: Map<number, string>,
): CleanupPlan {
  const groups = new Map<string, DbBookRow[]>();
  for (const b of books) {
    if (b.courseId == null || b.subjectId == null || b.classId == null) continue; // legacy rows: untouched
    const key = `${b.courseId}|${b.classId}|${b.subjectId}|${b.language}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }
  const plan: CleanupPlan = { archivedBookIds: [], kept: [], removed: [], orphanedQuestionIds: [] };
  for (const rows of groups.values()) {
    const active = rows.filter((r) => r.status === 'active');
    if (active.length <= 1) { if (active[0]) plan.kept.push(keepOf(active[0], sessionCode)); continue; }
    const cur = currentSessionByCourse.get(active[0].courseId!);
    const score = (b: DbBookRow) =>
      (b.sessionId != null && b.sessionId === cur ? 1_000_000 : 0) + (b.year ?? 0) * 100 + b.id * 0; // latest session, then year
    const sorted = active.slice().sort((a, z) => score(z) - score(a) || z.id - a.id);
    plan.kept.push(keepOf(sorted[0], sessionCode));
    for (const old of sorted.slice(1)) {
      plan.archivedBookIds.push(old.id);
      plan.removed.push({
        bookId: old.id, course: null, classId: old.classId, subjectId: old.subjectId, language: old.language,
        sessionCode: old.sessionId != null ? sessionCode.get(old.sessionId) ?? null : null,
        year: old.year, title: old.title,
        reason: 'duplicate session/year copy — archived in favour of the current/latest syllabus book',
      });
    }
  }
  return plan;
}
const keepOf = (b: DbBookRow, sessionCode: Map<number, string>): CleanupPlan['kept'][number] => ({
  bookId: b.id, course: null, classId: b.classId, subjectId: b.subjectId, language: b.language,
  sessionCode: b.sessionId != null ? sessionCode.get(b.sessionId) ?? null : null,
  year: b.year, title: b.title,
});

export async function buildPlan(): Promise<CleanupPlan> {
  const [books, sessions, links] = await Promise.all([
    q<DbBookRow>(`SELECT id, title, year, "sessionId", language, "courseId", "classId", "subjectId", status FROM "Book"`),
    q<{ id: number; code: string }>(`SELECT id, code FROM "AcademicSession"`),
    q<{ courseId: number; sessionId: number; status: string }>(`SELECT "courseId", "sessionId", status FROM "CourseSession"`),
  ]);
  const sessionCode = new Map(sessions.map((s) => [s.id, s.code]));
  const current = new Map(links.filter((l) => l.status === 'current').map((l) => [l.courseId, l.sessionId]));
  const plan = planCleanup(books, current, sessionCode);

  // enrich course codes for readability
  const courseRows = await q<{ id: number; code: string }>(`SELECT id, code FROM "Course"`);
  const code = new Map(courseRows.map((c) => [c.id, c.code]));
  const courseOf = (b: { course: string | null; bookId?: number }) => b.course;
  void courseOf;
  const fill = (r: { course: string | null } & Record<string, unknown>, src: { courseId?: number | null }) => {
    r.course = src.courseId != null ? code.get(src.courseId) ?? null : null;
  };
  const bookById = new Map(books.map((b) => [b.id, b]));
  for (const k of plan.kept) fill(k, bookById.get(k.bookId) ?? {});
  for (const r of plan.removed) fill(r, bookById.get(r.bookId) ?? {});

  // orphaned questions: incomplete syllabus chain or chapter on archived book
  const orphans = await q<{ id: number }>(
    `SELECT x.id FROM "Question" x
      LEFT JOIN "Chapter" ch ON ch.id = x."chapterId"
      LEFT JOIN "Book" b ON b.id = ch."bookId"
     WHERE x."isActive" = true
       AND (x."courseId" IS NULL OR x."subjectId" IS NULL OR x."classId" IS NULL
            OR ch.id IS NULL
            OR (b.id IS NOT NULL AND b.status = 'archived'))
     ORDER BY x.id`
  );
  plan.orphanedQuestionIds = orphans.map((o) => o.id);
  return plan;
}

/** Apply: archive duplicate books in ONE transaction. Never deletes rows. */
export async function applyPlan(plan: CleanupPlan): Promise<number> {
  if (!plan.archivedBookIds.length) return 0;
  return withTx(async (tx) => {
    const res = await tx.query(
      `UPDATE "Book" SET status = 'archived', "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[]) AND status = 'active'`,
      [plan.archivedBookIds],
    );
    return res.rowCount ?? 0;
  });
}

export interface CleanupReport {
  generatedAt: string;
  mode: 'full' | 'offline';
  jsonLevel: ReturnType<typeof analyzeCatalogFiles>;
  db: CleanupPlan | null; // null when analysed without a database
  archivedCount: number | null; // null = dry run / offline
}

export async function runCleanup(apply: boolean, opts: { offline?: boolean } = {}): Promise<CleanupReport> {
  const jsonLevel = analyzeCatalogFiles();
  let plan: CleanupPlan | null = null;
  let archivedCount: number | null = null;
  if (!opts.offline) {
    plan = await buildPlan();
    if (apply) archivedCount = await applyPlan(plan);
  }
  const report: CleanupReport = {
    generatedAt: new Date().toISOString(),
    mode: opts.offline ? 'offline' : 'full',
    jsonLevel, db: plan, archivedCount,
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
