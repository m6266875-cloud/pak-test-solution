/**
 * PHASE 1 — Preloaded course/syllabus/book catalog: validation + loader.
 *
 * validateCatalogFiles() is PURE (no DB, no network) and runs before any
 * insert so the preloaded catalogue can never put structurally invalid rows
 * into the database.
 *
 * applyCatalog(client) applies the validated files idempotently over one
 * transaction using raw parameterized SQL (the installed @prisma/client
 * cannot run in this environment because engine binaries are not available;
 * the loader is therefore dependency-free and works against plain `pg`).
 * Rows are matched by natural keys and updated in place — re-running the
 * loader never duplicates data.
 */
import fs from 'fs';
import path from 'path';

const DIR = __dirname;

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

/** Minimal query interface so this file does not depend on `pg` types. */
export interface DbClient {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

/* ──────────────────────────────── JSON shapes ─────────────────────────────── */

interface SourceEntry { id: string; url: string; name: string; kind: string }
interface SourcesFile { sources: SourceEntry[] }

interface SessionEntry { code: string; startYear: number; endYear: number; name?: string; displayOrder?: number }
interface CourseSessionLink { session: string; status: string; notes?: string }
interface ClassDef { grade: number; name: string; displayOrder?: number; notes?: string }
interface CourseEntry {
  code: string; name: string; shortName?: string; type: string; region?: string; website?: string;
  description?: string; logo?: string; sourceRef?: string; displayOrder?: number;
  classes: { from?: number; to?: number } | ClassDef[];
  courseSessions: CourseSessionLink[];
}
interface CoursesFile { sessions: SessionEntry[]; courses: CourseEntry[] }

interface BookEntry { title?: string; edition?: string; year?: number; verify?: boolean; note?: string; sourceRef?: string }
interface ChapterEntry { n: number; name: string; note?: string }
interface SubjectEntry {
  name: string; medium?: string; note?: string;
  book?: BookEntry | string; books?: BookEntry[];
  chapters?: ChapterEntry[]; chapterSource?: string;
}
interface ClassCatalogEntry { grade?: number; grades?: number[]; notes?: string; subjects?: SubjectEntry[] }
interface CourseCatalogFile {
  courseCode: string;
  defaults?: { session?: string; source?: string; publisher?: string };
  classes?: ClassCatalogEntry[];
  subjectPool?: SubjectEntry[];
}

/* ───────────────────────────── pure validation ───────────────────────────── */

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')) as T;
}

function resolveTitle(t: string, grade: number): string {
  return t.replace(/\{g\}/g, String(grade)).replace(/\{gMinus5\}/g, String(grade - 5));
}

export function validateCatalogFiles(): ValidationReport {
  const report: ValidationReport = { errors: [], warnings: [] };
  const err = (m: string) => report.errors.push(m);
  const warn = (m: string) => report.warnings.push(m);

  const sources = loadJson<SourcesFile>('sources.json').sources;
  const sourceIds = new Set(sources.map(s => s.id));
  const sourceById = new Map(sources.map(s => [s.id, s]));

  const coursesFile = loadJson<CoursesFile>('courses.json');
  const sessionCodes = new Set<string>();
  for (const s of coursesFile.sessions) {
    if (sessionCodes.has(s.code)) err(`courses.json: duplicate session ${s.code}`);
    sessionCodes.add(s.code);
    if (!/^\d{4}-\d{2}$/.test(s.code) || s.endYear - s.startYear !== 1) err(`courses.json: malformed session ${s.code}`);
  }
  const coursesByCode = new Map<string, CourseEntry>();
  for (const c of coursesFile.courses) {
    if (coursesByCode.has(c.code)) err(`courses.json: duplicate course ${c.code}`);
    coursesByCode.set(c.code, c);
    if (!['board', 'publisher', 'program'].includes(c.type)) err(`courses.json: ${c.code} bad type '${c.type}'`);
    if (c.sourceRef && !sourceIds.has(c.sourceRef)) err(`courses.json: ${c.code} unknown sourceRef ${c.sourceRef}`);
    const seen = new Set<string>();
    for (const cs of c.courseSessions) {
      if (!sessionCodes.has(cs.session)) err(`courses.json: ${c.code} references undefined session ${cs.session}`);
      if (!['upcoming', 'current', 'previous', 'archived'].includes(cs.status)) err(`courses.json: ${c.code} bad session status ${cs.status}`);
      if (seen.has(cs.session)) err(`courses.json: ${c.code} duplicated session link ${cs.session}`);
      seen.add(cs.session);
    }
    const currentCount = c.courseSessions.filter(cs => cs.status === 'current').length;
    if (currentCount !== 1) warn(`courses.json: ${c.code} — expected exactly one CURRENT courseSession, found ${currentCount}`);
    // duplicate grades inside an explicit class list
    if (Array.isArray(c.classes)) {
      const grades = c.classes.map(x => x.grade);
      if (new Set(grades).size !== grades.length) err(`courses.json: ${c.code} duplicate grades in class list`);
    }
  }

  const files = ['ptb.json', 'federal.json', 'oxford.json', 'afaq.json', 'gohar.json', 'bapu.json'];
  for (const file of files) {
    const cat = loadJson<CourseCatalogFile>(file);
    const course = coursesByCode.get(cat.courseCode);
    if (!course) { err(`${file}: unknown courseCode '${cat.courseCode}'`); continue; }
    if (cat.defaults?.session && !sessionCodes.has(cat.defaults.session)) err(`${file}: defaults.session '${cat.defaults.session}' undefined`);
    if (cat.defaults?.source && !sourceIds.has(cat.defaults.source)) err(`${file}: defaults.source '${cat.defaults.source}' unknown`);
    if (!cat.defaults?.source) warn(`${file}: no catalogue-level sourceRef — book rows should be treated as unverified`);

    let allowed: number[] | null = null;
    if (Array.isArray(course.classes)) allowed = course.classes.map(c => c.grade);
    else if (course.classes.from != null && course.classes.to != null) {
      allowed = [];
      for (let g = course.classes.from; g <= course.classes.to; g++) allowed.push(g);
    }
    if (!allowed) err(`${file}: course ${course.code} defines no classes`);

    const seenGlobal = new Map<number, Set<string>>(); // grade → subject/medium keys
    for (const cls of cat.classes ?? []) {
      const grades = cls.grades ?? (cls.grade != null ? [cls.grade] : []);
      for (const g of grades) {
        if (allowed && !allowed.includes(g)) err(`${file}: grade ${g} not allowed for course ${course.code}`);
      }
      const subjectList = cls.subjects ?? [];
      for (const subj of subjectList) {
        const medium = subj.medium ?? 'em';
        if (!['em', 'urdu'].includes(medium)) err(`${file}: '${subj.name}' bad medium '${medium}'`);
        const hasChapters = !!subj.chapters?.length;
        const needsSource = hasChapters || subj.book && (typeof subj.book === 'object' && subj.book.verify) || (subj.books ?? []).some(b => b.verify);
        const src = subj.chapterSource ?? cat.defaults?.source;
        if (needsSource && !src) warn(`${file}: '${subj.name}' carries chapters/verified book but no sourceRef anywhere`);
        if (subj.chapterSource && !sourceIds.has(subj.chapterSource)) err(`${file}: '${subj.name}' unknown chapterSource '${subj.chapterSource}'`);

        const books = subj.books ?? (subj.book ? [subj.book] : []);
        for (const b of books) {
          if (typeof b === 'string') { if (!b.trim()) err(`${file}: '${subj.name}' empty book title`); continue; }
          for (const g of grades) {
            if (!resolveTitle(b.title ?? '', g).trim()) err(`${file}: '${subj.name}' grade ${g} book without title`);
          }
          if (b.sourceRef && !sourceIds.has(b.sourceRef)) err(`${file}: '${subj.name}' unknown book sourceRef '${b.sourceRef}'`);
          if (b.verify === true) {
            const anchor = b.sourceRef ?? cat.defaults?.source;
            const src = anchor ? sourceById.get(anchor) : undefined;
            if (!anchor || !src) err(`${file}: '${subj.name}' marks a book verified but no source is referenced anywhere`);
            else if (!['official', 'publisher'].includes(src.kind)) err(`${file}: '${subj.name}' verified=true cites ${src.kind} '${src.name}' — verified rows must cite official/publisher sources only`);
          }
        }
        for (const g of grades) {
          if (!seenGlobal.has(g)) seenGlobal.set(g, new Set());
          const set = seenGlobal.get(g)!;
          const key = `${subj.name}|${medium}`;
          if (set.has(key)) err(`${file}: duplicate subject '${subj.name}' (${medium}) in grade ${g}`);
          set.add(key);
        }
        const chs = subj.chapters ?? [];
        let prev = -Infinity;
        for (const ch of chs) {
          if (typeof ch.n !== 'number' || !ch.name) err(`${file}: '${subj.name}' malformed chapter row`);
          if (ch.n <= prev) err(`${file}: '${subj.name}' chapter numbers not ascending (…${prev} → ${ch.n})`);
          prev = ch.n;
        }
        if (chs.length > 0 && chs[0].n !== 1) warn(`${file}: '${subj.name}' chapter numbering does not start at 1 (starts at ${chs[0].n}) — intentional when a continuation book numbers from 10+`);
        if (chs.length > 0) {
          const srcId = subj.chapterSource ?? cat.defaults?.source;
          const cs = srcId ? sourceById.get(srcId) : undefined;
          if (!cs) err(`${file}: '${subj.name}' lists chapters but no chapterSource resolves — name the exact consulted source`);
          else if (!['official', 'publisher'].includes(cs.kind)) warn(`${file}: '${subj.name}' chapter list cites ${cs.kind} '${cs.name}' — rows seed verified=false until confirmed on an official copy`);
        }
      }
    }
    if (cat.subjectPool) {
      const names = new Set<string>();
      for (const s of cat.subjectPool) {
        if (!s.name || !['em', 'urdu'].includes(s.medium ?? 'em')) err(`${file}: malformed subjectPool entry`);
        if (names.has(`${s.name}|${s.medium ?? 'em'}`)) err(`${file}: duplicate subjectPool entry ${s.name}`);
        names.add(`${s.name}|${s.medium ?? 'em'}`);
      }
    }
  }
  if (report.warnings.length) report.warnings.sort();
  return report;
}

/* ───────────────────────────────── loader ────────────────────────────────── */

export interface CatalogStats {
  sessions: number; courses: number; courseSessions: number; courseClasses: number;
  classes: number; subjects: number; books: number; chapters: number;
  created: { classes: number; subjects: number; books: number; chapters: number };
  // Phase 4 — single-copy guard (Part B): active Book siblings sharing one
  // (course, subject, class). Conflicts = same-title session/year copies that
  // should be archived; different-title siblings are only flagged for review.
  singleCopyConflicts: number;
  singleCopyWarnings: string[];
}

const asInt = (rows: any[]) => (rows.length ? Number(rows[0].id) : null);

export async function applyCatalog(db: DbClient): Promise<CatalogStats> {
  const report = validateCatalogFiles();
  if (report.errors.length) {
    throw new Error(`Catalog validation failed (${report.errors.length} errors):\n- ${report.errors.join('\n- ')}`);
  }
  const stats: CatalogStats = { sessions: 0, courses: 0, courseSessions: 0, courseClasses: 0, classes: 0, subjects: 0, books: 0, chapters: 0, created: { classes: 0, subjects: 0, books: 0, chapters: 0 }, singleCopyConflicts: 0, singleCopyWarnings: [] };
  const sources = loadJson<SourcesFile>('sources.json').sources;
  const sourceById = new Map(sources.map(s => [s.id, s]));
  const urlOf = (id?: string) => (id ? (sourceById.get(id)?.url ?? null) : null);
  const labelOf = (id?: string) => (id ? (sourceById.get(id)?.name ?? '') : null);

  const coursesFile = loadJson<CoursesFile>('courses.json');
  const sessionIds = new Map<string, number>();

  // helper statement makers — returns { id, created }. NEVER touches lifecycle
  // columns (status, isActive, verified-to-false, …) so admin actions persist
  // across re-seeds; it only refreshes catalog metadata and ordering.
  const upsertByUnique = async (
    table: string, uniqueCols: string[], uniqueVals: unknown[], updateCols: string[], updateVals: unknown[], createCols: string[], createVals: unknown[],
  ): Promise<{ id: number; created: boolean }> => {
    const where = uniqueCols.map((c, i) => `"${c}" = $${i + 1}`).join(' AND ');
    const sel = await db.query(`SELECT id FROM "${table}" WHERE ${where} LIMIT 1`, uniqueVals);
    const existing = asInt(sel.rows);
    if (existing != null) {
      if (updateCols.length) {
        const sets = updateCols.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
        await db.query(`UPDATE "${table}" SET ${sets}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${updateCols.length + 1}`, [...updateVals, existing]);
      }
      return { id: existing, created: false };
    }
    const cols = [...uniqueCols, ...createCols, 'createdAt', 'updatedAt'].map(c => `"${c}"`).join(', ');
    const vals = [...uniqueVals, ...createVals];
    const ph = [...vals.map((_, i) => `$${i + 1}`), 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'].join(', ');
    const ins = await db.query(`INSERT INTO "${table}" (${cols}) VALUES (${ph}) RETURNING id`, vals);
    return { id: asInt(ins.rows)!, created: true };
  };

  // 1) Academic sessions
  for (const s of coursesFile.sessions) {
    const { id } = await upsertByUnique(
      'AcademicSession', ['code'], [s.code],
      ['name', 'startYear', 'endYear', 'displayOrder'], [s.name ?? `Academic Year ${s.code}`, s.startYear, s.endYear, s.displayOrder ?? 0],
      ['name', 'startYear', 'endYear', 'displayOrder'], [s.name ?? `Academic Year ${s.code}`, s.startYear, s.endYear, s.displayOrder ?? 0],
    );
    sessionIds.set(s.code, id);
    stats.sessions++;
  }

  // 2) Classes (by grade), Courses, CourseSession, CourseClass
  const classIds = new Map<number, number>(); // grade → id
  const ensureClass = async (grade: number, name?: string): Promise<{ id: number; created: boolean }> => {
    const existing = classIds.get(grade);
    if (existing != null) return { id: existing, created: false };
    const rows = await db.query('SELECT id, "name" FROM "Class" WHERE "grade" = $1 LIMIT 1', [grade]);
    let id = asInt(rows.rows);
    let created = false;
    if (id == null) {
      const ins = await db.query('INSERT INTO "Class" ("name", "grade", "createdAt", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id', [name ?? `Class ${grade}`, grade]);
      id = asInt(ins.rows)!;
      stats.classes++;
      stats.created.classes++;
      created = true;
    } else if (name && rows.rows[0].name !== name) {
      await db.query('UPDATE "Class" SET "name" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2', [name, id]);
    }
    classIds.set(grade, id);
    return { id, created };
  };

  for (const c of coursesFile.courses) {
    const srcLabel = c.sourceRef ? labelOf(c.sourceRef) : '';
    const srcUrl = c.sourceRef ? urlOf(c.sourceRef) : null;
    const dataNotes = trim(`Preloaded catalog entity. Verified source: ${srcLabel || 'n/a'}${srcUrl ? ` (${srcUrl})` : ''}`);
    const { id: courseId } = await upsertByUnique(
      'Course', ['code'], [c.code],
      ['name', 'type', 'displayOrder', 'dataNotes'],
      [c.name, c.type, c.displayOrder ?? 0, dataNotes],
      ['name', 'shortName', 'type', 'region', 'description', 'website', 'logoUrl', 'sourceRef', 'displayOrder', 'dataNotes'],
      [c.name, c.shortName ?? null, c.type, c.region ?? null, c.description ?? null, c.website ?? null, c.logo ?? null, srcUrl, c.displayOrder ?? 0, dataNotes],
    );
    stats.courses++;

    for (const cs of c.courseSessions) {
      const sessionId = sessionIds.get(cs.session)!;
      await upsertByUnique(
        'CourseSession', ['courseId', 'sessionId'], [courseId, sessionId],
        ['status', 'notes'], [cs.status, cs.notes ?? null],
        ['status', 'notes'], [cs.status, cs.notes ?? null],
      );
      stats.courseSessions++;
    }

    let defs: ClassDef[] = [];
    if (Array.isArray(c.classes)) defs = c.classes;
    else if (c.classes.from != null && c.classes.to != null) {
      for (let g = c.classes.from; g <= c.classes.to; g++) defs.push({ grade: g, name: `Class ${g}` });
    }
    for (const [i, def] of defs.entries()) {
      const classId = (await ensureClass(def.grade, def.name)).id;
      await upsertByUnique(
        'CourseClass', ['courseId', 'classId'], [courseId, classId],
        ['isActive', 'displayOrder', 'notes'], [true, def.displayOrder ?? i, def.notes ?? null],
        ['isActive', 'displayOrder', 'notes'], [true, def.displayOrder ?? i, def.notes ?? null],
      );
      stats.courseClasses++;
    }
  }

  // 3) Per-course catalogue: subjects → books → chapters
  for (const file of ['ptb.json', 'federal.json', 'oxford.json', 'afaq.json', 'gohar.json', 'bapu.json']) {
    const cat = loadJson<CourseCatalogFile>(file);
    const courseRows = await db.query('SELECT id FROM "Course" WHERE "code" = $1', [cat.courseCode]);
    const courseId = asInt(courseRows.rows);
    if (courseId == null) throw new Error(`${file}: course ${cat.courseCode} was not created`);
    const sessionId = cat.defaults?.session ? sessionIds.get(cat.defaults.session) : null;
    const defaultSourceLabel = cat.defaults?.source ? labelOf(cat.defaults.source) : null;
    const defaultSourceUrl = cat.defaults?.source ? urlOf(cat.defaults.source) : null;
    const publisher = cat.defaults?.publisher ?? null;

    for (const cls of cat.classes ?? []) {
      const grades = cls.grades ?? (cls.grade != null ? [cls.grade] : []);
      const isPool = (cls as any).subjectsFrom === 'subjectPool';
      const clsSubjectNote = isPool ? ((cls as any).subjectNote ?? null) : null;
      const subjectList = isPool ? (cat.subjectPool ?? []) : (cls.subjects ?? []);
      // Class-block notes belong on CourseClass (junction), not repeated per row
      const ccNote = trim(`${cls.notes ?? ''}${clsSubjectNote ? ` ${clsSubjectNote}` : ''}`);
      for (const grade of grades) {
        const classRow = await db.query('SELECT id, "name" FROM "Class" WHERE "grade" = $1', [grade]);
        const classId = asInt(classRow.rows);
        if (classId == null) throw new Error(`${file}: class ${grade} missing for course ${cat.courseCode}`);
        if (ccNote) {
          await db.query('UPDATE "CourseClass" SET "notes" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "courseId" = $2 AND "classId" = $3', [ccNote, courseId, classId]);
        }

        let order = 0;
        for (const subj of subjectList) {
          const medium = subj.medium === 'urdu' ? 'urdu' : 'english';
          const subjectNote = isPool ? trim(`${clsSubjectNote ?? ''} ${subj.note ?? ''}`) : (subj.note ?? null);
          // subject upsert by natural key (courseId, classId, medium, name)
          const { id: subjectId, created: subjectCreated } = await upsertByUnique(
            'Subject', ['courseId', 'classId', 'medium', 'name'], [courseId, classId, medium, subj.name],
            ['displayOrder', 'dataNotes'], [order, subjectNote],
            ['status', 'displayOrder', 'dataNotes'], ['active', order, subjectNote],
          );
          stats.subjects++;
          if (subjectCreated) stats.created.subjects++;
          order++;

          // Book rows (usually 1 per subject; a subject may carry none)
          const books = subj.books ?? (subj.book ? [subj.book as BookEntry] : []);
          // Chapter provenance — a row counts as verified ONLY when the exact
          // consulted source (chapterSource) is official/publisher kind; lists
          // corroborated by secondary mirrors seed verified=false so they are
          // never presented as confirmed syllabus.
          const chSource = subj.chapterSource ? sourceById.get(subj.chapterSource) ?? null : null;
          const chSourceLabel = chSource ? chSource.name : defaultSourceLabel;
          const chSourceUrl = chSource ? chSource.url : defaultSourceUrl;
          const chVerified = !!chSource && ['official', 'publisher'].includes(chSource.kind);
          const chapterNoteFor = (ch: ChapterEntry): string | null =>
            ch.note ?? (chVerified
              ? `Unit list verified against ${chSourceLabel}.`
              : chSource
                ? `Unit list corroborated by ${chSourceLabel} (${chSource.kind}) — awaiting confirmation on an official copy.`
                : defaultSourceLabel
                  ? `Unit list as catalogued under ${defaultSourceLabel} — awaiting confirmation on an official copy.`
                  : null);

          for (const b of books) {
            const be = typeof b === 'string' ? { title: b } as BookEntry : b;
            const title = resolveTitle(be.title ?? '', grade);
            if (!title) continue;
            const bookNote = be.note ?? null;
            // Book source = the book's own anchor (entry-level sourceRef
            // override, else the catalogue defaults.source) — NOT the chapter
            // corroboration source, which lives on Chapter rows instead.
            const bookSource = be.sourceRef ? sourceById.get(be.sourceRef) ?? null : null;
            const bookSourceUrl = bookSource ? bookSource.url : defaultSourceUrl;
            const bookSourceLabel = bookSource ? bookSource.name : defaultSourceLabel;
            const bookNotes = be.verify === true && bookSourceLabel
              ? trim(`${bookNote ?? ''} Source: ${bookSourceLabel}`)
              : bookNote;
            const { id: bookId, created: bookCreated } = await upsertByUnique(
              'Book',
              ['courseId', 'sessionId', 'subjectId', 'classId', 'title'], [courseId, sessionId, subjectId, classId, title],
              ['publisher', 'edition', 'year', 'language', 'verified', 'sourceRef', 'dataNotes'],
              [publisher, be.edition ?? null, be.year ?? null, medium, be.verify === true, bookSourceUrl, bookNotes],
              ['publisher', 'edition', 'year', 'language', 'status', 'verified', 'sourceRef', 'dataNotes'],
              [publisher, be.edition ?? null, be.year ?? null, medium, 'active', be.verify === true, bookSourceUrl, bookNotes],
            );
            stats.books++;
            if (bookCreated) stats.created.books++;

            // Phase 4 — single-copy guard: exactly one ACTIVE book row per
            // (course, subject, class). Siblings left over from older sessions
            // must be archived (see scripts/phase4-catalog-dedupe.ts), never
            // silently multiplied. Report-only: this check never mutates.
            const sibs = await db.query(
              `SELECT b.id, b.title, b.edition, b.year, a.code AS session
                 FROM "Book" b LEFT JOIN "AcademicSession" a ON a.id = b."sessionId"
                WHERE b."courseId" = $1 AND b."subjectId" = $2 AND b."classId" = $3
                  AND b.status = 'active' AND b.id <> $4
                ORDER BY b.id`,
              [courseId, subjectId, classId, bookId]
            );
            for (const s of sibs.rows) {
              const sameTitle = String(s.title) === title;
              if (sameTitle) stats.singleCopyConflicts++;
              stats.singleCopyWarnings.push(
                `${file}: Book#${bookId} "${title}" has an ACTIVE sibling Book#${s.id} "${s.title}"` +
                ` (${s.edition ?? 'no edition'}${s.year ? `, ${s.year}` : ''}, session ${s.session ?? 'none'})` +
                (sameTitle
                  ? ' — same title: superseded session/year copy, archive it (npm run db:dedupe)'
                  : ' — different title: multi-book subject, confirm intentional')
              );
            }

            // Chapter rows — from the (validated) chapter list of this subject.
            for (const ch of subj.chapters ?? []) {
              const prev = await db.query('SELECT id FROM "Chapter" WHERE "bookId" = $1 AND "number" = $2', [bookId, ch.n]);
              const note = chapterNoteFor(ch);
              if (asInt(prev.rows) == null) {
                await db.query(
                  `INSERT INTO "Chapter" ("name", "number", "subjectId", "bookId", "status", "verified", "sourceRef", "dataNotes", "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                  [ch.name, ch.n, subjectId, bookId, chVerified, chSourceUrl, note],
                );
                stats.created.chapters++;
              } else {
                // refresh provenance only — never touches status (admin archive persists)
                await db.query(
                  `UPDATE "Chapter" SET "name" = $1, "verified" = $2, "sourceRef" = $3, "dataNotes" = $4, "updatedAt" = CURRENT_TIMESTAMP WHERE "bookId" = $5 AND "number" = $6`,
                  [ch.name, chVerified, chSourceUrl, note, bookId, ch.n],
                );
              }
              stats.chapters++;
            }
          }
        }
      }
    }
  }
  return stats;
}

function trim(s: string): string | null {
  const t = s.replace(/\s+/g, ' ').trim();
  return t || null;
}
