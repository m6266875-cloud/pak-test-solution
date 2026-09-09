-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 4 — 5-step wizard + syllabus cleanup support.
--
-- Purely additive. The schema sync (User.permissions / Paper.schoolId /
-- PaperFormatting.branding) was created by the Phase-3 migration
-- 20260910000001; here we only add the index the Phase-4 candidate engine
-- relies on for paginated, type-filtered pool queries, and re-assert the
-- Phase-3 columns with IF NOT EXISTS so a fresh database created from
-- schema.prisma alone also boots the raw-SQL services.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "schoolId" INTEGER;
ALTER TABLE "PaperFormatting" ADD COLUMN IF NOT EXISTS "branding" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Phase-4 candidate engine: scoped pool fetches filter by
-- (chapterId set, type, status, isActive) — cover it with one index.
CREATE INDEX IF NOT EXISTS "Question_chapter_type_status_active_idx"
  ON "Question" ("chapterId", "type", "status", "isActive");

-- Step-2 chapter checklist counts + book-scoped chapter lists.
CREATE INDEX IF NOT EXISTS "Chapter_book_status_idx"
  ON "Chapter" ("bookId", "status");

-- Cleanup tooling groups books by (course, class, subject, language, status).
CREATE INDEX IF NOT EXISTS "Book_syllabus_group_idx"
  ON "Book" ("courseId", "classId", "subjectId", "language", "status");
