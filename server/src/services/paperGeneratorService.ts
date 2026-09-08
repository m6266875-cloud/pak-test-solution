import { PrismaClient, QuestionType, Medium, PaperStatus } from '@prisma/client';
import { ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface QuestionTypeConfig {
  count: number;
  marks: number;
}

export interface PaperGenerationParams {
  title?: string;
  classId: number;
  subjectIds: number[];
  chapterIds: number[];
  medium: Medium;
  mcq: QuestionTypeConfig;
  short: QuestionTypeConfig;
  essay: QuestionTypeConfig;
  timeLimit?: number;
  randomize?: boolean;
  ignoreMarks?: {
    enabled: boolean;
    mcq?: { attempt: number; total: number };
  };
  blankLines?: {
    enabled: boolean;
    forShort?: boolean;
    forEssay?: boolean;
  };
  showAnswerKey?: boolean;
  showBubbleSheet?: boolean;
  teacherId: number;
  createdById: number;
  schoolName?: string;
}

export interface GeneratedPaper {
  id: number;
  title: string;
  totalMarks: number;
  timeLimit: number;
  questionCounts: { mcq: number; short: number; essay: number };
}

export class PaperGeneratorService {
  async generatePaper(params: PaperGenerationParams): Promise<GeneratedPaper> {
    const {
      title,
      classId,
      subjectIds,
      chapterIds,
      medium,
      mcq,
      short,
      essay,
      timeLimit = 90,
      randomize = true,
      ignoreMarks,
      blankLines,
      showAnswerKey = true,
      showBubbleSheet = false,
      teacherId,
      createdById,
      schoolName,
    } = params;

    // ── Validate class exists ───────────────────────────────────────────────
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) throw ApiError.notFound('Class not found');

    // ── Validate chapters belong to selected subjects ─────────────────────
    const chapters = await prisma.chapter.findMany({
      where: { id: { in: chapterIds }, subjectId: { in: subjectIds } },
      select: { id: true },
    });
    if (chapters.length !== chapterIds.length) {
      throw ApiError.badRequest('Some chapters do not belong to selected subjects');
    }

    // ── Fetch all questions from selected chapters ─────────────────────────
    const allQuestions = await prisma.question.findMany({
      where: {
        chapterId: { in: chapterIds },
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        text: true,
        marks: true,
        options: true,
        answer: true,
        difficulty: true,
        chapterId: true,
      },
    });

    // ── Group by type ──────────────────────────────────────────────────────
    const grouped = {
      mcq:   allQuestions.filter(q => q.type === QuestionType.mcq),
      short: allQuestions.filter(q => q.type === QuestionType.short),
      essay: allQuestions.filter(q => q.type === QuestionType.essay),
    };

    // ── Validate sufficient questions exist ────────────────────────────────
    const errors: string[] = [];
    if (mcq.count > 0 && grouped.mcq.length < mcq.count) {
      errors.push(`Need ${mcq.count} MCQs but only ${grouped.mcq.length} available in selected chapters`);
    }
    if (short.count > 0 && grouped.short.length < short.count) {
      errors.push(`Need ${short.count} short questions but only ${grouped.short.length} available`);
    }
    if (essay.count > 0 && grouped.essay.length < essay.count) {
      errors.push(`Need ${essay.count} essay questions but only ${grouped.essay.length} available`);
    }
    if (errors.length) throw ApiError.badRequest('Insufficient questions in question bank', errors);

    // ── Select questions ───────────────────────────────────────────────────
    const selected = {
      mcq:   this.selectQuestions(grouped.mcq, mcq.count, randomize),
      short: this.selectQuestions(grouped.short, short.count, randomize),
      essay: this.selectQuestions(grouped.essay, essay.count, randomize),
    };

    // ── Calculate total marks ──────────────────────────────────────────────
    const totalMarks =
      selected.mcq.length * mcq.marks +
      selected.short.length * short.marks +
      selected.essay.length * essay.marks;

    const paperTitle = title ||
      `${classRecord.name} — ${medium.charAt(0).toUpperCase() + medium.slice(1)} Paper (${new Date().toLocaleDateString('en-PK')})`;

    // ── Create paper in DB (transaction) ─────────────────────────────────
    const paper = await prisma.$transaction(async (tx) => {
      const p = await tx.paper.create({
        data: {
          title: paperTitle,
          teacherId,
          createdById,
          classId,
          medium,
          totalMarks,
          timeLimit,
          status: PaperStatus.draft,
          paperSubjects: {
            create: subjectIds.map(sid => ({ subjectId: sid })),
          },
          paperChapters: {
            create: chapterIds.map(cid => ({ chapterId: cid })),
          },
          paperSettings: {
            create: {
              questionCount: selected.mcq.length + selected.short.length + selected.essay.length,
              mcqCount: selected.mcq.length,
              mcqMarks: mcq.marks,
              shortCount: selected.short.length,
              shortMarks: short.marks,
              essayCount: selected.essay.length,
              essayMarks: essay.marks,
              randomize,
              ignoreMarksEnabled: ignoreMarks?.enabled || false,
              ignoreMarks: ignoreMarks ?? null,
              blankLines: blankLines ?? null,
              showAnswerKey,
              showBubbleSheet,
            },
          },
          paperFormatting: {
            create: {
              schoolName: schoolName || '',
              fontFamily: 'Arial',
              fontSize: 12,
              lineHeight: 1.5,
              layoutType: 'single_page',
            },
          },
        },
      });

      // Insert questions with order
      let order = 0;
      const questionData = [
        ...selected.mcq.map(q => ({ paperId: p.id, questionId: q.id, marks: mcq.marks, order: order++ })),
        ...selected.short.map(q => ({ paperId: p.id, questionId: q.id, marks: short.marks, order: order++ })),
        ...selected.essay.map(q => ({ paperId: p.id, questionId: q.id, marks: essay.marks, order: order++ })),
      ];

      await tx.paperQuestion.createMany({ data: questionData });

      return p;
    });

    // ── Log activity ───────────────────────────────────────────────────────
    await prisma.activityLog.create({
      data: {
        userId: teacherId,
        action: 'generate_paper',
        paperId: paper.id,
        details: { title: paperTitle, totalMarks, classId },
      },
    });

    logger.info(`Paper ${paper.id} generated by user ${teacherId}`);

    return {
      id: paper.id,
      title: paperTitle,
      totalMarks,
      timeLimit,
      questionCounts: {
        mcq: selected.mcq.length,
        short: selected.short.length,
        essay: selected.essay.length,
      },
    };
  }

  async getPaperById(paperId: number, userId: number) {
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        class: { select: { id: true, name: true, grade: true } },
        paperSubjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
        paperChapters: { include: { chapter: { select: { id: true, name: true, number: true } } } },
        paperQuestions: {
          where: { isSelected: true },
          orderBy: { order: 'asc' },
          include: {
            question: {
              select: {
                id: true, type: true, text: true, marks: true,
                options: true, answer: true, difficulty: true,
              },
            },
          },
        },
        paperSettings: true,
        paperFormatting: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
    });

    if (!paper) throw ApiError.notFound('Paper not found');
    if (paper.teacherId !== userId) throw ApiError.forbidden('You do not own this paper');

    return paper;
  }

  async listPapers(userId: number, page: number = 1, limit: number = 10, status?: PaperStatus) {
    const skip = (page - 1) * limit;
    const where = {
      teacherId: userId,
      ...(status && { status }),
    };

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { name: true, grade: true } },
          paperSubjects: { include: { subject: { select: { name: true } } } },
          paperSettings: { select: { mcqCount: true, shortCount: true, essayCount: true } },
        },
      }),
      prisma.paper.count({ where }),
    ]);

    return { papers, total };
  }

  async updatePaperTitle(paperId: number, userId: number, title: string) {
    await this.verifyOwnership(paperId, userId);
    return prisma.paper.update({ where: { id: paperId }, data: { title } });
  }

  async updatePaperStatus(paperId: number, userId: number, status: PaperStatus) {
    await this.verifyOwnership(paperId, userId);
    return prisma.paper.update({ where: { id: paperId }, data: { status } });
  }

  async updatePaperFormatting(paperId: number, userId: number, formatting: any) {
    await this.verifyOwnership(paperId, userId);
    return prisma.paperFormatting.update({
      where: { paperId },
      data: formatting,
    });
  }

  async deletePaper(paperId: number, userId: number) {
    await this.verifyOwnership(paperId, userId);
    await prisma.paper.delete({ where: { id: paperId } });
    await prisma.activityLog.create({
      data: { userId, action: 'delete_paper', details: { paperId } },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private selectQuestions<T>(questions: T[], count: number, randomize: boolean): T[] {
    if (count === 0) return [];
    const pool = randomize ? this.shuffle([...questions]) : [...questions];
    return pool.slice(0, count);
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private async verifyOwnership(paperId: number, userId: number) {
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      select: { teacherId: true },
    });
    if (!paper) throw ApiError.notFound('Paper not found');
    if (paper.teacherId !== userId) throw ApiError.forbidden('You do not own this paper');
    return paper;
  }
}
