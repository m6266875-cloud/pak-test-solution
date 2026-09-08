/**
 * PHASE 2 — Question Bank controller.
 * Route contract is a compatible superset of the legacy /api/questions API
 * (all old query params keep working) with the new filter set, bulk actions,
 * import/export and the extended status workflow.
 */
import { Response, NextFunction } from 'express';
import { successResponse, paginatedResponse, ApiError } from '../utils/apiResponse';
import { Phase2AuthRequest } from './auth';
import { questionBankService } from './questionBankService';
import { QuestionFilters } from './types';

const num = (v: any): number | undefined => (v === undefined || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

const idOf = (v: any): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest('Invalid id');
  return n;
};


function filtersFromQuery(query: any): QuestionFilters {
  return {
    page: num(query.page) ?? 1,
    limit: num(query.limit) ?? 20,
    search: query.search ? String(query.search) : undefined,
    courseId: num(query.courseId),
    sessionId: num(query.sessionId),
    classId: num(query.classId),
    subjectId: num(query.subjectId),
    bookId: num(query.bookId),
    chapterId: num(query.chapterId),
    topicId: num(query.topicId),
    exerciseId: num(query.exerciseId),
    type: query.type as any,
    language: query.language as any,
    marksEq: num(query.marksEq ?? query.marks),
    marksMin: num(query.marksMin),
    marksMax: num(query.marksMax),
    difficulty: query.difficulty as any,
    status: query.status as any,
    category: query.category ? String(query.category) : undefined,
    source: query.source as any,
    createdById: num(query.createdById),
    tag: query.tag ? String(query.tag) : undefined,
    sortBy: query.sortBy ? String(query.sortBy) : undefined,
    sortDir: query.sortDir === 'asc' ? 'asc' : 'desc',
  };
}

export const listQuestions = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await questionBankService.list(req.user!, filtersFromQuery(req.query));
    paginatedResponse(res, result.rows, result.total, result.page, result.limit, 'Questions fetched');
  } catch (err) {
    next(err);
  }
};

export const getQuestion = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await questionBankService.getById(req.user!, idOf(req.params.id));
    successResponse(res, question, 'Question fetched');
  } catch (err) {
    next(err);
  }
};

export const createQuestion = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await questionBankService.create(req.user!, req.body ?? {});
    successResponse(res, question, 'Question created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateQuestion = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await questionBankService.update(req.user!, idOf(req.params.id), req.body ?? {});
    successResponse(res, question, 'Question updated');
  } catch (err) {
    next(err);
  }
};

export const deleteQuestion = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await questionBankService.archive(req.user!, idOf(req.params.id));
    successResponse(res, result, 'Question archived');
  } catch (err) {
    next(err);
  }
};

export const approveQuestion = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await questionBankService.setStatus(req.user!, [idOf(req.params.id)], 'approved');
    successResponse(res, result, 'Question approved');
  } catch (err) {
    next(err);
  }
};

export const rejectQuestion = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await questionBankService.setStatus(req.user!, [idOf(req.params.id)], 'rejected', req.body?.reason);
    successResponse(res, result, 'Question rejected');
  } catch (err) {
    next(err);
  }
};

export const bulkStatus = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, status, reason } = req.body ?? {};
    if (!Array.isArray(ids)) {
      return next(Object.assign(new Error('ids array is required'), { statusCode: 400 }));
    }
    const result = await questionBankService.setStatus(req.user!, ids, status, reason);
    successResponse(res, result, `Bulk status → ${status}`);
  } catch (err) {
    next(err);
  }
};

export const bulkCreate = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = req.body?.questions ?? req.body?.rows;
    if (!Array.isArray(rows)) {
      return next(Object.assign(new Error('questions array is required'), { statusCode: 400 }));
    }
    const result = await questionBankService.importRows(req.user!, rows);
    successResponse(res, result, `${result.created} question(s) imported as drafts`, 201);
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await questionBankService.stats(req.user!, filtersFromQuery(req.query));
    successResponse(res, stats, 'Stats fetched');
  } catch (err) {
    next(err);
  }
};

export const exportQuestions = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const format = String(req.query.format ?? 'json').toLowerCase();
    const rows = await questionBankService.exportRows(req.user!, filtersFromQuery({ ...req.query, limit: undefined }));
    if (format === 'csv') {
      const header = ['id', 'bankNo', 'type', 'text', 'marks', 'difficulty', 'language', 'status', 'category', 'source', 'chapterId', 'subjectId', 'courseId', 'classId', 'bookId', 'topicId', 'exerciseId', 'answer', 'options', 'tags', 'pageRef', 'createdAt'];
      const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const csv = [header.join(','), ...rows.map((r: any) => header.map((h) => esc(r[h])).join(','))].join('\n');
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="questions-export.csv"' });
      return res.send(csv);
    }
    res.set({ 'Content-Type': 'application/json' });
    return res.send(JSON.stringify({ success: true, data: rows }, null, 2));
  } catch (err) {
    next(err);
  }
};

export const duplicateQuestion = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const original = await questionBankService.getById(req.user!, idOf(req.params.id));
    const copy = await questionBankService.create(req.user!, {
      chapterId: original.chapterId,
      exerciseId: original.exerciseId,
      topicId: original.topicId,
      bookId: original.bookId,
      type: original.type,
      text: original.text,
      marks: original.marks,
      options: original.options,
      answer: original.answer,
      difficulty: original.difficulty,
      language: original.language,
      source: original.source,
      status: 'draft',
      tags: original.tags,
      category: original.category,
      hint: original.hint,
      explanation: original.explanation,
      images: original.images,
      pageRef: original.pageRef,
      importedFrom: original.importedFrom,
    });
    successResponse(res, copy, 'Question duplicated (as draft)', 201);
  } catch (err) {
    next(err);
  }
};
