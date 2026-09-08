import { Request, Response, NextFunction } from 'express';
import { PrismaClient, BookStatus, Medium } from '@prisma/client';
import { successResponse, paginatedResponse, ApiError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/* ═══════════════════════════════ BOARDS ═══════════════════════════════ */

export const listBoards = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true, subjects: true } } },
    });
    successResponse(res, boards, 'Boards fetched');
  } catch (err) {
    next(err);
  }
};

export const createBoard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, region } = req.body;
    const existing = await prisma.board.findUnique({ where: { code } });
    if (existing) throw ApiError.conflict('A board with this code already exists');

    const board = await prisma.board.create({ data: { name, code, region: region || null } });
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'create_board', details: { boardId: board.id, name } },
    });
    successResponse(res, board, 'Board created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateBoard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) throw ApiError.notFound('Board not found');

    const { name, code, region } = req.body;
    if (code && code !== board.code) {
      const dup = await prisma.board.findUnique({ where: { code } });
      if (dup) throw ApiError.conflict('A board with this code already exists');
    }

    const updated = await prisma.board.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(region !== undefined && { region }),
      },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'update_board', details: { boardId: id, changes: req.body } },
    });
    successResponse(res, updated, 'Board updated');
  } catch (err) {
    next(err);
  }
};

export const deleteBoard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const board = await prisma.board.findUnique({
      where: { id },
      include: { _count: { select: { books: true, subjects: true } } },
    });
    if (!board) throw ApiError.notFound('Board not found');
    if (board._count.books > 0 || board._count.subjects > 0) {
      throw ApiError.conflict('Board has linked books or subjects — remove them first');
    }

    await prisma.board.delete({ where: { id } });
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'delete_board', details: { boardId: id, name: board.name } },
    });
    successResponse(res, null, 'Board deleted');
  } catch (err) {
    next(err);
  }
};

/* ═══════════════════════════════ BOOKS ═══════════════════════════════ */

export const listBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (req.query.boardId)   where.boardId   = Number(req.query.boardId);
    if (req.query.classId)   where.classId   = Number(req.query.classId);
    if (req.query.subjectId) where.subjectId = Number(req.query.subjectId);
    if (req.query.status)    where.status    = req.query.status as BookStatus;
    if (req.query.language)  where.language  = req.query.language as Medium;
    if (req.query.search) {
      const q = req.query.search as string;
      where.OR = [
        { title:     { contains: q, mode: 'insensitive' } },
        { publisher: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where, skip, take: limit,
        orderBy: [{ classId: 'asc' }, { title: 'asc' }],
        include: {
          board:   { select: { id: true, name: true, code: true } },
          class:   { select: { id: true, name: true, grade: true } },
          subject: { select: { id: true, name: true } },
          _count:  { select: { chapters: true } },
        },
      }),
      prisma.book.count({ where }),
    ]);

    paginatedResponse(res, books, total, page, limit, 'Books fetched');
  } catch (err) {
    next(err);
  }
};

export const getBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        board:   { select: { id: true, name: true, code: true } },
        class:   { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true } },
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            _count:    { select: { questions: true, exercises: true, topics: true } },
            exercises: { orderBy: { number: 'asc' } },
            topics:    { orderBy: { name: 'asc' } },
          },
        },
      },
    });
    if (!book) throw ApiError.notFound('Book not found');
    successResponse(res, book, 'Book fetched');
  } catch (err) {
    next(err);
  }
};

export const createBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, publisher, edition, year, language, fileUrl, status, boardId, classId, subjectId } = req.body;
    const book = await prisma.book.create({
      data: {
        title,
        publisher: publisher || null,
        edition:   edition   || null,
        year:      year ? Number(year) : null,
        language:  language  || 'english',
        fileUrl:   fileUrl   || null,
        status:    status    || 'active',
        boardId:   boardId   ? Number(boardId)   : null,
        classId:   classId   ? Number(classId)   : null,
        subjectId: subjectId ? Number(subjectId) : null,
      },
      include: {
        board:   { select: { id: true, name: true } },
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'create_book', details: { bookId: book.id, title } },
    });
    successResponse(res, book, 'Book created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Book not found');

    const { title, publisher, edition, year, language, fileUrl, status, boardId, classId, subjectId } = req.body;
    const book = await prisma.book.update({
      where: { id },
      data: {
        ...(title     !== undefined && { title }),
        ...(publisher !== undefined && { publisher }),
        ...(edition   !== undefined && { edition }),
        ...(year      !== undefined && { year: year ? Number(year) : null }),
        ...(language  !== undefined && { language }),
        ...(fileUrl   !== undefined && { fileUrl }),
        ...(status    !== undefined && { status }),
        ...(boardId   !== undefined && { boardId:   boardId   ? Number(boardId)   : null }),
        ...(classId   !== undefined && { classId:   classId   ? Number(classId)   : null }),
        ...(subjectId !== undefined && { subjectId: subjectId ? Number(subjectId) : null }),
      },
      include: {
        board:   { select: { id: true, name: true } },
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'update_book', details: { bookId: id, changes: req.body } },
    });
    successResponse(res, book, 'Book updated');
  } catch (err) {
    next(err);
  }
};

export const deleteBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const book = await prisma.book.findUnique({
      where: { id },
      include: { _count: { select: { chapters: true } } },
    });
    if (!book) throw ApiError.notFound('Book not found');
    if (book._count.chapters > 0) {
      throw ApiError.conflict('Book has linked chapters — unlink them first');
    }

    await prisma.book.delete({ where: { id } });
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'delete_book', details: { bookId: id, title: book.title } },
    });
    successResponse(res, null, 'Book deleted');
  } catch (err) {
    next(err);
  }
};

/* ═══════════════════════════════ CHAPTERS (drill-down) ═══════════════════════════════ */

export const listChapterTree = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.query.bookId)    where.bookId    = Number(req.query.bookId);
    if (req.query.subjectId) where.subjectId = Number(req.query.subjectId);

    const chapters = await prisma.chapter.findMany({
      where,
      orderBy: [{ subjectId: 'asc' }, { number: 'asc' }],
      include: {
        subject:   { select: { id: true, name: true } },
        _count:    { select: { questions: true, exercises: true, topics: true } },
        exercises: { orderBy: { number: 'asc' } },
        topics:    { orderBy: { name: 'asc' } },
      },
    });
    successResponse(res, chapters, 'Chapters fetched');
  } catch (err) {
    next(err);
  }
};

export const attachChapterToBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { bookId } = req.body as { bookId: number | null };

    const chapter = await prisma.chapter.findUnique({ where: { id } });
    if (!chapter) throw ApiError.notFound('Chapter not found');

    const updated = await prisma.chapter.update({
      where: { id },
      data: { bookId: bookId ? Number(bookId) : null },
    });
    successResponse(res, updated, bookId ? 'Chapter linked to book' : 'Chapter unlinked from book');
  } catch (err) {
    next(err);
  }
};

/* ═══════════════════════════════ EXERCISES ═══════════════════════════════ */

export const listExercises = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.query.chapterId) where.chapterId = Number(req.query.chapterId);

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: [{ chapterId: 'asc' }, { number: 'asc' }],
      include: {
        chapter: { select: { id: true, name: true, subjectId: true } },
        _count:  { select: { questions: true } },
      },
    });
    successResponse(res, exercises, 'Exercises fetched');
  } catch (err) {
    next(err);
  }
};

export const createExercise = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, number, chapterId } = req.body;
    const chapter = await prisma.chapter.findUnique({ where: { id: Number(chapterId) } });
    if (!chapter) throw ApiError.badRequest('Invalid chapterId');

    const dup = await prisma.exercise.findUnique({
      where: { number_chapterId: { number: Number(number || 1), chapterId: Number(chapterId) } },
    });
    if (dup) throw ApiError.conflict('An exercise with this number already exists in the chapter');

    const exercise = await prisma.exercise.create({
      data: { name, number: Number(number || 1), chapterId: Number(chapterId) },
    });
    successResponse(res, exercise, 'Exercise created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateExercise = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.exercise.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Exercise not found');

    const { name, number } = req.body;
    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        ...(name   !== undefined && { name }),
        ...(number !== undefined && { number: Number(number) }),
      },
    });
    successResponse(res, exercise, 'Exercise updated');
  } catch (err) {
    next(err);
  }
};

export const deleteExercise = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.exercise.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!existing) throw ApiError.notFound('Exercise not found');
    if (existing._count.questions > 0) {
      throw ApiError.conflict('Exercise has linked questions — reassign them first');
    }

    await prisma.exercise.delete({ where: { id } });
    successResponse(res, null, 'Exercise deleted');
  } catch (err) {
    next(err);
  }
};

/* ═══════════════════════════════ TOPICS ═══════════════════════════════ */

export const listTopics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.query.chapterId) where.chapterId = Number(req.query.chapterId);

    const topics = await prisma.topic.findMany({
      where,
      orderBy: [{ chapterId: 'asc' }, { name: 'asc' }],
      include: {
        chapter: { select: { id: true, name: true, subjectId: true } },
        _count:  { select: { questions: true } },
      },
    });
    successResponse(res, topics, 'Topics fetched');
  } catch (err) {
    next(err);
  }
};

export const createTopic = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, chapterId } = req.body;
    const chapter = await prisma.chapter.findUnique({ where: { id: Number(chapterId) } });
    if (!chapter) throw ApiError.badRequest('Invalid chapterId');

    const topic = await prisma.topic.create({
      data: { name, chapterId: Number(chapterId) },
    });
    successResponse(res, topic, 'Topic created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.topic.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Topic not found');

    const topic = await prisma.topic.update({
      where: { id },
      data: { name: req.body.name ?? existing.name },
    });
    successResponse(res, topic, 'Topic updated');
  } catch (err) {
    next(err);
  }
};

export const deleteTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.topic.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!existing) throw ApiError.notFound('Topic not found');
    if (existing._count.questions > 0) {
      throw ApiError.conflict('Topic has linked questions — reassign them first');
    }

    await prisma.topic.delete({ where: { id } });
    successResponse(res, null, 'Topic deleted');
  } catch (err) {
    next(err);
  }
};
