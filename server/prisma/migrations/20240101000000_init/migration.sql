-- ═══════════════════════════════════════════════════════════════════════════
-- Baseline schema — original Pak Test Solution data model (pre Phase 1).
-- Phase-1 additions live in ../20260908000000_phase1_course_catalog/migration.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Enums
CREATE TYPE "Role" AS ENUM ('super_admin', 'school_admin', 'teacher');
CREATE TYPE "Medium" AS ENUM ('english', 'urdu', 'bilingual');
CREATE TYPE "QuestionType" AS ENUM ('mcq', 'short', 'essay');
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE "PaperStatus" AS ENUM ('draft', 'final', 'archived');
CREATE TYPE "LayoutType" AS ENUM ('single_page', 'double_page', 'half_page');
CREATE TYPE "SchoolStatus" AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE "BookStatus" AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE "QuestionSource" AS ENUM ('manual', 'imported', 'past_paper', 'exercise');
CREATE TYPE "QuestionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- ── Class ───────────────────────────────────────────────────────────────────
CREATE TABLE "Class" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Class_grade_key" ON "Class"("grade");
CREATE SEQUENCE "Class_id_seq" OWNED BY "Class"."id";
ALTER TABLE "Class" ALTER COLUMN "id" SET DEFAULT nextval('"Class_id_seq"');

-- ── School ──────────────────────────────────────────────────────────────────
CREATE TABLE "School" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "logoUrl" TEXT,
  "principal" TEXT,
  "status" "SchoolStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");
CREATE INDEX "School_status_idx" ON "School"("status");
CREATE INDEX "School_city_idx" ON "School"("city");
CREATE SEQUENCE "School_id_seq" OWNED BY "School"."id";
ALTER TABLE "School" ALTER COLUMN "id" SET DEFAULT nextval('"School_id_seq"');

-- ── Board (exam-board registry) ─────────────────────────────────────────────
CREATE TABLE "Board" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "region" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Board_code_key" ON "Board"("code");
CREATE SEQUENCE "Board_id_seq" OWNED BY "Board"."id";
ALTER TABLE "Board" ALTER COLUMN "id" SET DEFAULT nextval('"Board_id_seq"');

-- ── User ────────────────────────────────────────────────────────────────────
CREATE TABLE "User" (
  "id" INTEGER NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'teacher',
  "schoolName" TEXT,
  "schoolId" INTEGER,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE SEQUENCE "User_id_seq" OWNED BY "User"."id";
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT nextval('"User_id_seq"');
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Subject ─────────────────────────────────────────────────────────────────
CREATE TABLE "Subject" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "medium" "Medium" NOT NULL DEFAULT 'english',
  "classId" INTEGER NOT NULL,
  "boardId" INTEGER,
  "schoolId" INTEGER,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subject_name_classId_medium_key" ON "Subject"("name", "classId", "medium");
CREATE SEQUENCE "Subject_id_seq" OWNED BY "Subject"."id";
ALTER TABLE "Subject" ALTER COLUMN "id" SET DEFAULT nextval('"Subject_id_seq"');
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Book ────────────────────────────────────────────────────────────────────
CREATE TABLE "Book" (
  "id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "publisher" TEXT,
  "edition" TEXT,
  "year" INTEGER,
  "language" "Medium" NOT NULL DEFAULT 'english',
  "fileUrl" TEXT,
  "status" "BookStatus" NOT NULL DEFAULT 'active',
  "boardId" INTEGER,
  "classId" INTEGER,
  "subjectId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);
CREATE SEQUENCE "Book_id_seq" OWNED BY "Book"."id";
ALTER TABLE "Book" ALTER COLUMN "id" SET DEFAULT nextval('"Book_id_seq"');
ALTER TABLE "Book" ADD CONSTRAINT "Book_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Book_boardId_idx" ON "Book"("boardId");
CREATE INDEX "Book_classId_idx" ON "Book"("classId");
CREATE INDEX "Book_subjectId_idx" ON "Book"("subjectId");
CREATE INDEX "Book_status_idx" ON "Book"("status");

-- ── Chapter ─────────────────────────────────────────────────────────────────
CREATE TABLE "Chapter" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "bookId" INTEGER,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Chapter_number_subjectId_key" ON "Chapter"("number", "subjectId");
CREATE SEQUENCE "Chapter_id_seq" OWNED BY "Chapter"."id";
ALTER TABLE "Chapter" ALTER COLUMN "id" SET DEFAULT nextval('"Chapter_id_seq"');
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Exercise ────────────────────────────────────────────────────────────────
CREATE TABLE "Exercise" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "number" INTEGER NOT NULL DEFAULT 1,
  "chapterId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Exercise_number_chapterId_key" ON "Exercise"("number", "chapterId");
CREATE SEQUENCE "Exercise_id_seq" OWNED BY "Exercise"."id";
ALTER TABLE "Exercise" ALTER COLUMN "id" SET DEFAULT nextval('"Exercise_id_seq"');
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Topic ───────────────────────────────────────────────────────────────────
CREATE TABLE "Topic" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "chapterId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);
CREATE SEQUENCE "Topic_id_seq" OWNED BY "Topic"."id";
ALTER TABLE "Topic" ALTER COLUMN "id" SET DEFAULT nextval('"Topic_id_seq"');
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Topic_chapterId_idx" ON "Topic"("chapterId");

-- ── Question ────────────────────────────────────────────────────────────────
CREATE TABLE "Question" (
  "id" INTEGER NOT NULL,
  "chapterId" INTEGER NOT NULL,
  "exerciseId" INTEGER,
  "topicId" INTEGER,
  "type" "QuestionType" NOT NULL DEFAULT 'mcq',
  "text" TEXT NOT NULL,
  "marks" INTEGER NOT NULL DEFAULT 1,
  "options" JSONB,
  "answer" TEXT,
  "difficulty" "Difficulty" NOT NULL DEFAULT 'easy',
  "language" "Medium" NOT NULL DEFAULT 'english',
  "source" "QuestionSource" NOT NULL DEFAULT 'manual',
  "status" "QuestionStatus" NOT NULL DEFAULT 'approved',
  "tags" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
CREATE SEQUENCE "Question_id_seq" OWNED BY "Question"."id";
ALTER TABLE "Question" ALTER COLUMN "id" SET DEFAULT nextval('"Question_id_seq"');
ALTER TABLE "Question" ADD CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Question_status_idx" ON "Question"("status");
CREATE INDEX "Question_exerciseId_idx" ON "Question"("exerciseId");
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- ── AdminPermission ─────────────────────────────────────────────────────────
CREATE TABLE "AdminPermission" (
  "id" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "permission" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminPermission_userId_permission_key" ON "AdminPermission"("userId", "permission");
CREATE SEQUENCE "AdminPermission_id_seq" OWNED BY "AdminPermission"."id";
ALTER TABLE "AdminPermission" ALTER COLUMN "id" SET DEFAULT nextval('"AdminPermission_id_seq"');
ALTER TABLE "AdminPermission" ADD CONSTRAINT "AdminPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RefreshToken ────────────────────────────────────────────────────────────
CREATE TABLE "RefreshToken" (
  "id" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE SEQUENCE "RefreshToken_id_seq" OWNED BY "RefreshToken"."id";
ALTER TABLE "RefreshToken" ALTER COLUMN "id" SET DEFAULT nextval('"RefreshToken_id_seq"');
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TeacherSubject ──────────────────────────────────────────────────────────
CREATE TABLE "TeacherSubject" (
  "id" INTEGER NOT NULL,
  "teacherId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherSubject_teacherId_subjectId_classId_key" ON "TeacherSubject"("teacherId", "subjectId", "classId");
CREATE SEQUENCE "TeacherSubject_id_seq" OWNED BY "TeacherSubject"."id";
ALTER TABLE "TeacherSubject" ALTER COLUMN "id" SET DEFAULT nextval('"TeacherSubject_id_seq"');
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Paper ───────────────────────────────────────────────────────────────────
CREATE TABLE "Paper" (
  "id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "teacherId" INTEGER NOT NULL,
  "createdById" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "medium" "Medium" NOT NULL DEFAULT 'english',
  "totalMarks" INTEGER NOT NULL,
  "timeLimit" INTEGER,
  "status" "PaperStatus" NOT NULL DEFAULT 'draft',
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);
CREATE SEQUENCE "Paper_id_seq" OWNED BY "Paper"."id";
ALTER TABLE "Paper" ALTER COLUMN "id" SET DEFAULT nextval('"Paper_id_seq"');
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── PaperSubject ────────────────────────────────────────────────────────────
CREATE TABLE "PaperSubject" (
  "id" INTEGER NOT NULL,
  "paperId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  CONSTRAINT "PaperSubject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperSubject_paperId_subjectId_key" ON "PaperSubject"("paperId", "subjectId");
CREATE SEQUENCE "PaperSubject_id_seq" OWNED BY "PaperSubject"."id";
ALTER TABLE "PaperSubject" ALTER COLUMN "id" SET DEFAULT nextval('"PaperSubject_id_seq"');
ALTER TABLE "PaperSubject" ADD CONSTRAINT "PaperSubject_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaperSubject" ADD CONSTRAINT "PaperSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── PaperChapter ────────────────────────────────────────────────────────────
CREATE TABLE "PaperChapter" (
  "id" INTEGER NOT NULL,
  "paperId" INTEGER NOT NULL,
  "chapterId" INTEGER NOT NULL,
  CONSTRAINT "PaperChapter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperChapter_paperId_chapterId_key" ON "PaperChapter"("paperId", "chapterId");
CREATE SEQUENCE "PaperChapter_id_seq" OWNED BY "PaperChapter"."id";
ALTER TABLE "PaperChapter" ALTER COLUMN "id" SET DEFAULT nextval('"PaperChapter_id_seq"');
ALTER TABLE "PaperChapter" ADD CONSTRAINT "PaperChapter_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaperChapter" ADD CONSTRAINT "PaperChapter_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── PaperQuestion ───────────────────────────────────────────────────────────
CREATE TABLE "PaperQuestion" (
  "id" INTEGER NOT NULL,
  "paperId" INTEGER NOT NULL,
  "questionId" INTEGER NOT NULL,
  "marks" INTEGER NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isSelected" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaperQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperQuestion_paperId_questionId_key" ON "PaperQuestion"("paperId", "questionId");
CREATE SEQUENCE "PaperQuestion_id_seq" OWNED BY "PaperQuestion"."id";
ALTER TABLE "PaperQuestion" ALTER COLUMN "id" SET DEFAULT nextval('"PaperQuestion_id_seq"');
ALTER TABLE "PaperQuestion" ADD CONSTRAINT "PaperQuestion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaperQuestion" ADD CONSTRAINT "PaperQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── PaperSetting ────────────────────────────────────────────────────────────
CREATE TABLE "PaperSetting" (
  "id" INTEGER NOT NULL,
  "paperId" INTEGER NOT NULL,
  "questionCount" INTEGER NOT NULL DEFAULT 20,
  "mcqCount" INTEGER NOT NULL DEFAULT 10,
  "mcqMarks" INTEGER NOT NULL DEFAULT 1,
  "shortCount" INTEGER NOT NULL DEFAULT 5,
  "shortMarks" INTEGER NOT NULL DEFAULT 3,
  "essayCount" INTEGER NOT NULL DEFAULT 3,
  "essayMarks" INTEGER NOT NULL DEFAULT 10,
  "randomize" BOOLEAN NOT NULL DEFAULT true,
  "ignoreMarksEnabled" BOOLEAN NOT NULL DEFAULT false,
  "ignoreMarks" JSONB,
  "blankLines" JSONB,
  "showAnswerKey" BOOLEAN NOT NULL DEFAULT true,
  "showBubbleSheet" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaperSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperSetting_paperId_key" ON "PaperSetting"("paperId");
CREATE SEQUENCE "PaperSetting_id_seq" OWNED BY "PaperSetting"."id";
ALTER TABLE "PaperSetting" ALTER COLUMN "id" SET DEFAULT nextval('"PaperSetting_id_seq"');
ALTER TABLE "PaperSetting" ADD CONSTRAINT "PaperSetting_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PaperFormatting ─────────────────────────────────────────────────────────
CREATE TABLE "PaperFormatting" (
  "id" INTEGER NOT NULL,
  "paperId" INTEGER NOT NULL,
  "fontFamily" TEXT NOT NULL DEFAULT 'Arial',
  "fontSize" INTEGER NOT NULL DEFAULT 12,
  "lineHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
  "bold" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT NOT NULL DEFAULT '#000000',
  "layoutType" "LayoutType" NOT NULL DEFAULT 'single_page',
  "showBorder" BOOLEAN NOT NULL DEFAULT false,
  "borderColor" TEXT NOT NULL DEFAULT '#0000FF',
  "schoolName" TEXT,
  "schoolNameSize" INTEGER NOT NULL DEFAULT 16,
  "schoolNameColor" TEXT NOT NULL DEFAULT '#000000',
  "schoolLogoUrl" TEXT,
  "headerNote" TEXT,
  "footerNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaperFormatting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaperFormatting_paperId_key" ON "PaperFormatting"("paperId");
CREATE SEQUENCE "PaperFormatting_id_seq" OWNED BY "PaperFormatting"."id";
ALTER TABLE "PaperFormatting" ALTER COLUMN "id" SET DEFAULT nextval('"PaperFormatting_id_seq"');
ALTER TABLE "PaperFormatting" ADD CONSTRAINT "PaperFormatting_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PastPaper ───────────────────────────────────────────────────────────────
CREATE TABLE "PastPaper" (
  "id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "board" TEXT NOT NULL DEFAULT 'Punjab',
  "classId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "paperUrl" TEXT NOT NULL,
  "isOfficial" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PastPaper_pkey" PRIMARY KEY ("id")
);
CREATE SEQUENCE "PastPaper_id_seq" OWNED BY "PastPaper"."id";
ALTER TABLE "PastPaper" ALTER COLUMN "id" SET DEFAULT nextval('"PastPaper_id_seq"');

-- ── ActivityLog ─────────────────────────────────────────────────────────────
CREATE TABLE "ActivityLog" (
  "id" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "paperId" INTEGER,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE SEQUENCE "ActivityLog_id_seq" OWNED BY "ActivityLog"."id";
ALTER TABLE "ActivityLog" ALTER COLUMN "id" SET DEFAULT nextval('"ActivityLog_id_seq"');
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
