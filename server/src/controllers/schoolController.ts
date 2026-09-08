import { Request, Response, NextFunction } from 'express';
import { PrismaClient, SchoolStatus } from '@prisma/client';
import { successResponse, paginatedResponse, ApiError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// ─── List schools (search + status filter + pagination) ─────────────────────
export const listSchools = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (req.query.status) where.status = req.query.status as SchoolStatus;
    if (req.query.search) {
      const q = req.query.search as string;
      where.OR = [
        { name:      { contains: q, mode: 'insensitive' } },
        { code:      { contains: q, mode: 'insensitive' } },
        { city:      { contains: q, mode: 'insensitive' } },
        { principal: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, subjects: true } } },
      }),
      prisma.school.count({ where }),
    ]);

    paginatedResponse(res, schools, total, page, limit, 'Schools fetched');
  } catch (err) {
    next(err);
  }
};

// ─── Get single school ───────────────────────────────────────────────────────
export const getSchool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        _count: { select: { users: true, subjects: true } },
        users: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, role: true, isActive: true },
        },
      },
    });
    if (!school) throw ApiError.notFound('School not found');
    successResponse(res, school, 'School fetched');
  } catch (err) {
    next(err);
  }
};

// ─── Create school ───────────────────────────────────────────────────────────
export const createSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, email, phone, address, city, logoUrl, principal, status } = req.body;

    const existing = await prisma.school.findUnique({ where: { code } });
    if (existing) throw ApiError.conflict('A school with this code already exists');

    const school = await prisma.school.create({
      data: {
        name, code,
        email: email || null, phone: phone || null, address: address || null,
        city: city || null, logoUrl: logoUrl || null, principal: principal || null,
        status: status || 'active',
      },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'create_school', details: { schoolId: school.id, name } },
    });

    successResponse(res, school, 'School created', 201);
  } catch (err) {
    next(err);
  }
};

// ─── Update school ───────────────────────────────────────────────────────────
export const updateSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.school.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('School not found');

    const { name, code, email, phone, address, city, logoUrl, principal, status } = req.body;

    if (code && code !== existing.code) {
      const dup = await prisma.school.findUnique({ where: { code } });
      if (dup) throw ApiError.conflict('A school with this code already exists');
    }

    const school = await prisma.school.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(principal !== undefined && { principal }),
        ...(status !== undefined && { status }),
      },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'update_school', details: { schoolId: id, changes: req.body } },
    });

    successResponse(res, school, 'School updated');
  } catch (err) {
    next(err);
  }
};

// ─── Toggle school status (active ⇄ inactive; accepts explicit status) ──────
export const toggleSchoolStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const school = await prisma.school.findUnique({ where: { id }, select: { status: true, name: true } });
    if (!school) throw ApiError.notFound('School not found');

    const requested = req.body?.status as SchoolStatus | undefined;
    const valid: SchoolStatus[] = ['active', 'inactive', 'suspended'];
    const nextStatus = requested && valid.includes(requested)
      ? requested
      : school.status === 'active' ? 'inactive' : 'active';

    const updated = await prisma.school.update({
      where: { id },
      data: { status: nextStatus },
      select: { id: true, status: true },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'school_status_change', details: { schoolId: id, status: nextStatus } },
    });

    successResponse(res, updated, `School is now ${nextStatus}`);
  } catch (err) {
    next(err);
  }
};
