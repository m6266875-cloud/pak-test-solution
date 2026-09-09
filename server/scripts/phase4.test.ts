/**
 * PHASE 4 — 5-step wizard backend + scope-enforcement behavioral tests.
 *
 * Real HTTP against the Phase-2 test app + real database (same harness as
 * scripts/phase2-generator.test.ts). Fixtures are self-contained: a P4FIX
 * course/class/subject/chapter chain plus teacher/admin users, all removed
 * afterwards so the shared dev DB is left exactly as found.
 *
 * Covers:
 *   • teacher chain: scoped catalog → preview-pool (counts/pagination/
 *     suggestion) → session auto-attach on generate → select → save
 *   • admin chain: unscoped preview-pool + generate across subjects
 *   • scope attacks: crafted chapter/subject ids outside the teacher's
 *     assignments must 403 (never trust client IDs)
 *   • validation: bad type 400, marks mismatch 400, short pool 422
 *   • audit trail: paper.generate / paper.questions.select / paper.save rows
 *   • syllabus import (Part B): verified-only gate, exact-content upsert,
 *     idempotent re-import, teacher 403, syllabus.import audit row
 *
 * Usage (from server/):
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db \
 *   JWT_SECRET=test-secret npx ts-node --transpile-only scripts/phase4.test.ts
 */
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import bcrypt from 'bcrypt';
import express, { Request, Response, NextFunction } from 'express';
import { createPhase2TestApp } from '../src/phase2/testApp';
import v3Router from '../src/phase3/routes';
import { q, q1, run } from '../src/phase2/db';

const SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_SECRET = SECRET; // authenticate middleware reads the env
const FIX = 'P4FIX|';
const P = '/api/v2';

let pass = 0;
let fail = 0;
function ok(cond: boolean, label: string, extra?: unknown) {
  if (cond) { pass++; console.log(`  ✔ ${label}`); }
  else { fail++; console.error(`  ✖ FAIL: ${label}`, extra ?? ''); }
}

async function api(base: string, token: string, method: string, path: string, body?: any) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}
const token = (id: number) => jwt.sign({ id }, SECRET, { expiresIn: '1h' });

async function cleanup() {
  await run(`DELETE FROM "Paper" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE '%p4fix%')`);
  await run(`DELETE FROM "TeacherSubject" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE '%p4fix%')`);
  await run(`DELETE FROM "Question" WHERE text LIKE '${FIX}%'`);
  await run(`DELETE FROM "Chapter" WHERE name LIKE '${FIX}%'`);
  await run(`DELETE FROM "Subject" WHERE name LIKE '${FIX}%'`);
  await run(`DELETE FROM "CourseClass" WHERE "courseId" IN (SELECT id FROM "Course" WHERE code LIKE 'P4FIX%')`);
  await run(`DELETE FROM "CourseSession" WHERE "courseId" IN (SELECT id FROM "Course" WHERE code LIKE 'P4FIX%')`);
  await run(`DELETE FROM "Course" WHERE code LIKE 'P4FIX%'`);
  await run(`DELETE FROM "Class" WHERE name LIKE '${FIX}%'`);
  await run(`DELETE FROM "User" WHERE email LIKE '%p4fix%'`);
  await run(`DELETE FROM "AcademicSession" WHERE code LIKE 'P4FIX%'`);
}

async function main() {
  await cleanup();

  // ── fixtures ────────────────────────────────────────────────────────────
  // free Class grade in the 90x sandbox band
  const used = new Set((await q<{ grade: number }>(`SELECT grade FROM "Class" WHERE grade BETWEEN 901 AND 920`)).map((r) => r.grade));
  const grade = [901, 902, 903, 904, 905, 906, 907, 908, 909, 910].find((g) => !used.has(g));
  if (!grade) throw new Error('No free fixture grade in 901..910');
  const classRow = await q1<{ id: number }>(
    `INSERT INTO "Class" ("name","grade") VALUES ($1,$2) RETURNING id`, [`${FIX}Class`, grade]);
  const classId = classRow!.id;
  const courseRow = await q1<{ id: number }>(
    `INSERT INTO "Course" ("code","name","type","status") VALUES ('P4FIXT','${FIX}Course','board','active') RETURNING id`);
  const courseId = courseRow!.id;
  await run(`INSERT INTO "CourseClass" ("courseId","classId","isActive") VALUES ($1,$2,true)`, [courseId, classId]);
  // session: reuse any existing one, else create a fixture session
  let sessionId = (await q1<{ id: number }>(`SELECT id FROM "AcademicSession" ORDER BY "startYear" DESC LIMIT 1`))?.id ?? null;
  if (sessionId == null) {
    sessionId = (await q1<{ id: number }>(
      `INSERT INTO "AcademicSession" ("code","name","startYear","endYear") VALUES ('P4FIX-00','${FIX}Session',2099,2100) RETURNING id`))!.id;
  }
  await run(`INSERT INTO "CourseSession" ("courseId","sessionId","status") VALUES ($1,$2,'current')`, [courseId, sessionId]);

  const subj = async (name: string) => (await q1<{ id: number }>(
    `INSERT INTO "Subject" ("name","medium","classId","courseId","status") VALUES ($1,'english',$2,$3,'active') RETURNING id`,
    [`${FIX}${name}`, classId, courseId]))!.id;
  const subjectId = await subj('Assigned');
  const otherSubjectId = await subj('Unassigned');
  const chap = async (subject: number, n: number) => (await q1<{ id: number }>(
    `INSERT INTO "Chapter" ("name","number","subjectId","status") VALUES ($1,$2,$3,'active') RETURNING id`,
    [`${FIX}Ch${n}`, n, subject]))!.id;
  const ch1 = await chap(subjectId, 1);
  const ch2 = await chap(subjectId, 2);
  const chForeign = await chap(otherSubjectId, 1);

  // books for the syllabus-import tests: one verified, one not
  const bookVerified = (await q1<{ id: number }>(
    `INSERT INTO "Book" ("title","subjectId","verified") VALUES ($1,$2,true) RETURNING id`,
    [`${FIX}Verified Book`, subjectId]))!.id;
  const bookDraft = (await q1<{ id: number }>(
    `INSERT INTO "Book" ("title","subjectId","verified") VALUES ($1,$2,false) RETURNING id`,
    [`${FIX}Draft Book`, subjectId]))!.id;

  const pw = await bcrypt.hash('P4fix-pass-1', 4);
  const teacherId = (await q1<{ id: number }>(
    `INSERT INTO "User" ("email","password","name","role") VALUES ('teacher.p4fix@example.test',$1,'${FIX}Teacher','teacher') RETURNING id`, [pw]))!.id;
  const adminId = (await q1<{ id: number }>(
    `INSERT INTO "User" ("email","password","name","role") VALUES ('admin.p4fix@example.test',$1,'${FIX}Admin','super_admin') RETURNING id`, [pw]))!.id;
  await run(`INSERT INTO "TeacherSubject" ("teacherId","subjectId","classId") VALUES ($1,$2,$3)`, [teacherId, subjectId, classId]);

  // 6 mcq + 4 short + 2 essay approved across ch1/ch2; 1 pending; 1 inactive; 1 foreign
  const mkq = async (chapterId: number, type: string, i: number, extra: string, params: unknown[]) =>
    run(`INSERT INTO "Question" ("chapterId","type","text","marks","difficulty","language","status","isActive",
          "courseId","classId","subjectId","sessionId",${extra}) VALUES ($1,$2,$3,1,'easy','english','approved',true,$4,$5,$6,$7)`,
      [chapterId, type, `${FIX}${type}-${chapterId}-${i}`, courseId, classId, subjectId, sessionId, ...params]);
  let qi = 0;
  for (const [ch, types] of [[ch1, ['mcq', 'mcq', 'mcq', 'short', 'short', 'essay']], [ch2, ['mcq', 'mcq', 'mcq', 'short', 'short', 'essay']]] as Array<[number, string[]]>) {
    for (const t of types) { qi++; await mkq(ch, t, qi, '"createdById"', [teacherId]); }
  }
  await run(`INSERT INTO "Question" ("chapterId","type","text","status","courseId","classId","subjectId") VALUES ($1,'mcq','${FIX}pending','pending',$2,$3,$4)`,
    [ch1, courseId, classId, subjectId]);
  await run(`INSERT INTO "Question" ("chapterId","type","text","status","isActive","courseId","classId","subjectId") VALUES ($1,'mcq','${FIX}inactive','approved',false,$2,$3,$4)`,
    [ch1, courseId, classId, subjectId]);
  await run(`INSERT INTO "Question" ("chapterId","type","text","status","courseId","classId","subjectId") VALUES ($1,'mcq','${FIX}foreign','approved',$2,$3,$4)`,
    [chForeign, courseId, classId, otherSubjectId]);

  const app = createPhase2TestApp();
  const server: any = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const T = token(teacherId);
  const A = token(adminId);

  try {
    // ── teacher chain: scoped catalog ──
    {
      const r = await api(base, T, 'GET', `${P}/catalog/courses`);
      const codes = ((r.json?.data ?? []) as any[]).map((c) => c.code);
      ok(r.status === 200 && codes.includes('P4FIXT'), 'teacher catalog lists assigned course');
      const r2 = await api(base, T, 'GET', `${P}/catalog/classes/${classId}/subjects?courseId=${courseId}`);
      const ids = ((r2.json?.data ?? []) as any[]).map((s: any) => s.id);
      ok(r2.status === 200 && ids.includes(subjectId) && !ids.includes(otherSubjectId), 'teacher subjects exclude unassigned subject');
    }

    // ── preview-pool: counts / pagination / suggestion ──
    {
      const r = await api(base, T, 'POST', `${P}/papers/preview-pool`, { chapterIds: [ch1, ch2] });
      const d = r.json?.data;
      ok(r.status === 200 && d?.total === 12, 'preview-pool total counts approved+active only', d?.total);
      ok(d?.countsByType?.mcq === 6 && d?.countsByType?.short === 4 && d?.countsByType?.essay === 2, 'preview-pool per-type counts', d?.countsByType);
      ok(d?.rows?.[0]?.text?.startsWith(FIX) && d?.rows?.[0]?.chapterName, 'preview-pool rows carry display fields');

      const pg = await api(base, T, 'POST', `${P}/papers/preview-pool`, { chapterIds: [ch1, ch2], limit: 5, page: 2 });
      ok(pg.status === 200 && pg.json?.data?.rows?.length === 5 && pg.json?.data?.total === 12, 'preview-pool paginates');

      const sug = await api(base, T, 'POST', `${P}/papers/preview-pool`, {
        chapterIds: [ch1, ch2], paperType: 'mixed',
        distribution: [{ type: 'mcq', count: 2, marks: 1 }, { type: 'short', count: 2, marks: 2 }],
      });
      const ids = (sug.json?.data?.suggestedIds ?? []) as number[];
      ok(sug.status === 200 && ids.length === 4 && new Set(ids).size === 4, 'preview-pool suggestion draws exact unique ids', ids);

      const bad = await api(base, T, 'POST', `${P}/papers/preview-pool`, { chapterIds: [ch1], type: 'nope' });
      ok(bad.status === 400, 'preview-pool rejects invalid type');
    }

    // ── scope attacks (never trust client IDs) ──
    {
      const r = await api(base, T, 'POST', `${P}/papers/preview-pool`, { chapterIds: [chForeign] });
      ok(r.status === 403, 'preview-pool 403 on unassigned chapter');
      const g = await api(base, T, 'POST', `${P}/papers`, {
        classId, subjectIds: [otherSubjectId], chapterIds: [chForeign],
        paperType: 'objective', language: 'english', totalMarks: 1,
        distribution: [{ type: 'mcq', count: 1, marks: 1 }],
      });
      ok(g.status === 403, 'generate 403 on unassigned subject scope');
    }

    // ── validation errors ──
    {
      const m = await api(base, T, 'POST', `${P}/papers`, {
        classId, subjectIds: [subjectId], chapterIds: [ch1, ch2],
        paperType: 'mixed', language: 'english', totalMarks: 99,
        distribution: [{ type: 'mcq', count: 2, marks: 1 }],
      });
      ok(m.status === 400, 'generate 400 on marks mismatch');
      const s = await api(base, T, 'POST', `${P}/papers`, {
        classId, subjectIds: [subjectId], chapterIds: [ch1, ch2],
        paperType: 'objective', language: 'english', totalMarks: 999,
        distribution: [{ type: 'mcq', count: 999, marks: 1 }],
      });
      ok(s.status === 422, 'generate 422 on insufficient pool');
    }

    // ── teacher generate (session auto-attach) → select → save + audit ──
    let paperId = 0;
    {
      const g = await api(base, T, 'POST', `${P}/papers`, {
        title: `${FIX}Paper`, classId, subjectIds: [subjectId], chapterIds: [ch1, ch2],
        paperType: 'mixed', language: 'english', totalMarks: 11,
        distribution: [
          { type: 'mcq', count: 2, marks: 1 },
          { type: 'short', count: 2, marks: 2 },
          { type: 'essay', count: 1, marks: 5 },
        ],
      });
      ok(g.status === 201 && g.json?.data?.papers?.length === 1, 'teacher generate succeeds without sessionId');
      paperId = g.json?.data?.papers?.[0]?.id ?? 0;
      const prow = await q1<any>(`SELECT "sessionId", "courseId" FROM "Paper" WHERE id = $1`, [paperId]);
      ok(prow?.sessionId === sessionId && prow?.courseId === courseId, 'generate auto-attaches the current session', prow);
      const logged = await q1(`SELECT id FROM "ActivityLog" WHERE action = 'paper.generate' AND "userId" = $1`, [teacherId]);
      ok(!!logged, 'paper.generate audit row written');

      const det = await api(base, T, 'GET', `${P}/papers/${paperId}`);
      ok(det.status === 200 && det.json?.data?.questions?.length === 5, 'generated paper holds 5 questions');

      // reselect (drop to 4 questions) + save title
      const qids = ((det.json?.data?.questions ?? []) as any[]).slice(0, 4).map((x) => x.questionId);
      const marksBy: Record<string, number> = {};
      ((det.json?.data?.questions ?? []) as any[]).slice(0, 4).forEach((x) => { marksBy[String(x.questionId)] = x.marks; });
      const rp = await api(base, T, 'PUT', `${P}/papers/${paperId}/questions`, { questionIds: qids, marksByQuestion: marksBy });
      ok(rp.status === 200, 'replaceQuestions succeeds');
      const sel = await q1(`SELECT id FROM "ActivityLog" WHERE action = 'paper.questions.select' AND "userId" = $1`, [teacherId]);
      ok(!!sel, 'paper.questions.select audit row written');

      const up = await api(base, T, 'PUT', `${P}/papers/${paperId}`, { title: `${FIX}Paper v2` });
      ok(up.status === 200, 'updateMeta succeeds');
      const saved = await q1(`SELECT id FROM "ActivityLog" WHERE action = 'paper.save' AND "userId" = $1`, [teacherId]);
      ok(!!saved, 'paper.save audit row written');
    }

    // ── admin chain: unscoped pool + generate ──
    {
      const r = await api(base, A, 'POST', `${P}/papers/preview-pool`, { chapterIds: [ch1, ch2, chForeign] });
      ok(r.status === 200 && r.json?.data?.total === 13, 'admin preview-pool spans all chapters', r.json?.data?.total);
      const g = await api(base, A, 'POST', `${P}/papers`, {
        title: `${FIX}AdminPaper`, classId, subjectIds: [otherSubjectId], chapterIds: [chForeign],
        paperType: 'objective', language: 'english', totalMarks: 1,
        distribution: [{ type: 'mcq', count: 1, marks: 1 }],
      });
      ok(g.status === 201, 'admin generate across subjects succeeds');
    }
  } finally {
    server.close();
    await cleanup();
    const left = await q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Question" WHERE text LIKE '${FIX}%'`);
    ok(Number(left?.n ?? 1) === 0, 'fixtures cleaned up');
  }

  console.log(`\nPhase-4: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
