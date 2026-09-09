/**
 * PHASE 4 — 5-step wizard + dashboards behavioral tests (real HTTP + real DB).
 *
 * Fixtures carry a P4FIX| marker; pre-run + teardown remove them so a shared
 * dev DB is left exactly as found. Requires a seeded database (catalog +
 * classes) like the Phase-2 tests.
 *
 * Covers (deliverable 6):
 *   • TEACHER CHAIN  — chapters checklist → candidates w/ auto pre-select →
 *     generate (manual selection) → paper persisted → teacher dashboard.
 *   • ADMIN CHAIN    — school_admin generates for oversight, dashboard shows
 *     school-scoped stats/teachers/recent papers; super_admin cleanup dry run.
 *   • SECURITY       — teacher cannot read chapters/candidates or generate
 *     outside assigned subjects with hand-crafted ids (403/400).
 *   • ACTIVITY LOG   — generation_started / questions_selected / saved rows.
 *
 * Usage (from server/):
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db \
 *   JWT_SECRET=test-secret npx ts-node --transpile-only scripts/phase4-wizard.test.ts
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import { Server } from 'http';
import phase4Api from '../src/phase4/mount';
import phase2Api from '../src/phase2/mount';
import { q, q1, run, withTx } from '../src/phase2/db';

const SECRET = process.env.JWT_SECRET || 'test-secret';
const FIX = 'P4FIX|';

let pass = 0, fail = 0;
function ok(cond: boolean, label: string) {
  if (cond) { pass++; console.log(`  ✔ ${label}`); }
  else { fail++; console.error(`  ✖ FAIL: ${label}`); }
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

interface Fix {
  schoolId: number; teacherId: number; adminId: number; superId: number;
  subjectId: number; otherSubjectId: number; bookId: number;
  chapter1: number; chapter2: number; otherChapter: number; exercise1: number;
  mcqIds: number[]; shortIds: number[];
}

async function seedFixtures(): Promise<Fix> {
  const school = await q1<{ id: number }>(
    `INSERT INTO "School" (name, code, status, "createdAt", "updatedAt")
     VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
    [`${FIX}School`, `${FIX}SCH`]);
  const mkUser = async (email: string, role: string, schoolId: number | null, perms: string[] = []) => {
    const r = await q1<{ id: number }>(
      `INSERT INTO "User" (email, password, name, role, "schoolId", permissions, "isActive", "createdAt", "updatedAt")
       VALUES ($1, 'x', $2, $3, $4, $5::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [email, `${FIX}${email}`, role, schoolId, JSON.stringify(perms)]);
    return Number(r!.id);
  };
  const schoolId = Number(school!.id);
  const teacherId = await mkUser('p4fix.teacher@demo.test', 'teacher', schoolId);
  const adminId = await mkUser('p4fix.admin@demo.test', 'school_admin', schoolId, ['generatedPapers', 'analytics', 'audit', 'users']);
  const superId = await mkUser('p4fix.super@demo.test', 'super_admin', null);

  const course = await q1<{ id: number }>(`SELECT id FROM "Course" WHERE code = 'PTB'`);
  const klass = await q1<{ id: number }>(`SELECT id FROM "Class" WHERE grade = 9`);
  if (!course || !klass) throw new Error('Catalog/classes not seeded — run db:catalog + seed first');

  const mkSubject = async (name: string) => {
    const r = await q1<{ id: number }>(
      `INSERT INTO "Subject" (name, medium, "classId", "courseId", status, "createdAt", "updatedAt")
       VALUES ($1, 'english', $2, $3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [name, Number(klass.id), Number(course.id)]);
    return Number(r!.id);
  };
  const subjectId = await mkSubject(`${FIX}Mathematics`);
  const otherSubjectId = await mkSubject(`${FIX}Other`);
  await run(`INSERT INTO "TeacherSubject" ("teacherId", "subjectId", "classId", "createdAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
    [teacherId, subjectId, Number(klass.id)]);

  const book = await q1<{ id: number }>(
    `INSERT INTO "Book" (title, "courseId", "classId", "subjectId", language, status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'english', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
    [`${FIX}Math 9`, Number(course.id), Number(klass.id), subjectId]);
  const bookId = Number(book!.id);

  const mkChapter = async (sid: number, bid: number | null, n: number) => {
    const r = await q1<{ id: number }>(
      `INSERT INTO "Chapter" (name, number, "subjectId", "bookId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [`${FIX}Ch ${n}`, n, sid, bid]);
    return Number(r!.id);
  };
  const chapter1 = await mkChapter(subjectId, bookId, 1);
  const chapter2 = await mkChapter(subjectId, bookId, 2);
  const otherChapter = await mkChapter(otherSubjectId, null, 1);
  const ex = await q1<{ id: number }>(
    `INSERT INTO "Exercise" (name, number, "chapterId", status, "createdAt", "updatedAt")
     VALUES ($1, 1, $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
    [`${FIX}Ex 1.1`, chapter1]);
  const exercise1 = Number(ex!.id);

  const mkQ = async (ch: number, exId: number | null, type: string, i: number) => {
    const r = await q1<{ id: number }>(
      `INSERT INTO "Question" ("chapterId", "exerciseId", type, text, marks, difficulty, language, status, "isActive",
                               "courseId", "classId", "subjectId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'easy', 'english', 'approved', true, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [ch, exId, type, `${FIX}Q ${type} ${i}`, type === 'mcq' ? 1 : 2, Number(course.id), Number(klass.id), subjectId]);
    return Number(r!.id);
  };
  const mcqIds: number[] = []; const shortIds: number[] = [];
  for (let i = 0; i < 6; i++) mcqIds.push(await mkQ(i % 2 ? chapter1 : chapter2, i % 2 ? exercise1 : null, 'mcq', i));
  for (let i = 0; i < 4; i++) shortIds.push(await mkQ(i % 2 ? chapter2 : chapter1, null, 'short', i));

  return { schoolId, teacherId, adminId, superId, subjectId, otherSubjectId, bookId, chapter1, chapter2, otherChapter, exercise1, mcqIds, shortIds };
}

async function teardown() {
  await run(`DELETE FROM "Paper" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE 'p4fix%')`);
  await run(`DELETE FROM "Question" WHERE text LIKE '${FIX}%'`);
  await run(`DELETE FROM "Exercise" WHERE name LIKE '${FIX}%'`);
  await run(`DELETE FROM "Chapter" WHERE name LIKE '${FIX}%'`);
  await run(`DELETE FROM "Book" WHERE title LIKE '${FIX}%'`);
  await run(`DELETE FROM "TeacherSubject" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE 'p4fix%')`);
  await run(`DELETE FROM "Subject" WHERE name LIKE '${FIX}%'`);
  await run(`DELETE FROM "ActivityLog" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'p4fix%')`);
  await run(`DELETE FROM "User" WHERE email LIKE 'p4fix%'`);
  await run(`DELETE FROM "School" WHERE code = '${FIX}SCH'`);
}

async function main() {
  await teardown();
  const fix = await seedFixtures();

  const app = express();
  app.use(express.json());
  app.use('/api/v4', phase4Api);
  app.use('/api/v2', phase2Api);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.statusCode && Number(err.statusCode) >= 400 ? Number(err.statusCode) : 500;
    res.status(status).json({ success: false, message: err?.message ?? 'Internal server error', details: err?.details });
  });
  const server: Server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const tTok = token(fix.teacherId); const aTok = token(fix.adminId); const sTok = token(fix.superId);

  const classId = Number((await q1<{ id: number }>(`SELECT id FROM "Class" WHERE grade = 9`))!.id);
  const scopeBody = { courseId: undefined, classId, subjectId: fix.subjectId, bookId: fix.bookId, chapterIds: [fix.chapter1, fix.chapter2], paperType: 'mixed', language: 'english' };
  const distribution = [ { type: 'mcq', count: 2, marks: 1 }, { type: 'short', count: 1, marks: 2 } ];

  console.log('\n— TEACHER CHAIN —');
  const ch = await api(base, tTok, 'GET', `/v4/wizard/chapters?subjectId=${fix.subjectId}&bookId=${fix.bookId}`);
  ok(ch.status === 200 && Array.isArray(ch.json.data) && ch.json.data.length === 2, 'step2: chapter checklist returns both chapters');
  const ch1 = ch.json.data.find((c: any) => c.id === fix.chapter1);
  ok(ch1 && ch1.exercises.length === 1 && ch1.approved >= 3, 'step2: live approved counts + exercises included');

  const cand = await api(base, tTok, 'POST', '/v4/wizard/candidates', { ...scopeBody, distribution, seed: 7 });
  ok(cand.status === 200, 'step4: candidates endpoint 200');
  const pre = cand.json?.data?.preselected ?? [];
  const preMcq = pre.find((p: any) => p.type === 'mcq'); const preShort = pre.find((p: any) => p.type === 'short');
  ok(preMcq?.ids?.length === 2 && preShort?.ids?.length === 1, 'step4: auto pre-select hits the distribution counts');
  ok(cand.json?.data?.totals?.matched === true, 'step4: running totals report a match');
  ok(Array.isArray(cand.json?.data?.rows) && cand.json.data.pagination?.limit <= 100, 'step4: pool is paginated (never dumped)');

  const gen = await api(base, tTok, 'POST', '/v4/wizard/generate', {
    ...scopeBody, distribution, totalMarks: 4, timeLimit: 60, title: `${FIX}Paper`,
    questionIds: [...(preMcq?.ids ?? []), ...(preShort?.ids ?? [])], status: 'draft',
  });
  ok(gen.status === 201 && gen.json?.data?.paper?.id, 'step5: generate persists the paper (draft)');
  const paperId = gen.json?.data?.paper?.id as number;

  const got = await api(base, tTok, 'GET', `/v2/papers/${paperId}`);
  ok(got.status === 200 && got.json.data.questions.length === 3, 'paper readable by owner with 3 questions');
  ok(got.json.data.settings?.generationConfig?.chapterIds?.length === 2, 'full config stored (chapters/exercises/…)');

  const dashT = await api(base, tTok, 'GET', '/v4/dashboard');
  ok(dashT.status === 200 && dashT.json.data.role === 'teacher', 'teacher dashboard: role payload');
  ok(dashT.json.data.school?.name?.includes('P4FIX'), 'teacher dashboard: school name present');
  ok((dashT.json.data.assignments ?? []).some((a: any) => a.subjectId === fix.subjectId), 'teacher dashboard: assignments listed');
  ok(!('stats' in dashT.json.data), 'teacher dashboard: no admin stats leak');

  console.log('\n— SECURITY (scope restrictions) —');
  const chX = await api(base, tTok, 'GET', `/v4/wizard/chapters?subjectId=${fix.otherSubjectId}`);
  ok(chX.status === 403, 'teacher cannot list chapters of an unassigned subject');
  const candX = await api(base, tTok, 'POST', '/v4/wizard/candidates', { ...scopeBody, subjectId: fix.otherSubjectId, chapterIds: [fix.otherChapter], distribution });
  ok(candX.status === 403, 'teacher cannot pull candidates outside scope (crafted ids)');
  const genX = await api(base, tTok, 'POST', '/v4/wizard/generate', {
    ...scopeBody, chapterIds: [fix.otherChapter], totalMarks: 4, distribution, questionIds: fix.mcqIds.slice(0, 2),
  });
  ok(genX.status === 400 || genX.status === 403, 'teacher cannot generate from another subject\'s chapters');
  const genY = await api(base, tTok, 'POST', '/v4/wizard/generate', {
    ...scopeBody, totalMarks: 4, distribution, questionIds: [fix.mcqIds[0]], // counts ≠ distribution
  });
  ok(genY.status === 400, 'selection not matching the distribution is rejected');

  console.log('\n— ADMIN CHAIN —');
  const candA = await api(base, aTok, 'POST', '/v4/wizard/candidates', { ...scopeBody, distribution, seed: 3 });
  ok(candA.status === 200, 'school_admin can run candidates (oversight)');
  const genA = await api(base, aTok, 'POST', '/v4/wizard/generate', {
    ...scopeBody, distribution, totalMarks: 4, questionIds: [...(preMcq?.ids ?? [])], title: `${FIX}AdminPaper`,
  });
  // admin selection must also match distribution exactly
  ok(genA.status === 400, 'admin selection violating distribution rejected too');
  const genA2 = await api(base, aTok, 'POST', '/v4/wizard/generate', {
    ...scopeBody, distribution, totalMarks: 4, questionIds: [...(preMcq?.ids ?? []), ...(preShort?.ids ?? [])], title: `${FIX}AdminPaper`,
  });
  ok(genA2.status === 201, 'school_admin generates via the same 5-step backend');
  const dashA = await api(base, aTok, 'GET', '/v4/dashboard');
  ok(dashA.status === 200 && dashA.json.data.role === 'school_admin' && Array.isArray(dashA.json.data.teachers), 'admin dashboard: school-scoped stats + teacher list');
  const dashS = await api(base, sTok, 'GET', '/v4/dashboard');
  ok(dashS.status === 200 && dashS.json.data.role === 'super_admin' && Array.isArray(dashS.json.data.activity), 'super dashboard: global stats + activity feed');

  console.log('\n— ACTIVITY LOG —');
  const logs = await q<{ action: string }>(
    `SELECT action FROM "ActivityLog" WHERE "userId" = $1 ORDER BY id`, [fix.teacherId]);
  const actions = logs.map((l) => l.action);
  ok(actions.includes('paper.generation_started') && actions.includes('paper.questions_selected') && actions.includes('paper.saved'),
    'generation_started / questions_selected / saved all logged');

  console.log('\n— CLEANUP TOOL (super-only) —');
  const clT = await api(base, tTok, 'POST', '/v4/catalog/cleanup?apply=0');
  ok(clT.status === 403, 'cleanup is Super-Admin-only');
  const clS = await api(base, sTok, 'POST', '/v4/catalog/cleanup?apply=0');
  ok(clS.status === 200 && clS.json.data.jsonLevel, 'super admin gets the cleanup report (dry run)');

  server.close();
  await teardown();
  console.log(`\nphase4-wizard: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
