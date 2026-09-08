import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { successResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiResponse';

const prisma = new PrismaClient();

export const getClasses = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { grade: 'asc' },
      include: { _count: { select: { subjects: true } } },
    });
    successResponse(res, classes, 'Classes fetched');
  } catch (err) {
    next(err);
  }
};

export const getSubjectsByClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = Number(req.params.classId);
    const subjects = await prisma.subject.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { chapters: true } } },
    });
    successResponse(res, subjects, 'Subjects fetched');
  } catch (err) {
    next(err);
  }
};

export const getChaptersBySubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = Number(req.params.subjectId);
    const chapters = await prisma.chapter.findMany({
      where: { subjectId },
      orderBy: { number: 'asc' },
      include: {
        _count: { select: { questions: true } },
      },
    });
    successResponse(res, chapters, 'Chapters fetched');
  } catch (err) {
    next(err);
  }
};

export const getChaptersBySubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectIds = (req.query.subjectIds as string)?.split(',').map(Number).filter(Boolean);
    if (!subjectIds?.length) throw ApiError.badRequest('subjectIds query param required');

    const chapters = await prisma.chapter.findMany({
      where: { subjectId: { in: subjectIds } },
      orderBy: [{ subjectId: 'asc' }, { number: 'asc' }],
      include: {
        subject: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
    });
    successResponse(res, chapters, 'Chapters fetched');
  } catch (err) {
    next(err);
  }
};

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = await prisma.subject.create({ data: req.body });
    successResponse(res, subject, 'Subject created', 201);
  } catch (err) {
    next(err);
  }
};

export const createChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapter = await prisma.chapter.create({ data: req.body });
    successResponse(res, chapter, 'Chapter created', 201);
  } catch (err) {
    next(err);
  }
};
