/**
 * PHASE 2 — Shared domain types mirroring the PostgreSQL enums and shapes.
 * Kept dependency-free so every module here type-checks without a Prisma
 * generated client.
 */

// ─── Enum value sets (must match prisma/schema.prisma + migrations) ─────────
export const QUESTION_TYPES = ['mcq', 'short', 'essay', 'true_false', 'fill_blank', 'matching', 'numerical', 'conceptual'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_STATUSES = ['pending', 'approved', 'rejected', 'draft', 'archived'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const MEDIA = ['english', 'urdu', 'bilingual'] as const;
export type Medium = (typeof MEDIA)[number];

export const QUESTION_SOURCES = ['manual', 'imported', 'past_paper', 'exercise'] as const;
export type QuestionSource = (typeof QUESTION_SOURCES)[number];

export const CONTENT_STATUSES = ['active', 'inactive', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const PAPER_STATUSES = ['draft', 'final', 'archived'] as const;
export type PaperStatus = (typeof PAPER_STATUSES)[number];

export const PAPER_TYPES = ['objective', 'subjective', 'mixed'] as const;
export type PaperType = (typeof PAPER_TYPES)[number];

export const ROLES = ['super_admin', 'school_admin', 'teacher'] as const;
export type Role = (typeof ROLES)[number];

export const QUESTION_CATEGORIES = ['exercise', 'example', 'review', 'past_paper', 'conceptual', 'practice'] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

// ─── Auth request user (same contract as middleware/auth + schoolId) ────────
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  name: string;
  schoolId: number | null;
}

// ─── Question row (DB shape used by the bank queries) ───────────────────────
export interface QuestionRow {
  id: number;
  chapterId: number;
  exerciseId: number | null;
  topicId: number | null;
  bookId: number | null;
  type: QuestionType;
  text: string;
  marks: number;
  options: any | null;
  answer: string | null;
  difficulty: Difficulty;
  language: Medium;
  source: QuestionSource;
  status: QuestionStatus;
  tags: string[];
  category: string | null;
  bankNo: string | null;
  hint: string | null;
  explanation: string | null;
  images: any | null;
  pageRef: string | null;
  sourceRef: string | null;
  importedFrom: string | null;
  importRef: string | null;
  isActive: boolean;
  courseId: number | null;
  sessionId: number | null;
  classId: number | null;
  subjectId: number | null;
  createdById: number | null;
  updatedById: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Question list filters (superset of the legacy question API) ────────────
export interface QuestionFilters {
  page?: number;
  limit?: number;
  search?: string;
  courseId?: number;
  sessionId?: number;
  classId?: number;
  subjectId?: number;
  bookId?: number;
  chapterId?: number;
  topicId?: number;
  exerciseId?: number;
  type?: QuestionType;
  language?: Medium;
  marksEq?: number;
  marksMin?: number;
  marksMax?: number;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  category?: string;
  source?: QuestionSource;
  createdById?: number;
  tag?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ─── Distribution row of the paper generator ────────────────────────────────
export interface DistributionRow {
  type: QuestionType;
  count: number;
  marks: number;
}

export interface AvailabilityRow {
  type: QuestionType;
  required: number;
  marks: number;
  available: number;
  ok: boolean;
}
