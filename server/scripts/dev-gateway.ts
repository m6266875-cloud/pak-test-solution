/**
 * SANDBOX DEV GATEWAY (not for production).
 *
 * The full src/app.ts cannot boot here because the Prisma engine binaries
 * are unavailable in this environment, so this gateway provides:
 *   • /api/auth/* — the SAME response contract as src/controllers/authController
 *     (login / refresh / logout / profile / change-password) implemented with
 *     node-pg + bcrypt + jwt
 *   • /api/v2/*    — the real Phase-2 mount (question bank, catalog scope,
 *     paper generator v2, patterns)
 *   • a deterministic fixture seed on boot:
 *       admin@paktestsolution.com / Admin@123456   (super_admin)
 *       math.teacher@demo.test      / Teacher@123456 (teacher, PTB g9 Mathematics)
 *       eng.teacher@demo.test       / Teacher@123456 (teacher, PTB g9 English)
 *       physics.teacher@demo.test   / Teacher@123456 (teacher, PTB g9 Physics)
 *       chemistry.teacher@demo.test / Teacher@123456 (teacher, PTB g9 Chemistry)
 *       biology.teacher@demo.test   / Teacher@123456 (teacher, PTB g9 Biology)
 *     one teacher per PTB grade-9 subject — each account is scoped to its own
 *     subject only (catalog, question bank, paper generation). Seeded
 *     idempotently with assignments, used ONLY for local UI runs.
 *
 * Usage: PORT=5000 DATABASE_URL=... npx ts-node --transpile-only scripts/dev-gateway.ts
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool, q, q1, run } from '../src/phase2/db';
import phase2Api from '../src/phase2/mount';
import phase3Api from '../src/phase3/mount';
import { createV2Governance } from '../src/phase3/v2Governance';
import { PERMISSIONS } from '../src/phase3/perms';
import { successResponse, ApiError } from '../src/utils/apiResponse';
import { questionBankService } from '../src/phase2/questionBankService';
import { physicsRows, chemistryRows, biologyRows } from './demo-content';
import type { DemoRow } from './demo-content';

// Auto-load server/.env (JWT secrets, DATABASE_URL, PORT) so the gateway runs
// with a bare `npm run dev:gateway`. Shell env still wins — dotenv never
// overwrites already-defined variables.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-very-long-random-secret-key-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-this-to-another-very-long-random-secret-key';
const PORT = Number(process.env.PORT || 5000);

const signAccess = (u: { id: number }) => jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '15m' });
const signRefresh = (u: { id: number }) => jwt.sign({ id: u.id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });

interface DbUser { id: number; email: string; password: string; name: string; role: string; schoolId: number | null; schoolName: string | null; isActive: boolean; }

async function userById(id: number): Promise<DbUser | null> {
  return q1<DbUser>(`SELECT u.id, u.email, u.password, u.name, u.role, u."schoolId", s.name AS "schoolName", u."isActive"
                       FROM "User" u LEFT JOIN "School" s ON s.id = u."schoolId" WHERE u.id = $1`, [id]);
}

async function profileFor(u: DbUser) {
  const [school, subjects, perms] = await Promise.all([
    u.schoolId != null
      ? q1<any>(`SELECT id, name, code, status, "logoUrl" FROM "School" WHERE id = $1`, [u.schoolId])
      : Promise.resolve(null),
    q<any>(
      `SELECT DISTINCT s.id, s.name AS "subjectName", s.code AS "subjectCode", s.medium, cl.grade
         FROM "TeacherSubject" ts
         JOIN "Subject" s ON s.id = ts."subjectId"
         JOIN "Class" cl ON cl.id = ts."classId"
        WHERE ts."teacherId" = $1 ORDER BY cl.grade, s.name`,
      [u.id]
    ),
    q1<{ permissions: string[] | null }>(`SELECT permissions FROM "User" WHERE id = $1`, [u.id]),
  ]);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    schoolId: u.schoolId,
    schoolName: school?.name ?? null,
    school: school
      ? { id: school.id, name: school.name, code: school.code, status: school.status, logoUrl: school.logoUrl }
      : null,
    phone: null,
    isActive: u.isActive,
    permissions: u.role === 'super_admin' ? [...PERMISSIONS] : (perms?.permissions ?? []),
    subjects,
  };
}

async function seedFixtures() {
  // school
  let schoolId = await qScalarSchool();
  if (!schoolId) {
    const r = await pool.query(`INSERT INTO "School" (name, code, status, "createdAt", "updatedAt") VALUES ('Demo School','DEMO','active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`);
    schoolId = Number(r.rows[0].id);
  }
  async function qScalarSchool(): Promise<number | null> {
    const r = await q1<{ id: number }>(`SELECT id FROM "School" WHERE code = 'DEMO'`);
    return r ? r.id : null;
  }
  const upsertUser = async (email: string, name: string, role: string, password: string, withSchool: boolean) => {
    const existing = await q1<DbUser>(`SELECT * FROM "User" WHERE email = $1`, [email]);
    if (existing) return existing;
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      `INSERT INTO "User" (email, password, name, role, "schoolId", "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
      [email, hash, name, role, withSchool ? schoolId : null]
    );
    const u = await userById(Number(r.rows[0].id));
    if (!u) throw new Error('seed failed');
    return u;
  };
  const admin = await upsertUser('admin@paktestsolution.com', 'Super Admin', 'super_admin', 'Admin@123456', false);
  const mathT = await upsertUser('math.teacher@demo.test', 'Math Teacher (Demo)', 'teacher', 'Teacher@123456', true);
  const engT = await upsertUser('eng.teacher@demo.test', 'English Teacher (Demo)', 'teacher', 'Teacher@123456', true);
  const physT = await upsertUser('physics.teacher@demo.test', 'Physics Teacher (Demo)', 'teacher', 'Teacher@123456', true);
  const chemT = await upsertUser('chemistry.teacher@demo.test', 'Chemistry Teacher (Demo)', 'teacher', 'Teacher@123456', true);
  const bioT = await upsertUser('biology.teacher@demo.test', 'Biology Teacher (Demo)', 'teacher', 'Teacher@123456', true);

  const assignSubject = async (teacherId: number, courseCode: string, grade: number, subjectName: string, medium = 'english') => {
    const s = await q1<{ id: number; classId: number }>(
      `SELECT s.id, s."classId" FROM "Subject" s JOIN "Course" c ON c.id = s."courseId" JOIN "Class" cl ON cl.id = s."classId"
        WHERE c.code = $1 AND cl.grade = $2 AND s.name = $3 AND s.medium = $4 AND s.status = 'active' LIMIT 1`,
      [courseCode, grade, subjectName, medium]
    );
    if (!s) return;
    await run(`INSERT INTO "TeacherSubject" ("teacherId","subjectId","classId") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [teacherId, s.id, s.classId]);
  };
  await assignSubject(mathT.id, 'PTB', 9, 'Mathematics');
  // ── DEMO QUESTION BANK (sandbox-only, clearly labeled, never in prod) ─────
  // Content is generic, invented drill material prefixed "DEMO" so nobody can
  // mistake it for the real board syllabus; idempotent (skips when present).
  // Status mix: mostly approved so the wizard can be demoed immediately; a
  // few pending/draft rows left for the admin review workflow demo.
  const demoAdmin = { id: admin.id, email: admin.email, name: admin.name, role: 'super_admin', schoolId: null } as const;
  const hasDemo = await q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Question" WHERE text LIKE 'DEMO%'`);
  if (Number(hasDemo?.n ?? 0) === 0) {
    const ri = (n: number) => Math.floor(Math.random() * n);
    const LETTER = (i: number) => String.fromCharCode(65 + i);
    const mkMcq = (correct: string, wrong: string[]) => {
      const wrongs = [...wrong].filter((w) => w !== correct);
      const opts = [correct, ...wrongs.slice(0, 3)];
      while (opts.length < 4) opts.push(String(Number(correct) + opts.length * 3 + 7));
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      const arr = order.map((i) => opts[i]);
      const aIdx = arr.indexOf(correct);
      return { options: arr, answer: LETTER(aIdx) };
    };
    const mathMcq = (n: number) => {
      const kind = ri(4);
      if (kind === 0) { const a = ri(90) + 10, b = ri(90) + 10; const c = a + b;
        return { q: `DEMO: What is ${a} + ${b}?`, ...mkMcq(c.toString(), [String(c + 2), String(c - 3), String(a * 2)]) }; }
      if (kind === 1) { const a = ri(12) + 2, b = ri(12) + 2; const c = a * b;
        return { q: `DEMO: What is ${a} × ${b}?`, ...mkMcq(c.toString(), [String(c + a), String(c - b), String(a + b)]) }; }
      if (kind === 2) { const x = ri(9) + 1, a = ri(5) + 1, b = ri(15) + 1, c = a * x + b;
        return { q: `DEMO: Solve ${a}x + ${b} = ${c}. What is x?`, ...mkMcq(x.toString(), [String(x + 1), String(a + x), String(c)]) }; }
      const qN = (ri(4) + 1) * 100;
      return { q: `DEMO: What is 25% of ${qN}?`, ...mkMcq(String(qN / 4), [String(qN / 2), String(qN / 5), String(qN / 3)]) };
    };
    const mathShort = (): [string, string] => {
      const x = ri(9) + 1, a = ri(5) + 1, b = ri(20) - 10, c = a * x + b;
      return [`DEMO: Solve ${a}x ${b < 0 ? `- ${-b}` : `+ ${b}`} = ${c} for x.`, `x = ${x}`];
    };
    const mathTrue = (): [string, string] => {
      const a = ri(50) + 5, b = ri(50) + 5;
      return ri(2) === 0
        ? [`DEMO: ${a} + ${b} = ${b} + ${a}`, 'true']
        : [`DEMO: ${a} × ${b} = ${a} + ${b}`, 'false'];
    };
    const mathFill = (): [string, string] => {
      const a = ri(90) + 10, b = ri(90) + 10;
      return [`DEMO: ${a} + ${b} = ____`, String(a + b)];
    };
    const engWords: Array<[string, string]> = [
      ['big', 'large'], ['small', 'tiny'], ['happy', 'glad'], ['begin', 'start'], ['quick', 'fast'],
      ['hard', 'difficult'], ['bright', 'shiny'], ['strong', 'powerful'], ['rich', 'wealthy'], ['clean', 'tidy'],
      ['near', 'close'], ['quiet', 'silent'], ['angry', 'mad'], ['beautiful', 'pretty'], ['clever', 'smart'],
      ['easy', 'simple'], ['old', 'ancient'], ['sad', 'unhappy'], ['tall', 'high'], ['wide', 'broad'],
      ['correct', 'right'], ['brave', 'courageous'], ['lazy', 'idle'], ['thirsty', 'dry'],
    ];
    const engMcq = (n: number) => {
      const [w, syn] = engWords[(ri(1) + n * 7 + ri(24)) % engWords.length];
      const dist = engWords.map(([x, y]) => (x === w ? y : x === syn ? x : y === syn ? x : y)).filter((x) => x !== syn);
      const wrong = [...new Set(dist)].slice(0, 3);
      const obj = mkMcq(syn, wrong);
      return { q: `DEMO: Choose the word closest in meaning to “${w}”.`, ...obj };
    };
    const engShort = (n: number): [string, string] => {
      const w = engWords[(n * 5 + ri(24)) % engWords.length][0];
      return [`DEMO: Write one sentence using the word “${w}”.`, `Answer must include “${w}” — teacher discretion.`];
    };
    const pairsMath = [
      [{ left: '√49', right: '7' }, { left: '3²', right: '9' }, { left: '2³', right: '8' }, { left: '√25', right: '5' }],
      [{ left: 'Perimeter of square side 4 cm', right: '16 cm' }, { left: 'Area of square side 3 cm', right: '9 cm²' }, { left: '1 hour', right: '60 minutes' }, { left: '1 dozen', right: '12 items' }],
    ];
    const pairsEng = [
      [{ left: 'Synonym of “happy”', right: 'glad' }, { left: 'Opposite of “hot”', right: 'cold' }, { left: 'Past of “go”', right: 'went' }, { left: 'Plural of “child”', right: 'children' }],
      [{ left: 'Synonym of “big”', right: 'large' }, { left: 'Opposite of “fast”', right: 'slow' }, { left: 'Past of “see”', right: 'saw' }, { left: 'Plural of “mouse”', right: 'mice' }],
    ];

    const build = async (subjectName: string, medium: string, plan: Array<{ type: string; count: number }>, isMath: boolean) => {
      const subj = await q1<{ id: number }>(`SELECT s.id FROM "Subject" s JOIN "Course" c ON c.id = s."courseId" JOIN "Class" cl ON cl.id = s."classId"
                                             WHERE c.code = 'PTB' AND cl.grade = 9 AND s.name = $1 AND s.medium = $2 AND s.status = 'active' LIMIT 1`, [subjectName, medium]);
      if (!subj) return;
      const chapters = await q<{ id: number; number: number }>(`SELECT id, number FROM "Chapter" WHERE "subjectId" = $1 AND status = 'active' ORDER BY number`, [subj.id]);
      if (!chapters.length) return;
      const book = await q1<{ id: number }>(`SELECT id FROM "Book" WHERE "subjectId" = $1 AND status = 'active' LIMIT 1`, [subj.id]);
      let made = 0;
      const langFor = () => (isMath ? (made % 13 === 5 ? 'urdu' : made % 9 === 3 ? 'bilingual' : 'english') : made % 11 === 4 ? 'bilingual' : 'english');
      for (const row of plan) {
        for (let i = 0; i < row.count; i += 1) {
          const ch = chapters[made % chapters.length];
          const diffs = ['easy', 'medium', 'hard'] as const;
          const diff = diffs[made % 3];
          const status = made % 19 === 0 ? 'pending' : made % 23 === 0 ? 'draft' : 'approved';
          const payload: Record<string, any> = {
            chapterId: ch.id, type: row.type, marks: 1, difficulty: diff,
            language: langFor(), source: 'manual', status,
            tags: ['demo', 'sandbox'], category: 'exercise',
          };
          if (book) payload.bookId = book.id;
          const suf = ` (Ch ${ch.number} demo)`;
          try {
            if (row.type === 'mcq') {
              const m = isMath ? mathMcq(made) : engMcq(made);
              payload.text = m.q; payload.options = m.options; payload.answer = m.answer;
            } else if (row.type === 'short') {
              const [q, a] = isMath ? mathShort() : engShort(made);
              payload.text = q + suf; payload.answer = a;
            } else if (row.type === 'essay') {
              payload.text = isMath
                ? `DEMO: Factorize ${made % 5 + 2}x² + ${made % 5 + 2}x and state the factors.` + suf
                : `DEMO: Write a short paragraph (3–4 sentences) on “My favourite subject”.` + suf;
              payload.answer = isMath ? `${made % 5 + 2}x(x + 1)` : 'Model answer: teacher guide.';
            } else if (row.type === 'true_false') {
              const [q, a] = mathTrue();
              payload.text = q + suf; payload.answer = a;
            } else if (row.type === 'fill_blank') {
              const [q, a] = mathFill();
              payload.text = q + suf; payload.answer = a;
            } else if (row.type === 'matching') {
              const set = isMath ? pairsMath[made % pairsMath.length] : pairsEng[made % pairsEng.length];
              payload.text = `DEMO: Match column A with column B.` + suf;
              payload.options = { pairs: set }; payload.answer = 'A→1,B→2,C→3,D→4';
            } else if (row.type === 'numerical') {
              const h = ri(4) + 2, speed = ri(6) + 3, d = speed * h;
              payload.text = `DEMO: A train covers ${d} km in ${h} hours. Find its average speed in km/h.` + suf;
              payload.answer = String(speed);
            } else if (row.type === 'conceptual') {
              payload.text = isMath
                ? `DEMO: Explain in your own words why division by zero is not allowed.` + suf
                : `DEMO: Why do we use punctuation while writing English sentences?` + suf;
              payload.answer = 'Model answer: teacher guide.';
            }
            if (made % 17 === 8 && row.type === 'mcq') { payload.language = 'urdu'; payload.text = `DEMO: پانچ جمع تین کا حاصل کیا ہے؟ (Urdu demo)`; payload.options = ['8', '9', '10', '11']; payload.answer = 'A'; }
            await questionBankService.create(demoAdmin as any, payload);
            made += 1;
          } catch (e: any) {
            console.warn('demo seed skip:', e?.message);
          }
        }
      }
      console.log(`✔ demo questions seeded for ${subjectName} (${made})`);
    };

    const mathPlan = [
      { type: 'mcq', count: 30 }, { type: 'short', count: 18 }, { type: 'essay', count: 9 },
      { type: 'true_false', count: 9 }, { type: 'fill_blank', count: 10 }, { type: 'matching', count: 6 },
      { type: 'numerical', count: 9 }, { type: 'conceptual', count: 5 },
    ];
    const engPlan = [
      { type: 'mcq', count: 26 }, { type: 'short', count: 15 }, { type: 'essay', count: 6 },
      { type: 'true_false', count: 7 }, { type: 'fill_blank', count: 8 }, { type: 'matching', count: 6 },
      { type: 'conceptual', count: 5 },
    ];
    await build('Mathematics', 'english', mathPlan, true);
    await build('English', 'english', engPlan, false);
  } else {
    console.log('✔ demo questions already present — skipping seed');
  }

  // ── SCIENCE DEMO BANKS (physics / chemistry / biology, per-subject gate) ─
  // English-medium Grade-9 PTB science subjects. Rows come from the
  // hand-authored demo-content banks (75 rows each), all inserted approved so
  // every science teacher can generate immediately; pending/draft demo rows
  // for the admin review flow already exist in the math/english banks.
  const marksFor: Record<string, number> = {
    mcq: 1, true_false: 1, fill_blank: 1, matching: 1,
    short: 2, numerical: 2, conceptual: 2, essay: 5,
  };
  const LETTER = (i: number) => String.fromCharCode(65 + i);
  const buildScience = async (subjectName: string, rows: DemoRow[]) => {
    const subj = await q1<{ id: number }>(`SELECT s.id FROM "Subject" s JOIN "Course" c ON c.id = s."courseId" JOIN "Class" cl ON cl.id = s."classId"
                                           WHERE c.code = 'PTB' AND cl.grade = 9 AND s.name = $1 AND s.medium = 'english' AND s.status = 'active' LIMIT 1`, [subjectName]);
    if (!subj) return 0;
    const existing = await q1<{ n: string }>(`SELECT count(*)::int AS n FROM "Question" WHERE "subjectId" = $1 AND text LIKE 'DEMO%'`, [subj.id]);
    if (Number(existing?.n ?? 0) > 0) { console.log(`✔ demo questions already present — skipping ${subjectName}`); return 0; }
    const chapters = await q<{ id: number; number: number }>(`SELECT id, number FROM "Chapter" WHERE "subjectId" = $1 AND status = 'active' ORDER BY number`, [subj.id]);
    if (!chapters.length) { console.warn(`⚠ no chapters for ${subjectName} — skipping bank`); return 0; }
    const book = await q1<{ id: number }>(`SELECT id FROM "Book" WHERE "subjectId" = $1 AND status = 'active' LIMIT 1`, [subj.id]);
    let made = 0;
    for (const row of rows) {
      try {
        const ch = chapters[made % chapters.length];
        const diffs = ['easy', 'medium', 'hard'] as const;
        const payload: Record<string, any> = {
          chapterId: ch.id, type: row.t, marks: marksFor[row.t] ?? 1,
          difficulty: diffs[made % 3], language: 'english', source: 'manual',
          status: 'approved', tags: ['demo', 'sandbox'], category: 'exercise',
        };
        if (book) payload.bookId = book.id;
        const suf = ` (Ch ${ch.number} demo)`;
        if (row.t === 'mcq') {
          const rot = made % 4; // letter variety
          const options = row.o.map((_, k) => row.o[(k + rot) % 4]);
          payload.text = row.q;
          payload.options = options;
          payload.answer = LETTER((4 - rot) % 4);
        } else if (row.t === 'matching') {
          payload.text = `DEMO: Match column A with column B.` + suf;
          payload.options = { pairs: row.pairs };
          payload.answer = 'A→1,B→2,C→3,D→4';
        } else {
          payload.text = row.q + suf;
          payload.answer = row.a;
        }
        await questionBankService.create(demoAdmin as any, payload);
        made += 1;
      } catch (e: any) {
        console.warn('science demo seed skip:', e?.message);
      }
    }
    console.log(`✔ demo questions seeded for ${subjectName} (${made})`);
    return made;
  };
  await buildScience('Physics', physicsRows);
  await buildScience('Chemistry', chemistryRows);
  await buildScience('Biology', biologyRows);

  await assignSubject(engT.id, 'PTB', 9, 'English');
  await assignSubject(physT.id, 'PTB', 9, 'Physics');
  await assignSubject(chemT.id, 'PTB', 9, 'Chemistry');
  await assignSubject(bioT.id, 'PTB', 9, 'Biology');
  console.log('✔ fixtures ensured: admin@… / Admin@123456 · 5 subject teachers (math · english · physics · chemistry · biology @demo.test) / Teacher@123456');
}

async function main() {
  await seedFixtures();
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ success: true, message: 'dev gateway ok' }));

  // ── auth (contract-mirroring) ─────────────────────────────────────────────
  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};
      const user = await q1<DbUser>(`SELECT u.*, s.name AS "schoolName" FROM "User" u LEFT JOIN "School" s ON s.id = u."schoolId" WHERE lower(u.email) = lower($1)`, [String(email ?? '')]);
      if (!user || !(await bcrypt.compare(String(password ?? ''), user.password))) {
        throw ApiError.unauthorized('Invalid email or password');
      }
      if (!user.isActive) throw ApiError.forbidden('Account is deactivated');
      res.cookie('refreshToken', signRefresh({ id: user.id }), { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
      await q(`INSERT INTO "ActivityLog" ("userId","action","details") VALUES ($1,'login',$2)`, [user.id, JSON.stringify({ method: 'email' })]);
      const profile = await profileFor(user);
      successResponse(res, { user: profile, accessToken: signAccess({ id: user.id }) }, 'Login successful');
    } catch (err) { next(err); }
  });

  const verifyRefresh = (token: string): { id: number } => jwt.verify(token, JWT_REFRESH_SECRET) as { id: number };

  app.post('/api/auth/refresh', async (req, res, next) => {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });
      const { id } = verifyRefresh(token);
      const user = await userById(id);
      if (!user || !user.isActive) throw ApiError.unauthorized('User not found');
      res.cookie('refreshToken', signRefresh({ id }), { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
      successResponse(res, { accessToken: signAccess({ id }) }, 'Token refreshed');
    } catch (err) { next(err); }
  });

  app.post('/api/auth/logout', (_req, res) => { res.clearCookie('refreshToken'); successResponse(res, null, 'Logged out'); });

  const bearerUser = async (req: express.Request) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) throw ApiError.unauthorized('No token');
    const { id } = jwt.verify(h.slice(7), JWT_SECRET) as { id: number };
    const u = await userById(id);
    if (!u) throw ApiError.unauthorized('User not found');
    if (!u.isActive) throw ApiError.unauthorized('Deactivated');
    return u;
  };

  app.get('/api/auth/profile', async (req, res, next) => {
    try {
      const u = await bearerUser(req);
      successResponse(res, await profileFor(u), 'Profile fetched');
    } catch (err) { next(err); }
  });

  app.put('/api/auth/change-password', async (req, res, next) => {
    try {
      const u = await bearerUser(req);
      const { currentPassword, newPassword } = req.body ?? {};
      if (!(await bcrypt.compare(String(currentPassword ?? ''), u.password))) throw ApiError.badRequest('Current password is incorrect');
      const hash = await bcrypt.hash(String(newPassword ?? ''), 12);
      await run(`UPDATE "User" SET password = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`, [hash, u.id]);
      successResponse(res, null, 'Password changed');
    } catch (err) { next(err); }
  });

  // ── Phase-2 API (perm governance + activity audit for school_admins) ─────
  app.use('/api/v2', createV2Governance(), phase2Api);
  // ── Phase-3 API (schools/users/templates/analytics/audit/papers/PDF) ─────
  app.use('/api/v3', phase3Api);

  app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.statusCode && Number(err.statusCode) >= 400 ? Number(err.statusCode) : 500;
    if (status >= 500) console.error('[dev-gateway]', err?.message);
    res.status(status).json({
      success: false,
      message: err?.message ?? 'Internal server error',
      errors: err?.errors ?? undefined,
      details: err?.details ?? undefined,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dev gateway on http://0.0.0.0:${PORT} (auth + /api/v2)`);
  });
}

main().catch((e) => { console.error('gateway failed:', e); process.exit(1); });
