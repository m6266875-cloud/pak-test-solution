/**
 * PHASE 3 — Analytics & dashboards (node-pg aggregates).
 *
 * super_admin sees global numbers; school_admin sees numbers scoped to their
 * own school. All queries are server-side SQL aggregates — no data shipped to
 * the browser for counting.
 */
import { q, q1 } from '../phase2/db';
import { AuthUser } from '../phase2/types';
import { ApiError } from '../utils/apiResponse';

function scope(user: AuthUser): { schoolId: number | null; isSuper: boolean } {
  if (user.role === 'super_admin') return { schoolId: null, isSuper: true };
  if (user.role === 'school_admin') return { schoolId: user.schoolId, isSuper: false };
  throw ApiError.forbidden('Only admins can view analytics');
}

export const analyticsService = {
  async overview(user: AuthUser) {
    const sc = scope(user);
    const sid = sc.schoolId;
    const params = sid != null ? [sid] : [];
    const schoolPapers = (base: string, col = '"schoolId"') =>
      sid != null ? `${base} WHERE ${col} = $1` : base;

    const [schools, teachers, courses, books, classes, papers, questions, byQType, byQStatus, byPaperStatus] =
      await Promise.all([
        sid == null
          ? q1<{ n: string }>(`SELECT count(*)::int AS n FROM "School" WHERE status <> 'archived'`)
          : Promise.resolve(null),
        q1<{ n: string }>(
          sid == null
            ? `SELECT count(*)::int AS n FROM "User" WHERE role IN ('teacher','school_admin') AND "isActive"=true`
            : `SELECT count(*)::int AS n FROM "User" WHERE role='teacher' AND "schoolId"=$1 AND "isActive"=true`,
          params
        ),
        sid == null
          ? q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Course"`)
          : q1<{ n: string }>(
              `SELECT count(DISTINCT s."courseId")::int AS n FROM "TeacherSubject" ts
               JOIN "Subject" s ON s.id = ts."subjectId" JOIN "User" u ON u.id = ts."teacherId"
               WHERE u."schoolId" = $1`,
              params
            ),
        sid == null
          ? q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Book"`)
          : q1<{ n: string }>(
              `SELECT count(DISTINCT b.id)::int AS n FROM "Book" b
               JOIN "Subject" s ON s.id = b."subjectId"
               JOIN "TeacherSubject" ts ON ts."subjectId" = s.id
               JOIN "User" u ON u.id = ts."teacherId"
               WHERE u."schoolId" = $1`,
              params
            ),
        sid == null
          ? q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Class" WHERE grade BETWEEN 1 AND 12`)
          : q1<{ n: string }>(
              `SELECT count(DISTINCT ts."classId")::int AS n FROM "TeacherSubject" ts
               JOIN "User" u ON u.id = ts."teacherId" WHERE u."schoolId" = $1`,
              params
            ),
        q1<{ n: string }>(schoolPapers(`SELECT count(*)::int AS n FROM "Paper"`), params),
        sid == null
          ? q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Question"`)
          : q1<{ n: string }>(
              `SELECT count(DISTINCT pq."questionId")::int AS n FROM "PaperQuestion" pq
               JOIN "Paper" p ON p.id = pq."paperId" WHERE p."schoolId" = $1`,
              params
            ),
        sid == null
          ? q<any>(`SELECT type, count(*)::int AS n FROM "Question" GROUP BY type`)
          : q<any>(
              `SELECT pq.type, count(*)::int AS n FROM "PaperQuestion" pq
               JOIN "Paper" p ON p.id = pq."paperId" WHERE p."schoolId" = $1 GROUP BY pq.type`,
              params
            ),
        sid == null
          ? q<any>(`SELECT status, count(*)::int AS n FROM "Question" GROUP BY status`)
          : Promise.resolve([]),
        q<any>(
          schoolPapers(`SELECT status, count(*)::int AS n FROM "Paper" GROUP BY status`),
          params
        ),
      ]);

    return {
      totals: {
        schools: Number((schools as any)?.n ?? (sid != null ? 1 : 0)),
        teachers: Number(teachers?.n ?? 0),
        courses: Number(courses?.n ?? 0),
        books: Number(books?.n ?? 0),
        classes: Number(classes?.n ?? 0),
        papers: Number(papers?.n ?? 0),
        questions: Number(questions?.n ?? 0),
      },
      questionsByType: byQType ?? [],
      questionsByStatus: byQStatus ?? [],
      papersByStatus: byPaperStatus ?? [],
    };
  },

  async paperActivity(user: AuthUser) {
    const sc = scope(user);
    const sid = sc.schoolId;
    const params = sid != null ? [sid] : [];
    const w = sid != null ? 'WHERE "schoolId" = $1 AND' : 'WHERE';
    const [today, week, month, daily] = await Promise.all([
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Paper" ${w} "createdAt" >= CURRENT_DATE`, params),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Paper" ${w} "createdAt" >= CURRENT_DATE - INTERVAL '7 days'`, params),
      q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Paper" ${w} "createdAt" >= date_trunc('month', CURRENT_DATE)`, params),
      q<any>(
        `SELECT to_char("createdAt", 'YYYY-MM-DD') AS day, count(*)::int AS n
           FROM "Paper" ${w} "createdAt" >= CURRENT_DATE - INTERVAL '13 days'
          GROUP BY day ORDER BY day`,
        params
      ),
    ]);
    return {
      today: Number(today?.n ?? 0),
      week: Number(week?.n ?? 0),
      month: Number(month?.n ?? 0),
      daily: daily ?? [],
    };
  },

  async topLists(user: AuthUser) {
    const sc = scope(user);
    const sid = sc.schoolId;
    const params = sid != null ? [sid] : [];
    const scoped = (head: string, tail: string) =>
      sid == null ? `${head} ${tail}` : `${head} WHERE p."schoolId" = $1 ${tail}`;
    const [schools, teachers, subjects] = await Promise.all([
      sid == null
        ? q<any>(
            `SELECT s.id, s.name, s.code, count(p.id)::int AS papers
               FROM "Paper" p JOIN "School" s ON s.id = p."schoolId"
              GROUP BY s.id ORDER BY papers DESC LIMIT 5`
          )
        : Promise.resolve([]),
      q<any>(
        scoped(
          `SELECT u.id, u.name, u.email, count(p.id)::int AS papers
             FROM "Paper" p JOIN "User" u ON u.id = p."teacherId"`,
          `GROUP BY u.id ORDER BY papers DESC LIMIT 5`
        ),
        params
      ),
      q<any>(
        scoped(
          `SELECT s.id, s.name, s.medium, count(ps."paperId")::int AS papers
             FROM "PaperSubject" ps
             JOIN "Subject" s ON s.id = ps."subjectId"
             JOIN "Paper" p ON p.id = ps."paperId"`,
          `GROUP BY s.id ORDER BY papers DESC LIMIT 8`
        ),
        params
      ),
    ]);
    return { schools, teachers, subjects };
  }
};
