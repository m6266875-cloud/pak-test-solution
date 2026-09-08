-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1 — REAL COURSE / SYLLABUS / BOOK CATALOG
--
-- Adds the course-catalog platform on top of the existing schema without
-- removing or renaming anything:
--   • Course, AcademicSession, CourseSession, CourseClass
--   • Course-scoped + statused Subjects, enriched Books (ISBN, session,
--     authorized soft-copy lifecycle), statused Chapters/Exercises/Topics,
--     question provenance columns
--   • Partial unique indexes so chapter numbering may differ per book/edition
--     while legacy subject-scoped chapters keep their old guarantees
-- ═══════════════════════════════════════════════════════════════════════════

-- ── New enums ───────────────────────────────────────────────────────────────
CREATE TYPE "CourseType" AS ENUM ('board', 'publisher', 'program');
CREATE TYPE "CourseStatus" AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE "ContentStatus" AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE "SessionStatus" AS ENUM ('upcoming', 'current', 'previous', 'archived');
CREATE TYPE "BookFileStatus" AS ENUM ('uploaded', 'processing', 'extracting', 'structuring', 'review', 'approved', 'rejected', 'failed');

-- ── Course (supported publisher / board / program platform) ─────────────────
CREATE TABLE "Course" (
  "id" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortName" TEXT,
  "type" "CourseType" NOT NULL DEFAULT 'board',
  "region" TEXT,
  "description" TEXT,
  "website" TEXT,
  "status" "CourseStatus" NOT NULL DEFAULT 'active',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "logoUrl" TEXT,
  "logoStorageKey" TEXT,
  "logoEnabled" BOOLEAN NOT NULL DEFAULT true,
  "logoAltText" TEXT,
  "logoMeta" JSONB,
  "sourceRef" TEXT,
  "dataNotes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");
CREATE INDEX "Course_status_idx" ON "Course"("status");
CREATE INDEX "Course_type_idx" ON "Course"("type");
CREATE INDEX "Course_displayOrder_idx" ON "Course"("displayOrder");
CREATE SEQUENCE "Course_id_seq" OWNED BY "Course"."id";
ALTER TABLE "Course" ALTER COLUMN "id" SET DEFAULT nextval('"Course_id_seq"');

-- ── AcademicSession (version-aware academic year) ───────────────────────────
CREATE TABLE "AcademicSession" (
  "id" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startYear" INTEGER NOT NULL,
  "endYear" INTEGER NOT NULL,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademicSession_code_key" ON "AcademicSession"("code");
CREATE INDEX "AcademicSession_startYear_idx" ON "AcademicSession"("startYear");
CREATE INDEX "AcademicSession_displayOrder_idx" ON "AcademicSession"("displayOrder");
CREATE SEQUENCE "AcademicSession_id_seq" OWNED BY "AcademicSession"."id";
ALTER TABLE "AcademicSession" ALTER COLUMN "id" SET DEFAULT nextval('"AcademicSession_id_seq"');

-- ── CourseSession (per-course session status; one CURRENT per course) ───────
CREATE TABLE "CourseSession" (
  "id" INTEGER NOT NULL,
  "courseId" INTEGER NOT NULL,
  "sessionId" INTEGER NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'previous',
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseSession_courseId_sessionId_key" ON "CourseSession"("courseId", "sessionId");
CREATE INDEX "CourseSession_status_idx" ON "CourseSession"("status");
CREATE INDEX "CourseSession_sessionId_idx" ON "CourseSession"("sessionId");
CREATE SEQUENCE "CourseSession_id_seq" OWNED BY "CourseSession"."id";
ALTER TABLE "CourseSession" ALTER COLUMN "id" SET DEFAULT nextval('"CourseSession_id_seq"');
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CourseClass (valid classes/programs per course) ─────────────────────────
CREATE TABLE "CourseClass" (
  "id" INTEGER NOT NULL,
  "courseId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseClass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseClass_courseId_classId_key" ON "CourseClass"("courseId", "classId");
CREATE INDEX "CourseClass_courseId_isActive_idx" ON "CourseClass"("courseId", "isActive");
CREATE SEQUENCE "CourseClass_id_seq" OWNED BY "CourseClass"."id";
ALTER TABLE "CourseClass" ALTER COLUMN "id" SET DEFAULT nextval('"CourseClass_id_seq"');
ALTER TABLE "CourseClass" ADD CONSTRAINT "CourseClass_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseClass" ADD CONSTRAINT "CourseClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Subject enrichment ──────────────────────────────────────────────────────
ALTER TABLE "Subject" ADD COLUMN "courseId" INTEGER;
ALTER TABLE "Subject" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "Subject" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subject" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "Subject" ADD COLUMN "dataNotes" TEXT;

-- Course-scoped uniqueness (courseId set): one subject per (course,class,medium,name)
CREATE UNIQUE INDEX "Subject_courseId_classId_name_medium_key" ON "Subject"("courseId", "classId", "name", "medium") WHERE "courseId" IS NOT NULL;
-- Legacy rows (courseId NULL) keep the historical guarantee
CREATE UNIQUE INDEX "Subject_name_classId_medium_legacy_key" ON "Subject"("name", "classId", "medium") WHERE "courseId" IS NULL;
DROP INDEX IF EXISTS "Subject_name_classId_medium_key";

ALTER TABLE "Subject" ADD CONSTRAINT "Subject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Subject_courseId_classId_idx" ON "Subject"("courseId", "classId");
CREATE INDEX "Subject_courseId_classId_status_idx" ON "Subject"("courseId", "classId", "status");
CREATE INDEX "Subject_status_idx" ON "Subject"("status");

-- ── Book enrichment ─────────────────────────────────────────────────────────
ALTER TABLE "Book" ADD COLUMN "courseId" INTEGER;
ALTER TABLE "Book" ADD COLUMN "sessionId" INTEGER;
ALTER TABLE "Book" ADD COLUMN "bookCode" TEXT;
ALTER TABLE "Book" ADD COLUMN "isbn" TEXT;
ALTER TABLE "Book" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Book" ADD COLUMN "fileMime" TEXT;
ALTER TABLE "Book" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Book" ADD COLUMN "fileStatus" "BookFileStatus";
ALTER TABLE "Book" ADD COLUMN "fileUploadedById" INTEGER;
ALTER TABLE "Book" ADD COLUMN "fileUploadedAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN "fileProcessedAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN "fileReviewedById" INTEGER;
ALTER TABLE "Book" ADD COLUMN "fileReviewedAt" TIMESTAMP(3);
ALTER TABLE "Book" ADD COLUMN "processingLog" JSONB;
ALTER TABLE "Book" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "Book" ADD COLUMN "dataNotes" TEXT;
ALTER TABLE "Book" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Book" ADD COLUMN "metadata" JSONB;

ALTER TABLE "Book" ADD CONSTRAINT "Book_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_fileUploadedById_fkey" FOREIGN KEY ("fileUploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_fileReviewedById_fkey" FOREIGN KEY ("fileReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Book_courseId_idx" ON "Book"("courseId");
CREATE INDEX "Book_sessionId_idx" ON "Book"("sessionId");
CREATE INDEX "Book_courseId_sessionId_status_idx" ON "Book"("courseId", "sessionId", "status");
CREATE INDEX "Book_classId_subjectId_idx" ON "Book"("classId", "subjectId");
CREATE INDEX "Book_isbn_idx" ON "Book"("isbn");
CREATE INDEX "Book_fileStatus_idx" ON "Book"("fileStatus");

-- ── Chapter enrichment + per-edition numbering ──────────────────────────────
ALTER TABLE "Chapter" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "Chapter" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "Chapter" ADD COLUMN "dataNotes" TEXT;

-- Legacy chapters (no book link): keep (subjectId, number) unique
CREATE UNIQUE INDEX "Chapter_subjectId_number_legacy_key" ON "Chapter"("subjectId", "number") WHERE "bookId" IS NULL;
-- Book chapters (one edition/one set): (bookId, number) unique, allowing the
-- same subject to hold several book editions with independent numbering
CREATE UNIQUE INDEX "Chapter_bookId_number_key" ON "Chapter"("bookId", "number") WHERE "bookId" IS NOT NULL;
DROP INDEX IF EXISTS "Chapter_number_subjectId_key";

CREATE INDEX "Chapter_subjectId_number_idx" ON "Chapter"("subjectId", "number");
CREATE INDEX "Chapter_bookId_number_idx" ON "Chapter"("bookId", "number");
CREATE INDEX "Chapter_status_idx" ON "Chapter"("status");

-- ── Exercise / Topic enrichment ─────────────────────────────────────────────
ALTER TABLE "Exercise" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "Exercise" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Exercise_chapterId_status_idx" ON "Exercise"("chapterId", "status");

ALTER TABLE "Topic" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "Topic" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Topic" ADD COLUMN "sourceRef" TEXT;
CREATE INDEX "Topic_chapterId_status_idx" ON "Topic"("chapterId", "status");

-- ── Question provenance ─────────────────────────────────────────────────────
ALTER TABLE "Question" ADD COLUMN "bookId" INTEGER;
ALTER TABLE "Question" ADD COLUMN "pageRef" TEXT;
ALTER TABLE "Question" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "Question" ADD CONSTRAINT "Question_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Question_bookId_idx" ON "Question"("bookId");
