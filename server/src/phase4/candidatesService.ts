/**
 * PHASE 4 — Candidate-question engine for the 5-step wizard.
 *
 * Dedicated, testable service (Phase-4 spec §D): takes
 *   { chapters[], exercises[], paperType, marksBreakdown }
 * and returns a scored/randomised candidate set with a server-computed
 * auto pre-selection that hits the target marks. The browser only ever
 * receives PAGINATED slices + the (small) preselected set — the full bank
 * is never dumped client-side.
 *
 * Security: every entry point re-resolves the caller's teacher scope and
 * re-validates course/class/subject/book/chapter/exercise ids server-side
 * (never trust client IDs). Admins pass through per existing semantics
 * (school_admin paper oversight stays school-scoped in the paper service).
 *
 * The randomness is seeded (mulberry32) so "regenerate / shuffle" in the UI
 * is just a new seed — reproducible and testable.
 */
import { q, q1 } from '../phase2/db';
import { ApiError } from '../utils/apiResponse';
import { AuthUser, PAPER_TYPES, PaperType, QUESTION_TYPES, QuestionType } from '../phase2/types';
import { loadTeacherScope, isAdminRole } from '../phase2/scope';

export const TYPE_GROUPS: Record<PaperType, QuestionType[]> = {
  objective: ['mcq', 'true_false', 'fill_blank', 'matching'],
  subjective: ['short', 'essay', 'numerical', 'conceptual'],
  mixed: [...QUESTION_TYPES],
};

const LANGS = new Set(['english', 'urdu', 'bilingual']);

/* ── deterministic RNG (seeded shuffle ⇒ reproducible auto-select) ───────── */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(arr: T[], rnd: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * PURE chapter-even pre-selection: round-robins over a shuffled chapter
 * order so the auto pick spreads across the selected chapters (same spirit
 * as the Phase-2 draw, but deterministic per seed). Never duplicates.
 */
export function preselectEven<T extends { id: number; chapterId: number }>(
  pool: T[], count: number, rnd: () => number,
): T[] {
  const byChapter = new Map<number, T[]>();
  for (const row of pool) {
    if (!byChapter.has(row.chapterId)) byChapter.set(row.chapterId, []);
    byChapter.get(row.chapterId)!.push(row);
  }
  for (const arr of byChapter.values()) {
    const s = shuffleWith(arr, rnd);
    arr.length = 0;
    arr.push(...s);
  }
  const chapters = shuffleWith([...byChapter.keys()], rnd);
  const picked: T[] = [];
  let ci = 0;
  while (picked.length < count) {
    const before = picked.length;
    for (let k = 0; k < chapters.length; k++) {
      const arr = byChapter.get(chapters[(ci + k) % chapters.length])!;
      if (arr.length) { picked.push(arr.pop()!); if (picked.length >= count) break; }
    }
    ci = (ci + 1) % Math.max(1, chapters.length);
    if (picked.length === before) break; // pool exhausted
  }
  return picked.slice(0, count);
}

/* ── scope resolution ────────────────────────────────────────────────────── */

export interface WizardScopeInput {
  courseId?: number | null;
  classId: number;
  subjectId: number;
  bookId?: number | null;
  chapterIds: number[];
  exerciseIds?: number[];
  paperType: string;
  language: string;
}

export interface WizardScope {
  courseId: number | null;
  classId: number;
  subjectId: number;
  bookId: number | null;
  chapterIds: number[];
  exerciseIds: number[];
  paperType: PaperType;
  language: 'english' | 'urdu' | 'bilingual';
}

const ints = (v: unknown): number[] =>
  [...new Set((Array.isArray(v) ? v : []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);

/**
 * Server-side validation of the wizard scope. Teachers are restricted to
 * their TeacherSubject assignments; every id is re-checked against the DB.
 */
export async function assertWizardScope(user: AuthUser, input: WizardScopeInput): Promise<WizardScope> {
  if (!PAPER_TYPES.includes(input.paperType as PaperType)) {
    throw ApiError.badRequest(`Invalid paperType '${input.paperType}'`);
  }
  if (!LANGS.has(input.language)) throw ApiError.badRequest(`Invalid language '${input.language}'`);
  if (!Number.isInteger(input.classId) || input.classId < 1) throw ApiError.badRequest('classId is required');
  if (!Number.isInteger(input.subjectId) || input.subjectId < 1) throw ApiError.badRequest('subjectId is required');

  const subject = await q1<{ id: number; classId: number; courseId: number | null; status: string }>(
    `SELECT id, "classId", "courseId", status FROM "Subject" WHERE id = $1`, [input.subjectId],
  );
  if (!subject) throw ApiError.notFound('Subject not found');
  if (subject.status !== 'active') throw ApiError.badRequest('Subject is not active');
  if (subject.classId !== input.classId) {
    throw ApiError.badRequest('Subject does not belong to the selected class');
  }
  if (input.courseId != null && subject.courseId !== input.courseId) {
    throw ApiError.badRequest('Course does not match the selected subject');
  }

  if (user.role === 'teacher') {
    const scope = await loadTeacherScope(user.id);
    if (!scope.subjectIds.includes(subject.id)) {
      throw ApiError.forbidden('This subject is not assigned to you');
    }
  }

  let bookId: number | null = null;
  if (input.bookId != null) {
    const book = await q1<{ id: number; subjectId: number; status: string }>(
      `SELECT id, "subjectId", status FROM "Book" WHERE id = $1`, [input.bookId],
    );
    if (!book || book.status !== 'active') throw ApiError.badRequest('Invalid or inactive book');
    if (book.subjectId !== subject.id) throw ApiError.badRequest('Book does not belong to the selected subject');
    bookId = book.id;
  }

  const chapterIds = ints(input.chapterIds);
  if (!chapterIds.length) throw ApiError.badRequest('At least one chapter is required');
  const chs = await q<{ id: number; subjectId: number; bookId: number | null; status: string }>(
    `SELECT id, "subjectId", "bookId", status FROM "Chapter" WHERE id = ANY($1::int[])`, [chapterIds],
  );
  if (chs.length !== chapterIds.length) {
    const found = new Set(chs.map((c) => c.id));
    throw ApiError.badRequest('Some chapters do not exist', [{ missing: chapterIds.filter((x) => !found.has(x)) }]);
  }
  for (const c of chs) {
    if (c.subjectId !== subject.id) throw ApiError.badRequest('Some chapters do not belong to the selected subject');
    if (c.status !== 'active') throw ApiError.badRequest('Some chapters are not active');
    if (bookId != null && c.bookId != null && c.bookId !== bookId) {
      throw ApiError.badRequest('Some chapters belong to a different book');
    }
  }

  const exerciseIds = ints(input.exerciseIds);
  if (exerciseIds.length) {
    const ex = await q<{ id: number; chapterId: number }>(
      `SELECT id, "chapterId" FROM "Exercise" WHERE id = ANY($1::int[])`, [exerciseIds],
    );
    if (ex.length !== exerciseIds.length || ex.some((e) => !chapterIds.includes(e.chapterId))) {
      throw ApiError.badRequest('Some exercises do not belong to the selected chapters');
    }
  }

  return {
    courseId: subject.courseId, classId: input.classId, subjectId: subject.id, bookId,
    chapterIds, exerciseIds,
    paperType: input.paperType as PaperType,
    language: input.language as WizardScope['language'],
  };
}

/* ── step 2: chapter checklist with live counts ──────────────────────────── */

export interface ChapterChecklistRow {
  id: number; number: number; name: string; verified: boolean;
  approved: number; total: number;
  exercises: { id: number; number: number; name: string; approved: number }[];
}

export async function chapterChecklist(
  user: AuthUser, p: { subjectId: number; bookId?: number | null },
): Promise<ChapterChecklistRow[]> {
  if (!Number.isInteger(p.subjectId) || p.subjectId < 1) throw ApiError.badRequest('subjectId is required');
  const subject = await q1<{ id: number; status: string }>(
    `SELECT id, status FROM "Subject" WHERE id = $1`, [p.subjectId],
  );
  if (!subject) throw ApiError.notFound('Subject not found');
  if (user.role === 'teacher') {
    const scope = await loadTeacherScope(user.id);
    if (!scope.subjectIds.includes(p.subjectId)) throw ApiError.forbidden('This subject is not assigned to you');
  }
  const params: unknown[] = [p.subjectId];
  let extra = '';
  if (p.bookId != null) { params.push(p.bookId); extra = ` AND ch."bookId" = $2`; }
  const [chs, exs] = await Promise.all([
    q<{ id: number; number: number; name: string; verified: boolean; approved: number; total: number }>(
      `SELECT ch.id, ch.number, ch.name, ch.verified,
              (SELECT count(*) FROM "Question" x WHERE x."chapterId" = ch.id AND x.status='approved' AND x."isActive")::int AS approved,
              (SELECT count(*) FROM "Question" x WHERE x."chapterId" = ch.id AND x."isActive")::int AS total
         FROM "Chapter" ch
        WHERE ch."subjectId" = $1 AND ch.status = 'active'${extra}
        ORDER BY ch.number, ch.id`, params,
    ),
    q<{ id: number; number: number; name: string; chapterId: number; approved: number }>(
      `SELECT e.id, e.number, e.name, e."chapterId",
              (SELECT count(*) FROM "Question" x WHERE x."exerciseId" = e.id AND x.status='approved' AND x."isActive")::int AS approved
         FROM "Exercise" e
        WHERE e."chapterId" IN (SELECT id FROM "Chapter" ch WHERE ch."subjectId" = $1 AND ch.status='active'${extra})
          AND e.status = 'active'
        ORDER BY e."chapterId", e.number, e.id`, params,
    ),
  ]);
  return chs.map((c) => ({
    ...c, approved: Number(c.approved), total: Number(c.total),
    exercises: exs.filter((e) => e.chapterId === c.id).map((e) => ({ id: e.id, number: e.number, name: e.name, approved: Number(e.approved) })),
  }));
}

/* ── candidate pool (paginated) + auto pre-selection ─────────────────────── */

export interface TargetRow { type: string; count: number; marks: number; }

export interface CandidateRow {
  id: number; type: QuestionType; text: string; options: any; marks: number;
  difficulty: string; language: string; chapterId: number;
  chapterNo: number; chapterName: string; exerciseId: number | null; exerciseNo: number | null;
}

export interface CandidatesResult {
  rows: CandidateRow[];
  pagination: { page: number; limit: number; total: number };
  availableByType: Record<string, number>;
  preselected: { type: QuestionType; count: number; marks: number; selected: number; ids: number[]; rows: CandidateRow[] }[];
  totals: { requiredMarks: number; preselectedMarks: number; matched: boolean };
}

const POOL_CAP = 2000; // pre-select draws from at most this many rows per type

export class CandidateService {
  /** SQL where-fragment for the scoped, approved+active pool. */
  private async poolWhere(user: AuthUser, s: WizardScope): Promise<{ where: string[]; params: unknown[] }> {
    const where = [`x."chapterId" = ANY($1::int[])`, `x.status = 'approved'`, x_active()];
    const params: unknown[] = [s.chapterIds];
    if (s.exerciseIds.length) { params.push(s.exerciseIds); where.push(`x."exerciseId" = ANY($2::int[])`); }
    if (s.language !== 'bilingual') {
      params.push(s.language); where.push(`x.language = $${params.length}`);
    } else {
      params.push(['english', 'urdu', 'bilingual']); where.push(`x.language = ANY($${params.length}::text[])`);
    }
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      if (!scope.subjectIds.length) { where.push('FALSE'); }
      else { params.push(scope.subjectIds); where.push(`x."subjectId" = ANY($${params.length}::int[])`); }
    }
    return { where, params };
  }

  /** Paginated candidate rows for the review list (never the full bank). */
  async listCandidates(user: AuthUser, s: WizardScope, o: {
    type?: string; page?: number; limit?: number; search?: string;
  }): Promise<{ rows: CandidateRow[]; pagination: { page: number; limit: number; total: number } }> {
    const { where, params } = await this.poolWhere(user, s);
    if (o.type) {
      if (!TYPE_GROUPS[s.paperType].includes(o.type as QuestionType)) {
        throw ApiError.badRequest(`Question type '${o.type}' is not allowed for a ${s.paperType} paper`);
      }
      params.push(o.type); where.push(`x.type = $${params.length}`);
    } else {
      params.push(TYPE_GROUPS[s.paperType]); where.push(`x.type = ANY($${params.length}::text[])`);
    }
    if (o.search?.trim()) {
      params.push(`%${o.search.trim().slice(0, 120)}%`); where.push(`x.text ILIKE $${params.length}`);
    }
    const page = Math.max(1, o.page ?? 1);
    const limit = Math.min(100, Math.max(1, o.limit ?? 50));
    const whereSql = where.join(' AND ');
    const [rows, cnt] = await Promise.all([
      q<CandidateRow & { approved: number }>(
        `SELECT x.id, x.type, x.text, x.options, x.marks, x.difficulty, x.language,
                x."chapterId", ch.number AS "chapterNo", ch.name AS "chapterName",
                x."exerciseId", e.number AS "exerciseNo"
           FROM "Question" x
           JOIN "Chapter" ch ON ch.id = x."chapterId"
           LEFT JOIN "Exercise" e ON e.id = x."exerciseId"
          WHERE ${whereSql}
          ORDER BY x.type, x.id
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, (page - 1) * limit],
      ),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Question" x WHERE ${whereSql}`, params),
    ]);
    return { rows, pagination: { page, limit, total: Number(cnt?.n ?? 0) } };
  }

  /**
   * The Step-4 core: availability per type + seeded auto pre-selection that
   * pre-checks exactly enough questions to hit each target row's marks.
   */
  async buildCandidateSet(user: AuthUser, s: WizardScope, p: {
    distribution: TargetRow[]; seed?: number; page?: number; limit?: number; search?: string;
  }): Promise<CandidatesResult> {
    const rows = (p.distribution ?? []).map((d) => ({
      type: d.type === 'long' ? 'essay' : d.type,
      count: Number(d.count), marks: Number(d.marks),
    }));
    for (const r of rows) {
      if (!TYPE_GROUPS[s.paperType].includes(r.type as QuestionType)) {
        throw ApiError.badRequest(`Question type '${r.type}' is not allowed for a ${s.paperType} paper`);
      }
      if (!Number.isInteger(r.count) || r.count < 0 || !Number.isInteger(r.marks) || r.marks < 1) {
        throw ApiError.badRequest('Invalid distribution row');
      }
    }
    const seed = Number.isInteger(p.seed) ? (p.seed as number) : 1;
    const { where, params } = await this.poolWhere(user, s);

    const availRows = await q<{ type: string; n: string }>(
      `SELECT x.type, count(*)::int AS n FROM "Question" x WHERE ${where.join(' AND ')} GROUP BY x.type`, params,
    );
    const availableByType: Record<string, number> = {};
    for (const t of QUESTION_TYPES) availableByType[t] = 0;
    for (const r of availRows) availableByType[r.type] = Number(r.n);

    const preselected: CandidatesResult['preselected'] = [];
    let requiredMarks = 0;
    let preselectedMarks = 0;
    for (const [i, row] of rows.entries()) {
      requiredMarks += row.count * row.marks;
      if (row.count === 0) continue;
      const typeWhere = [...where, `x.type = $${params.length + 1}`];
      const pool = await q<{ id: number; chapterId: number }>(
        `SELECT x.id, x."chapterId" FROM "Question" x WHERE ${typeWhere.join(' AND ')} ORDER BY x.id LIMIT ${POOL_CAP}`,
        [...params, row.type],
      );
      const picked = preselectEven(pool, row.count, mulberry32(seed + i * 7919));
      preselectedMarks += picked.length * row.marks;
      const full = picked.length
        ? await q<CandidateRow>(
          `SELECT x.id, x.type, x.text, x.options, x.marks, x.difficulty, x.language,
                  x."chapterId", ch.number AS "chapterNo", ch.name AS "chapterName",
                  x."exerciseId", e.number AS "exerciseNo"
             FROM "Question" x
             JOIN "Chapter" ch ON ch.id = x."chapterId"
             LEFT JOIN "Exercise" e ON e.id = x."exerciseId"
            WHERE x.id = ANY($1::int[]) ORDER BY x.type, x.id`,
          [picked.map((x) => x.id)],
        )
        : [];
      preselected.push({ type: row.type as QuestionType, count: row.count, marks: row.marks, selected: picked.length, ids: picked.map((x) => x.id), rows: full });
    }

    const list = await this.listCandidates(user, s, { page: p.page, limit: p.limit, search: p.search });
    return {
      rows: list.rows, pagination: list.pagination, availableByType, preselected,
      totals: { requiredMarks, preselectedMarks, matched: requiredMarks === preselectedMarks },
    };
  }
}

const x_active = () => `x."isActive" = true`;

export const candidateService = new CandidateService();
