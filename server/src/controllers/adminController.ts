import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { successResponse, paginatedResponse, ApiError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, role, schoolName, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), password: hashedPassword, name, role: role || 'teacher', schoolName, phone },
      select: { id: true, email: true, name: true, role: true, schoolName: true, isActive: true, createdAt: true },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'create_user', details: { targetUserId: user.id, role } },
    });

    successResponse(res, user, 'User created', 201);
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (req.query.role)   where.role = req.query.role as Role;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' } },
        { email: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, schoolName: true,
          isActive: true, lastLoginAt: true, createdAt: true,
          _count: { select: { papers: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    paginatedResponse(res, users, total, page, limit, 'Users fetched');
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true, name: true, email: true, role: true, schoolName: true,
        phone: true, isActive: true, lastLoginAt: true, createdAt: true,
        teacherSubjects: {
          include: {
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true, grade: true } },
          },
        },
        _count: { select: { papers: true } },
      },
    });
    if (!user) throw ApiError.notFound('User not found');
    successResponse(res, user, 'User fetched');
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, schoolName, phone, role, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { name, schoolName, phone, role, isActive },
      select: { id: true, name: true, email: true, role: true, schoolName: true, isActive: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'update_user',
        details: { targetUserId: user.id, changes: req.body },
      },
    });

    successResponse(res, user, 'User updated');
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, name: true } });
    if (!user) throw ApiError.notFound('User not found');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: updated.isActive ? 'activate_user' : 'deactivate_user',
        details: { targetUserId: userId },
      },
    });

    successResponse(res, updated, `User ${updated.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (req.query.userId) where.userId = Number(req.query.userId);
    if (req.query.action) where.action = { contains: req.query.action as string };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);

    paginatedResponse(res, logs, total, page, limit, 'Audit logs fetched');
  } catch (err) {
    next(err);
  }
};

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalPapers, totalQuestions, recentPapers, papersByStatus] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.paper.count(),
      prisma.question.count({ where: { isActive: true } }),
      prisma.paper.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { name: true } },
          teacher: { select: { name: true } },
          paperSubjects: { include: { subject: { select: { name: true } } } },
        },
      }),
      prisma.paper.groupBy({ by: ['status'], _count: { id: true } }),
    ]);

    successResponse(res, {
      totalUsers, totalPapers, totalQuestions, recentPapers, papersByStatus,
    }, 'Dashboard stats fetched');
  } catch (err) {
    next(err);
  }
};
