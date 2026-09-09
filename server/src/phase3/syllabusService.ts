/**
 * PHASE 4 — Syllabus structure import (Part B).
 *
 * Admin import of chapter/exercise structure for ONE book. Two hard rules:
 *
 * 1. VERIFIED-ONLY — the parent book must have verified=true (confirmed
 *    against an official/publisher source). Imports under unverified books
 *    are rejected with 422 so unconfirmed lists can never be presented as
 *    verified syllabus.
 * 2. NO INVENTED CONTENT — exactly the chapters/exercises named in the
 *    payload are upserted; nothing is auto-created, renumbered or "filled
 *    in". New rows land with verified=false so a human must confirm them
 *    against the source before they count as verified syllabus.
 *
 * Matching: by (bookId, number) when a number is given, else by
 * (bookId, lower(name)) for chapters; by (chapterId, number ?? name) for
 * exercises. Everything runs in ONE transaction — a bad row rolls back
 * the whole import.
 */
import { q1, withTx, makeTxHelpers } from '../phase2/db';
import { AuthUser } from '../phase2/types';
import { ApiError } from '../utils/apiResponse';
import { record } from './audit';

interface ExerciseInput {
  number?: number | null;
  name: string;
  sourceRef?: string | null;
}
interface ChapterInput {
  number?: number | null;
  name: string;
  description?: string | null;
  sourceRef?: string | null;
  exercises?: ExerciseInput[];
}

const clean = (v: unknown, max: number): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const numOrNull = (v: unknown): number | null =>
  Number.isInteger(v) && (v as number) >= 0 ? (v as number) : null;

export class SyllabusAdminService {
  async importChapters(user: AuthUser, body: Record<string, any>) {
    const bookId = Number(body.bookId);
    if (!Number.isInteger(bookId) || bookId < 1) throw ApiError.badRequest('bookId is required');
    const chapters = body.chapters;
    if (!Array.isArray(chapters) || !chapters.length) {
      throw ApiError.badRequest('chapters must be a non-empty array');
    }
    if (chapters.length > 100) throw ApiError.badRequest('At most 100 chapters per import');

    const book = await q1<any>(`SELECT id, title, "subjectId", verified FROM "Book" WHERE id = $1`, [bookId]);
    if (!book) throw ApiError.notFound('Book not found');
    if (!book.verified) {
      throw new ApiError('Imports are allowed only for verified books — confirm this book against its source first', 422);
    }
    const subjectId = body.subjectId != null ? Number(body.subjectId) : book.subjectId;
    if (!Number.isInteger(subjectId) || subjectId < 1) {
      throw ApiError.badRequest('subjectId is required (the book has none set)');
    }
    const subject = await q1(`SELECT id FROM "Subject" WHERE id = $1`, [subjectId]);
    if (!subject) throw ApiError.notFound('Subject not found');

    // validate the whole payload before touching the DB
    const rows: ChapterInput[] = chapters.map((c: any, i: number) => {
      const name = clean(c?.name, 300);
      if (!name) throw ApiError.badRequest(`chapters[${i}].name is required`);
      const ex = c?.exercises;
      if (ex !== undefined && !Array.isArray(ex)) throw ApiError.badRequest(`chapters[${i}].exercises must be an array`);
      if (Array.isArray(ex) && ex.length > 100) throw ApiError.badRequest(`chapters[${i}]: at most 100 exercises per import`);
      return {
        number: numOrNull(c?.number),
        name,
        description: clean(c?.description, 2000),
        sourceRef: clean(c?.sourceRef, 300),
        exercises: (Array.isArray(ex) ? ex : []).map((e: any, j: number) => {
          const ename = clean(e?.name, 300);
          if (!ename) throw ApiError.badRequest(`chapters[${i}].exercises[${j}].name is required`);
          return { number: numOrNull(e?.number), name: ename, sourceRef: clean(e?.sourceRef, 300) };
        }),
      };
    });

    const result = await withTx(async (tx) => {
      const { q1: tq1 } = makeTxHelpers(tx);
      let chaptersCreated = 0;
      let chaptersUpdated = 0;
      let exercisesCreated = 0;
      let exercisesUpdated = 0;

      for (const c of rows) {
        const existing = c.number != null
          ? await tq1<any>(`SELECT id FROM "Chapter" WHERE "bookId" = $1 AND number = $2`, [bookId, c.number])
          : await tq1<any>(`SELECT id FROM "Chapter" WHERE "bookId" = $1 AND lower(name) = lower($2)`, [bookId, c.name]);
        let chapterId: number;
        if (existing) {
          chapterId = existing.id;
          await tx.query(
            `UPDATE "Chapter" SET name = $1, description = COALESCE($2, description), "sourceRef" = COALESCE($3, "sourceRef"), "updatedAt" = CURRENT_TIMESTAMP WHERE id = $4`,
            [c.name, c.description, c.sourceRef, chapterId]
          );
          chaptersUpdated++;
        } else {
          // brand-new chapters need a number for the (bookId, number) key —
          // allocate max+1 (still "no invented content": one row per payload row)
          let number = c.number;
          if (number == null) {
            const m = await tq1<{ m: number }>(`SELECT COALESCE(max(number), 0)::int AS m FROM "Chapter" WHERE "bookId" = $1`, [bookId]);
            number = (m?.m ?? 0) + 1;
          }
          const ins = await tx.query<{ id: number }>(
            `INSERT INTO "Chapter" ("name","number","subjectId","bookId","description","status","verified","sourceRef","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,'active',false,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
            [c.name, number, subjectId, bookId, c.description, c.sourceRef]
          );
          chapterId = ins.rows[0].id;
          chaptersCreated++;
        }

        for (const e of c.exercises ?? []) {
          const eExisting = e.number != null
            ? await tq1<any>(`SELECT id FROM "Exercise" WHERE "chapterId" = $1 AND number = $2`, [chapterId, e.number])
            : await tq1<any>(`SELECT id FROM "Exercise" WHERE "chapterId" = $1 AND lower(name) = lower($2)`, [chapterId, e.name]);
          if (eExisting) {
            await tx.query(
              `UPDATE "Exercise" SET name = $1, "sourceRef" = COALESCE($2, "sourceRef"), "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3`,
              [e.name, e.sourceRef, eExisting.id]
            );
            exercisesUpdated++;
          } else {
            let number = e.number;
            if (number == null) {
              const m = await tq1<{ m: number }>(`SELECT COALESCE(max(number), 0)::int AS m FROM "Exercise" WHERE "chapterId" = $1`, [chapterId]);
              number = (m?.m ?? 0) + 1;
            }
            await tx.query(
              `INSERT INTO "Exercise" ("name","number","chapterId","status","sourceRef","createdAt","updatedAt")
               VALUES ($1,$2,$3,'active',$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
              [e.name, number, chapterId, e.sourceRef]
            );
            exercisesCreated++;
          }
        }
      }
      return { chaptersCreated, chaptersUpdated, exercisesCreated, exercisesUpdated };
    });

    await record(user, {
      action: 'syllabus.import', entity: 'Book', entityId: bookId,
      meta: { subjectId, ...result },
    });
    return { bookId, bookTitle: book.title, subjectId, ...result };
  }
}

export const syllabusAdminService = new SyllabusAdminService();
