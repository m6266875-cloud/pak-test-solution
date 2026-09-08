-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2 — Question Bank: extended value domains (additive enum values only)
--
-- PG18 notes:
--   • Each ALTER TYPE ... ADD VALUE runs as its own autocommit statement
--     (the migration runner executes statements one at a time, so new enum
--     values are never used inside the same transaction that adds them).
--   • ADD VALUE IF NOT EXISTS keeps the file idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- Question types: objective + subjective families
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'true_false';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'fill_blank';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'numerical';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'conceptual';

-- Question workflow statuses
ALTER TYPE "QuestionStatus" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "QuestionStatus" ADD VALUE IF NOT EXISTS 'archived';
