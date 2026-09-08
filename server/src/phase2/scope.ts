/**
 * PHASE 2 — Teacher scope engine (enforced in SQL, never just in the UI).
 *
 * A teacher may only reach questions/papers whose Subject is in
 * TeacherSubject(teacherId, subjectId, classId). Question rows carry the
 * denormalised subjectId/courseId/classId so every query can be scoped with
 * a single "subjectId = ANY(…)" predicate — there is no path where a crafted
 * request can read or generate from an unassigned subject.
 *
 * Admins (super_admin, school_admin) manage the whole bank — matching the
 * pre-existing role semantics — and school_admin paper oversight is scoped
 * by school in the paper service (teacher.schoolId == admin.schoolId).
 */
import { q, q1 } from './db';
import { ApiError } from '../utils/apiResponse';
import { AuthUser, Role } from './types';

export interface TeacherScope {
  /** Subject ids the teacher is assigned to teach (any class). */
  subjectIds: number[];
  /** Class ids present in the assignments (derived). */
  classIds: number[];
  /** Course ids the assigned subjects belong to (derived). */
  courseIds: number[];
}

export const isAdminRole = (role: Role): boolean => role !== 'teacher';

export async function loadTeacherScope(teacherId: number): Promise<TeacherScope> {
  const rows = await q<{ subjectId: number; classId: number; courseId: number | null }>(
    `SELECT ts."subjectId", ts."classId", s."courseId"
       FROM "TeacherSubject" ts
       LEFT JOIN "Subject" s ON s.id = ts."subjectId"
      WHERE ts."teacherId" = $1`,
    [teacherId]
  );
  return {
    subjectIds: [...new Set(rows.map((r) => r.subjectId))],
    classIds: [...new Set(rows.map((r) => r.classId))],
    courseIds: [...new Set(rows.filter((r) => r.courseId != null).map((r) => r.courseId as number))],
  };
}

/**
 * SQL predicate fragment restricting a Question query to the teacher's
 * assignments. `alias` prefixes the subjectId column (e.g. 'q', 'x').
 * When the teacher has no assignments the predicate is `FALSE` so zero rows
 * leak. Admins pass through with allowAll=true.
 */
export function questionScopePredicate(user: AuthUser, alias: string, scope: TeacherScope | null = null): { sql: string; params: unknown[] } {
  if (isAdminRole(user.role)) return { sql: 'TRUE', params: [] };
  if (!scope || scope.subjectIds.length === 0) return { sql: 'FALSE', params: [] };
  const col = alias ? `"${alias}"."subjectId"` : '"subjectId"';
  return { sql: `${col} = ANY($1::int[])`, params: [scope.subjectIds] };
}

export async function assertChapterAllowed(chapterId: number, user: AuthUser): Promise<{ id: number; subjectId: number; classId: number | null; courseId: number | null }> {
  const chapter = await q1<{ id: number; subjectId: number; classId: number | null; courseId: number | null }>(
    `SELECT ch.id, ch."subjectId", s."classId", s."courseId"
       FROM "Chapter" ch
       JOIN "Subject" s ON s.id = ch."subjectId"
      WHERE ch.id = $1`,
    [chapterId]
  );
  if (!chapter) throw ApiError.notFound('Chapter not found');
  if (isAdminRole(user.role)) return chapter;

  const scope = await loadTeacherScope(user.id);
  if (!scope.subjectIds.includes(chapter.subjectId)) {
    throw ApiError.forbidden('This chapter does not belong to any subject assigned to you');
  }
  return chapter;
}

/** Fetch a subject row + its course/class for scope checks. */
export async function assertSubjectAllowed(subjectId: number, user: AuthUser): Promise<{ id: number; classId: number; courseId: number | null }> {
  const subject = await q1<{ id: number; classId: number; courseId: number | null }>(
    `SELECT id, "classId", "courseId" FROM "Subject" WHERE id = $1`,
    [subjectId]
  );
  if (!subject) throw ApiError.notFound('Subject not found');
  if (isAdminRole(user.role)) return subject;

  const scope = await loadTeacherScope(user.id);
  if (!scope.subjectIds.includes(subjectId)) {
    throw ApiError.forbidden('This subject is not assigned to you');
  }
  return subject;
}

/** Question ids a teacher may touch (created by them) — or admin: any id. */
export async function assertQuestionWritable(questionId: number, user: AuthUser): Promise<void> {
  const question = await q1<{ id: number; createdById: number | null; subjectId: number | null }>(
    `SELECT id, "createdById", "subjectId" FROM "Question" WHERE id = $1`,
    [questionId]
  );
  if (!question) throw ApiError.notFound('Question not found');
  if (isAdminRole(user.role)) return;
  if (question.createdById !== user.id) {
    throw ApiError.forbidden('You can only edit questions you created');
  }
  const scope = await loadTeacherScope(user.id);
  if (question.subjectId == null || !scope.subjectIds.includes(question.subjectId)) {
    throw ApiError.forbidden('This question does not belong to a subject assigned to you');
  }
}
