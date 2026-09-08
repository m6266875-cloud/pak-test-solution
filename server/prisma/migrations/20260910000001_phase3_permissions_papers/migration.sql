-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3 — Granular admin permissions + school scoping of papers
--   • User.permissions: string[] of module permissions for school_admin
--     accounts (super_admin implies all; teachers have none)
--   • Paper.schoolId: snapshot of the generating teacher's school so papers
--     can be filtered/isolated by school without joins on every query
--   • PaperFormatting.branding: per-paper branding snapshot (template id,
--     watermark, logo mode, footer…) merged from school/template defaults
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "schoolId" INTEGER;
ALTER TABLE "PaperFormatting" ADD COLUMN IF NOT EXISTS "branding" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- backfill paper.schoolId from the creating teacher's school
UPDATE "Paper" p SET "schoolId" = u."schoolId"
FROM "User" u WHERE u.id = p."teacherId" AND p."schoolId" IS NULL AND u."schoolId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Paper_schoolId_idx" ON "Paper" ("schoolId");
CREATE INDEX IF NOT EXISTS "Paper_teacherId_createdAt_idx" ON "Paper" ("teacherId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Question_subjectId_status_idx" ON "Question" ("subjectId", "status");
