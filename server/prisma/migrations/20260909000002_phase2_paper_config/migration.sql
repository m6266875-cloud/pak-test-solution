-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2 — Paper generator v2: full configuration storage
--
-- PaperSetting keeps its legacy count columns (v1 PDF/UI compatibility) and
-- gains the complete wizard configuration JSON so a paper can be
-- regenerated / edited later from stored config + question ids (never from
-- rendered HTML).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "PaperSetting" ADD COLUMN IF NOT EXISTS "distribution" JSONB;        -- [{type,count,marks,difficulty?}]
ALTER TABLE "PaperSetting" ADD COLUMN IF NOT EXISTS "generationConfig" JSONB;    -- full wizard snapshot incl. topics/exercises/paperCount/language/…
ALTER TABLE "PaperSetting" ADD COLUMN IF NOT EXISTS "paperCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PaperSetting" ADD COLUMN IF NOT EXISTS "paperIndex" INTEGER NOT NULL DEFAULT 1; -- 1-based when part of a multi-paper batch
