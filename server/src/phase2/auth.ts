/**
 * PHASE 2 — JWT authentication + role guards over node-pg.
 *
 * Contract is identical to src/middleware/auth.ts (Bearer token, user must
 * exist and be active) with one extension: req.user.schoolId is populated so
 * downstream scoping can enforce teacher/school-admin boundaries. Errors are
 * thrown through the same ApiError type so the existing error handler works.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiResponse';
import { q1 } from './db';
import { AuthUser, Role, ROLES } from './types';

export interface Phase2AuthRequest extends Request {
  user?: AuthUser;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  schoolId: number | null;
  isActive: boolean;
}

export const authenticate = async (req: Phase2AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized('No token provided');

    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw ApiError.internal('JWT_SECRET is not configured');

    const decoded = jwt.verify(token, secret) as { id: number };
    if (!decoded?.id) throw ApiError.unauthorized('Invalid token');

    const user = await q1<UserRow>(
      `SELECT id, email, name, role, "schoolId", "isActive" FROM "User" WHERE id = $1`,
      [decoded.id]
    );
    if (!user) throw ApiError.unauthorized('User not found');
    if (!user.isActive) throw ApiError.unauthorized('Account is deactivated');

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name, schoolId: user.schoolId };
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize =
  (...roles: Role[]) =>
  (req: Phase2AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };

export const requireAdmin = authorize(...ROLES.filter((r) => r !== 'teacher') as Role[]); // super_admin + school_admin
export const requireSuperAdmin = authorize('super_admin');
export const requireTeacher = authorize(...ROLES); // super_admin + school_admin + teacher

export { ROLES };
