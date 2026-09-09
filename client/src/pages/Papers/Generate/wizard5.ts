/**
 * PHASE 4 — 5-step paper generation wizard state (replaces the 15-step flow).
 *
 * Steps: 1 Scope (course → class → subject → book) · 2 Chapters (+ exercise
 * drill-in) · 3 Type & marks (paper type, language, marks/time, mark
 * breakdown) · 4 Questions (auto-pool review, shuffle, manual add) ·
 * 5 Review (branded preview, edit/print/PDF/save).
 *
 * Phase-4 decisions baked in: single subject per paper, no session step (the
 * server stamps the course's current session), topics hidden from the wizard
 * (server support retained), one paper per run (paperCount=1).
 */
import type {
  BookV2, ChapterV2, ClassV2, CourseV2, Difficulty, DistributionInput, ExerciseV2,
  GeneratePaperPayload, Medium, PaperTypeV2, PreviewPoolCandidate, QuestionType, SubjectV2,
} from '../../../types';
import type { DistRow } from '../shared/paperUtils';

export interface W5State {
  step: number;
  // ── step 1 · scope ──
  courses: CourseV2[];
  courseId?: number;
  classes: ClassV2[];
  classId?: number;
  subjects: SubjectV2[];
  subjectId?: number;
  books: BookV2[];
  bookId?: number;
  // ── step 2 · chapters + exercises ──
  chapters: ChapterV2[];
  chapterIds: number[];
  exercisesByChapter: Record<number, ExerciseV2[]>;
  exerciseIds: number[];
  expandedChapters: number[];
  // ── step 3 · build ──
  paperType: PaperTypeV2;
  language: Medium;
  totalMarks: number;
  timeLimit: number;
  title: string;
  examTitle: string;
  description: string;
  distribution: DistRow[];
  // ── step 4 · selection ──
  countsByType: Record<string, number>;
  selectedIds: number[]; // pick order
  selectedMeta: Record<number, string>; // question id → type
  selectionReady: boolean; // set by Step 4 once a suggestion/pool loads
  lastFilledAnchor?: string; // build fingerprint at last auto-fill (revisit guard)
  // ── step 5 · generated paper ──
  paperId?: number;
  warnings: string[];
}

export const emptyW5 = (): W5State => ({
  step: 1,
  courses: [], classes: [], subjects: [], books: [], chapters: [],
  chapterIds: [], exercisesByChapter: {}, exerciseIds: [], expandedChapters: [],
  paperType: 'mixed', language: 'english',
  totalMarks: 75, timeLimit: 90,
  title: '', examTitle: '', description: '',
  distribution: [],
  countsByType: {}, selectedIds: [], selectedMeta: {}, selectionReady: false,
  paperId: undefined, warnings: [],
});

export const distSum5 = (s: W5State) => s.distribution.reduce((a, d) => a + d.count * d.marks, 0);
export const distCount5 = (s: W5State) => s.distribution.reduce((a, d) => a + d.count, 0);

/** selected question count per type (from the id→type map Step 4 maintains) */
export const selectedCountByType = (s: W5State): Record<string, number> => {
  const m: Record<string, number> = {};
  for (const id of s.selectedIds) {
    const t = s.selectedMeta[id];
    if (t) m[t] = (m[t] ?? 0) + 1;
  }
  return m;
};

/** live selected marks: Σ per-type picked × per-question marks */
export const selectedMarks5 = (s: W5State): number => {
  const counts = selectedCountByType(s);
  return s.distribution.reduce((a, d) => a + (counts[d.type] ?? 0) * d.marks, 0);
};

/** every distribution row filled to exactly its required count */
export const selectionExact5 = (s: W5State): boolean => {
  const rows = s.distribution.filter((d) => d.count > 0);
  if (!rows.length) return false;
  const counts = selectedCountByType(s);
  return rows.every((d) => (counts[d.type] ?? 0) === d.count);
};

// ─── steps ──────────────────────────────────────────────────────────────────
export interface Step5Def {
  n: number;
  label: string;
  canLeave: (s: W5State) => boolean;
}

export const STEPS5: StepDef5[] = [
  { n: 1, label: 'Scope', short: '1', canLeave: (s) => s.courseId != null && s.classId != null && s.subjectId != null },
  { n: 2, label: 'Chapters', short: '2', canLeave: (s) => s.chapterIds.length > 0 },
  {
    n: 3, label: 'Type & Marks', short: '3',
    canLeave: (s) => s.distribution.some((d) => d.count > 0) && distSum5(s) === s.totalMarks,
  },
  { n: 4, label: 'Questions', short: '4', canLeave: (s) => selectionExact5(s) },
  { n: 5, label: 'Review', short: '5', canLeave: () => true },
];
interface StepDef5 extends Step5Def { short: string }

// ─── breakdown presets (Step 3 one-click mixes) ─────────────────────────────
export interface BreakdownPreset {
  id: string;
  name: string;
  hint: string;
  paperType: PaperTypeV2;
  totalMarks: number;
  timeLimit: number;
}

export const BREAKDOWN_PRESETS: BreakdownPreset[] = [
  { id: 'monthly-25', name: 'Monthly Test · 25', hint: 'Mixed · quick class test', paperType: 'mixed', totalMarks: 25, timeLimit: 40 },
  { id: 'school-50', name: 'School Exam · 50', hint: 'Mixed · term assessment', paperType: 'mixed', totalMarks: 50, timeLimit: 90 },
  { id: 'board-75', name: 'Board Pattern · 75', hint: 'Mixed · board-style paper', paperType: 'mixed', totalMarks: 75, timeLimit: 180 },
  { id: 'board-100', name: 'Board Pattern · 100', hint: 'Mixed · full paper', paperType: 'mixed', totalMarks: 100, timeLimit: 180 },
];

// ─── payload builders ───────────────────────────────────────────────────────
/** selection ordered by distribution-row order, then pick order (print order) */
export const orderedSelection5 = (s: W5State): number[] => {
  const rowIdx = new Map<string, number>();
  s.distribution.forEach((d, i) => { if (!rowIdx.has(d.type)) rowIdx.set(d.type, i); });
  const pickIdx = new Map<number, number>();
  s.selectedIds.forEach((id, i) => pickIdx.set(id, i));
  return [...s.selectedIds].sort((a, b) => {
    const ra = rowIdx.get(s.selectedMeta[a]) ?? 99;
    const rb = rowIdx.get(s.selectedMeta[b]) ?? 99;
    if (ra !== rb) return ra - rb;
    return (pickIdx.get(a) ?? 0) - (pickIdx.get(b) ?? 0);
  });
};

/** per-question marks derived from the distribution row of each picked type */
export const marksByQuestion5 = (s: W5State): Record<string, number> => {
  const marks = new Map<string, number>();
  s.distribution.forEach((d) => { if (!marks.has(d.type)) marks.set(d.type, d.marks); });
  const out: Record<string, number> = {};
  for (const id of s.selectedIds) out[String(id)] = marks.get(s.selectedMeta[id]) ?? 1;
  return out;
};

export const distPayload5 = (s: W5State): DistributionInput[] =>
  s.distribution.filter((d) => d.count > 0)
    .map((d) => ({ type: d.type as QuestionType, count: d.count, marks: d.marks, difficulty: (d._diff === 'any' ? 'any' : d._diff) as Difficulty | 'any' }));

/** POST /v2/papers body. No sessionId — the server stamps the current one. */
export const buildGeneratePayload5 = (s: W5State): GeneratePaperPayload => ({
  courseId: s.courseId,
  classId: s.classId!,
  subjectIds: s.subjectId != null ? [s.subjectId] : [],
  bookId: s.bookId,
  chapterIds: s.chapterIds,
  exerciseIds: s.exerciseIds,
  paperType: s.paperType,
  language: s.language,
  totalMarks: s.totalMarks,
  distribution: distPayload5(s),
  timeLimit: s.timeLimit,
  paperCount: 1,
  autoSelect: false,
  questionIds: orderedSelection5(s),
  title: s.title.trim() || undefined,
  examTitle: s.examTitle.trim() || undefined,
  description: s.description.trim() || undefined,
});

/** full wizard config for PaperPattern save (same keys as the old wizard) */
export const patternConfig5 = (s: W5State): Record<string, unknown> => ({
  wizard: 5,
  courseId: s.courseId, classId: s.classId,
  subjectIds: s.subjectId != null ? [s.subjectId] : [],
  bookId: s.bookId, chapterIds: s.chapterIds,
  topicIds: [], exerciseIds: s.exerciseIds,
  paperType: s.paperType, language: s.language, totalMarks: s.totalMarks,
  distribution: distPayload5(s),
  timeLimit: s.timeLimit, paperCount: 1, autoSelect: false,
});

/** apply a saved pattern (old 15-step or new 5-step configs) onto the wizard */
export const patternToW5 = (cfg: Record<string, any>): Partial<W5State> => {
  const subjectIds: number[] = Array.isArray(cfg.subjectIds) ? cfg.subjectIds : [];
  return {
    courseId: cfg.courseId, classId: cfg.classId,
    subjectId: subjectIds[0],
    bookId: cfg.bookId,
    chapterIds: Array.isArray(cfg.chapterIds) ? cfg.chapterIds : [],
    exerciseIds: Array.isArray(cfg.exerciseIds) ? cfg.exerciseIds : [],
    paperType: cfg.paperType ?? 'mixed',
    language: cfg.language ?? 'english',
    totalMarks: cfg.totalMarks ?? 75,
    timeLimit: cfg.timeLimit ?? 90,
    distribution: (Array.isArray(cfg.distribution) ? cfg.distribution : []).map((d: any) => ({
      type: d.type, count: d.count, marks: d.marks,
      difficulty: d.difficulty === 'any' ? undefined : d.difficulty,
      _diff: d.difficulty ?? 'any',
    })),
    // force steps to refetch lists for the applied scope
    classes: [], subjects: [], books: [], chapters: [],
    exercisesByChapter: {}, expandedChapters: [],
    selectedIds: [], selectedMeta: {}, selectionReady: false,
    countsByType: {}, paperId: undefined, warnings: [],
  };
};

export type { PreviewPoolCandidate };
