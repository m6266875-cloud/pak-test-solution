/**
 * PHASE 4 — Step 3: paper type, language, total marks + time, and the marks
 * breakdown per question type (only types relevant to the chosen paper type).
 * A saved Pattern can auto-fill the breakdown (existing Pattern system).
 */
import { useEffect, useState } from 'react';
import { Sparkles, FileStack } from 'lucide-react';
import toast from 'react-hot-toast';
import { v2 } from '../../../api/v2';
import type { PatternV2 } from '../../../types';
import { StepHeading, PickCard } from '../generate/wizUI';
import {
  DistributionRowUI, LANGS, MARK_CHIPS, PAPER_TYPE_CARDS, paletteFor, suggestRows, TYPE_LABELS, distSumRows,
} from '../paperUtils';
import type { W5State } from './state';

export default function Step3TypeMarks({ w, set }: { w: W5State; set: (p: Partial<W5State>) => void }) {
  const [patterns, setPatterns] = useState<PatternV2[]>([]);
  useEffect(() => {
    v2.patterns.list().then((r) => setPatterns((r.data.data ?? []) as PatternV2[])).catch(() => undefined);
  }, []);

  const setRows = (distribution: DistributionRowUI[]) => set({ distribution });
  const rowFor = (t: string) => w.distribution.find((d) => d.type === t);

  const changeType = (pt: typeof w.paperType) => {
    // keep only rows allowed for the new type; re-suggest if empty
    const kept = w.distribution.filter((d) => paletteFor(pt).includes(d.type as any));
    set({ paperType: pt, distribution: kept.length ? kept : suggestRows(pt, w.totalMarks) });
  };

  const setRow = (t: string, patch: Partial<DistributionRowUI>) => {
    const has = rowFor(t);
    const next = has
      ? w.distribution.map((d) => (d.type === t ? { ...d, ...patch } : d))
      : [...w.distribution, { type: t as any, count: 0, marks: 1, difficulty: 'any' as const, _diff: 'any' as const, ...patch }];
    setRows(next);
  };

  const applyPattern = (p: PatternV2) => {
    const c: any = p.config ?? {};
    const patch: Partial<W5State> = { patternId: p.id };
    if (c.paperType) patch.paperType = c.paperType;
    if (c.language) patch.language = c.language;
    if (Number.isFinite(Number(c.totalMarks))) patch.totalMarks = Number(c.totalMarks);
    if (Number.isFinite(Number(c.timeLimit))) patch.timeLimit = Number(c.timeLimit);
    if (Array.isArray(c.distribution) && c.distribution.length) {
      const merged = new Map<string, DistributionRowUI>();
      for (const d of c.distribution as any[]) {
        if (!paletteFor((c.paperType ?? w.paperType) as any).includes(d.type)) continue;
        const prev = merged.get(d.type);
        if (prev) prev.count += Number(d.count) || 0;
        else merged.set(d.type, { type: d.type, count: Number(d.count) || 0, marks: Number(d.marks) || 1, difficulty: d.difficulty ?? 'any', _diff: (d.difficulty ?? 'any') as DistributionRowUI['_diff'] });
      }
      patch.distribution = [...merged.values()];
    }
    set(patch);
    toast.success(`Pattern “${p.name}” applied`);
  };

  const sum = distSumRows(w.distribution);

  return (
    <div className="space-y-6">
      <div>
        <StepHeading n={3} title="Paper type & language" />
        <div className="grid sm:grid-cols-3 gap-3">
          {PAPER_TYPE_CARDS.map((c) => (
            <PickCard key={c.id} active={w.paperType === c.id} onClick={() => changeType(c.id)} title={c.label} sub={c.hint} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-500">Language:</span>
          {LANGS.map((l) => (
            <button key={l} type="button" onClick={() => set({ language: l })}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border capitalize ${w.language === l ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-surface-200 text-surface-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <StepHeading n={3} title="Total marks & time" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-surface-600">Total marks
            <input type="number" min={1} max={500} value={w.totalMarks}
              onChange={(e) => {
                const v = Math.max(1, Math.min(500, Number(e.target.value) || 1));
                set({ totalMarks: v, distribution: w.distribution.length ? w.distribution : suggestRows(w.paperType, v) });
              }}
              className="ml-2 w-24 rounded-xl border border-surface-200 px-3 py-2 text-sm font-bold" />
          </label>
          {MARK_CHIPS.map((m) => (
            <button key={m} type="button" onClick={() => set({ totalMarks: m, distribution: suggestRows(w.paperType, m) })}
              className="text-xs font-bold px-3 py-1.5 rounded-full border bg-white border-surface-200 text-surface-600 hover:border-brand-400">{m}</button>
          ))}
          <label className="text-sm font-semibold text-surface-600 ml-auto">Time (min)
            <input type="number" min={10} max={240} value={w.timeLimit}
              onChange={(e) => set({ timeLimit: Math.max(10, Math.min(240, Number(e.target.value) || 60)) })}
              className="ml-2 w-20 rounded-xl border border-surface-200 px-3 py-2 text-sm font-bold" />
          </label>
        </div>
      </div>

      <div>
        <StepHeading n={3} title="Marks breakdown"
          hint="How many questions of each type, at how many marks each. Σ must equal total marks."
          extra={
            <button type="button" onClick={() => setRows(suggestRows(w.paperType, w.totalMarks))}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Auto-fill
            </button>
          } />
        <div className="grid sm:grid-cols-2 gap-3">
          {paletteFor(w.paperType).map((t) => {
            const r = rowFor(t);
            return (
              <div key={t} className="card px-4 py-3 flex items-center gap-3">
                <span className="flex-1 text-sm font-semibold text-surface-800">{TYPE_LABELS[t]}</span>
                <label className="text-[11px] font-bold text-surface-500">Count
                  <input type="number" min={0} max={100} value={r?.count ?? 0}
                    onChange={(e) => setRow(t, { count: Math.max(0, Number(e.target.value) || 0) })}
                    className="ml-1.5 w-16 rounded-lg border border-surface-200 px-2 py-1.5 text-sm font-bold" />
                </label>
                <label className="text-[11px] font-bold text-surface-500">Marks/Q
                  <input type="number" min={1} max={100} value={r?.marks ?? 1}
                    onChange={(e) => setRow(t, { marks: Math.max(1, Number(e.target.value) || 1) })}
                    className="ml-1.5 w-16 rounded-lg border border-surface-200 px-2 py-1.5 text-sm font-bold" />
                </label>
              </div>
            );
          })}
        </div>
        <p className={`mt-3 text-sm font-bold ${sum === w.totalMarks ? 'text-brand-700' : 'text-amber-600'}`}>
          Breakdown Σ = {sum} / {w.totalMarks} marks {sum === w.totalMarks ? '✓' : '— adjust counts/marks'}
        </p>
      </div>

      {patterns.length > 0 && (
        <div>
          <StepHeading n={3} title="Or start from a saved pattern" hint="Board pattern, school exam, monthly test…" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {patterns.map((p) => (
              <PickCard key={p.id} active={w.patternId === p.id} onClick={() => applyPattern(p)}
                icon={<FileStack className="w-4 h-4" />} title={p.name}
                sub={p.description || `${(p.config as any)?.paperType ?? ''} · ${(p.config as any)?.totalMarks ?? ''} marks`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
