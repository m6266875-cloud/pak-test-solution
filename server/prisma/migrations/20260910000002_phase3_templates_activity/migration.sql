-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3 — Paper templates + richer activity log (additive)
--   PaperTemplate: reusable header/footer/branding configurations.
--     schoolId NULL = system/global template (super admin manages);
--     schoolId set = school-level template.
--   ActivityLog (Phase-1 table, extended): append-only audit trail gaining
--     role/schoolId/entity/entityId so logs can be filtered by school and by
--     entity while the Phase-1 columns (details, paperId, ip) stay intact.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "PaperTemplate" (
  "id"         SERIAL PRIMARY KEY,
  "schoolId"   INTEGER REFERENCES "School"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "kind"       TEXT NOT NULL DEFAULT 'school_exam',
  "config"     JSONB NOT NULL DEFAULT '{}'::jsonb,
  "isDefault"  BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"   BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "schoolId" INTEGER REFERENCES "School"("id") ON DELETE SET NULL;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx"    ON "ActivityLog" ("action");
CREATE INDEX IF NOT EXISTS "ActivityLog_schoolId_idx"  ON "ActivityLog" ("schoolId");
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx"    ON "ActivityLog" ("userId");
CREATE INDEX IF NOT EXISTS "PaperTemplate_schoolId_idx" ON "PaperTemplate" ("schoolId");
CREATE INDEX IF NOT EXISTS "ActivityLog_entity_idx"    ON "ActivityLog" ("entity", "entityId");
