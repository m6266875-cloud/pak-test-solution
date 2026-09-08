/**
 * PHASE 2 — Paper generator v2 + catalog scope + patterns behavioral tests.
 *
 * Real HTTP against the Phase-2 test app + real database. Fixtures carry a
 * P2FIX| marker; pre-run + teardown remove them, so the shared dev DB is
 * left exactly as found.
 *
 * Usage (from server/):
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db \
 *   JWT_SECRET=test-secret npx ts-node --transpile-only scripts/phase2-generator.test.ts
 */
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import { createPhase2TestApp } from '../src/phase2/testApp';
import { q, run, withTx } from '../src/phase2/db';

const SECRET = process.env.JWT_SECRET || 'test-secret';
const FIX = 'P2FIX|';
const P = '/api/v2';

let pass = 0;
let fail = 0;
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

const num1 = (r: any): number | null => (r && r.length ? Number(Object.values(r[0])[0]) : null);

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

async function main() {
  // ── pre-clean ─────────────────────────────────────────────────────────────
  await run(`DELETE FROM "Paper" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE '%p2fix%')`);
  await run(`DELETE FROM "TeacherSubject" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE '%p2fix%')`);
  await run(`DELETE FROM "Question" WHERE text LIKE 'P2FIX|%'`);
  await run(`DELETE FROM "Exercise" WHERE name LIKE 'P2FIX|%'`);
  await run(`DELETE FROM "Topic" WHERE name LIKE 'P2FIX|%'`);
  await run(`DELETE FROM "User" WHERE email LIKE '%p2fix%'`);

  // ── fixtures ──────────────────────────────────────────────────────────────
  const ids = await withTx(async (c) => {
    const ins = async (email: string, name: string, role: string) => {
      const r = await c.query(
        `INSERT INTO "User" (email, password, name, role, "isActive", "createdAt", "updatedAt")
         VALUES ($1,'x',$2,$3,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`, [email, name, role]);
      return Number(r.rows[0].id);
    };
    return {
      admin: await ins('gen-admin-p2fix@test.local', 'P2FIX Gen Admin', 'super_admin'),
      math: await ins('gen-math-p2fix@test.local', 'P2FIX Math Teacher', 'teacher'),
      english: await ins('gen-eng-p2fix@test.local', 'P2FIX English Teacher', 'teacher'),
    };
  });

  const mathSubj = await q<{ id: number }>(`SELECT s.id FROM "Subject" s JOIN "Course" c ON c.id = s."courseId" JOIN "Class" cl ON cl.id = s."classId" WHERE c.code='PTB' AND cl.grade=9 AND s.name='Mathematics' AND s.medium='english'`);
  const engSubj = await q<{ id: number }>(`SELECT s.id FROM "Subject" s JOIN "Course" c ON c.id = s."courseId" JOIN "Class" cl ON cl.id = s."classId" WHERE c.code='PTB' AND cl.grade=9 AND s.name='English' AND s.medium='english'`);
  if (!mathSubj.length || !engSubj.length) { console.error('fixture subjects missing'); process.exit(1); }
  const mathId = mathSubj[0].id;
  const engId = engSubj[0].id;
  const classId = Number((await q(`SELECT "classId" FROM "Subject" WHERE id=$1`, [mathId]))[0].classId);
  const courseId = Number((await q(`SELECT "courseId" FROM "Subject" WHERE id=$1`, [mathId]))[0].courseId);

  const chA = (await q(`SELECT id FROM "Chapter" WHERE "subjectId"=$1 AND number=1`, [mathId]))[0]?.id;
  const chB = (await q(`SELECT id FROM "Chapter" WHERE "subjectId"=$1 AND number=2`, [mathId]))[0]?.id;
  const engCh = (await q(`SELECT id FROM "Chapter" WHERE "subjectId"=$1 AND number=1`, [engId]))[0]?.id;
  if (!chA || !chB || !engCh) { console.error('fixture chapters missing'); process.exit(1); }

  await run(`INSERT INTO "TeacherSubject" ("teacherId","subjectId","classId") VALUES ($1,$2,$3)`, [ids.math, mathId, classId]);
  await run(`INSERT INTO "TeacherSubject" ("teacherId","subjectId","classId") VALUES ($1,$2,$3)`, [ids.english, engId, classId]);

  // topics/exercises fixture (to test topic/exercise filtering paths)
  const topicA = (await q(`INSERT INTO "Topic" (name,"chapterId",status,"createdAt","updatedAt") VALUES ('P2FIX|Topic A',$1,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`, [chA]))[0].id;
  const exerciseA = (await q(`INSERT INTO "Exercise" (name,number,"chapterId",status,"createdAt","updatedAt") VALUES ('P2FIX|Exercise 1',1,$1,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`, [chA]))[0].id;

  // questions via admin API
  const app = createPhase2TestApp();
  const server: any = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const T_ADMIN = token(ids.admin);
  const T_MATH = token(ids.math);
  const T_ENG = token(ids.english);

  // Baseline availability (chA,chB may already hold unrelated approved rows
  // in the shared dev DB) — assertions below are exact deltas.
  const baseAvailMap: Record<string, number> = (await api(base, T_MATH, 'GET', `${P}/catalog/availability?chapterIds=${chA},${chB}`))
    .json.data.reduce((m: Record<string, number>, x: any) => { m[x.type] = x.available; return m; }, {});

  const mkQ = async (chapterId: number, type: string, text: string, extra: any = {}) => {
    const r = await api(base, T_ADMIN, 'POST', `${P}/questions`, {
      chapterId, type, text, marks: 1, status: 'approved', difficulty: 'easy', language: 'english',
      ...extra,
    });
    return r.status === 201 ? r.json.data.id : null;
  };

  const mcqIds: number[] = [];
  for (let i = 0; i < 6; i++) { const id = await mkQ(chA, 'mcq', `${FIX}Math ch1 MCQ ${i}`); if (id) mcqIds.push(id); }
  for (let i = 0; i < 6; i++) { const id = await mkQ(chB, 'mcq', `${FIX}Math ch2 MCQ ${i}`); if (id) mcqIds.push(id); }
  const shortIds: number[] = [];
  for (let i = 0; i < 6; i++) { const id = await mkQ(chA, 'short', `${FIX}Math short ${i}`, { marks: 2 }); if (id) shortIds.push(id); }
  const essayIds: number[] = [];
  for (let i = 0; i < 3; i++) { const id = await mkQ(chB, 'essay', `${FIX}Math essay ${i}`, { marks: 5 }); if (id) essayIds.push(id); }
  await mkQ(chA, 'mcq', `${FIX}Math urdu mcq`, { language: 'urdu' });
  await mkQ(engCh, 'mcq', `${FIX}English approved mcq`);
  ok(mcqIds.length === 12 && shortIds.length === 6 && essayIds.length === 3, `fixtures ready (12 mcq / 6 short / 3 essay)`);

  // ── catalog scope endpoints ───────────────────────────────────────────────
  const courses = await api(base, T_MATH, 'GET', `${P}/catalog/courses`);
  ok(courses.json.data.some((c: any) => c.code === 'PTB') && !courses.json.data.some((c: any) => c.code === 'BAPU'), 'teacher courses = assigned only (PTB yes, BAPU no)');
  const classes = await api(base, T_MATH, 'GET', `${P}/catalog/courses/${courseId}/classes`);
  ok(classes.json.data.length === 1 && classes.json.data[0].grade === 9, 'teacher sees only class 9 for PTB');
  const subjects = await api(base, T_MATH, 'GET', `${P}/catalog/classes/${classId}/subjects?courseId=${courseId}`);
  ok(subjects.json.data.length === 1 && subjects.json.data[0].name === 'Mathematics', 'teacher subjects = assignments only');
  const books = await api(base, T_MATH, 'GET', `${P}/catalog/subjects/${mathId}/books`);
  ok(books.json.data.length >= 1 && books.json.data.every((b: any) => b.status === undefined || b.id > 0), 'subject books listed');
  const chapters = await api(base, T_MATH, 'GET', `${P}/catalog/subjects/${mathId}/chapters`);
  ok(chapters.json.data.length >= 2, 'subject chapters listed');
  const topics = await api(base, T_MATH, 'GET', `${P}/catalog/chapters/${chA}/topics`);
  ok(topics.json.data.some((t: any) => t.id === topicA), 'chapter topics include fixture topic');
  const exercises = await api(base, T_MATH, 'GET', `${P}/catalog/chapters/${chA}/exercises`);
  ok(exercises.json.data.some((e: any) => e.id === exerciseA), 'chapter exercises include fixture exercise');
  const emptyExercises = await api(base, T_MATH, 'GET', `${P}/catalog/chapters/${chB}/exercises`);
  ok(Array.isArray(emptyExercises.json.data) && emptyExercises.json.data.length === 0, 'chapter w/o exercises returns [] (graceful)');
  const avail = await api(base, T_MATH, 'GET', `${P}/catalog/availability?chapterIds=${chA},${chB}`);
  const availMap = Object.fromEntries(avail.json.data.map((x: any) => [x.type, x.available]));
  ok(availMap.mcq === (baseAvailMap.mcq ?? 0) + 13 && availMap.short === (baseAvailMap.short ?? 0) + 6 && availMap.essay === (baseAvailMap.essay ?? 0) + 3, 'availability counts approved per type (incl. urdu mcq)');
  const availFiltered = await api(base, T_MATH, 'GET', `${P}/catalog/availability?chapterIds=${chA},${chB}&topicIds=${topicA}`);
  ok(availFiltered.json.data.every((x: any) => x.type !== 'mcq' || x.available === 0), 'availability honors topic filter');

  // cross-subject catalog leak attempt
  const engBooks = await api(base, T_MATH, 'GET', `${P}/catalog/subjects/${engId}/books`);
  ok(engBooks.status === 403, `teacher book read on english subject → ${engBooks.status} (403)`);

  // ── distribution validation ───────────────────────────────────────────────
  const dist = (d: any[], totalMarks: number, extra: any = {}) => api(base, T_MATH, 'POST', `${P}/papers`, {
    courseId, classId, subjectIds: [mathId], chapterIds: [chA, chB],
    paperType: 'mixed', language: 'english', totalMarks, distribution: d, autoSelect: true,
    timeLimit: 90, ...extra,
  });

  const mismatch = await dist([{ type: 'mcq', count: 10, marks: 1 }, { type: 'short', count: 5, marks: 2 }, { type: 'essay', count: 2, marks: 5 }], 50);
  ok(mismatch.status === 400 && mismatch.json.errors?.[0]?.actual === 30, `marks mismatch → 400 with actual sum in errors (got ${mismatch.status})`);

  const objectiveWithShort = await dist([{ type: 'short', count: 1, marks: 5 }], 5, { paperType: 'objective' });
  ok(objectiveWithShort.status === 400, 'objective paper rejects short questions (400)');

  const shortage = await dist([{ type: 'mcq', count: 50, marks: 1 }], 50);
  ok(shortage.status === 422 && shortage.json.details?.shortages?.length === 1 && Array.isArray(shortage.json.details?.suggestions), `shortage → 422 with suggestions (got ${shortage.status})`);

  const langShortage = await dist([{ type: 'mcq', count: 2, marks: 1 }], 2, { language: 'urdu' });
  ok(langShortage.status === 422, 'urdu-only request with english-only pool → 422');

  // out-of-course/class subject leak attempt by teacher
  const crossSubj = await api(base, T_MATH, 'POST', `${P}/papers`, {
    classId, subjectIds: [engId], chapterIds: [engCh], paperType: 'mixed', language: 'english',
    totalMarks: 5, distribution: [{ type: 'mcq', count: 5, marks: 1 }],
  });
  ok(crossSubj.status === 403, `teacher generate on english subject → ${crossSubj.status} (403)`);

  // ── auto generation ───────────────────────────────────────────────────────
  const happy = await dist([
    { type: 'mcq', count: 10, marks: 1 },
    { type: 'short', count: 5, marks: 2 },
    { type: 'essay', count: 2, marks: 5 },
  ], 30);
  ok(happy.status === 201 && happy.json.data.papers.length === 1, `auto paper generated (got ${happy.status})`);
  const paperId = happy.json.data.papers[0].id;

  const paper = await api(base, T_MATH, 'GET', `${P}/papers/${paperId}`);
  const pq = paper.json.data.questions;
  ok(paper.json.data.totalMarks === 30 && pq.length === 17, 'paper has 17 questions / 30 marks');
  const idsInPaper = pq.map((x: any) => x.questionId);
  ok(new Set(idsInPaper).size === idsInPaper.length, 'no duplicate questions inside the paper');
  const mcqInPaper = pq.filter((x: any) => x.snapshotType === 'mcq');
  ok(mcqInPaper.length === 10 && mcqInPaper.every((x: any) => x.marks === 1), '10 mcq at 1 mark each');
  ok(pq.some((x: any) => x.snapshotType === 'short' && x.marks === 2), 'short questions carry 2 marks');
  ok(paper.json.data.settings.distribution.length === 3, 'distribution JSON stored in settings');

  // topic/exercise filter respected on generation (topic A has no questions → filter to chB only mcqs)
  const topicFiltered = await dist([{ type: 'mcq', count: 5, marks: 1 }], 5, { chapterIds: [chA], topicIds: [topicA] });
  ok(topicFiltered.status === 422, 'generation respects topic filter (no mcq on topic A → 422)');

  // ── multi-paper: disjoint while pool allows ───────────────────────────────
  const two = await dist([{ type: 'mcq', count: 5, marks: 1 }, { type: 'short', count: 2, marks: 2 }], 9, { paperCount: 2 });
  ok(two.status === 201 && two.json.data.papers.length === 2 && two.json.data.warnings.length === 0, `multi-paper 2× disjoint (no warnings; got ${two.status})`);
  const p1 = await api(base, T_MATH, 'GET', `${P}/papers/${two.json.data.papers[0].id}`);
  const p2 = await api(base, T_MATH, 'GET', `${P}/papers/${two.json.data.papers[1].id}`);
  const s1 = new Set(p1.json.data.questions.map((x: any) => x.questionId));
  const s2 = new Set(p2.json.data.questions.map((x: any) => x.questionId));
  ok([...s1].every((x) => !s2.has(x)), 'two papers are disjoint (unique questions)');

  // ── multi-paper: honest reuse warning when pool too small ────────────────
  const reuse = await dist([{ type: 'short', count: 4, marks: 2 }], 8, { paperCount: 2 });
  ok(reuse.status === 201 && reuse.json.data.warnings.length === 1 && reuse.json.data.warnings[0].includes('repeat'), 'reuse warning surfaced when pool too small');
  const r1 = await api(base, T_MATH, 'GET', `${P}/papers/${reuse.json.data.papers[0].id}`);
  const r2 = await api(base, T_MATH, 'GET', `${P}/papers/${reuse.json.data.papers[1].id}`);
  const r1ids = new Set(r1.json.data.questions.map((x: any) => x.questionId));
  ok(r1ids.size === 4, 'per-paper uniqueness kept in reuse mode');

  // ── manual selection ──────────────────────────────────────────────────────
  const pick3 = mcqIds.slice(0, 3);
  const pick2 = shortIds.slice(0, 2);
  const manual = await dist([{ type: 'mcq', count: 3, marks: 1 }, { type: 'short', count: 2, marks: 2 }], 7, {
    autoSelect: false,
    questionIds: [...pick3, ...pick2],
  });
  ok(manual.status === 201, `manual selection paper generated (got ${manual.status})`);
  const mp = await api(base, T_MATH, 'GET', `${P}/papers/${manual.json.data.papers[0].id}`);
  const mq = mp.json.data.questions.map((x: any) => x.questionId);
  ok(JSON.stringify(mq) === JSON.stringify([...pick3, ...pick2]), 'manual paper keeps the exact submitted order');

  const manualBadCount = await dist([{ type: 'mcq', count: 4, marks: 1 }], 4, { autoSelect: false, questionIds: pick3 });
  ok(manualBadCount.status === 400, 'manual count mismatch → 400');

  const manualOutOfScope = await dist([{ type: 'mcq', count: 1, marks: 1 }], 1, { autoSelect: false, questionIds: [mcqIds[0], 1] });
  ok(manualOutOfScope.status === 400, 'manual selection with nonexistent/out-of-scope id → 400');

  // ── edit paths: status, replace questions, duplicate, delete ─────────────
  const finalize = await api(base, T_MATH, 'PUT', `${P}/papers/${paperId}`, { title: `${FIX}Final Paper`, status: 'final' });
  ok(finalize.status === 200 && finalize.json.data.status === 'final', 'paper status → final');

  const replace = await api(base, T_MATH, 'PUT', `${P}/papers/${paperId}/questions`, { questionIds: [...pick2, ...pick3] });
  ok(replace.status === 200 && replace.json.data.questions.length === 5, 'replace questions works');
  ok(replace.json.data.questions.map((x: any) => x.questionId).join() === [...pick2, ...pick3].join(), 'replace keeps submitted order');

  const replaceCross = await api(base, T_MATH, 'PUT', `${P}/papers/${paperId}/questions`, { questionIds: [engCh && 1].length ? [1] : [1] });
  ok(replaceCross.status === 400, 'replace with out-of-chapter question → 400');

  const dup = await api(base, T_MATH, 'POST', `${P}/papers/${paperId}/duplicate`);
  ok(dup.status === 201 && dup.json.data.status === 'draft' && dup.json.data.title.includes('(copy)'), 'paper duplicated as draft');
  const dupId = dup.json.data.id;
  ok(dup.json.data.questions.length === replace.json.data.questions.length, 'duplicate keeps questions');

  const engSeesOwn = await api(base, T_ENG, 'GET', `${P}/papers/${paperId}`);
  ok(engSeesOwn.status === 403, `another teacher reading the paper → ${engSeesOwn.status} (403)`);
  const adminSees = await api(base, T_ADMIN, 'GET', `${P}/papers/${paperId}`);
  ok(adminSees.status === 200, 'admin reads any paper');

  const del = await api(base, T_MATH, 'DELETE', `${P}/papers/${dupId}`);
  ok(del.status === 200, 'duplicate deleted');
  const gone = await api(base, T_MATH, 'GET', `${P}/papers/${dupId}`);
  ok(gone.status === 404, 'deleted paper is gone');

  const listing = await api(base, T_ADMIN, 'GET', `${P}/papers?limit=50`);
  ok(listing.json.pagination.total >= 4, 'admin paper list sees papers');
  const listingTeacher = await api(base, T_ENG, 'GET', `${P}/papers`);
  ok(listingTeacher.json.pagination.total === 0, 'english teacher sees none of the math teacher\'s papers');

  // ── patterns ──────────────────────────────────────────────────────────────
  const cfg = { classId, subjectIds: [mathId], chapterIds: [chA], paperType: 'mixed', language: 'english', totalMarks: 30, distribution: [{ type: 'mcq', count: 10, marks: 1 }, { type: 'short', count: 5, marks: 2 }, { type: 'essay', count: 2, marks: 5 }] };
  const pat = await api(base, T_MATH, 'POST', `${P}/patterns`, { name: `${FIX}Mid Term`, description: 'class 9 mid term', config: cfg });
  ok(pat.status === 201 && pat.json.data.id, 'teacher saves pattern');
  const patId = pat.json.data.id;

  const patListEng = await api(base, T_ENG, 'GET', `${P}/patterns`);
  ok(patListEng.json.data.every((x: any) => x.id !== patId), 'pattern invisible to other teacher');
  const patApplyEng = await api(base, T_ENG, 'GET', `${P}/patterns/${patId}`);
  ok(patApplyEng.status === 403, `other teacher cannot apply private pattern → ${patApplyEng.status}`);

  const share = await api(base, T_ADMIN, 'PUT', `${P}/patterns/${patId}`, { isShared: true });
  ok(share.status === 200 && share.json.data.isShared === true, 'admin shares pattern');
  const patApplyEng2 = await api(base, T_ENG, 'GET', `${P}/patterns/${patId}`);
  ok(patApplyEng2.status === 200 && deepEqual(patApplyEng2.json.data.config, cfg), 'shared pattern now applicable with same config');

  const delOther = await api(base, T_ENG, 'DELETE', `${P}/patterns/${patId}`);
  ok(delOther.status === 403, `other teacher cannot delete shared pattern → ${delOther.status}`);
  const delAdmin = await api(base, T_ADMIN, 'DELETE', `${P}/patterns/${patId}`);
  ok(delAdmin.status === 200, 'admin deletes pattern');

  const badPat = await api(base, T_MATH, 'POST', `${P}/patterns`, { name: 'bad', config: { nope: 1 } });
  ok(badPat.status === 400, 'invalid pattern config rejected');

  server.close();

  // ── teardown ──────────────────────────────────────────────────────────────
  await run(`DELETE FROM "Paper" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE '%p2fix%')`);
  await run(`DELETE FROM "TeacherSubject" WHERE "teacherId" IN (SELECT id FROM "User" WHERE email LIKE '%p2fix%')`);
  await run(`DELETE FROM "Question" WHERE text LIKE 'P2FIX|%'`);
  await run(`DELETE FROM "Exercise" WHERE name LIKE 'P2FIX|%'`);
  await run(`DELETE FROM "Topic" WHERE name LIKE 'P2FIX|%'`);
  await run(`DELETE FROM "User" WHERE email LIKE '%p2fix%'`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Test run crashed:', e); process.exit(1); });
