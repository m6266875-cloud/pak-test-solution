/**
 * PHASE 2 — Catalog scope controller (wizard + filter data).
 */
import { Response, NextFunction } from 'express';
import { successResponse } from '../utils/apiResponse';
import { Phase2AuthRequest } from './auth';
import { catalogService, intOr } from './catalogService';
import { ApiError } from '../utils/apiResponse';

const idOf = (v: any): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest('Invalid id');
  return n;
};

export const listCourses = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await catalogService.listCourses(req.user!), 'Courses fetched');
  } catch (err) { next(err); }
};

export const courseSessions = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await catalogService.courseSessions(req.user!, idOf(req.params.courseId)), 'Sessions fetched');
  } catch (err) { next(err); }
};

export const courseClasses = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await catalogService.courseClasses(req.user!, idOf(req.params.courseId)), 'Classes fetched');
  } catch (err) { next(err); }
};

export const classSubjects = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId != null ? intOr(req.query.courseId) : undefined;
    successResponse(res, await catalogService.classSubjects(req.user!, idOf(req.params.classId), courseId), 'Subjects fetched');
  } catch (err) { next(err); }
};

export const subjectBooks = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.query.sessionId != null ? intOr(req.query.sessionId) : undefined;
    successResponse(res, await catalogService.subjectBooks(req.user!, idOf(req.params.subjectId), sessionId), 'Books fetched');
  } catch (err) { next(err); }
};

export const subjectChapters = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookId = req.query.bookId != null ? intOr(req.query.bookId) : undefined;
    successResponse(res, await catalogService.subjectChapters(req.user!, idOf(req.params.subjectId), bookId), 'Chapters fetched');
  } catch (err) { next(err); }
};

export const chapterTopics = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await catalogService.chapterTopics(req.user!, idOf(req.params.chapterId)), 'Topics fetched');
  } catch (err) { next(err); }
};

export const chapterExercises = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    successResponse(res, await catalogService.chapterExercises(req.user!, idOf(req.params.chapterId)), 'Exercises fetched');
  } catch (err) { next(err); }
};

export const availability = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try {
    const toIntArr = (v: any): number[] =>
      String(v ?? '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    const result = await catalogService.availability(req.user!, {
      subjectIds: toIntArr(req.query.subjectIds),
      chapterIds: toIntArr(req.query.chapterIds),
      topicIds: toIntArr(req.query.topicIds),
      exerciseIds: toIntArr(req.query.exerciseIds),
      language: req.query.language ? String(req.query.language) : undefined,
      difficulty: req.query.difficulty ? String(req.query.difficulty) : undefined,
    });
    successResponse(res, result, 'Availability fetched');
  } catch (err) { next(err); }
};
