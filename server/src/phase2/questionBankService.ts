/**
 * PHASE 2 — Central Question Bank service (node-pg).
 *
 * All reads are scoped for teachers via questionScopePredicate() — a crafted
 * request can never reach questions of an unassigned subject. Admins keep the
 * full-bank semantics of the pre-existing API.
 *
 * Lifecycle: draft → pending → approved | rejected ; archived is the soft
 * delete state (rows are never removed — generated papers keep their FKs).
 */
import { q, q1, run, withTx } from './db';
import { ApiError } from '../utils/apiResponse';
import { loadTeacherScope, questionScopePredicate, assertChapterAllowed, isAdminRole } from './scope';
import { AuthUser, QuestionFilters, QuestionRow, QuestionType, QuestionStatus, Difficulty, Medium, QuestionSource } from './types';

const TYPE_SET = new Set<string>(['mcq', 'short', 'essay', 'true_false', 'fill_blank', 'matching', 'numerical', 'conceptual']);
const STATUS_SET = new Set<string>(['pending', 'approved', 'rejected', 'draft', 'archived']);
const DIFF_SET = new Set<string>(['easy', 'medium', 'hard']);
const MEDIA_SET = new Set<string>(['english', 'urdu', 'bilingual']);
const SOURCE_SET = new Set<string>(['manual', 'imported', 'past_paper', 'exercise']);
const SORT_WHITELIST = new Set(['createdAt', 'updatedAt', 'marks', 'id']);

interface WhereResult {
  sql: string;
  params: unknown[];
}

export const QUESTION_SELECT = `
  q.id, q."chapterId", q."exerciseId", q."topicId", q."bookId", q.type, q.text, q.marks,
  q.options, q.answer, q.difficulty, q.language, q.source, q.status, q.tags,
  q.category, q."bankNo", q.hint, q.explanation, q.images, q."pageRef", q."sourceRef",
  q."importedFrom", q."importRef", q."isActive", q."courseId", q."sessionId", q."classId",
  q."subjectId", q."createdById", q."updatedById", q."createdAt", q."updatedAt",
  ch.name AS "chapterName", ch.number AS "chapterNumber",
  s.name AS "subjectName", c.name AS "className", co.code AS "courseCode", co.name AS "courseName",
  b.title AS "bookTitle", ex.name AS "exerciseName", t.name AS "topicName",
  u.name AS "createdByName"
`;

export async function buildQuestionWhere(user: AuthUser, f: QuestionFilters, alias = 'q'): Promise<WhereResult> {
  const where: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  const a = alias ? `${alias}.` : '';
  const add = (sql: string, val: unknown) => {
    where.push(sql.replace('?', `$${p++}`));
    params.push(val);
  };

  // scope first (teacher) — assignments are loaded here so the SQL predicate
  // is derived from the real TeacherSubject rows.
  const scope = user.role === 'teacher' ? await loadTeacherScope(user.id) : null;
  const scopePred = questionScopePredicate(user, alias, scope);
  where.push(scopePred.sql);
  if (scopePred.params.length) {
    params.push(...scopePred.params);
    p += scopePred.params.length;
  }

  // teachers see only approved content by default; any other status they ask
  // for is narrowed to their own creations.
  if (user.role === 'teacher') {
    if (f.status && f.status !== 'approved' && !['draft', 'pending', 'rejected', 'archived'].includes(f.status)) {
      throw ApiError.badRequest(`Invalid status filter '${f.status}'`);
    }
    if (!f.status) {
      where.push(`${a}status = $${p++}`);
      params.push('approved');
    } else if (f.status !== 'approved') {
      where.push(`${a}"createdById" = $${p++}`);
      params.push(user.id);
    }
  }

  if (f.isActive !== false) {
    where.push(`${a}"isActive" = $${p++}`);
    params.push(true);
  }
  if (f.search) {
    const like = `%${f.search}%`;
    where.push(`(${a}text ILIKE $${p} OR ${a}"bankNo" ILIKE $${p})`);
    params.push(like);
    p++;
  }
  const intFilters: Array<[keyof QuestionFilters, string]> = [
    ['courseId', '"courseId"'], ['sessionId', '"sessionId"'], ['classId', '"classId"'],
    ['subjectId', '"subjectId"'], ['bookId', '"bookId"'], ['chapterId', '"chapterId"'],
    ['topicId', '"topicId"'], ['exerciseId', '"exerciseId"'], ['marksEq', 'marks'],
  ];
  for (const [key, col] of intFilters) {
    const v = f[key as keyof QuestionFilters];
    if (v != null && v !== '') {
      where.push(`${a}${col} = $${p++}`);
      params.push(Number(v));
    }
  }
  if (f.marksMin != null) { where.push(`${a}marks >= $${p++}`); params.push(Number(f.marksMin)); }
  if (f.marksMax != null) { where.push(`${a}marks <= $${p++}`); params.push(Number(f.marksMax)); }

  const enumFilters: Array<[string, string | undefined, Set<string>, string]> = [
    ['type', f.type, TYPE_SET, 'type'],
    ['difficulty', f.difficulty, DIFF_SET, 'difficulty'],
    ['language', f.language, MEDIA_SET, 'language'],
    ['source', f.source, SOURCE_SET, 'source'],
    ['status', f.status, STATUS_SET, 'status'],
  ];
  for (const [label, val, set, col] of enumFilters) {
    if (val == null || val === '') continue;
    if (!set.has(val)) throw ApiError.badRequest(`Invalid ${label} '${val}'`);
    where.push(`${a}"${col}" = $${p++}`);
    params.push(val);
  }
  if (f.category) { where.push(`${a}category = $${p++}`); params.push(f.category); }
  if (f.tag) { where.push(`$${p} = ANY(${a}tags)`); params.push(f.tag); p++; }
  if (f.createdById) { where.push(`${a}"createdById" = $${p++}`); params.push(Number(f.createdById)); }

  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

function orderSql(f: QuestionFilters): { sql: string; params: unknown[] } {
  const col = f.sortBy && SORT_WHITELIST.has(f.sortBy) ? (f.sortBy === 'id' ? 'q.id' : f.sortBy) : 'q."createdAt"';
  const dir = f.sortDir === 'asc' ? 'ASC' : 'DESC';
  return { sql: `ORDER BY ${col} ${dir}, q.id DESC`, params: [] };
}

export class QuestionBankService {
  /** Paginated, scoped, filtered question list with catalog labels. */
  async list(user: AuthUser, f: QuestionFilters = {}) {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const w = await buildQuestionWhere(user, f);
    const { sql: order, params: orderParams } = orderSql(f);
    const rows = await q<QuestionRow & Record<string, any>>(
      `SELECT ${QUESTION_SELECT}
         FROM "Question" q
         JOIN "Chapter" ch ON ch.id = q."chapterId"
         LEFT JOIN "Subject" s ON s.id = q."subjectId"
         LEFT JOIN "Class" c ON c.id = q."classId"
         LEFT JOIN "Course" co ON co.id = q."courseId"
         LEFT JOIN "Book" b ON b.id = q."bookId"
         LEFT JOIN "Exercise" ex ON ex.id = q."exerciseId"
         LEFT JOIN "Topic" t ON t.id = q."topicId"
         LEFT JOIN "User" u ON u.id = q."createdById"
         ${w.sql} ${order} LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
      [...w.params, limit, (page - 1) * limit]
    );
    const totalRow = await q1<{ n: string }>(
      `SELECT count(*)::int AS n FROM "Question" q ${w.sql}`,
      w.params
    );
    return { rows, total: Number(totalRow?.n ?? 0), page, limit };
  }

  async getById(user: AuthUser, id: number) {
    // WHERE clause is assembled here (not via questionScopePredicate) so the
    // placeholder numbering cannot collide with the $1 id parameter.
    const params: unknown[] = [id];
    let scopeSql = 'TRUE';
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      scopeSql = scope.subjectIds.length
        ? `q."subjectId" = ANY($${params.length + 1}::int[])`
        : 'FALSE';
      if (scope.subjectIds.length) params.push(scope.subjectIds);
    }
    const rows = await q<QuestionRow & Record<string, any>>(
      `SELECT ${QUESTION_SELECT}
         FROM "Question" q
         JOIN "Chapter" ch ON ch.id = q."chapterId"
         LEFT JOIN "Subject" s ON s.id = q."subjectId"
         LEFT JOIN "Class" c ON c.id = q."classId"
         LEFT JOIN "Course" co ON co.id = q."courseId"
         LEFT JOIN "Book" b ON b.id = q."bookId"
         LEFT JOIN "Exercise" ex ON ex.id = q."exerciseId"
         LEFT JOIN "Topic" t ON t.id = q."topicId"
         LEFT JOIN "User" u ON u.id = q."createdById"
        WHERE q.id = $1 AND ${scopeSql}`,
      params
    );
    const row = rows[0];
    if (!row) throw ApiError.notFound('Question not found');
    return row;
  }

  /** Create: chapter must be inside the caller's scope; chain is derived. */
  async create(user: AuthUser, payload: Record<string, any>) {
    this.validateShape(payload);
    const chapter = await assertChapterAllowed(Number(payload.chapterId), user);

    const bookId = payload.bookId != null ? Number(payload.bookId) : null;
    let sessionId: number | null = null;
    if (bookId != null) {
      const b = await q1<{ sessionId: number | null }>(`SELECT "sessionId" FROM "Book" WHERE id = $1`, [bookId]);
      if (!b) throw ApiError.badRequest('Invalid bookId');
      sessionId = b.sessionId;
    } else if (chapter.id) {
      // chapter's own book (book-scoped chapters) may carry the session
      const cb = await q1<{ sessionId: number | null }>(
        `SELECT b."sessionId" FROM "Chapter" c LEFT JOIN "Book" b ON b.id = c."bookId" WHERE c.id = $1`,
        [chapter.id]
      );
      sessionId = cb?.sessionId ?? null;
    }

    const status: QuestionStatus = user.role === 'teacher' ? 'draft' : (payload.status ?? 'draft');
    if (!STATUS_SET.has(status)) throw ApiError.badRequest(`Invalid status '${status}'`);
    if (user.role === 'teacher' && ['approved', 'rejected'].includes(status)) {
      throw ApiError.forbidden('Only an admin can approve/reject questions');
    }

    const row = await withTx(async (tx) => {
      const ins = await tx.query(
        `INSERT INTO "Question"
           ("chapterId","exerciseId","topicId","bookId","type","text","marks","options","answer",
            "difficulty","language","source","status","tags","category","bankNo","hint","explanation",
            "images","pageRef","sourceRef","importedFrom","importRef",
            "courseId","sessionId","classId","subjectId","createdById","updatedById","isActive","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,true,CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          chapter.id,
          payload.exerciseId != null ? Number(payload.exerciseId) : null,
          payload.topicId != null ? Number(payload.topicId) : null,
          bookId,
          payload.type,
          String(payload.text).trim(),
          Number(payload.marks ?? 1),
          payload.options != null ? JSON.stringify(payload.options) : null,
          payload.answer != null ? String(payload.answer) : null,
          payload.difficulty ?? 'easy',
          payload.language ?? 'english',
          payload.source ?? 'manual',
          status,
          Array.isArray(payload.tags) ? payload.tags.map(String) : [],
          payload.category ?? null,
          payload.bankNo != null ? String(payload.bankNo) : null,
          payload.hint != null ? String(payload.hint) : null,
          payload.explanation != null ? String(payload.explanation) : null,
          payload.images != null ? JSON.stringify(payload.images) : null,
          payload.pageRef != null ? String(payload.pageRef) : null,
          payload.sourceRef != null ? String(payload.sourceRef) : null,
          payload.importedFrom != null ? String(payload.importedFrom) : null,
          payload.importRef != null ? String(payload.importRef) : null,
          chapter.courseId,
          sessionId,
          chapter.classId,
          chapter.subjectId,
          user.id,
          user.id,
        ]
      );
      const id = Number(ins.rows[0].id);
      await tx.query(`INSERT INTO "ActivityLog" ("userId","action","details") VALUES ($1,$2,$3)`, [
        user.id,
        user.role === 'teacher' ? 'create_question' : 'create_question',
        JSON.stringify({ questionId: id, chapterId: chapter.id, subjectId: chapter.subjectId, status }),
      ]);
      return id;
    });
    return this.getById(user, row);
  }

  async update(user: AuthUser, id: number, payload: Record<string, any>) {
    await this.assertWritable(id, user);
    this.validateShape(payload, false);
    const current = await q1<QuestionRow>(`SELECT * FROM "Question" WHERE id = $1`, [id]);
    if (!current) throw ApiError.notFound('Question not found');

    const set: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    const put = (col: string, val: unknown) => {
      set.push(`"${col}" = $${p++}`);
      params.push(val);
    };

    const scalarFields: Array<[string, string]> = [
      ['text', 'text'], ['marks', 'marks'], ['difficulty', 'difficulty'], ['language', 'language'],
      ['source', 'source'], ['status', 'status'], ['category', 'category'], ['bankNo', 'bankNo'],
      ['hint', 'hint'], ['explanation', 'explanation'], ['pageRef', 'pageRef'], ['sourceRef', 'sourceRef'],
      ['importedFrom', 'importedFrom'], ['importRef', 'importRef'], ['type', 'type'],
    ];
    for (const [key, col] of scalarFields) {
      if (payload[key] !== undefined) {
        if (['text', 'hint', 'explanation', 'answer', 'bankNo'].includes(key)) {
          put(col, payload[key] == null ? null : String(payload[key]));
        } else if (key === 'marks') {
          put(col, Number(payload[key]));
        } else {
          put(col, payload[key]);
        }
      }
    }
    if (payload.options !== undefined) put('options', payload.options == null ? null : JSON.stringify(payload.options));
    if (payload.answer !== undefined) put('answer', payload.answer == null ? null : String(payload.answer));
    if (payload.images !== undefined) put('images', payload.images == null ? null : JSON.stringify(payload.images));
    if (payload.tags !== undefined) put('tags', Array.isArray(payload.tags) ? payload.tags.map(String) : []);
    // relinking chapter requires scope check on the new chapter
    if (payload.chapterId !== undefined && Number(payload.chapterId) !== current.chapterId) {
      const ch = await assertChapterAllowed(Number(payload.chapterId), user);
      put('chapterId', ch.id);
      const subj = await q1<{ classId: number | null; courseId: number | null }>(
        `SELECT "classId","courseId" FROM "Subject" WHERE id = $1`, [ch.subjectId]
      );
      put('subjectId', ch.subjectId);
      put('classId', subj?.classId ?? null);
      put('courseId', subj?.courseId ?? null);
    }
    if (payload.bookId !== undefined) {
      const bId = payload.bookId != null ? Number(payload.bookId) : null;
      let sess: number | null = null;
      if (bId != null) {
        const b = await q1<{ sessionId: number | null }>(`SELECT "sessionId" FROM "Book" WHERE id = $1`, [bId]);
        if (!b) throw ApiError.badRequest('Invalid bookId');
        sess = b.sessionId;
      }
      put('bookId', bId);
      put('sessionId', sess);
    }
    if (payload.exerciseId !== undefined) put('exerciseId', payload.exerciseId == null ? null : Number(payload.exerciseId));
    if (payload.topicId !== undefined) put('topicId', payload.topicId == null ? null : Number(payload.topicId));
    if (set.length === 0) return this.getById(user, id);

    set.push(`"updatedById" = $${p++}`);
    params.push(user.id);
    params.push(id);
    await q(`UPDATE "Question" SET ${set.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    return this.getById(user, id);
  }

  /** Soft delete = archived (never a physical delete; papers keep FKs). */
  async archive(user: AuthUser, id: number) {
    await this.assertWritable(id, user);
    await run(
      `UPDATE "Question" SET status = 'archived', "isActive" = false, "updatedById" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
      [user.id, id]
    );
    await q(`INSERT INTO "ActivityLog" ("userId","action","details") VALUES ($1,$2,$3)`, [
      user.id, 'archive_question', JSON.stringify({ questionId: id }),
    ]);
    return { id, status: 'archived' };
  }

  async setStatus(user: AuthUser, ids: number[], status: QuestionStatus, reason?: string) {
    if (!STATUS_SET.has(status)) throw ApiError.badRequest(`Invalid status '${status}'`);
    if (user.role === 'teacher' && status !== 'archived') {
      throw ApiError.forbidden('Only an admin can change question workflow status');
    }
    const uniq = [...new Set(ids.map(Number))].filter((n) => Number.isFinite(n) && n > 0);
    if (!uniq.length) throw ApiError.badRequest('No valid question ids provided');
    // teachers may only archive their own rows
    let where = `id = ANY($1::int[])`;
    const params: unknown[] = [uniq];
    if (user.role === 'teacher') {
      const scope = await loadTeacherScope(user.id);
      if (!scope.subjectIds.length) throw ApiError.forbidden('No subjects assigned');
      where += ` AND "subjectId" = ANY($2::int[]) AND "createdById" = $3`;
      params.push(scope.subjectIds, user.id);
    }
    const statusIdx = params.length + 1;
    const userIdx = params.length + 2;
    const updated = await run(
      `UPDATE "Question"
          SET status = $${statusIdx}, "updatedById" = $${userIdx},
              ${status === 'archived' ? '"isActive" = false, ' : ''}"updatedAt" = CURRENT_TIMESTAMP
        WHERE ${where}`,
      [...params, status, user.id]
    );
    await q(`INSERT INTO "ActivityLog" ("userId","action","details") VALUES ($1,$2,$3)`, [
      user.id, 'bulk_question_status', JSON.stringify({ ids: uniq, status, reason: reason ?? null, count: updated }),
    ]);
    return { updated, status };
  }

  async stats(user: AuthUser, f: QuestionFilters = {}) {
    const w = await buildQuestionWhere(user, { ...f, limit: undefined });
    const base = `FROM "Question" q ${w.sql}`;
    const [total, byType, byStatus, byDifficulty, byLanguage, bySource, byCategory] = await Promise.all([
      q<{ n: string }>(`SELECT count(*)::int AS n ${base}`, w.params),
      q<{ type: string; n: string }>(`SELECT q.type, count(*)::int AS n ${base} GROUP BY q.type ORDER BY q.type`, w.params),
      q<{ status: string; n: string }>(`SELECT q.status, count(*)::int AS n ${base} GROUP BY q.status ORDER BY q.status`, w.params),
      q<{ difficulty: string; n: string }>(`SELECT q.difficulty, count(*)::int AS n ${base} GROUP BY q.difficulty ORDER BY q.difficulty`, w.params),
      q<{ language: string; n: string }>(`SELECT q.language, count(*)::int AS n ${base} GROUP BY q.language ORDER BY q.language`, w.params),
      q<{ source: string; n: string }>(`SELECT q.source, count(*)::int AS n ${base} GROUP BY q.source ORDER BY q.source`, w.params),
      q<{ category: string | null; n: string }>(`SELECT q.category, count(*)::int AS n ${base} GROUP BY q.category ORDER BY q.category`, w.params),
    ]);
    return {
      total: Number(total[0]?.n ?? 0),
      byType, byStatus, byDifficulty, byLanguage, bySource, byCategory,
    };
  }

  /** Export the currently filtered/scoped set (for CSV/JSON by the caller). */
  async exportRows(user: AuthUser, f: QuestionFilters = {}) {
    const w = await buildQuestionWhere(user, f);
    return q<QuestionRow & Record<string, any>>(
      `SELECT q.id, q."bankNo", q.type, q.text, q.marks, q.difficulty, q.language, q.source, q.status,
              q.category, q."chapterId", q."subjectId", q."courseId", q."classId", q."bookId",
              q."topicId", q."exerciseId", q.answer, q.options, q.tags, q."pageRef", q."createdAt"
         FROM "Question" q ${w.sql} ORDER BY q.id`,
      w.params
    );
  }

  /** Import rows → every row lands as DRAFT for admin review (never auto-approve). */
  async importRows(user: AuthUser, rows: Record<string, any>[]) {
    if (!Array.isArray(rows) || rows.length === 0) throw ApiError.badRequest('Rows array is required');
    if (user.role === 'teacher' && rows.length > 200) {
      throw ApiError.badRequest('Teachers may import at most 200 rows per batch');
    }
    const created: number[] = [];
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      try {
        const chapterId = await this.resolveChapter(raw);
        const row = await this.create(user, { ...raw, chapterId, status: 'draft' });
        created.push(row.id);
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err?.message ?? 'invalid row'}`);
      }
    }
    return { created: created.length, imported: created, errors };
  }

  private async resolveChapter(raw: Record<string, any>): Promise<number> {
    if (raw.chapterId != null) {
      const ch = await q1(`SELECT id FROM "Chapter" WHERE id = $1`, [Number(raw.chapterId)]);
      if (!ch) throw ApiError.badRequest(`chapterId ${raw.chapterId} not found`);
      return Number(raw.chapterId);
    }
    if (raw.bookId != null && raw.chapterNumber != null) {
      const ch = await q1(`SELECT id FROM "Chapter" WHERE "bookId" = $1 AND number = $2`, [Number(raw.bookId), Number(raw.chapterNumber)]);
      if (!ch) throw ApiError.badRequest(`book ${raw.bookId} chapter ${raw.chapterNumber} not found`);
      return Number(ch.id);
    }
    if (raw.subjectId != null && raw.chapterNumber != null) {
      const ch = await q1(`SELECT id FROM "Chapter" WHERE "subjectId" = $1 AND number = $2 AND "bookId" IS NULL`, [Number(raw.subjectId), Number(raw.chapterNumber)]);
      if (!ch) throw ApiError.badRequest(`subject ${raw.subjectId} chapter ${raw.chapterNumber} not found (no bookId set)`);
      return Number(ch.id);
    }
    throw ApiError.badRequest('provide chapterId, or bookId+chapterNumber, or subjectId+chapterNumber');
  }

  private validateShape(payload: Record<string, any>, requireCore = true) {
    if (requireCore || payload.type !== undefined) {
      if (!payload.type || !TYPE_SET.has(payload.type)) throw ApiError.badRequest('Valid question type required');
    }
    if (requireCore || payload.text !== undefined) {
      if (payload.text == null || String(payload.text).trim().length < 1) {
        throw ApiError.badRequest('Question text is required');
      }
    }
    const type: QuestionType = payload.type ?? 'mcq';
    if (payload.marks !== undefined) {
      const m = Number(payload.marks);
      if (!Number.isFinite(m) || m < 1 || m > 100) throw ApiError.badRequest('Marks must be between 1 and 100');
    }
    if (type === 'mcq' && payload.options !== undefined && payload.options != null) {
      const opts = Array.isArray(payload.options) ? payload.options : payload.options.options ?? Object.values(payload.options);
      if (!Array.isArray(opts) || opts.length < 2) throw ApiError.badRequest('MCQ requires at least 2 options');
    }
    if (type === 'true_false' && payload.answer !== undefined && payload.answer != null) {
      const a = String(payload.answer).toLowerCase();
      if (!['true', 'false'].includes(a)) throw ApiError.badRequest("True/False answer must be 'true' or 'false'");
    }
    if (payload.difficulty !== undefined && !DIFF_SET.has(payload.difficulty)) throw ApiError.badRequest('Invalid difficulty');
    if (payload.language !== undefined && !MEDIA_SET.has(payload.language)) throw ApiError.badRequest('Invalid language');
    if (payload.source !== undefined && !SOURCE_SET.has(payload.source)) throw ApiError.badRequest('Invalid source');
    if (payload.status !== undefined && !STATUS_SET.has(payload.status)) throw ApiError.badRequest('Invalid status');
  }

  private async assertWritable(id: number, user: AuthUser) {
    if (isAdminRole(user.role)) {
      const exists = await q1(`SELECT id FROM "Question" WHERE id = $1`, [id]);
      if (!exists) throw ApiError.notFound('Question not found');
      return;
    }
    // teacher: own creation + assigned subject (scope.ts helper covers both)
    const { assertQuestionWritable } = await import('./scope');
    await assertQuestionWritable(id, user);
  }
}

export const questionBankService = new QuestionBankService();
