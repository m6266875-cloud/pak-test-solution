-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3 — School management & branding foundations (additive)
--   • School statuses gain pending + archived (spec: Active / Pending /
--     Suspended / Archived)
--   • School.branding JSONB holds watermark + header/footer + template
--     defaults (opacity/size/position, enabled flags, …)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TYPE "SchoolStatus" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "SchoolStatus" ADD VALUE IF NOT EXISTS 'archived';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "branding" JSONB NOT NULL DEFAULT '{}'::jsonb;
