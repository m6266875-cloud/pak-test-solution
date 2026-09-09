/**
 * PHASE 4 wizard · Step 3 — paper type, language, marks, time & breakdown.
 */
import { useEffect, useMemo } from 'react';
import type { Medium, PaperTypeV2, QuestionType } from '../../../../types';
import { LANGS, PAPER_TYPE_CARDS, TYPE_LABELS, paletteFor, suggestRows } from '../../shared/paperUtils';

const LANG_LABELS: Record<Medium, string> = { english: 'English', urdu: 'Urdu', bilingual: 'Bilingual' };
import type { BreakdownPreset } from '../wizard5';
import { BREAKDOWN_PRESETS, distSum5 } from '../wizard5';
import type { W5State } from '../wizard5';

interface Props {
  state: W5State;
  setState: (fn: (s: W5State) => W5State) => void;
}

const num = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const lab = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const btn = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40';

export default function TypeMarksStep5({ state, setState }: Props) {
  const set = (p: Partial<W5State>) => setState((s) => ({ ...s, ...p }));
  const sum = distSum5(state);
  const over = sum > state.totalMarks;

  // seed a default breakdown on first arrival
  useEffect(() => {
    if (!state.distribution.length) {
      setState((s) => s.distribution.length ? s : ({ ...s, distribution: suggestRows(s.paperType, s.totalMarks) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickPreset = (p: BreakdownPreset) =>
    set({
      paperType: p.paperType, totalMarks: p.totalMarks, timeLimit: p.timeLimit,
      distribution: suggestRows(p.paperType, p.totalMarks),
    });

  const setDist = (type: string, patch: Partial<{ count: number; marks: number }>) =>
    set({ distribution: state.distribution.map((d) => (d.type === type ? { ...d, ...patch } : d)) });

  const toggleType = (type: string) =>
    set({
      distribution: state.distribution.some((d) => d.type === type)
        ? state.distribution.filter((d) => d.type !== type)
        : [...state.distribution, { type: type as QuestionType, count: 0, marks: 1, _diff: 'any' as const }],
    });

  const paperType: PaperTypeV2 = state.paperType;
  const allTypes = useMemo(() => paletteFor(state.paperType), [state.paperType]);

  return (
    <div className="space-y-6">
      {/* paper type */}
      <div>
        <p className={lab}>Paper type</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PAPER_TYPE_CARDS.map((c) => {
            const active = paperType === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => set({ paperType: c.id as PaperTypeV2 })}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  active ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <span className={`block text-sm font-bold ${active ? 'text-indigo-900' : 'text-slate-800'}`}>{c.label}</span>
                <span className="block text-xs text-slate-500">{c.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* language + marks + time */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className={lab}>Language</label>
          <div className="flex gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set({ language: l })}
                className={`flex-1 rounded-xl border-2 px-2 py-2 text-sm font-semibold ${
                  state.language === l ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={lab}>Total marks</label>
          <div className="flex items-center gap-2">
            <button type="button" className={btn} disabled={state.totalMarks <= 1} onClick={() => set({ totalMarks: state.totalMarks - 1 })}>−</button>
            <input type="number" min={1} max={200} className={`${num} text-center`} value={state.totalMarks}
              onChange={(e) => set({ totalMarks: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} />
            <button type="button" className={btn} disabled={state.totalMarks >= 200} onClick={() => set({ totalMarks: state.totalMarks + 1 })}>+</button>
          </div>
        </div>
        <div>
          <label className={lab}>Time limit (minutes)</label>
          <div className="flex items-center gap-2">
            <button type="button" className={btn} disabled={state.timeLimit <= 5} onClick={() => set({ timeLimit: Math.max(5, state.timeLimit - 5) })}>−</button>
            <input type="number" min={5} step={5} className={`${num} text-center`} value={state.timeLimit}
              onChange={(e) => set({ timeLimit: Math.max(5, Number(e.target.value) || 5) })} />
            <button type="button" className={btn} onClick={() => set({ timeLimit: state.timeLimit + 5 })}>+</button>
          </div>
        </div>
      </div>

      {/* titles */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className={lab}>Paper title <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <input className={num} value={state.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. First Term Examination" />
        </div>
        <div>
          <label className={lab}>Exam title <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <input className={num} value={state.examTitle} onChange={(e) => set({ examTitle: e.target.value })} placeholder="e.g. 9th Class · Physics" />
        </div>
        <div>
          <label className={lab}>Notes <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <input className={num} value={state.description} onChange={(e) => set({ description: e.target.value })} placeholder="Internal notes…" />
        </div>
      </div>

      {/* breakdown */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className={lab}>Mark breakdown</p>
          <div className="flex flex-wrap gap-2">
            {BREAKDOWN_PRESETS.map((p) => (
              <button
                key={p.id} type="button" onClick={() => pickPreset(p)} title={p.hint}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {state.distribution.map((d) => (
            <div key={d.type} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{TYPE_LABELS[d.type] ?? d.type}</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Qs
                <button type="button" className={btn} disabled={d.count <= 0} onClick={() => setDist(d.type, { count: d.count - 1 })}>−</button>
                <input type="number" min={0} max={100} className={`${num} w-14 text-center`} value={d.count}
                  onChange={(e) => setDist(d.type, { count: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
                <button type="button" className={btn} disabled={d.count >= 100} onClick={() => setDist(d.type, { count: d.count + 1 })}>+</button>
              </label>
              <span className="text-slate-300">×</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                marks
                <button type="button" className={btn} disabled={d.marks <= 1} onClick={() => setDist(d.type, { marks: d.marks - 1 })}>−</button>
                <input type="number" min={1} max={50} className={`${num} w-14 text-center`} value={d.marks}
                  onChange={(e) => setDist(d.type, { marks: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} />
                <button type="button" className={btn} disabled={d.marks >= 50} onClick={() => setDist(d.type, { marks: d.marks + 1 })}>+</button>
              </label>
              <span className="w-16 text-right text-sm font-bold text-indigo-700">= {d.count * d.marks}</span>
              <button type="button" onClick={() => toggleType(d.type)} title="Remove row" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allTypes.filter((t) => !state.distribution.some((d) => d.type === t)).map((t) => (
            <button
              key={t} type="button" onClick={() => toggleType(t)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-700"
            >
              + {TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
        <div className={`mt-3 rounded-xl border px-4 py-2.5 text-sm ${over ? 'border-red-200 bg-red-50 text-red-700' : sum === state.totalMarks ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          Breakdown total <span className="font-bold">{sum}</span> of <span className="font-bold">{state.totalMarks}</span> marks
          {over ? ' — over budget, reduce counts or marks.' : sum === state.totalMarks ? ' — matches your total. ✓' : ` — ${state.totalMarks - sum} marks unassigned.`}
        </div>
      </div>
    </div>
  );
}
