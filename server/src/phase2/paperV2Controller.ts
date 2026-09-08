/**
 * PHASE 2 — Paper generator v2 controller (route contract for /api/v2/papers).
 */
import { Response, NextFunction } from 'express';
import { successResponse, paginatedResponse, ApiError } from '../utils/apiResponse';
import { Phase2AuthRequest } from './auth';
import { paperGeneratorV2 } from './generatorService';

const idOf = (v: any): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest('Invalid id');
  return n;
};
const numOr = (v: any): number | undefined => (v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

export const generatePapers = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await paperGeneratorV2.generate(req.user!, req.body ?? {});
    successResponse(res, result, `${result.papers.length} paper(s) generated`, 201);
  } catch (err) { next(err); }
};

export const listPapers = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await paperGeneratorV2.list(req.user!, {
      page: numOr(req.query.page) ?? 1,
      limit: numOr(req.query.limit) ?? 10,
      status: req.query.status ? String(req.query.status) : undefined,
      courseId: numOr(req.query.courseId),
      classId: numOr(req.query.classId),
      subjectId: numOr(req.query.subjectId),
      schoolId: numOr(req.query.schoolId),
      teacherId: numOr(req.query.teacherId),
      search: req.query.search ? String(req.query.search) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    });
    paginatedResponse(res, result.rows, result.total, result.page, result.limit, 'Papers fetched');
  } catch (err) { next(err); }
};

export const getPaper = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await paperGeneratorV2.getPaper(req.user!, idOf(req.params.id)), 'Paper fetched');
  } catch (err) { next(err); }
};

export const updatePaper = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await paperGeneratorV2.updateMeta(req.user!, idOf(req.params.id), req.body ?? {}), 'Paper updated');
  } catch (err) { next(err); }
};

export const deletePaper = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await paperGeneratorV2.delete(req.user!, idOf(req.params.id)), 'Paper deleted');
  } catch (err) { next(err); }
};

export const duplicatePaper = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await paperGeneratorV2.duplicate(req.user!, idOf(req.params.id)), 'Paper duplicated', 201);
  } catch (err) { next(err); }
};

export const replaceQuestions = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await paperGeneratorV2.replaceQuestions(req.user!, idOf(req.params.id), req.body ?? {}), 'Paper questions updated');
  } catch (err) { next(err); }
};

export const updateFormatting = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    successResponse(res, await paperGeneratorV2.updateFormatting(req.user!, idOf(req.params.id), {
      schoolName: body.schoolName,
      headerNote: body.headerNote,
    }), 'Paper formatting updated');
  } catch (err) { next(err); }
};
