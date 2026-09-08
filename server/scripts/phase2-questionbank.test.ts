/**
 * PHASE 2 — Question bank behavioral tests (scope enforcement + filters).
 *
 * Runs against the REAL database through the Phase-2 test app over HTTP.
 * Creates fixture users/questions with a P2FIX| marker and removes them in
 * teardown, so the shared dev database is left exactly as found.
 *
 * Usage (from server/):
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db \
 *   JWT_SECRET=test-secret npx ts-node --transpile-only scripts/phase2-questionbank.test.ts
 */
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import { createPhase2TestApp } from '../src/phase2/testApp';
import { q, run, withTx } from '../src/phase2/db';

const SECRET = process.env.JWT_SECRET || 'test-secret';
const FIX = 'P2FIX|';

let pass = 0;
let fail = 0;
function ok(cond: boolean, label: string) {
  if (cond) {
    pass++;
    console.log(`  ✔ ${label}`);
  } else {
    fail++;
    console.error(`  ✖ FAIL: ${label}`);
  }
}

async function api(base: string, token: string, method: string, path: string, body?: any) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

const token = (id: number) => jwt.sign({ id }, SECRET, { expiresIn: '1h' });

async function main() {
  // clean any leftovers from an interrupted previous run
  await run(`DELETE FROM "TeacherSubject" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE '%p2fix%')`);
  await run(`DELETE FROM "Question" WHERE text LIKE 'P2FIX|%'`);
  await run(`DELETE FROM "User" WHERE email LIKE '%p2fix%'`);

  // ── fixtures: users + assignments ────────────────────────────────────────
  const ids = await withTx(async (c) => {
    const ins = async (email: string, name: string, role: string) => {
      const r = await c.query(
        `INSERT INTO "User" (email, password, name, role, "isActive", "createdAt", "updatedAt")
         VALUES ($1,'x',$2,$3,true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
        [email, name, role]
      );
      return Number(r.rows[0].id);
    };
    const adminId = await ins(`admin-p2fix@test.local`, 'P2FIX Admin', 'super_admin');
    const mathTeacher = await ins(`math-p2fix@test.local`, 'P2FIX Math Teacher', 'teacher');
    const engTeacher = await ins(`eng-p2fix@test.local`, 'P2FIX English Teacher', 'teacher');
    return { adminId, mathTeacher, engTeacher };
  });

  const subjectOf = async (courseCode: string, grade: number, name: string, medium = 'english') =>
    q1num(`SELECT s.id FROM "Subject" s JOIN "Course" c ON c.id = s."courseId" JOIN "Class" cl ON cl.id = s."classId"
            WHERE c.code = $1 AND cl.grade = $2 AND s.name = $3 AND s.medium = $4`, [courseCode, grade, name, medium]);

  const ch1Of = async (subjectId: number) =>
    q1num(`SELECT id FROM "Chapter" WHERE "subjectId" = $1 AND number = 1`, [subjectId]);

  const mathSubj = await subjectOf('PTB', 9, 'Mathematics');
  const mathCh1 = mathSubj ? await ch1Of(mathSubj) : null;
  const engSubj = await subjectOf('PTB', 9, 'English');
  const engCh1 = engSubj ? await ch1Of(engSubj) : null;
  const physSubj = await subjectOf('PTB', 9, 'Physics');

  ok(!!mathSubj && !!mathCh1 && !!engSubj && !!engCh1 && !!physSubj, 'fixture catalog rows exist (PTB g9 Math/English/Physics)');
  if (!mathSubj || !mathCh1 || !engSubj || !engCh1 || !physSubj) return;

  await run(`INSERT INTO "TeacherSubject" ("teacherId","subjectId","classId")
             SELECT $1,$2, s."classId" FROM "Subject" s WHERE s.id=$2`, [ids.mathTeacher, mathSubj]);
  await run(`INSERT INTO "TeacherSubject" ("teacherId","subjectId","classId")
             SELECT $1,$2, s."classId" FROM "Subject" s WHERE s.id=$2`, [ids.engTeacher, engSubj]);

  const app = createPhase2TestApp();
  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const T_MATH = token(ids.mathTeacher);
  const T_ENG = token(ids.engTeacher);
  const T_ADMIN = token(ids.adminId);

  // Baselines: the shared dev DB may already contain unrelated (e.g. demo)
  // approved questions in scope, so scope-count assertions are delta-based.
  const baseList = async (t: string) => {
    const r = await api(base, t, 'GET', '/api/v2/questions?limit=1');
    return Number(r.json?.pagination?.total ?? 0);
  };
  const baseMathApproved = await baseList(T_MATH);
  const baseEngApproved = await baseList(T_ENG);
  // marksEq baselines (the shared DB may hold unrelated rows at any marks
  // value, e.g. science demo banks with short/numerical = 2 marks)
  const baseMarksEq2 = Number((await api(base, T_ADMIN, 'GET', '/api/v2/questions?limit=1&marksEq=2')).json?.pagination?.total ?? 0);

  // ── create fixtures through the API (admin) ──────────────────────────────
  const mkQ = async (chapterId: number, type: string, text: string, status: string, marks = 1) => {
    const r = await api(base, T_ADMIN, 'POST', '/api/v2/questions', {
      chapterId, type, text, marks, status, difficulty: 'medium', language: 'english',
      options: type === 'mcq' ? ['A', 'B', 'C', 'D'] : undefined,
      answer: type === 'mcq' ? 'A' : undefined,
    });
    return r.json?.data?.id ?? null;
  };
  const mathQ1 = await mkQ(mathCh1, 'mcq', `${FIX}Math approved MCQ 1`, 'approved', 1);
  const mathQ2 = await mkQ(mathCh1, 'mcq', `${FIX}Math approved MCQ 2`, 'approved', 1);
  // draft created by the MATH TEACHER (create path forces draft status)
  const draftRes = await api(base, T_MATH, 'POST', '/api/v2/questions', {
    chapterId: mathCh1, type: 'short', text: `${FIX}Math draft short (teacher)`, marks: 2,
  });
  const mathDraft = draftRes.json?.data?.id ?? null;
  const adminDraft = await mkQ(mathCh1, 'fill_blank', `${FIX}Admin fill-blank draft`, 'draft', 1);
  const engQ1 = await mkQ(engCh1, 'mcq', `${FIX}English approved MCQ 1`, 'approved', 1);
  const physQ1 = physSubj ? await mkQ((await ch1Of(physSubj))!, 'mcq', `${FIX}Physics approved MCQ`, 'approved', 1) : null;
  ok(mathQ1 && mathQ2 && mathDraft && adminDraft && engQ1, 'fixture questions created via API (incl. teacher-created draft)');

  // ── scope tests ──────────────────────────────────────────────────────────
  const list = async (t: string, params = '') => (await api(base, t, 'GET', `/api/v2/questions?limit=50${params}`)).json;
  const l1 = await list(T_MATH);
  ok(l1.success && l1.pagination.total === baseMathApproved + 2, `math teacher default view = own approved only (got ${l1.pagination?.total}, base ${baseMathApproved})`);
  ok(l1.data.filter((q: any) => (q.text || '').startsWith('P2FIX|')).every((q: any) => q.text.includes('Math approved')), 'math teacher sees only mathematics questions');

  const lEng = await list(T_ENG);
  const engFixture = (lEng.data as any[]).filter((q: any) => (q.text || '').startsWith('P2FIX|'));
  ok(lEng.pagination.total === baseEngApproved + 1 && engFixture.length === 1 && engFixture[0]?.text.includes('English approved'), 'english teacher sees only english approved');

  // direct access to out-of-scope question ids must fail
  const out = await api(base, T_MATH, 'GET', `/api/v2/questions/${engQ1}`);
  ok(out.status === 404 || out.status === 403, `math teacher GET english question → ${out.status} (expected 404/403)`);

  // create against an out-of-scope chapter must fail
  const cross = await api(base, T_MATH, 'POST', '/api/v2/questions', {
    chapterId: engCh1, type: 'mcq', text: `${FIX}cross`, marks: 1,
    options: ['a', 'b'], answer: 'a',
  });
  ok(cross.status === 403, `math teacher create on english chapter → ${cross.status} (expected 403)`);

  // drafts invisible to other teachers, visible to creator when filtered
  const lDraftOther = await list(T_ENG, '&status=draft');
  ok(lDraftOther.pagination.total === 0, 'english teacher sees 0 drafts (none created by them)');
  const lDraftOwn = await list(T_MATH, '&status=draft');
  ok(lDraftOwn.pagination.total === 1 && lDraftOwn.data[0]?.id === mathDraft, 'math teacher sees own draft with status=draft');

  // edit/delete protection
  const delCross = await api(base, T_MATH, 'DELETE', `/api/v2/questions/${engQ1}`);
  ok(delCross.status === 403 || delCross.status === 404, `math teacher archive english question → ${delCross.status} (expected 403/404)`);
  const approveByTeacher = await api(base, T_MATH, 'PATCH', `/api/v2/questions/${mathDraft}/approve`);
  ok(approveByTeacher.status === 403, `teacher approve attempt → ${approveByTeacher.status} (expected 403)`);

  // physics out of both teachers' scope
  if (physQ1) {
    const physSeen = await api(base, T_MATH, 'GET', `/api/v2/questions/${physQ1}`);
    ok(physSeen.status === 404 || physSeen.status === 403, `math teacher GET physics question → ${physSeen.status} (expected 404/403)`);
  }

  // ── admin workflow ───────────────────────────────────────────────────────
  const appr = await api(base, T_ADMIN, 'PATCH', `/api/v2/questions/${mathDraft}/approve`);
  ok(appr.status === 200, 'admin approves draft');
  const afterApprove = await list(T_MATH);
  ok(afterApprove.pagination.total === baseMathApproved + 3, `math teacher now sees ${baseMathApproved + 3} approved (got ${afterApprove.pagination?.total}, base ${baseMathApproved})`);

  const rej = await api(base, T_ADMIN, 'PATCH', `/api/v2/questions/${mathQ2}/reject`, { reason: `${FIX}test reject` });
  ok(rej.status === 200, 'admin rejects question');
  const afterReject = await list(T_MATH);
  ok(afterReject.pagination.total === baseMathApproved + 2, 'rejected question leaves the teacher approved pool');

  // ── filters ──────────────────────────────────────────────────────────────
  const byType = await list(T_ADMIN, '&type=mcq');
  ok(byType.data.every((q: any) => q.type === 'mcq') && byType.pagination.total >= 3, 'admin type=mcq filter');
  const byMarks = await list(T_ADMIN, '&marksEq=2');
  const marksEqRows = byMarks.data as any[];
  ok(byMarks.pagination.total === baseMarksEq2 + 1 && marksEqRows.every((q: any) => q.marks === 2)
    && marksEqRows.some((q: any) => (q.text || '').startsWith('P2FIX|')), `admin marksEq=2 filter (base ${baseMarksEq2} + fixture)`);
  const bySearch = await list(T_ADMIN, `&search=${encodeURIComponent('Math approved MCQ 1')}`);
  ok(bySearch.pagination.total === 1, 'admin text search filter');
  const byCourse = await list(T_ADMIN, `&courseId=${await q1num(`SELECT id FROM "Course" WHERE code='PTB'`, [])}`);
  ok(byCourse.pagination.total >= 3, 'admin courseId filter');
  const byStatus = await list(T_ADMIN, '&status=draft');
  ok(byStatus.pagination.total >= 1, 'admin sees drafts with status=draft');

  // validation
  const bad = await api(base, T_ADMIN, 'POST', '/api/v2/questions', {
    chapterId: mathCh1, type: 'mcq', text: `${FIX}bad`, marks: 500, options: ['a', 'b'],
  });
  ok(bad.status === 400, `marks 500 rejected → ${bad.status}`);
  const badType = await api(base, T_ADMIN, 'POST', '/api/v2/questions', {
    chapterId: mathCh1, type: 'nope', text: `${FIX}bad2`, marks: 1,
  });
  ok(badType.status === 400, `invalid type rejected → ${badType.status}`);

  // duplicate + export
  const dup = await api(base, T_MATH, 'POST', `/api/v2/questions/${mathQ1}/duplicate`);
  ok(dup.status === 201 && dup.json.data.status === 'draft', 'teacher duplicates own question as draft');
  const csv = await fetch(`${base}/api/v2/questions/export?format=csv`, {
    headers: { Authorization: `Bearer ${T_ADMIN}` },
  });
  const csvText = await csv.text();
  ok(csv.status === 200 && csvText.startsWith('id,bankNo,type,text') && csvText.includes(FIX), 'admin csv export');

  // stats sanity
  const st2 = await api(base, T_ADMIN, 'GET', '/api/v2/questions/stats');
  ok(st2.json.success && Number(st2.json.data.total) >= 5, 'stats endpoint returns totals');

  // pagination
  const p1 = await api(base, T_ADMIN, 'GET', '/api/v2/questions?page=1&limit=3');
  ok(p1.json.data.length === 3 && p1.json.pagination.totalPages >= 2, 'pagination limit/page respected');

  server.close();

  // ── teardown ─────────────────────────────────────────────────────────────
  await run(`DELETE FROM "Question" WHERE text LIKE '%${FIX}%' OR text LIKE '%P2FIX%'`);
  await run(`DELETE FROM "User" WHERE email LIKE '%p2fix%'`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

async function q1num(sql: string, params: unknown[]): Promise<number | null> {
  const r = await q<{ n?: string }>(sql, params);
  const v = r[0] ? Object.values(r[0])[0] : null;
  return v == null ? null : Number(v);
}

main().catch((e) => {
  console.error('Test run crashed:', e);
  process.exit(1);
});
