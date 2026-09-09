/**
 * PHASE 4 — 5-step paper wizard state.
 *
 * Step 1 Course & Scope · Step 2 Chapters (+ optional exercises) ·
 * Step 3 Paper Type & Marks (+ pattern auto-fill) · Step 4 Auto-Generate &
 * Select · Step 5 Review, Finalize & Output.
 */
import type { BookV2, ClassV2, CourseV2, Medium, PaperTypeV2, PaperV2, SubjectV2 } from '../../../types';
import type { ChapterRow, CandidateQuestion } from '../../../api/v4';
import type { DistributionRowUI } from '../paperUtils';

export interface W5State {
  step: number; // 1..5
  // step 1
  courses: CourseV2[];
  courseId?: number;
  classes: ClassV2[];
  classId?: number;
  subjects: SubjectV2[];
  subjectId?: number;
  books: BookV2[];
  bookId?: number | null; // null = no book / auto
  bookConfirmed: boolean;
  // step 2
  chapters: ChapterRow[];
  chapterIds: number[];
  exerciseSel: Record<number, number[]>; // chapterId → selected exercise ids ([] = whole chapter)
  // step 3
  paperType: PaperTypeV2;
  language: Medium;
  totalMarks: number;
  timeLimit: number;
  distribution: DistributionRowUI[];
  patternId?: number;
  // step 4
  seed: number;
  page: number;
  selected: Record<string, number[]>; // type → picked question ids
  marksByType: Record<string, number>; // marks per question, from distribution
  poolRows: Record<string, CandidateQuestion[]>; // loaded page slices per type
  poolTotal: Record<string, number>;
  // step 5
  paper?: PaperV2 | null;
  title: string;
  examTitle: string;
}

export const emptyW5 = (): W5State => ({
  step: 1,
  courses: [], classes: [], subjects: [], books: [], bookConfirmed: false,
  chapters: [], chapterIds: [], exerciseSel: {},
  paperType: 'mixed', language: 'english', totalMarks: 50, timeLimit: 60,
  distribution: [], seed: 1, page: 1, selected: {}, marksByType: {}, poolRows: {}, poolTotal: {},
  paper: null, title: '', examTitle: '',
});

export const W5_STEPS = [
  { n: 1, label: 'Course & Scope' },
  { n: 2, label: 'Chapters' },
  { n: 3, label: 'Type & Marks' },
  { n: 4, label: 'Select Questions' },
  { n: 5, label: 'Review & Save' },
];

/** Live selected marks = Σ per type picked × marks-per-question. */
export const selectedMarks = (s: W5State) =>
  Object.entries(s.selected).reduce((a, [t, ids]) => a + ids.length * (s.marksByType[t] ?? 1), 0);

export const targetMarksOf = (s: W5State) =>
  s.distribution.reduce((a, d) => a + d.count * d.marks, 0);

export const canLeaveStep = (s: W5State): boolean => {
  switch (s.step) {
    case 1: return !!s.courseId && !!s.classId && !!s.subjectId && s.bookConfirmed;
    case 2: return s.chapterIds.length > 0;
    case 3: return s.totalMarks >= 1 && s.totalMarks <= 500
      && s.distribution.some((d) => d.count > 0)
      && s.distribution.reduce((a, d) => a + d.count * d.marks, 0) === s.totalMarks;
    case 4: return selectedMarks(s) === s.totalMarks;
    default: return true;
  }
};
