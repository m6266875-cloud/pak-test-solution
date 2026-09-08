/**
 * PHASE 2 — Catalog scope service (wizard + filter data, node-pg).
 *
 * Every endpoint is scoped for teachers: subjects only from their
 * TeacherSubject assignments; chapters/topics/exercises/books only under
 * those subjects; question counts always approved+active only, so the wizard
 * availability numbers equal what the generator can actually draw.
 */
import { q, q1 } from './db';
import { ApiError } from '../utils/apiResponse';
import { loadTeacherScope, isAdminRole } from './scope';
import { AuthUser } from './types';

const intOr = (v: any): number | undefined => (v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

const APPROVED_QL = `(SELECT count(*) FROM "Question" x WHERE x."chapterId" = ch.id AND x.status = 'approved' AND x."isActive")`;
const TOTAL_QL = `(SELECT count(*) FROM "Question" x WHERE x."chapterId" = ch.id AND x."isActive")`;

export class CatalogService {
  /** Courses available to the caller (teacher: only assigned courses). */
  async listCourses(user: AuthUser) {
    const admin = isAdminRole(user.role);
    let rows: any[];
    if (admin) {
      rows = await q(
        `SELECT co.id, co.code, co.name, co."shortName", co.type, co."logoUrl", co."logoEnabled", co.status, co."displayOrder",
                (SELECT count(*) FROM "CourseClass" cc WHERE cc."courseId" = co.id AND cc."isActive")::int AS "classCount",
                (SELECT count(*) FROM "Subject" s WHERE s."courseId" = co.id AND s.status = 'active')::int AS "subjectCount",
                (SELECT count(*) FROM "Book" b WHERE b."courseId" = co.id AND b.status = 'active')::int AS "bookCount"
           FROM "Course" co WHERE co.status = 'active' ORDER BY co."displayOrder", co.name`
      );
    } else {
      rows = await q(
        `SELECT DISTINCT co.id, co.code, co.name, co."shortName", co.type, co."logoUrl", co."logoEnabled", co.status, co."displayOrder",
                (SELECT count(*) FROM "CourseClass" cc WHERE cc."courseId" = co.id AND cc."isActive")::int AS "classCount",
                (SELECT count(DISTINCT s.id) FROM "Subject" s JOIN "TeacherSubject" ts ON ts."subjectId" = s.id
                   WHERE s."courseId" = co.id AND ts."teacherId" = $1 AND s.status = 'active')::int AS "subjectCount",
                (SELECT count(DISTINCT b.id) FROM "Book" b JOIN "TeacherSubject" ts ON ts."subjectId" = b."subjectId"
                   WHERE b."courseId" = co.id AND ts."teacherId" = $1 AND b.status = 'active')::int AS "bookCount"
           FROM "Course" co
           JOIN "Subject" s ON s."courseId" = co.id
           JOIN "TeacherSubject" ts ON ts."subjectId" = s.id
          WHERE co.status = 'active' AND ts."teacherId" = $1
          ORDER BY co."displayOrder", co.name`,
        [user.id]
      );
    }
    // attach current session per course
    const out: any[] = [];
    for (const r of rows) {
      const cur = await q1(
        `SELECT cs.status, a.id AS "sessionId", a.code, a.name FROM "CourseSession" cs
           JOIN "AcademicSession" a ON a.id = cs."sessionId"
          WHERE cs."courseId" = $1 ORDER BY (cs.status = 'current') DESC, cs."sortOrder", a."startYear" DESC LIMIT 1`,
        [r.id]
      );
      out.push({ ...r, currentSession: cur ?? null });
    }
    return out;
  }

  /** Sessions linked to a course (with statuses). */
  async courseSessions(user: AuthUser, courseId: number) {
    await this.assertCourseVisible(user, courseId);
    return q(
      `SELECT cs.status, a.id, a.code, a.name, a."startYear", a."endYear"
         FROM "CourseSession" cs JOIN "AcademicSession" a ON a.id = cs."sessionId"
        WHERE cs."courseId" = $1
        ORDER BY (cs.status = 'current') DESC, a."startYear" DESC`,
      [courseId]
    );
  }

  /** Classes valid for a course (+ subject count per class; teacher-scoped). */
  async courseClasses(user: AuthUser, courseId: number) {
    await this.assertCourseVisible(user, courseId);
    if (isAdminRole(user.role)) {
      return q(
        `SELECT cl.id, cl.name, cl.grade, cc."displayOrder",
                (SELECT count(*) FROM "Subject" s
                  WHERE s."courseId" = cc."courseId" AND s."classId" = cl.id AND s.status = 'active')::int AS "subjectCount"
           FROM "CourseClass" cc JOIN "Class" cl ON cl.id = cc."classId"
          WHERE cc."courseId" = $1 AND cc."isActive"
          ORDER BY cc."displayOrder", cl.grade`,
        [courseId]
      );
    }
    return q(
      `SELECT cl.id, cl.name, cl.grade, cc."displayOrder",
              (SELECT count(DISTINCT s.id) FROM "Subject" s JOIN "TeacherSubject" ts ON ts."subjectId" = s.id
                WHERE s."courseId" = cc."courseId" AND s."classId" = cl.id AND s.status = 'active' AND ts."teacherId" = $2)::int AS "subjectCount"
         FROM "CourseClass" cc JOIN "Class" cl ON cl.id = cc."classId"
        WHERE cc."courseId" = $1 AND cc."isActive"
          AND EXISTS (SELECT 1 FROM "TeacherSubject" ts2 JOIN "Subject" s2 ON s2.id = ts2."subjectId"
                       WHERE ts2."teacherId" = $2 AND s2."courseId" = cc."courseId" AND s2."classId" = cl.id)
        ORDER BY cc."displayOrder", cl.grade`,
      [courseId, user.id]
    );
  }

  /** Subjects of a class/course (teacher: assignments only). */
  async classSubjects(user: AuthUser, classId: number, courseId?: number) {
    const admin = isAdminRole(user.role);
    const params: unknown[] = [classId];
    let extra = '';
    if (courseId != null) {
      params.push(courseId);
      extra = ` AND s."courseId" = $${params.length}`;
    }
    if (!admin) {
      params.push(user.id);
      extra += ` AND s.id IN (SELECT "subjectId" FROM "TeacherSubject" WHERE "teacherId" = $${params.length})`;
    }
    return q(
      `SELECT s.id, s.name, s.code, s.medium, s."displayOrder",
              (SELECT count(*) FROM "Book" b WHERE b."subjectId" = s.id AND b.status = 'active')::int AS "bookCount",
              (SELECT count(*) FROM "Chapter" ch WHERE ch."subjectId" = s.id AND ch.status = 'active')::int AS "chapterCount"
         FROM "Subject" s
        WHERE s."classId" = $1 AND s.status = 'active'${extra}
        ORDER BY s."displayOrder", s.name`,
      params
    );
  }

  /** Active books of a subject (optional session filter). */
  async subjectBooks(user: AuthUser, subjectId: number, sessionId?: number) {
    await this.assertSubjectVisible(user, subjectId);
    const params: unknown[] = [subjectId];
    let extra = '';
    if (sessionId != null) {
      params.push(sessionId);
      extra = ` AND b."sessionId" = $${params.length}`;
    }
    return q(
      `SELECT b.id, b.title, b.edition, b.year, b.language, b.isbn, b."bookCode", b."sessionId",
              b."fileStatus", b.verified,
              (SELECT count(*) FROM "Chapter" ch WHERE ch."bookId" = b.id AND ch.status = 'active')::int AS "chapterCount"
         FROM "Book" b
        WHERE b."subjectId" = $1 AND b.status = 'active'${extra}
        ORDER BY b.year DESC NULLS LAST, b.title`,
      params
    );
  }

  /** Chapters of a subject — from a specific book, or bookless/any. */
  async subjectChapters(user: AuthUser, subjectId: number, bookId?: number) {
    await this.assertSubjectVisible(user, subjectId);
    const params: unknown[] = [subjectId];
    let extra = '';
    if (bookId != null) {
      params.push(bookId);
      extra = ` AND (ch."bookId" = $${params.length})`;
    }
    return q(
      `SELECT ch.id, ch.number, ch.name, ch.description,
              (SELECT count(*) FROM "Topic" t WHERE t."chapterId" = ch.id AND t.status = 'active')::int AS "topicCount",
              (SELECT count(*) FROM "Exercise" e WHERE e."chapterId" = ch.id AND e.status = 'active')::int AS "exerciseCount",
              (SELECT count(*) FROM "Question" x WHERE x."chapterId" = ch.id AND x.status = 'approved' AND x."isActive")::int AS "approvedQuestionCount",
              (SELECT count(*) FROM "Question" x WHERE x."chapterId" = ch.id AND x."isActive")::int AS "totalQuestionCount"
         FROM "Chapter" ch
        WHERE ch."subjectId" = $1 AND ch.status = 'active'${extra}
        ORDER BY ch.number, ch.id`,
      params
    );
  }

  /** Topics of a chapter (active) with approved-question counts. */
  async chapterTopics(user: AuthUser, chapterId: number) {
    await this.assertChapterVisible(user, chapterId);
    return q(
      `SELECT t.id, t.name, t."sortOrder",
              (SELECT count(*) FROM "Question" x WHERE x."topicId" = t.id AND x.status = 'approved' AND x."isActive")::int AS "approvedQuestionCount",
              (SELECT count(*) FROM "Question" x WHERE x."topicId" = t.id AND x."isActive")::int AS "totalQuestionCount"
         FROM "Topic" t
        WHERE t."chapterId" = $1 AND t.status = 'active'
        ORDER BY t."sortOrder", t.id`,
      [chapterId]
    );
  }

  /** Exercises of a chapter (active) with approved-question counts. */
  async chapterExercises(user: AuthUser, chapterId: number) {
    await this.assertChapterVisible(user, chapterId);
    return q(
      `SELECT e.id, e.name, e.number,
              (SELECT count(*) FROM "Question" x WHERE x."exerciseId" = e.id AND x.status = 'approved' AND x."isActive")::int AS "approvedQuestionCount",
              (SELECT count(*) FROM "Question" x WHERE x."exerciseId" = e.id AND x."isActive")::int AS "totalQuestionCount"
         FROM "Exercise" e
        WHERE e."chapterId" = $1 AND e.status = 'active'
        ORDER BY e.number, e.id`,
      [chapterId]
    );
  }

  /**
   * Availability engine input: per-type approved counts matching the exact
   * selection (chapters × topics × exercises × language × difficulty).
   */
  async availability(user: AuthUser, p: {
    subjectIds?: number[];
    chapterIds?: number[];
    topicIds?: number[];
    exerciseIds?: number[];
    language?: string;
    difficulty?: string;
  } = {}) {
    const chapterIds = (p.chapterIds ?? []).map(Number).filter((n) => n > 0);
    const topicIds = (p.topicIds ?? []).map(Number).filter((n) => n > 0);
    const exerciseIds = (p.exerciseIds ?? []).map(Number).filter((n) => n > 0);
    if (!chapterIds.length) throw ApiError.badRequest('chapterIds are required');

    const params: unknown[] = [chapterIds];
    const where = [`x."chapterId" = ANY($1::int[])`, `x.status = 'approved'`, `x."isActive" = true`];
    const addParam = (v: unknown) => {
      params.push(v);
      return params.length;
    };
    if (topicIds.length) { const i = addParam(topicIds); where.push(`x."topicId" = ANY($${i}::int[])`); }
    if (exerciseIds.length) { const i = addParam(exerciseIds); where.push(`x."exerciseId" = ANY($${i}::int[])`); }
    if (p.language && p.language !== 'any') { const i = addParam(p.language); where.push(`x.language = $${i}`); }
    if (p.difficulty && p.difficulty !== 'any') { const i = addParam(p.difficulty); where.push(`x.difficulty = $${i}`); }
    const scope = user.role === 'teacher' ? await loadTeacherScope(user.id) : null;
    if (scope && scope.subjectIds.length) {
      const i = addParam(scope.subjectIds);
      where.push(`x."subjectId" = ANY($${i}::int[])`);
    } else if (scope) {
      where.push('FALSE');
    }
    const byType = await q<{ type: string; n: string }>(
      `SELECT x.type, count(*)::int AS n FROM "Question" x WHERE ${where.join(' AND ')} GROUP BY x.type`,
      params
    );
    return byType.map((r) => ({ type: r.type, available: Number(r.n) }));
  }

  // ── guards ────────────────────────────────────────────────────────────────
  private async assertCourseVisible(user: AuthUser, courseId: number) {
    const course = await q1(`SELECT id FROM "Course" WHERE id = $1 AND status = 'active'`, [courseId]);
    if (!course) throw ApiError.notFound('Course not found');
    if (isAdminRole(user.role)) return;
    const scope = await loadTeacherScope(user.id);
    if (!scope.courseIds.includes(courseId)) throw ApiError.forbidden('This course is not assigned to you');
  }

  private async assertSubjectVisible(user: AuthUser, subjectId: number) {
    const subject = await q1(`SELECT id, "courseId", "classId", status FROM "Subject" WHERE id = $1`, [subjectId]);
    if (!subject || subject.status !== 'active') throw ApiError.notFound('Subject not found');
    if (isAdminRole(user.role)) return;
    const scope = await loadTeacherScope(user.id);
    if (!scope.subjectIds.includes(subjectId)) throw ApiError.forbidden('This subject is not assigned to you');
  }

  private async assertChapterVisible(user: AuthUser, chapterId: number) {
    const chapter = await q1<{ id: number; subjectId: number; status: string }>(
      `SELECT id, "subjectId", status FROM "Chapter" WHERE id = $1`, [chapterId]
    );
    if (!chapter || chapter.status !== 'active') throw ApiError.notFound('Chapter not found');
    if (isAdminRole(user.role)) return;
    const scope = await loadTeacherScope(user.id);
    if (!scope.subjectIds.includes(chapter.subjectId)) throw ApiError.forbidden('This chapter is not assigned to you');
  }
}

export const catalogService = new CatalogService();
export { intOr };
