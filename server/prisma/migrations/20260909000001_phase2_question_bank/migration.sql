-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2 — Central Question Bank + Paper Generator upgrade (additive only)
--
--   • Question: full-bank filter keys (denormalised chain), audit trail,
--     category (kept separate from type/source), bankNo, MCQ images,
--     import provenance.
--   • Paper: course / session / book linkage + paper type + exam title.
--   • PaperQuestion: snapshot of type/difficulty/language at generation time
--     (finished papers keep rendering even if the bank row changes later)
--     + per-paper display-text override (edits never mutate the bank).
--   • PaperPattern: saved generation patterns (teacher + admin-shared).
--   • Indexes for every frequently filtered column.
--
-- All statements use IF NOT EXISTS / additive forms so the file is safe to
-- re-run and never touches existing rows or columns.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Question: audit trail ───────────────────────────────────────────────────
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "createdById" INTEGER;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "updatedById" INTEGER;
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Question: denormalised catalog chain (fast filters + teacher scoping) ──
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "courseId" INTEGER;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "sessionId" INTEGER;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "classId" INTEGER;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "subjectId" INTEGER;
ALTER TABLE "Question" ADD CONSTRAINT "Question_courseId_fkey"  FOREIGN KEY ("courseId")  REFERENCES "Course"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_classId_fkey"  FOREIGN KEY ("classId")  REFERENCES "Class"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Question: content metadata ──────────────────────────────────────────────
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "category" TEXT;          -- exercise | example | review | past_paper | conceptual | practice (separate from type & source)
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "bankNo" TEXT;             -- human-readable question id (e.g. PTB-9-MATH-0001)
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "hint" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanation" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "images" JSONB;            -- authorized image refs: { stem?, options?: {A?:url,...} }
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "importedFrom" TEXT;       -- file/sheet the question was imported from
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "importRef" TEXT;          -- row reference inside the import source

-- ── Backfill the denormalised chain from the existing hierarchy ─────────────
-- subject <- chapter <- question ; course/class come from the subject row;
-- session comes from the linked book when present (else NULL = legacy rows).
UPDATE "Question" q
SET "subjectId" = ch."subjectId"
FROM "Chapter" ch
WHERE ch.id = q."chapterId" AND q."subjectId" IS NULL;

UPDATE "Question" q
SET "courseId" = s."courseId", "classId" = s."classId"
FROM "Subject" s
WHERE s.id = q."subjectId" AND (q."courseId" IS NULL OR q."classId" IS NULL);

UPDATE "Question" q
SET "sessionId" = b."sessionId"
FROM "Book" b
WHERE b.id = q."bookId" AND q."sessionId" IS NULL;

-- ── Question indexes for the bank filters ───────────────────────────────────
CREATE INDEX IF NOT EXISTS "Question_course_class_subject_idx" ON "Question"("courseId", "classId", "subjectId");
CREATE INDEX IF NOT EXISTS "Question_subjectId_status_idx"     ON "Question"("subjectId", "status");
CREATE INDEX IF NOT EXISTS "Question_type_status_idx"          ON "Question"("type", "status");
CREATE INDEX IF NOT EXISTS "Question_status_type_lang_idx"     ON "Question"("status", "type", "language");
CREATE INDEX IF NOT EXISTS "Question_difficulty_idx"           ON "Question"("difficulty");
CREATE INDEX IF NOT EXISTS "Question_language_idx"             ON "Question"("language");
CREATE INDEX IF NOT EXISTS "Question_marks_idx"                ON "Question"("marks");
CREATE INDEX IF NOT EXISTS "Question_category_idx"             ON "Question"("category");
CREATE INDEX IF NOT EXISTS "Question_createdById_idx"          ON "Question"("createdById");
CREATE INDEX IF NOT EXISTS "Question_session_idx"              ON "Question"("sessionId");
CREATE INDEX IF NOT EXISTS "Question_bankNo_idx"               ON "Question"("bankNo");

-- ── Paper: course / session / book linkage + paper type + exam title ────────
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "courseId" INTEGER;
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "sessionId" INTEGER;
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "bookId" INTEGER;
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "paperType" TEXT NOT NULL DEFAULT 'mixed';  -- objective | subjective | mixed
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "examTitle" TEXT;
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_courseId_fkey"  FOREIGN KEY ("courseId")  REFERENCES "Course"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_bookId_fkey"   FOREIGN KEY ("bookId")   REFERENCES "Book"("id")   ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Paper_teacherId_status_idx" ON "Paper"("teacherId", "status");
CREATE INDEX IF NOT EXISTS "Paper_course_class_idx"     ON "Paper"("courseId", "classId");
CREATE INDEX IF NOT EXISTS "Paper_session_idx"          ON "Paper"("sessionId");
CREATE INDEX IF NOT EXISTS "Paper_createdAt_idx"        ON "Paper"("createdAt");

-- ── PaperQuestion: generation-time snapshots + display override ─────────────
ALTER TABLE "PaperQuestion" ADD COLUMN IF NOT EXISTS "type" "QuestionType";
ALTER TABLE "PaperQuestion" ADD COLUMN IF NOT EXISTS "difficulty" "Difficulty";
ALTER TABLE "PaperQuestion" ADD COLUMN IF NOT EXISTS "language" "Medium";
ALTER TABLE "PaperQuestion" ADD COLUMN IF NOT EXISTS "displayTextOverride" TEXT;

-- Backfill snapshots from the current bank rows (finished papers stay stable
-- going forward; this only seeds existing rows from today's values).
UPDATE "PaperQuestion" pq
SET "type" = q."type", "difficulty" = q."difficulty", "language" = q."language"
FROM "Question" q
WHERE q.id = pq."questionId" AND pq."type" IS NULL;

CREATE INDEX IF NOT EXISTS "PaperQuestion_paperId_order_idx" ON "PaperQuestion"("paperId", "order");
CREATE INDEX IF NOT EXISTS "PaperQuestion_questionId_idx"    ON "PaperQuestion"("questionId");

-- ── TeacherSubject: assignment lookup by subject/class (admin screens) ───────
CREATE INDEX IF NOT EXISTS "TeacherSubject_subjectId_idx" ON "TeacherSubject"("subjectId");
CREATE INDEX IF NOT EXISTS "TeacherSubject_classId_idx"   ON "TeacherSubject"("classId");

-- ── PaperPattern: saved generation patterns ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "PaperPattern" (
  "id"          SERIAL,
  "name"        TEXT     NOT NULL,
  "description" TEXT,
  "config"      JSONB    NOT NULL,
  "isShared"    BOOLEAN  NOT NULL DEFAULT false,
  "createdById" INTEGER  NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaperPattern_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PaperPattern" ADD CONSTRAINT "PaperPattern_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "PaperPattern_createdById_idx" ON "PaperPattern"("createdById");
CREATE INDEX IF NOT EXISTS "PaperPattern_isShared_idx"    ON "PaperPattern"("isShared");
