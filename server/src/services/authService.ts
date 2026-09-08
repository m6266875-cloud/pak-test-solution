import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: Role;
  schoolName?: string;
  phone?: string;
  createdByAdminId?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
    schoolName: string | null;
  };
  tokens: TokenPair;
}

export class AuthService {
  // ─── Register ────────────────────────────────────────────────────────────
  async register(data: RegisterData): Promise<LoginResponse> {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw ApiError.conflict('Email already registered');

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        name: data.name.trim(),
        role: data.role || 'teacher',
        schoolName: data.schoolName?.trim(),
        phone: data.phone?.trim(),
      },
      select: { id: true, name: true, email: true, role: true, schoolName: true },
    });

    await this.logActivity(user.id, 'register', { method: 'email' });

    const tokens = await this.generateTokenPair(user);
    return { user, tokens };
  }

  // ─── Login ───────────────────────────────────────────────────────────────
  async login(email: string, password: string, ipAddress?: string): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true, name: true, email: true, role: true,
        password: true, isActive: true, schoolName: true,
      },
    });

    if (!user) throw ApiError.unauthorized('Invalid email or password');
    if (!user.isActive) throw ApiError.unauthorized('Your account has been deactivated. Contact admin.');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw ApiError.unauthorized('Invalid email or password');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logActivity(user.id, 'login', { ipAddress });

    const { password: _, ...userWithoutPassword } = user;
    const tokens = await this.generateTokenPair(userWithoutPassword);
    return { user: userWithoutPassword, tokens };
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────
  async refreshToken(token: string): Promise<TokenPair> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, role: true, name: true, isActive: true } } },
    });

    if (!storedToken) throw ApiError.unauthorized('Invalid refresh token');
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw ApiError.unauthorized('Refresh token expired, please login again');
    }
    if (!storedToken.user.isActive) throw ApiError.unauthorized('Account deactivated');

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    return this.generateTokenPair(storedToken.user);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────
  async logout(token: string, userId: number): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token } });
    await this.logActivity(userId, 'logout', {});
  }

  // ─── Change Password ─────────────────────────────────────────────────────
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw ApiError.notFound('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw ApiError.badRequest('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await this.logActivity(userId, 'change_password', {});
  }

  // ─── Get Profile ─────────────────────────────────────────────────────────
  async getProfile(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true,
        schoolName: true, phone: true, isActive: true,
        lastLoginAt: true, createdAt: true,
        teacherSubjects: {
          include: {
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true, grade: true } },
          },
        },
      },
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────
  private async generateTokenPair(user: { id: number; email: string; role: Role; name: string }): Promise<TokenPair> {
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });

    const refreshTokenValue = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: { token: refreshTokenValue, userId: user.id, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private async logActivity(userId: number, action: string, details: object) {
    try {
      await prisma.activityLog.create({ data: { userId, action, details } });
    } catch (e) {
      logger.error(`Failed to log activity: ${e}`);
    }
  }
}
