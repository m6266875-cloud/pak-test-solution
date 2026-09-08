import { Request, Response, NextFunction } from 'express';
import { PrismaClient, QuestionType, Difficulty, QuestionStatus } from '@prisma/client';
import { successResponse, paginatedResponse, ApiError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const createQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await prisma.question.create({ data: req.body });
    successResponse(res, question, 'Question created', 201);
  } catch (err) {
    next(err);
  }
};

export const bulkCreateQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { questions } = req.body as { questions: any[] };
    if (!Array.isArray(questions) || questions.length === 0) {
      throw ApiError.badRequest('Questions array is required');
    }
    const result = await prisma.question.createMany({ data: questions, skipDuplicates: true });
    successResponse(res, { count: result.count }, `${result.count} questions imported`, 201);
  } catch (err) {
    next(err);
  }
};

export const getQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (req.query.chapterId)  where.chapterId  = Number(req.query.chapterId);
    if (req.query.exerciseId) where.exerciseId = Number(req.query.exerciseId);
    if (req.query.topicId)    where.topicId    = Number(req.query.topicId);
    if (req.query.type)       where.type = req.query.type as QuestionType;
    if (req.query.difficulty) where.difficulty = req.query.difficulty as Difficulty;
    if (req.query.status)     where.status = req.query.status as QuestionStatus;
    if (req.query.search) {
      where.text = { contains: req.query.search as string, mode: 'insensitive' };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { chapter: { include: { subject: { select: { name: true } } } } },
      }),
      prisma.question.count({ where }),
    ]);

    paginatedResponse(res, questions, total, page, limit, 'Questions fetched');
  } catch (err) {
    next(err);
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const question = await prisma.question.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    successResponse(res, question, 'Question updated');
  } catch (err) {
    next(err);
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Soft delete
    await prisma.question.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false },
    });
    successResponse(res, null, 'Question deleted');
  } catch (err) {
    next(err);
  }
};

export const getQuestionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chapterId = req.query.chapterId ? Number(req.query.chapterId) : undefined;
    const where = chapterId ? { chapterId, isActive: true } : { isActive: true };

    const [total, byType, byDifficulty, byStatus, bySource, byLanguage] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
      prisma.question.groupBy({
        by: ['difficulty'],
        where,
        _count: { id: true },
      }),
      prisma.question.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.question.groupBy({
        by: ['source'],
        where,
        _count: { id: true },
      }),
      prisma.question.groupBy({
        by: ['language'],
        where,
        _count: { id: true },
      }),
    ]);

    successResponse(res, { total, byType, byDifficulty, byStatus, bySource, byLanguage }, 'Stats fetched');
  } catch (err) {
    next(err);
  }
};

// ─── Question approval workflow ──────────────────────────────────────────────
export const approveQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Question not found');

    const question = await prisma.question.update({
      where: { id },
      data: { status: 'approved' },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'approve_question',
        details: { questionId: id, previousStatus: existing.status },
      },
    });

    successResponse(res, question, 'Question approved');
  } catch (err) {
    next(err);
  }
};

export const rejectQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Question not found');

    const question = await prisma.question.update({
      where: { id },
      data: { status: 'rejected' },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'reject_question',
        details: { questionId: id, previousStatus: existing.status, reason: req.body?.reason },
      },
    });

    successResponse(res, question, 'Question rejected');
  } catch (err) {
    next(err);
  }
};
