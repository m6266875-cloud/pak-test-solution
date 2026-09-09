/**
 * Shared, wizard-agnostic paper helpers (labels, type groups, MCQ option
 * normalisation, distribution suggester). Lifted out of the retired 15-step
 * wizard state so PaperDoc / paper detail / My Papers / Patterns and the new
 * 5-step wizard all share one implementation.
 */
import type { Difficulty, DistributionInput, Medium, PaperTypeV2, QuestionType } from '../../types';

// ─── labels / constants ─────────────────────────────────────────────────────
export const TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice', true_false: 'True / False', fill_blank: 'Fill in the Blank',
  matching: 'Matching', short: 'Short Question', essay: 'Long Question', long: 'Long Question',
  numerical: 'Numerical / Problem', conceptual: 'Conceptual',
};
export const TYPE_SHORT: Record<string, string> = {
  mcq: 'MCQ', true_false: 'T/F', fill_blank: 'Fill', matching: 'Matching',
  short: 'Short', essay: 'Long', long: 'Long', numerical: 'Numerical', conceptual: 'Conceptual',
};
export const CANON = (t: string) => (t === 'long' ? 'essay' : t);

/** fixed section order used for paper display / print order */
export const TYPE_ORDER: QuestionType[] = ['mcq', 'true_false', 'fill_blank', 'matching', 'short', 'numerical', 'conceptual', 'essay'];

export const OBJ_TYPES: QuestionType[] = ['mcq', 'true_false', 'fill_blank', 'matching'];
export const SUBJ_TYPES: QuestionType[] = ['short', 'essay', 'numerical', 'conceptual'];
export const TYPE_GROUPS: Record<PaperTypeV2, QuestionType[]> = {
  objective: OBJ_TYPES, subjective: SUBJ_TYPES, mixed: ['mcq', 'short', 'essay', 'true_false', 'fill_blank', 'matching', 'numerical', 'conceptual'],
};

export const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
export const LANGS: Medium[] = ['english', 'urdu', 'bilingual'];

export const PAPER_TYPE_CARDS: Array<{ id: PaperTypeV2; label: string; hint: string }> = [
  { id: 'objective', label: 'Objective', hint: 'MCQ · True/False · Fill · Matching' },
  { id: 'subjective', label: 'Subjective', hint: 'Short · Long · Numerical · Conceptual' },
  { id: 'mixed', label: 'Mixed', hint: 'Objective + Subjective sections' },
];

export const MARK_CHIPS = [25, 50, 75, 100];
export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// ─── distribution rows ──────────────────────────────────────────────────────
export interface DistributionRowUI extends DistributionInput {
  _diff: 'any' | Difficulty; // bound to the row's difficulty select
}

export const distSumRows = (rows: DistributionRowUI[]) => rows.reduce((a, d) => a + d.count * d.marks, 0);

/** Deterministic suggested rows that always sum to exactly `total`. */
export const suggestRows = (paperType: PaperTypeV2, total: number): DistributionRowUI[] => {
  if (total <= 0) return [];
  const out: DistributionRowUI[] = [];
  const allowed = TYPE_GROUPS[paperType];
  const can = (t: QuestionType) => allowed.includes(t);
  const mk = (type: QuestionType, count: number, marks: number): DistributionRowUI => ({
    type, count, marks, difficulty: 'any', _diff: 'any',
  });
  let rem = total;

  if (paperType === 'objective') {
    const m = [5, 4, 2, 1].find((x) => total % x === 0 && total / x <= 25) ?? 1;
    out.push(mk('mcq', Math.ceil(total / m), m));
    if (out[0].count * m !== total) out.push(mk('mcq', 0, m));
    return out.filter((d) => d.count > 0);
  }

  const shortM = 2; const longM = 5;
  if (can('mcq') && can('short') && can('essay')) {
    const mcqN = Math.min(12, Math.floor(total * 0.24));
    if (mcqN > 0) { out.push(mk('mcq', mcqN, 1)); rem -= mcqN; }
  }
  if (can('short') && rem >= shortM) {
    const shortN = Math.min(12, Math.floor(rem * 0.4 / shortM));
    if (shortN > 0) { out.push(mk('short', shortN, shortM)); rem -= shortN * shortM; }
  }
  if (can('essay') && rem >= longM) {
    out.push(mk('essay', Math.floor(rem / longM), longM));
    rem = rem % longM;
  }
  if (rem > 0) {
    const extra: QuestionType[] = allowed.filter((t) => t !== 'mcq' && t !== 'short' && t !== 'essay');
    if (extra.length) out.push(mk(extra[0], 1, rem));
    else if (can('essay')) {
      const e = out.find((d) => d.type === 'essay');
      if (e && e.count > 0) { e.marks += rem; rem = 0; }
      else out.push(mk('essay', 1, rem));
    } else if (can('short')) {
      const sh = out.find((d) => d.type === 'short');
      if (sh && sh.count > 0) { sh.marks += rem; }
      else out.push(mk('short', 1, rem));
    } else out.push(mk(allowed[0], 1, rem));
  }
  return out.filter((d) => d.count > 0);
};

/** Row palette offered by the distribution builder (every allowed type). */
export const paletteFor = (paperType: PaperTypeV2): QuestionType[] => TYPE_GROUPS[paperType];

// ─── option rendering helpers (shared with bank page + paper docs) ──────────
/** Normalise MCQ options JSON → [letter, text][] (array or {A:…} object). */
export const optionEntries = (options: any): Array<[string, string]> => {
  if (!options) return [];
  const arr = Array.isArray(options) ? options
    : Array.isArray(options.options) ? options.options
    : null;
  if (arr) return arr.map((o: any, i: number) => [String.fromCharCode(65 + i), String(o?.text ?? o ?? '')]);
  if (typeof options === 'object') {
    return Object.entries(options).map(([k, v]) => [k.toUpperCase(), String((v as any)?.text ?? (v as any) ?? '')]);
  }
  return [];
};

/** Which letter holds the correct answer for an MCQ row (best effort). */
export const answerLetter = (q: { options: any; answer: string | null }): string | null => {
  const opts = optionEntries(q.options);
  if (!q.answer || !opts.length) return null;
  const a = String(q.answer).trim();
  if (/^[A-Ea-e]$/.test(a)) return a.toUpperCase();
  const lower = a.toLowerCase();
  const idx = opts.findIndex(([, t]) => t.toLowerCase() === lower);
  if (idx >= 0) return opts[idx][0];
  const asIdx = Number(a);
  if (Number.isInteger(asIdx) && asIdx >= 0 && asIdx < opts.length) return opts[asIdx][0];
  return null;
};

export const QUESTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
