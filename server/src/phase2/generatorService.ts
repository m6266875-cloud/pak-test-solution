/**
 * PHASE 2 — Paper generator v2 (node-pg).
 *
 * Implements the full wizard contract:
 *   • distribution validation  — Σ(count × marks) === totalMarks
 *   • availability engine      — required vs available (approved, in-scope)
 *   • matching engine          — every query carries the teacher scope + only
 *                                approved/active questions
 *   • auto select              — chapter-even round-robin, no per-paper dups,
 *                                cross-paper uniqueness while the pool allows
 *                                (honest reuse otherwise)
 *   • manual select            — submitted question ids are revalidated
 *                                server-side against the exact scope
 *   • multi-paper batches      — one transaction, variation maximised
 *   • snapshots                — PaperQuestion.type/difficulty/language stored
 *                                at generation time; full config in
 *                                PaperSetting.generationConfig for edits
 */
import { q, q1, run, withTx, TxClient } from './db';
import { hasPerm } from '../phase3/perms';
import { record as recordAudit } from '../phase3/audit';
import { ApiError } from '../utils/apiResponse';
import { loadTeacherScope } from './scope';
import { AuthUser, PaperType, QuestionType } from './types';

const PAPER_TYPES = new Set<string>(['objective', 'subjective', 'mixed']);
const TYPE_GROUPS: Record<string, Set<string>> = {
  objective: new Set(['mcq', 'true_false', 'fill_blank', 'matching']),
  subjective: new Set(['short', 'essay', 'numerical', 'conceptual']),
  mixed: new Set(['mcq', 'short', 'essay', 'true_false', 'fill_blank', 'matching', 'numerical', 'conceptual']),
};
const DIFFS = new Set<string>(['easy', 'medium', 'hard', 'any']);
const LANG = new Set<string>(['english', 'urdu', 'bilingual']);
const STATUSES = new Set<string>(['draft', 'final', 'archived']);
const TYPE_SET = new Set<string>(['mcq', 'short', 'essay', 'true_false', 'fill_blank', 'matching', 'numerical', 'conceptual']);

export interface DistributionRowInput {
  type: string;            // question type (alias 'long' → essay)
  count: number;
  marks: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'any';
}

export interface GenerateInput {
  title?: string;
  examTitle?: string;
  description?: string;
  courseId?: number;
  sessionId?: number;
  classId: number;
  subjectIds: number[];
  bookId?: number;
  chapterIds: number[];
  topicIds?: number[];
  exerciseIds?: number[];
  paperType: PaperType;
  language: 'english' | 'urdu' | 'bilingual';
  totalMarks: number;
  distribution: DistributionRowInput[];
  timeLimit?: number;
  paperCount?: number;
  autoSelect?: boolean;
  questionIds?: number[];
  randomize?: boolean;
  showAnswerKey?: boolean;
  showBubbleSheet?: boolean;
  schoolName?: string;
}

export interface PreviewPoolInput {
  chapterIds: number[];
  topicIds?: number[];
  exerciseIds?: number[];
  language?: 'english' | 'urdu' | 'bilingual';
  type?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'any';
  search?: string;
  paperType?: PaperType;
  distribution?: DistributionRowInput[];
  excludeIds?: number[];
  page?: number;
  limit?: number;
}

interface Resolved {
  subjectIds: number[];
  classId: number;
  courseId: number | null;
  sessionId: number | null;
  bookId: number | null;
  chapterIds: number[];
  topicIds: number[];
  exerciseIds: number[];
  paperType: PaperType;
  language: string;
  rows: { type: QuestionType; count: number; marks: number; difficulty: string }[];
  totalMarks: number;
  title: string;
  examTitle: string | null;
  description: string | null;
  timeLimit: number;
  paperCount: number;
  autoSelect: boolean;
  manualIds: number[];
  schoolName: string | null;
}

interface PoolRow {
  id: number;
  type: string;
  chapterId: number;
  difficulty: string;
  topicId: number | null;
  exerciseId: number | null;
}

/** node-pg: plain objects are JSON-stringified automatically, but ARRAYS are
 * serialized in postgres-array syntax — jsonb params must be explicit JSON. */
const jsonParam = (v: unknown): string | null =>
  v == null ? null : typeof v === 'string' ? v : JSON.stringify(v);

const normType = (t: string): QuestionType => {
  const v = t === 'long' ? 'essay' : t;
  if (!TYPE_SET.has(v)) throw ApiError.badRequest(`Invalid question type '${t}'`);
  return v as QuestionType;
};

/**
 * PHASE 4 — the 5-step wizard no longer asks for a session. Resolve the
 * course's current session (fall back to the most recent linked session)
 * so generated papers still snapshot one, exactly as Phase 3 stored it.
 */
async function currentSessionForCourse(courseId: number): Promise<number | null> {
  const cur = await q1<{ sessionId: number }>(
    `SELECT cs."sessionId" FROM "CourseSession" cs JOIN "AcademicSession" a ON a.id = cs."sessionId"
      WHERE cs."courseId" = $1 ORDER BY (cs.status = 'current') DESC, a."startYear" DESC, cs."sortOrder" LIMIT 1`,
    [courseId]
  );
  return cur?.sessionId ?? null;
}

export class PaperGeneratorV2 {
  /** Validate + fully resolve the request; throws before any write. */
  async resolve(user: AuthUser, input: GenerateInput): Promise<Resolved> {
    const distribution = Array.isArray(input.distribution) ? input.distribution : null;
    if (!distribution || distribution.length === 0) {
      throw ApiError.badRequest('distribution is required (at least one {type,count,marks} row)');
    }
    if (!PAPER_TYPES.has(input.paperType)) throw ApiError.badRequest(`Invalid paperType '${input.paperType}'`);
    if (!LANG.has(input.language)) throw ApiError.badRequest(`Invalid language '${input.language}'`);
    if (!Number.isInteger(input.classId) || input.classId < 1) throw ApiError.badRequest('classId is required');
    const subjectIds = [...new Set((input.subjectIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    if (!subjectIds.length) throw ApiError.badRequest('At least one subject is required');
    const chapterIds = [...new Set((input.chapterIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    if (!chapterIds.length) throw ApiError.badRequest('At least one chapter is required');
    const topicIds = [...new Set((input.topicIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    const exerciseIds = [...new Set((input.exerciseIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);

    const totalMarks = Number(input.totalMarks);
    if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 500) {
      throw ApiError.badRequest('totalMarks must be an integer between 1 and 500');
    }
    const paperCount = Math.min(20, Math.max(1, Number(input.paperCount ?? 1)));
    if (!Number.isInteger(Number(input.paperCount)) && input.paperCount !== undefined) {
      throw ApiError.badRequest('paperCount must be an integer 1..20');
    }

    // distribution validation
    const rows: Resolved['rows'] = [];
    let sum = 0;
    const typeCounts = new Map<string, number>();
    for (const d of distribution) {
      const type = normType(d.type);
      if (!TYPE_GROUPS[input.paperType].has(type)) {
        throw ApiError.badRequest(`Question type '${d.type}' is not allowed for a ${input.paperType} paper`);
      }
      const count = Number(d.count);
      const marks = Number(d.marks);
      if (!Number.isInteger(count) || count < 0 || !Number.isInteger(marks) || marks < 1 || marks > 100) {
        throw ApiError.badRequest(`Invalid distribution row {type: ${d.type}, count: ${d.count}, marks: ${d.marks}}`);
      }
      if (count > 0) {
        rows.push({ type, count, marks, difficulty: d.difficulty ?? 'any' });
        sum += count * marks;
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + count);
      }
    }
    if (!rows.length) throw ApiError.badRequest('Distribution must ask for at least one question');
    if (sum !== totalMarks) {
      throw ApiError.badRequest(
        `Total marks do not match the distribution: selected ${totalMarks}, distribution sums to ${sum}`,
        [{ required: totalMarks, actual: sum, delta: sum - totalMarks }]
      );
    }

    // subjects ↔ class/course
    const subs = await q<{ id: number; classId: number; courseId: number | null; status: string }>(
      `SELECT id, "classId", "courseId", status FROM "Subject" WHERE id = ANY($1::int[])`,
      [subjectIds]
    );
    if (subs.length !== subjectIds.length) {
      const found = new Set(subs.map((s) => s.id));
      throw ApiError.badRequest('Some subjects do not exist', [{ missing: subjectIds.filter((x) => !found.has(x)) }]);
    }
    const badStatus = subs.find((s) => s.status !== 'active');
    if (badStatus) throw ApiError.badRequest(`Subject ${badStatus.id} is not active`);
    for (const s of subs) {
      if (s.classId !== input.classId) {
        throw ApiError.badRequest(`Subject ${s.id} does not belong to class ${input.classId}`);
      }
    }
    const courseIds = new Set(subs.filter((s) => s.courseId != null).map((s) => s.courseId));
    if (input.courseId != null && !courseIds.has(input.courseId)) {
      throw ApiError.badRequest('courseId does not match the selected subjects');
    }
    if (courseIds.size > 1) throw ApiError.badRequest('All subjects must belong to one course');
    const courseId = courseIds.size === 1 ? [...courseIds][0] as number : null;

    // teacher scope (pairwise handled by subject rows)
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      const allowed = new Set(scope.subjectIds);
      const blocked = subjectIds.filter((x) => !allowed.has(x));
      if (blocked.length) {
        throw ApiError.forbidden(`Some subjects are not assigned to you (${blocked.join(', ')})`);
      }
    }

    // chapters ∈ subjects
    const chs = await q<{ id: number; subjectId: number; status: string }>(
      `SELECT id, "subjectId", status FROM "Chapter" WHERE id = ANY($1::int[])`,
      [chapterIds]
    );
    if (chs.length !== chapterIds.length) {
      const found = new Set(chs.map((c) => c.id));
      throw ApiError.badRequest('Some chapters do not exist', [{ missing: chapterIds.filter((x) => !found.has(x)) }]);
    }
    const chSubjects = new Set(chs.map((c) => c.subjectId));
    const wrong = [...chSubjects].filter((sid) => !subjectIds.includes(sid));
    if (wrong.length) throw ApiError.badRequest('Some chapters do not belong to the selected subjects');
    if (chs.some((c) => c.status !== 'active')) throw ApiError.badRequest('Some chapters are not active');

    // topics/exercises ∈ chapters
    if (topicIds.length) {
      const t = await q<{ chapterId: number }>(`SELECT DISTINCT "chapterId" FROM "Topic" WHERE id = ANY($1::int[])`, [topicIds]);
      if (t.length !== topicIds.length || t.some((r) => !chapterIds.includes(r.chapterId))) {
        throw ApiError.badRequest('Some topics do not belong to the selected chapters');
      }
    }
    if (exerciseIds.length) {
      const e = await q<{ chapterId: number }>(`SELECT DISTINCT "chapterId" FROM "Exercise" WHERE id = ANY($1::int[])`, [exerciseIds]);
      if (e.length !== exerciseIds.length || e.some((r) => !chapterIds.includes(r.chapterId))) {
        throw ApiError.badRequest('Some exercises do not belong to the selected chapters');
      }
    }

    // book
    let bookId: number | null = null;
    let sessionId: number | null = input.sessionId != null ? Number(input.sessionId) : null;
    if (input.bookId != null) {
      const b = await q1<{ id: number; subjectId: number; sessionId: number | null; status: string }>(
        `SELECT id, "subjectId", "sessionId", status FROM "Book" WHERE id = $1`, [input.bookId]
      );
      if (!b || b.status !== 'active') throw ApiError.badRequest('Invalid or inactive bookId');
      if (!subjectIds.includes(b.subjectId)) throw ApiError.badRequest('The book does not belong to the selected subjects');
      bookId = b.id;
      if (b.sessionId != null) {
        if (sessionId != null && sessionId !== b.sessionId) {
          throw ApiError.badRequest('sessionId conflicts with the book\'s academic session');
        }
        sessionId = b.sessionId;
      }
    }

    // Phase 4 — stamp the course's current session when the caller (5-step
    // wizard) did not submit one explicitly.
    if (sessionId == null && courseId != null) {
      sessionId = await currentSessionForCourse(courseId);
    }

    // manual question ids
    const autoSelect = input.autoSelect !== false;
    const manualIds = autoSelect ? [] : [...new Set((input.questionIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    if (!autoSelect && manualIds.length === 0) {
      throw ApiError.badRequest('questionIds are required when autoSelect is false');
    }
    // manual count check per type must happen after pool fetch (types known only from DB)

    const defaultTitle = `Paper — ${await this.classLabel(input.classId)} (${input.language})`;
    return {
      subjectIds, classId: input.classId, courseId, sessionId, bookId, chapterIds, topicIds, exerciseIds,
      paperType: input.paperType, language: input.language,
      rows, totalMarks,
      title: (input.title ?? '').trim() || defaultTitle,
      examTitle: (input.examTitle ?? '').trim() || null,
      description: (input.description ?? '').trim() || null,
      timeLimit: Math.min(240, Math.max(10, Number(input.timeLimit ?? 90))),
      paperCount,
      autoSelect,
      manualIds,
      schoolName: (input.schoolName ?? '').trim().slice(0, 200) || null,
    };
  }

  /** Per-type availability inside the resolved scope (approved + active). */
  async availability(user: AuthUser, r: Resolved): Promise<Record<string, number>> {
    const where = [`x."chapterId" = ANY($1::int[])`, `x.status = 'approved'`, `x."isActive" = true`];
    const params: unknown[] = [r.chapterIds];
    const push = (v: unknown) => {
      params.push(v);
      return params.length;
    };
    if (r.topicIds.length) { const i = push(r.topicIds); where.push(`x."topicId" = ANY($${i}::int[])`); }
    if (r.exerciseIds.length) { const i = push(r.exerciseIds); where.push(`x."exerciseId" = ANY($${i}::int[])`); }
    if (r.language === 'english' || r.language === 'urdu') {
      const i = push(r.language);
      where.push(`x.language = $${i}`);
    } else {
      // bilingual/dual papers may mix both languages + bilingual rows
      const i = push(['english', 'urdu', 'bilingual']);
      where.push(`x.language = ANY($${i}::text[])`);
    }
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      if (!scope.subjectIds.length) return {};
      const i = push(scope.subjectIds);
      where.push(`x."subjectId" = ANY($${i}::int[])`);
    }
    const rows = await q<{ type: string; n: string }>(
      `SELECT x.type, count(*)::int AS n FROM "Question" x WHERE ${where.join(' AND ')} GROUP BY x.type`,
      params
    );
    const map: Record<string, number> = {};
    for (const t of TYPE_SET) map[t] = 0;
    for (const rw of rows) map[rw.type] = Number(rw.n);
    return map;
  }

  /**
   * PHASE 4 — candidate pool for wizard Step 4 (preview, nothing persisted).
   * Same scope + approval semantics as generate(): chapters must exist and be
   * active, teachers are restricted to their assigned subjects, only
   * approved/active questions are returned. Paginated — the client never
   * receives the whole bank. When `distribution` is supplied, `suggestedIds`
   * holds a chapter-even auto-pick produced by the same draw logic as
   * generate(), so "shuffle" is simply another call.
   */
  async previewPool(user: AuthUser, input: PreviewPoolInput) {
    const chapterIds = [...new Set((input.chapterIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    if (!chapterIds.length) throw ApiError.badRequest('chapterIds are required');
    const topicIds = [...new Set((input.topicIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    const exerciseIds = [...new Set((input.exerciseIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    const excludeIds = [...new Set((input.excludeIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);

    const language = input.language ?? 'bilingual';
    if (!LANG.has(language)) throw ApiError.badRequest(`Invalid language '${input.language}'`);
    const type = input.type != null ? normType(input.type) : null;
    const difficulty = input.difficulty ?? 'any';
    if (!DIFFS.has(difficulty)) throw ApiError.badRequest(`Invalid difficulty '${input.difficulty}'`);

    const chs = await q<{ id: number; subjectId: number; status: string }>(
      `SELECT id, "subjectId", status FROM "Chapter" WHERE id = ANY($1::int[])`,
      [chapterIds]
    );
    if (chs.length !== chapterIds.length) {
      const found = new Set(chs.map((c) => c.id));
      throw ApiError.badRequest('Some chapters do not exist', [{ missing: chapterIds.filter((x) => !found.has(x)) }]);
    }
    if (chs.some((c) => c.status !== 'active')) throw ApiError.badRequest('Some chapters are not active');
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      const blocked = [...new Set(chs.map((c) => c.subjectId))].filter((sid) => !scope.subjectIds.includes(sid));
      if (blocked.length) throw ApiError.forbidden('Some chapters are not assigned to you');
    }

    // shared scope predicate (chapters × topics × exercises × language × teacher)
    const where = [`x."chapterId" = ANY($1::int[])`, `x.status = 'approved'`, `x."isActive" = true`];
    const params: unknown[] = [chapterIds];
    const push = (v: unknown) => { params.push(v); return params.length; };
    if (topicIds.length) { const i = push(topicIds); where.push(`x."topicId" = ANY($${i}::int[])`); }
    if (exerciseIds.length) { const i = push(exerciseIds); where.push(`x."exerciseId" = ANY($${i}::int[])`); }
    if (language === 'english' || language === 'urdu') {
      const i = push(language);
      where.push(`x.language = $${i}`);
    } else {
      const i = push(['english', 'urdu', 'bilingual']);
      where.push(`x.language = ANY($${i}::text[])`);
    }
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      if (!scope.subjectIds.length) {
        return { rows: [], total: 0, page: 1, limit: 0, countsByType: {}, suggestedIds: input.distribution?.length ? [] : null };
      }
      const i = push(scope.subjectIds);
      where.push(`x."subjectId" = ANY($${i}::int[])`);
    }
    const baseWhere = where.join(' AND ');
    const baseParams = [...params];

    // per-type counts inside the scope (ignores type/search/exclude filters)
    const counts: Record<string, number> = {};
    for (const t of TYPE_SET) counts[t] = 0;
    const countRows = await q<{ type: string; n: string }>(
      `SELECT x.type, count(*)::int AS n FROM "Question" x WHERE ${baseWhere} GROUP BY x.type`,
      baseParams
    );
    for (const r of countRows) counts[r.type] = Number(r.n);

    // paginated candidate rows
    const page = Math.max(1, Number(input.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(input.limit ?? 50) || 50));
    const rowWhere = [baseWhere];
    const rowParams: unknown[] = [...baseParams];
    const rpush = (v: unknown) => { rowParams.push(v); return rowParams.length; };
    if (type) { const i = rpush(type); rowWhere.push(`x.type = $${i}`); }
    if (difficulty !== 'any') { const i = rpush(difficulty); rowWhere.push(`x.difficulty = $${i}`); }
    if (excludeIds.length) { const i = rpush(excludeIds); rowWhere.push(`NOT (x.id = ANY($${i}::int[]))`); }
    const term = (input.search ?? '').trim();
    if (term) { const i = rpush(`%${term.replace(/[\\%_]/g, '\\$&')}%`); rowWhere.push(`x.text ILIKE $${i}`); }
    const whereSql = rowWhere.join(' AND ');
    const [rows, cnt] = await Promise.all([
      q(
        `SELECT x.id, x.type, x.text, x.marks, x.options, x.answer, x.difficulty, x.language,
                x."chapterId", ch.number AS "chapterNumber", ch.name AS "chapterName",
                x."exerciseId", e.number AS "exerciseNumber", e.name AS "exerciseName"
           FROM "Question" x
           JOIN "Chapter" ch ON ch.id = x."chapterId"
           LEFT JOIN "Exercise" e ON e.id = x."exerciseId"
          WHERE ${whereSql} ORDER BY x.id LIMIT $${rowParams.length + 1} OFFSET $${rowParams.length + 2}`,
        [...rowParams, limit, (page - 1) * limit]
      ),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Question" x WHERE ${whereSql}`, rowParams),
    ]);

    // optional auto-pick suggestion (same draw logic as generate())
    let suggestedIds: number[] | null = null;
    if (input.distribution && input.distribution.length) {
      if (input.paperType != null && !PAPER_TYPES.has(input.paperType)) {
        throw ApiError.badRequest(`Invalid paperType '${input.paperType}'`);
      }
      const distRows: { type: QuestionType; count: number; marks: number; difficulty: string }[] = [];
      for (const d of input.distribution) {
        const dt = normType(d.type);
        if (input.paperType && !TYPE_GROUPS[input.paperType].has(dt)) {
          throw ApiError.badRequest(`Question type '${d.type}' is not allowed for a ${input.paperType} paper`);
        }
        const count = Number(d.count);
        const marks = Number(d.marks);
        if (!Number.isInteger(count) || count < 0 || count > 200 || !Number.isInteger(marks) || marks < 1 || marks > 100) {
          throw ApiError.badRequest(`Invalid distribution row {type: ${d.type}, count: ${d.count}, marks: ${d.marks}}`);
        }
        const dd = d.difficulty ?? 'any';
        if (!DIFFS.has(dd)) throw ApiError.badRequest(`Invalid difficulty '${d.difficulty}'`);
        if (count > 0) distRows.push({ type: dt, count, marks, difficulty: dd });
      }
      const pool = await q<PoolRow>(
        `SELECT x.id, x.type, x."chapterId", x.difficulty, x."topicId", x."exerciseId"
           FROM "Question" x WHERE ${baseWhere} ORDER BY x.id`,
        baseParams
      );
      const byType = new Map<string, PoolRow[]>();
      for (const prow of pool) {
        if (!byType.has(prow.type)) byType.set(prow.type, []);
        byType.get(prow.type)!.push(prow);
      }
      const used = new Set<number>();
      suggestedIds = [];
      for (const row of distRows) {
        const chosen = this.drawForRow(byType.get(row.type) ?? [], row, null, used);
        for (const c of chosen) { used.add(c.id); suggestedIds!.push(c.id); }
      }
    }

    // full rows for the suggestion so the client can render picks instantly
    let suggestedRows: unknown[] = [];
    if (suggestedIds && suggestedIds.length) {
      suggestedRows = await q(
        `SELECT x.id, x.type, x.text, x.marks, x.options, x.answer, x.difficulty, x.language,
                x."chapterId", ch.number AS "chapterNumber", ch.name AS "chapterName",
                x."exerciseId", e.number AS "exerciseNumber", e.name AS "exerciseName"
           FROM "Question" x
           JOIN "Chapter" ch ON ch.id = x."chapterId"
           LEFT JOIN "Exercise" e ON e.id = x."exerciseId"
          WHERE x.id = ANY($1::int[])`,
        [suggestedIds]
      );
    }

    return { rows, total: Number(cnt?.n ?? 0), page, limit, countsByType: counts, suggestedIds, suggestedRows };
  }

  /**
   * The full batch: resolve → availability check → per-paper selection →
   * one transaction persisting all papers. Returns summaries + warnings.
   */
  async generate(user: AuthUser, input: GenerateInput) {
    const r = await this.resolve(user, input);

    const avail = await this.availability(user, r);
    const shortages: string[] = [];
    for (const row of r.rows) {
      if (avail[row.type] < row.count) shortages.push(`${row.count}× ${row.type} required, only ${avail[row.type]} available`);
    }
    if (shortages.length) {
      const e = new ApiError('Insufficient approved questions for the selected scope', 422, [] as any);
      (e as any).details = {
        shortages,
        available: avail,
        required: Object.fromEntries(r.rows.map((x) => [x.type, x.count])),
        suggestions: [
          'Select more chapters or the full book',
          'Select more topics or remove the topic restriction',
          'Remove the exercise restriction',
          'Change the question type',
          'Reduce the required quantity',
        ],
      };
      throw e;
    }

    // total pool size per type across the batch → decide cross-paper strategy
    const pool = await this.fetchPool(user, r);
    const byType = new Map<string, PoolRow[]>();
    for (const qrow of pool) {
      if (!byType.has(qrow.type)) byType.set(qrow.type, []);
      byType.get(qrow.type)!.push(qrow);
    }

    // manual path: no randomness, ids revalidated
    let selections: { rows: Resolved['rows']; idsByType: Map<string, number[]> }[] = [];
    if (!r.autoSelect) {
      const found = await q<{ id: number; type: string; chapterId: number; topicId: number | null; exerciseId: number | null; status: string; isActive: boolean }>(
        `SELECT id, type, "chapterId", "topicId", "exerciseId", status, "isActive" FROM "Question" WHERE id = ANY($1::int[])`,
        [r.manualIds]
      );
      if (found.length !== r.manualIds.length) {
        throw ApiError.badRequest('Some selected questions do not exist');
      }
      const bad = found.filter(
        (x) => x.status !== 'approved' || !x.isActive || !r.chapterIds.includes(x.chapterId)
        || (r.topicIds.length && x.topicId != null && !r.topicIds.includes(x.topicId))
        || (r.exerciseIds.length && x.exerciseId != null && !r.exerciseIds.includes(x.exerciseId))
      );
      if (bad.length) throw ApiError.badRequest('Some selected questions are not approved/active or fall outside the selected scope');
      if (user.role === 'teacher') {
        const scope = await loadTeacherScope(user.id);
        const scopedIds = new Set(
          (await q<{ subjectId: number }>(`SELECT "subjectId" FROM "Question" WHERE id = ANY($1::int[])`, [r.manualIds])).map((x) => x.subjectId)
        );
        const blocked = [...scopedIds].filter((sid) => !scope.subjectIds.includes(sid));
        if (blocked.length) throw ApiError.forbidden('Some selected questions are outside your assigned subjects');
      }
      // per-type counts must equal distribution
      const countByType = new Map<string, number>();
      for (const f of found) countByType.set(f.type, (countByType.get(f.type) ?? 0) + 1);
      const mism = r.rows.filter((row) => (countByType.get(row.type) ?? 0) !== row.count);
      if (mism.length) {
        throw ApiError.badRequest('Selected question counts do not match the distribution', [
          mism.map((m) => ({ type: m.type, required: m.count, selected: countByType.get(m.type) ?? 0 })),
        ]);
      }
      const idsByType = new Map<string, number[]>();
      for (const f of found) {
        if (!idsByType.has(f.type)) idsByType.set(f.type, []);
        idsByType.get(f.type)!.push(f.id);
      }
      selections = [{ rows: r.rows, idsByType }];
    }

    const warnings: string[] = [];
    if (r.autoSelect) {
      // Strategy: keep papers disjoint while the per-type pool allows it;
      // when the pool is smaller than needed × paperCount we say so honestly
      // and let later papers reuse questions (per-paper duplicates never).
      const totalNeeded: Record<string, number> = {};
      for (const row of r.rows) totalNeeded[row.type] = (totalNeeded[row.type] ?? 0) + row.count * r.paperCount;
      const strict = Object.entries(totalNeeded).every(([t, need]) => (byType.get(t)?.length ?? 0) >= need);
      if (!strict) {
        warnings.push('The question bank does not contain enough unique questions for fully unique papers — some questions may repeat across papers.');
      }
      const usedGlobal = new Set<number>();
      const usedInPaper = new Set<number>();
      selections = [];
      for (let pi = 1; pi <= r.paperCount; pi++) {
        const idsByType = new Map<string, number[]>();
        for (const row of r.rows) {
          const chosen = this.drawForRow(
            byType.get(row.type) ?? [],
            row,
            strict ? usedGlobal : null, // null ⇒ reuse across papers allowed
            usedInPaper
          );
          for (const c of chosen) {
            usedGlobal.add(c.id);
            usedInPaper.add(c.id);
            if (!idsByType.has(row.type)) idsByType.set(row.type, []);
            idsByType.get(row.type)!.push(c.id);
          }
        }
        // per-paper totals must still match the distribution exactly
        for (const row of r.rows) {
          if ((idsByType.get(row.type) ?? []).length !== row.count) {
            const e = new ApiError(
              `Could not fill ${row.count}× ${row.type} (difficulty ${row.difficulty}) — too few approved questions in this exact mix`,
              422, [] as any
            );
            (e as any).details = { shortages: [`${row.count}× ${row.type} (${row.difficulty})`] };
            throw e;
          }
        }
        usedInPaper.clear();
        selections.push({ rows: r.rows, idsByType });
      }
    }

    // persist
    const papers = await withTx(async (tx) => {
      const out: any[] = [];
      for (let p = 0; p < selections.length; p++) {
        const paper = await this.insertPaper(tx, user, r, selections[p], p + 1, r.paperCount, warnings);
        out.push(paper);
      }
      return out;
    });

    // Phase 4 — generation audit trail (record() never throws).
    await recordAudit(user, {
      action: 'paper.generate', entity: 'Paper', entityId: papers[0]?.id ?? null,
      meta: {
        paperIds: papers.map((p: any) => p.id), paperCount: r.paperCount,
        courseId: r.courseId, classId: r.classId, subjectIds: r.subjectIds,
        totalMarks: r.totalMarks, paperType: r.paperType, warnings,
      },
    });

    return { papers, warnings, available: avail };
  }

  /**
   * Draw `row.count` questions for one distribution row.
   *   - candidates = pool ∩ difficulty ∩ (per-paper unused) ∩ (forbidAll when strict)
   *   - chapter-even shuffle for spread
   *   - if the strict pool is exhausted mid-batch, refill from the same
   *     difficulty slice while still never duplicating inside one paper.
   */
  private drawForRow(pool: PoolRow[], row: Resolved['rows'][number], forbidAll: Set<number> | null, usedInPaper: Set<number>): PoolRow[] {
    const slice = (src: PoolRow[]) =>
      row.difficulty === 'any' ? src.slice() : src.filter((x) => x.difficulty === row.difficulty);
    let candidates = slice(pool).filter((x) => !usedInPaper.has(x.id));
    if (forbidAll) candidates = candidates.filter((x) => !forbidAll.has(x.id));

    const picked: PoolRow[] = [];
    if (candidates.length < row.count) {
      // refill from the full (unforbidden) difficulty slice — may repeat a
      // question already used by an earlier paper, never within this paper
      const refill = slice(pool).filter((x) => !usedInPaper.has(x.id) && !picked.some((p) => p.id === x.id));
      candidates = candidates.concat(refill);
    }
    // chapter-even round robin over a shuffled chapter order
    const byChapter = new Map<number, PoolRow[]>();
    for (const c of candidates) {
      if (!byChapter.has(c.chapterId)) byChapter.set(c.chapterId, []);
      byChapter.get(c.chapterId)!.push(c);
    }
    const chapters = [...byChapter.keys()];
    this.shuffle(chapters);
    let guard = 0;
    while (picked.length < row.count && guard++ < 100000) {
      let added = false;
      for (const ch of chapters) {
        const arr = byChapter.get(ch)!;
        if (arr.length) {
          const idx = Math.floor(Math.random() * arr.length);
          const item = arr.splice(idx, 1)[0];
          picked.push(item);
          added = true;
          if (picked.length >= row.count) break;
        }
      }
      if (!added) break;
    }
    return picked.slice(0, row.count);
  }

  private async insertPaper(tx: TxClient, user: AuthUser, r: Resolved, sel: { rows: Resolved['rows']; idsByType: Map<string, number[]> }, paperIndex: number, paperCount: number, warnings: string[]) {
    const title = paperCount > 1 ? `${r.title} (Paper ${paperIndex}/${paperCount})` : r.title;
    // Phase 3 — automatic school branding snapshot: paper records its school
    // and carries the school name/logo/watermark defaults forward, so no
    // teacher ever uploads a logo per paper.
    let resolvedSchoolName = r.schoolName;
    let schoolLogoUrl: string | null = null;
    let schoolBranding: Record<string, unknown> | null = null;
    if (user.schoolId) {
      const sch = await q1<{ name: string; logoUrl: string | null; branding: any }>(
        `SELECT name, "logoUrl", branding FROM "School" WHERE id = $1 AND status = 'active'`, [user.schoolId]);
      if (sch) {
        if (!resolvedSchoolName) resolvedSchoolName = sch.name;
        if (sch.logoUrl) {
          const ext = String(sch.logoUrl).split('.').pop();
          schoolLogoUrl = `/api/v3/schools/${user.schoolId}/logo?v=${ext}`;
        }
        const wm = sch.branding?.watermark ?? {};
        schoolBranding = {
          watermark: {
            enabled: Boolean(wm.enabled),
            opacity: Number.isFinite(Number(wm.opacity)) ? Number(wm.opacity) : 0.07,
            size: Number.isFinite(Number(wm.size)) ? Number(wm.size) : 45,
            position: wm.position ?? 'center',
          },
          header: {
            showSchoolName: sch.branding?.header?.showSchoolName !== false,
            showLogo: sch.branding?.header?.showLogo !== false,
            showContact: Boolean(sch.branding?.header?.showContact),
          },
          templateId: null,
          date: null,
          instructions: null,
        };
      }
    }
    const pRes = await tx.query(
      `INSERT INTO "Paper" ("title","description","teacherId","createdById","schoolId","classId","medium","totalMarks","timeLimit","status",
                            "courseId","sessionId","bookId","paperType","examTitle","isPublished","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11,$12,$13,$14,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [title, r.description, user.id, user.id, user.schoolId, r.classId, r.language, r.totalMarks, r.timeLimit, r.courseId, r.sessionId, r.bookId, r.paperType, r.examTitle]
    );
    const paperId = Number(pRes.rows[0].id);

    for (const sid of r.subjectIds) {
      await tx.query(`INSERT INTO "PaperSubject" ("paperId","subjectId") VALUES ($1,$2)`, [paperId, sid]);
    }
    for (const cid of r.chapterIds) {
      await tx.query(`INSERT INTO "PaperChapter" ("paperId","chapterId") VALUES ($1,$2)`, [paperId, cid]);
    }

    // question rows: iterate the distribution order, keep per-type submitted order
    let order = 0;
    const qRows: Array<[number, number, number, number, string | null, string | null]> = []; // paperId filled later via tx
    const snapshot = await q(
      `SELECT id, type, difficulty, language FROM "Question" WHERE id = ANY($1::int[])`,
      [[...sel.idsByType.values()].flat()]
    );
    const snap = new Map(snapshot.map((s) => [s.id, s]));
    const legacy = { mcq: 0, mcqMarks: 1, short: 0, shortMarks: 1, essay: 0, essayMarks: 1, total: 0 };
    for (const row of sel.rows) {
      const ids = sel.idsByType.get(row.type) ?? [];
      for (const qid of ids) {
        const s = snap.get(qid);
        await tx.query(
          `INSERT INTO "PaperQuestion" ("paperId","questionId","marks","order","isSelected","type","difficulty","language","createdAt")
           VALUES ($1,$2,$3,$4,true,$5,$6,$7,CURRENT_TIMESTAMP)`,
          [paperId, qid, row.marks, order++, s?.type ?? null, s?.difficulty ?? null, s?.language ?? null]
        );
        legacy.total++;
        if (row.type === 'mcq') { legacy.mcq++; legacy.mcqMarks = row.marks; }
        if (row.type === 'short') { legacy.short++; legacy.shortMarks = row.marks; }
        if (row.type === 'essay') { legacy.essay++; legacy.essayMarks = row.marks; }
      }
    }

    const config = {
      courseId: r.courseId, sessionId: r.sessionId, classId: r.classId, subjectIds: r.subjectIds,
      bookId: r.bookId, chapterIds: r.chapterIds, topicIds: r.topicIds, exerciseIds: r.exerciseIds,
      paperType: r.paperType, language: r.language, totalMarks: r.totalMarks,
      distribution: r.rows, timeLimit: r.timeLimit, paperCount, paperIndex,
      autoSelect: r.autoSelect,
    };
    await tx.query(
      `INSERT INTO "PaperSetting" ("paperId","questionCount","mcqCount","mcqMarks","shortCount","shortMarks","essayCount","essayMarks",
                                   "randomize","ignoreMarksEnabled","distribution","generationConfig","paperCount","paperIndex","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,false,$9,$10,$11,$12,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [paperId, legacy.total, legacy.mcq, legacy.mcqMarks, legacy.short, legacy.shortMarks, legacy.essay, legacy.essayMarks,
       jsonParam(r.rows), jsonParam(config), paperCount, paperIndex]
    );
    await tx.query(
      `INSERT INTO "PaperFormatting" ("paperId","schoolName","schoolLogoUrl","branding","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [paperId, resolvedSchoolName, schoolLogoUrl, JSON.stringify(schoolBranding ?? {})]
    );
    return { id: paperId, title, totalMarks: r.totalMarks, paperType: r.paperType, questionCount: legacy.total, paperIndex, paperCount };
  }

  // ── reads / edits ─────────────────────────────────────────────────────────
  async getPaper(user: AuthUser, paperId: number) {
    const paper = await q1<any>(
      `SELECT p.*, c.name AS "className", c.grade, co.code AS "courseCode", co.name AS "courseName",
              b.title AS "bookTitle", t.name AS "teacherName"
         FROM "Paper" p
         JOIN "Class" c ON c.id = p."classId"
         LEFT JOIN "Course" co ON co.id = p."courseId"
         LEFT JOIN "Book" b ON b.id = p."bookId"
         JOIN "User" t ON t.id = p."teacherId"
        WHERE p.id = $1`,
      [paperId]
    );
    if (!paper) throw ApiError.notFound('Paper not found');
    if (user.role === 'teacher' && paper.teacherId !== user.id) throw ApiError.forbidden('You do not own this paper');

    const [subjects, chapters, questions, settings, formatting] = await Promise.all([
      q<any>(`SELECT s.id, s.name, s.code, s.medium FROM "PaperSubject" ps JOIN "Subject" s ON s.id = ps."subjectId" WHERE ps."paperId" = $1 ORDER BY s.id`, [paperId]),
      q<any>(`SELECT ch.id, ch.number, ch.name FROM "PaperChapter" pc JOIN "Chapter" ch ON ch.id = pc."chapterId" WHERE pc."paperId" = $1 ORDER BY ch.number`, [paperId]),
      q<any>(
        `SELECT pq.id AS "paperQuestionId", pq."questionId", pq.marks, pq."order", pq."isSelected",
                pq.type AS "snapshotType", pq.difficulty AS "snapshotDifficulty", pq.language AS "snapshotLanguage",
                pq."displayTextOverride", q.text, q.options, q.answer, q.difficulty, q.language, q.type, q.images
           FROM "PaperQuestion" pq JOIN "Question" q ON q.id = pq."questionId"
          WHERE pq."paperId" = $1 ORDER BY pq."order"`,
        [paperId]
      ),
      q1<any>(`SELECT * FROM "PaperSetting" WHERE "paperId" = $1`, [paperId]),
      q1<any>(`SELECT * FROM "PaperFormatting" WHERE "paperId" = $1`, [paperId]),
    ]);
    return { ...paper, subjects, chapters, questions, settings, formatting };
  }

  async list(user: AuthUser, f: { page?: number; limit?: number; status?: string; courseId?: number; classId?: number; subjectId?: number; schoolId?: number; teacherId?: number; search?: string; from?: string; to?: string } = {}) {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 10));
    const where: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    const add = (sql: string, v: unknown) => { where.push(sql.replace('?', `$${p++}`)); params.push(v); };
    if (user.role === 'teacher') add('p."teacherId" = ?', user.id);
    if (user.role === 'school_admin') add('p."schoolId" = ?', user.schoolId ?? -1); // Phase 3 school isolation
    if (user.role === 'super_admin' && f.schoolId) add('p."schoolId" = ?', f.schoolId);
    if (f.teacherId && user.role !== 'teacher') add('p."teacherId" = ?', f.teacherId);
    if (f.status) {
      if (!STATUSES.has(f.status)) throw ApiError.badRequest(`Invalid status '${f.status}'`);
      add('p.status = ?', f.status);
    }
    if (f.courseId) add('p."courseId" = ?', f.courseId);
    if (f.classId) add('p."classId" = ?', f.classId);
    if (f.subjectId) add(`EXISTS (SELECT 1 FROM "PaperSubject" ps WHERE ps."paperId" = p.id AND ps."subjectId" = ?)`, f.subjectId);
    if (f.search) add('p.title ILIKE ?', `%${f.search}%`);
    if (f.from) add('p."createdAt" >= ?', new Date(f.from));
    if (f.to) add('p."createdAt" <= ?', new Date(f.to));
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows, cnt] = await Promise.all([
      q<any>(
        `SELECT p.id, p.title, p."paperType", p.medium, p.status, p."totalMarks", p."timeLimit", p."createdAt", p."updatedAt",
                p."classId", p."courseId", p."sessionId", p."examTitle", c.name AS "className", c.grade,
                co.code AS "courseCode", u.name AS "teacherName",
                (SELECT json_agg(json_build_object('id', s.id, 'name', s.name)) FROM "PaperSubject" ps JOIN "Subject" s ON s.id = ps."subjectId" WHERE ps."paperId" = p.id) AS subjects,
                (SELECT count(*) FROM "PaperQuestion" pq WHERE pq."paperId" = p.id AND pq."isSelected")::int AS "questionCount"
           FROM "Paper" p
           JOIN "Class" c ON c.id = p."classId"
           LEFT JOIN "Course" co ON co.id = p."courseId"
           JOIN "User" u ON u.id = p."teacherId"
           ${whereSql}
           ORDER BY p."createdAt" DESC, p.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, (page - 1) * limit]
      ),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Paper" p ${whereSql}`, params),
    ]);
    return { rows, total: Number(cnt?.n ?? 0), page, limit };
  }

  async updateMeta(user: AuthUser, paperId: number, body: { title?: string; status?: string; examTitle?: string; description?: string; totalMarks?: number }) {
    await this.assertCanManage(user, paperId);
    const changedKeys = ['title', 'examTitle', 'description', 'totalMarks', 'status'].filter((k) => (body as any)[k] !== undefined);
    const sets: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (body.title !== undefined) { sets.push(`"title" = $${p++}`); params.push(String(body.title).trim() || 'Untitled paper'); }
    if (body.examTitle !== undefined) { sets.push(`"examTitle" = $${p++}`); params.push(body.examTitle == null ? null : String(body.examTitle)); }
    if (body.description !== undefined) { sets.push(`description = $${p++}`); params.push(body.description == null ? null : String(body.description)); }
    if (body.totalMarks !== undefined) {
      const t = Number(body.totalMarks);
      if (!Number.isInteger(t) || t < 1 || t > 500) throw ApiError.badRequest('totalMarks must be an integer between 1 and 500');
      sets.push(`"totalMarks" = $${p++}`);
      params.push(t);
    }
    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) throw ApiError.badRequest(`Invalid status '${body.status}'`);
      sets.push(`status = $${p++}`);
      params.push(body.status);
    }
    if (sets.length) {
      params.push(paperId);
      await run(`UPDATE "Paper" SET ${sets.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
      // Phase 4 — "paper saved" audit trail (status-only callers may add their own row).
      await recordAudit(user, { action: 'paper.save', entity: 'Paper', entityId: paperId, meta: { fields: changedKeys, status: body.status ?? null } });
    }
    return this.getPaper(user, paperId);
  }

  /** Print/publish formatting knobs stored on PaperFormatting (school name,
   * header note). Additive upsert so v1 papers also work. */
  async updateFormatting(user: AuthUser, paperId: number, body: { schoolName?: string | null; headerNote?: string | null }) {
    await this.assertCanManage(user, paperId);
    const { schoolName, headerNote } = body;
    if (schoolName !== undefined && schoolName !== null && String(schoolName).length > 200) {
      throw ApiError.badRequest('schoolName must be at most 200 characters');
    }
    if (headerNote !== undefined && headerNote !== null && String(headerNote).length > 500) {
      throw ApiError.badRequest('headerNote must be at most 500 characters');
    }
    const exists = await q1<{ id: number }>(`SELECT id FROM "PaperFormatting" WHERE "paperId" = $1`, [paperId]);
    if (exists) {
      const sets: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      if (schoolName !== undefined) { sets.push(`"schoolName" = $${p++}`); params.push(schoolName == null || String(schoolName).trim() === '' ? null : String(schoolName).trim()); }
      if (headerNote !== undefined) { sets.push(`"headerNote" = $${p++}`); params.push(headerNote == null || String(headerNote).trim() === '' ? null : String(headerNote).trim()); }
      if (sets.length) {
        params.push(paperId);
        await run(`UPDATE "PaperFormatting" SET ${sets.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE "paperId" = $${params.length}`, params);
      }
    } else {
      await run(
        `INSERT INTO "PaperFormatting" ("paperId","schoolName","headerNote","createdAt","updatedAt") VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [paperId, schoolName == null || String(schoolName).trim() === '' ? null : String(schoolName).trim(),
         headerNote == null || String(headerNote).trim() === '' ? null : String(headerNote).trim()]
      );
    }
    return this.getPaper(user, paperId);
  }

  /** Replace question set / order / marks (regeneration from stored config). */
  async replaceQuestions(user: AuthUser, paperId: number, body: { questionIds: number[]; marksByQuestion?: Record<string, number> }) {
    await this.assertCanManage(user, paperId);
    const paper = await q1<any>(`SELECT * FROM "Paper" WHERE id = $1`, [paperId]);
    if (!paper) throw ApiError.notFound('Paper not found');
    const ids = [...new Set((body.questionIds ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) throw ApiError.badRequest('questionIds are required');
    if (ids.length !== (body.questionIds ?? []).length) throw ApiError.badRequest('Duplicate question ids are not allowed');

    const chapters = (await q<{ id: number }>(`SELECT "chapterId" AS id FROM "PaperChapter" WHERE "paperId" = $1`, [paperId])).map((x) => x.id);
    const found = await q<any>(
      `SELECT id, type, difficulty, language, "chapterId", "topicId", "exerciseId", status, "isActive", "subjectId"
         FROM "Question" WHERE id = ANY($1::int[])`,
      [ids]
    );
    if (found.length !== ids.length) throw ApiError.badRequest('Some questions do not exist');
    const bad = found.filter((x) => x.status !== 'approved' || !x.isActive || !chapters.includes(x.chapterId));
    if (bad.length) throw ApiError.badRequest('Some questions are not approved/active or fall outside this paper\'s chapters');
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      const blocked = found.filter((x) => !scope.subjectIds.includes(x.subjectId));
      if (blocked.length) throw ApiError.forbidden('Some questions are outside your assigned subjects');
    }

    const marksBy = body.marksByQuestion ?? {};
    await withTx(async (tx) => {
      await tx.query(`DELETE FROM "PaperQuestion" WHERE "paperId" = $1`, [paperId]);
      let order = 0;
      for (const qid of ids) {
        const f = found.find((x) => x.id === qid)!;
        const marks = marksBy[String(qid)] != null ? Number(marksBy[String(qid)]) : null;
        await tx.query(
          `INSERT INTO "PaperQuestion" ("paperId","questionId","marks","order","isSelected","type","difficulty","language","createdAt")
           VALUES ($1,$2,$3,$4,true,$5,$6,$7,CURRENT_TIMESTAMP)`,
          [paperId, qid, Number.isInteger(marks) && (marks as number) >= 1 ? marks : 1, order++, f.type, f.difficulty, f.language]
        );
      }
    });
    // Phase 4 — question selection audit trail.
    await recordAudit(user, { action: 'paper.questions.select', entity: 'Paper', entityId: paperId, meta: { questionCount: ids.length } });
    return this.getPaper(user, paperId);
  }

  async duplicate(user: AuthUser, paperId: number) {
    const paper = await this.assertCanManage(user, paperId);
    const newId = await withTx(async (tx) => {
      const ins = await tx.query(
        `INSERT INTO "Paper" ("title","description","teacherId","createdById","schoolId","classId","medium","totalMarks","timeLimit","status",
                              "courseId","sessionId","bookId","paperType","examTitle","isPublished","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11,$12,$13,$14,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
        [`${paper.title} (copy)`, paper.description, paper.teacherId, user.id, paper.schoolId ?? null, paper.classId, paper.medium, paper.totalMarks, paper.timeLimit,
         paper.courseId, paper.sessionId, paper.bookId, paper.paperType, paper.examTitle]
      );
      const id = Number(ins.rows[0].id);
      await tx.query(`INSERT INTO "PaperSubject" ("paperId","subjectId") SELECT $1, "subjectId" FROM "PaperSubject" WHERE "paperId" = $2`, [id, paperId]);
      await tx.query(`INSERT INTO "PaperChapter" ("paperId","chapterId") SELECT $1, "chapterId" FROM "PaperChapter" WHERE "paperId" = $2`, [id, paperId]);
      const set = await q1<any>(`SELECT * FROM "PaperSetting" WHERE "paperId" = $1`, [paperId]);
      if (set) {
        await tx.query(
          `INSERT INTO "PaperSetting" ("paperId","questionCount","mcqCount","mcqMarks","shortCount","shortMarks","essayCount","essayMarks",
                                       "randomize","ignoreMarksEnabled","distribution","generationConfig","paperCount","paperIndex","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          [id, set.questionCount, set.mcqCount, set.mcqMarks, set.shortCount, set.shortMarks, set.essayCount, set.essayMarks,
           set.randomize, set.ignoreMarksEnabled, jsonParam(set.distribution), jsonParam(set.generationConfig), set.paperCount, set.paperIndex]
        );
      }
      const fmt = await q1<any>(`SELECT * FROM "PaperFormatting" WHERE "paperId" = $1`, [paperId]);
      if (fmt) {
        await tx.query(
          `INSERT INTO "PaperFormatting" ("paperId","schoolName","schoolLogoUrl","branding","headerNote","footerNote","createdAt","updatedAt")
           SELECT $1, "schoolName", "schoolLogoUrl", "branding", "headerNote", "footerNote", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             FROM "PaperFormatting" WHERE "paperId" = $2`,
          [id, paperId]
        );
      }
      await tx.query(
        `INSERT INTO "PaperQuestion" ("paperId","questionId","marks","order","isSelected","type","difficulty","language","displayTextOverride","createdAt")
         SELECT $1, "questionId", marks, "order", "isSelected", type, difficulty, language, "displayTextOverride", CURRENT_TIMESTAMP
           FROM "PaperQuestion" WHERE "paperId" = $2`,
        [id, paperId]
      );
      return id;
    });
    return this.getPaper(user, newId);
  }

  async delete(user: AuthUser, paperId: number) {
    await this.assertCanManage(user, paperId);
    await run(`DELETE FROM "Paper" WHERE id = $1`, [paperId]);
    await q(`INSERT INTO "ActivityLog" ("userId","action","details") VALUES ($1,$2,$3)`, [user.id, 'delete_paper', JSON.stringify({ paperId })]);
    return { id: paperId };
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  private async fetchPool(user: AuthUser, r: Resolved): Promise<PoolRow[]> {
    const where = [`x."chapterId" = ANY($1::int[])`, `x.status = 'approved'`, `x."isActive" = true`];
    const params: unknown[] = [r.chapterIds];
    const push = (v: unknown) => { params.push(v); return params.length; };
    if (r.topicIds.length) { const i = push(r.topicIds); where.push(`x."topicId" = ANY($${i}::int[])`); }
    if (r.exerciseIds.length) { const i = push(r.exerciseIds); where.push(`x."exerciseId" = ANY($${i}::int[])`); }
    if (r.language === 'english' || r.language === 'urdu') {
      const i = push(r.language);
      where.push(`x.language = $${i}`);
    } else {
      const i = push(['english', 'urdu', 'bilingual']);
      where.push(`x.language = ANY($${i}::text[])`);
    }
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      if (!scope.subjectIds.length) return [];
      const i = push(scope.subjectIds);
      where.push(`x."subjectId" = ANY($${i}::int[])`);
    }
    return q<PoolRow>(
      `SELECT x.id, x.type, x."chapterId", x.difficulty, x."topicId", x."exerciseId"
         FROM "Question" x WHERE ${where.join(' AND ')} ORDER BY x.id`,
      params
    );
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private async classLabel(classId: number): Promise<string> {
    const c = await q1<{ name: string }>(`SELECT name FROM "Class" WHERE id = $1`, [classId]);
    return c?.name ?? `Class ${classId}`;
  }

  private async assertCanManage(user: AuthUser, paperId: number) {
    const paper = await q1<any>(`SELECT * FROM "Paper" WHERE id = $1`, [paperId]);
    if (!paper) throw ApiError.notFound('Paper not found');
    if (user.role === 'super_admin') return paper;
    if (user.role === 'teacher') {
      if (paper.teacherId !== user.id) throw ApiError.forbidden('You do not own this paper');
      return paper;
    }
    if (user.role === 'school_admin') {
      if (!(await hasPerm(user, 'generatedPapers'))) {
        throw ApiError.forbidden('Your admin permissions do not include "generatedPapers"');
      }
      if (paper.schoolId !== user.schoolId) throw ApiError.forbidden('This paper belongs to another school');
      return paper;
    }
    throw ApiError.forbidden('You cannot manage papers');
  }
}

export const paperGeneratorV2 = new PaperGeneratorV2();
