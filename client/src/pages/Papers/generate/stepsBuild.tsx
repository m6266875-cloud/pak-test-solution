/**
 * PHASE 2 — Wizard configuration + selection steps (9 Paper type → 14
 * Selection). Availability and manual selection hit the same scope-enforced
 * endpoints the generator uses, so “required vs available” shown here is the
 * same math the server validates at submit time (422 + suggestions).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, CircleDot, Dices, Eraser,
  Eye, FileText, Languages, ListFilter, Loader2, Minus, Plus, RefreshCw, Search,
  ShieldAlert, Trash2, Wand2,
} from 'lucide-react';
import { v2 } from '../../../api/v2';
import type { Difficulty, PaperTypeV2, QuestionRowV2, QuestionType } from '../../../types';
import type { DistributionRowUI, WizardState } from './state';
import {
  DIFFS, LANGS, TYPE_LABELS, TYPE_SHORT, TYPE_GROUPS, distCount, distSum,
  optionEntries, paletteFor, suggestRows,
} from './state';
import { EmptyCard, LoadingCard, PickCard, StepHeading } from './wizUI';

export interface BuildStepProps {
  w: WizardState;
  set: (p: Partial<WizardState>) => void;
}

// ─── Step 9 · Paper type ────────────────────────────────────────────────────
export function StepType({ w, set }: BuildStepProps) {
  const choose = (id: PaperTypeV2) => {
    const allowed = TYPE_GROUPS[id];
    const rows = w.distribution.filter((d) => allowed.includes(d.type));
    set({ paperType: id, distribution: rows });
  };
  return (
    <div>
      <StepHeading n={9} title="What kind of paper?" hint="Objective (MCQ-style), Subjective or a Mixed paper." />
      <div className="grid md:grid-cols-3 gap-3">
        {(['objective', 'subjective', 'mixed'] as PaperTypeV2[]).map((id) => (
          <PickCard
            key={id} active={w.paperType === id} onClick={() => choose(id)}
            title={id[0].toUpperCase() + id.slice(1)}
            sub={TYPE_GROUPS[id].map((t) => TYPE_SHORT[t]).join(' · ')}
            icon={id === 'objective' ? <CircleDot className="w-4.5 h-4.5" />
              : id === 'subjective' ? <FileText className="w-4.5 h-4.5" /> : <ListFilter className="w-4.5 h-4.5" />}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 10 · Language ─────────────────────────────────────────────────────
export function StepLanguage({ w, set }: BuildStepProps) {
  return (
    <div>
      <StepHeading n={10} title="Paper language" hint="Urdu papers print right-to-left; bilingual papers keep the English layout with Urdu allowed." />
      <div className="grid md:grid-cols-3 gap-3">
        {LANGS.map((l) => (
          <PickCard
            key={l} active={w.language === l} onClick={() => set({ language: l })}
            title={l[0].toUpperCase() + l.slice(1)}
            sub={l === 'english' ? 'LTR · English questions only'
              : l === 'urdu' ? 'RTL — اردو' : 'Dual · English + اردو'}
            icon={<Languages className="w-4.5 h-4.5" />}
          />
        ))}
      </div>
      {(w.language === 'urdu' || w.language === 'bilingual') && (
        <div dir="rtl" className="mt-4 card bg-amber-50/60 border-amber-200 text-sm px-4 py-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">RTL indicator: the preview and PDF will print right-to-left with Urdu numerals.</span>
        </div>
      )}
    </div>
  );
}

// ─── Step 11 · Marks & time ─────────────────────────────────────────────────
export function StepMarks({ w, set }: BuildStepProps) {
  const chips = [25, 50, 75, 100];
  const timeChips = [40, 60, 90, 120, 180];
  return (
    <div>
      <StepHeading n={11} title="Total marks & time" hint="The generator enforces Σ(count × per-question marks) = total marks (spec 18)." />
      <p className="label">Total marks</p>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((m) => (
          <button key={m} type="button" onClick={() => set({ totalMarks: m })}
            className={clsx('px-5 py-2.5 rounded-xl font-bold text-sm border transition-all',
              w.totalMarks === m ? 'bg-brand-600 text-white border-brand-600 shadow-brand' : 'bg-white border-surface-200 text-surface-600 hover:border-brand-300')}>
            {m}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-1">
          <span className="text-xs font-semibold text-surface-400">Custom</span>
          <input type="number" min={1} max={500} className="input w-24"
            value={chips.includes(w.totalMarks) ? '' : w.totalMarks}
            placeholder="e.g. 80"
            onChange={(e) => set({ totalMarks: Number(e.target.value) || 0 })} />
        </div>
      </div>
      <p className="label mt-5">Time limit (minutes)</p>
      <div className="flex flex-wrap items-center gap-2">
        {timeChips.map((t) => (
          <button key={t} type="button" onClick={() => set({ timeLimit: t })}
            className={clsx('px-4 py-2 rounded-xl font-semibold text-sm border transition-all',
              w.timeLimit === t ? 'bg-surface-800 text-white border-surface-800' : 'bg-white border-surface-200 text-surface-600 hover:border-surface-400')}>
            {t} min
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 12 · Distribution builder ─────────────────────────────────────────
export function StepDistribution({ w, set }: BuildStepProps) {
  const sum = distSum(w);
  const ok = sum === w.totalMarks;
  const totalQ = distCount(w);
  const palette = paletteFor(w.paperType);

  const patch = (i: number, p: Partial<DistributionRowUI>) =>
    set({ distribution: w.distribution.map((d, idx) => (idx === i ? { ...d, ...p } : d)) });
  const remove = (i: number) => set({ distribution: w.distribution.filter((_, idx) => idx !== i) });
  const addRow = (t: QuestionType) => {
    if (w.distribution.some((d) => d.type === t)) { toast.error(`${TYPE_LABELS[t]} already has a row — edit it instead`); return; }
    set({ distribution: [...w.distribution, { type: t, count: 0, marks: 2, difficulty: 'any', _diff: 'any' }] });
  };

  return (
    <div>
      <StepHeading
        n={12} title="Build the mark distribution"
        hint="One row per question type. Counts × marks must equal the paper total."
        extra={<span className={clsx('text-sm font-extrabold px-3 py-1.5 rounded-full', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600')}>{sum} / {w.totalMarks}</span>}
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-surface-400 uppercase tracking-wide">Templates</span>
        <button className="btn-ghost btn-sm" onClick={() => set({ distribution: suggestRows(w.paperType, w.totalMarks) })}>
          <Wand2 className="w-3.5 h-3.5" /> Suggested mix
        </button>
        {w.paperType !== 'subjective' && w.totalMarks % 1 === 0 && (
          <button className="btn-ghost btn-sm"
            onClick={() => {
              const count = w.totalMarks / 1;
              if (count > 0) set({ distribution: [{ type: 'mcq', count, marks: 1, difficulty: 'any', _diff: 'any' }] });
            }}>
            <CircleDot className="w-3.5 h-3.5" /> All MCQ ×1
          </button>
        )}
      </div>

      {!w.distribution.length && <EmptyCard title="No rows yet" hint="Add rows below or use a template." />}

      <div className="space-y-2">
        {w.distribution.map((d, i) => (
          <div key={d.type} className={clsx('card p-3 flex flex-wrap items-center gap-3', !ok && sum > w.totalMarks && 'border-rose-300 bg-rose-50/40')}>
            <div className="w-40">
              <p className="font-bold text-sm">{TYPE_LABELS[d.type]}</p>
              <p className="text-[11px] text-surface-400">{d.count} question{d.count === 1 ? '' : 's'} · {d.count * d.marks} marks</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" className="btn-icon" disabled={d.count <= 0} onClick={() => patch(i, { count: d.count - 1 })}><Minus className="w-4 h-4" /></button>
              <input type="number" min={0} max={200} className="input w-16 text-center font-bold" value={d.count}
                onChange={(e) => patch(i, { count: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
              <button type="button" className="btn-icon" onClick={() => patch(i, { count: d.count + 1 })}><Plus className="w-4 h-4" /></button>
            </div>
            <span className="text-surface-300">×</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-surface-400">marks</span>
              <input type="number" min={1} max={100} className="input w-16 text-center font-bold" value={d.marks}
                onChange={(e) => patch(i, { marks: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
              <button type="button" className="btn-icon" disabled={d.marks <= 1} onClick={() => patch(i, { marks: d.marks - 1 })}><ChevronDown className="w-4 h-4" /></button>
              <button type="button" className="btn-icon" disabled={d.marks >= 100} onClick={() => patch(i, { marks: d.marks + 1 })}><ChevronUp className="w-4 h-4" /></button>
            </div>
            <select className="select w-32" value={d._diff}
              onChange={(e) => {
                const v = e.target.value as 'any' | Difficulty;
                patch(i, { _diff: v, difficulty: v === 'any' ? undefined : v });
              }}>
              <option value="any">Any difficulty</option>
              {DIFFS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <button type="button" className="btn-ghost btn-icon ml-auto text-rose-500" onClick={() => remove(i)} title="Remove row"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <p className="label mt-4">Add a question type</p>
      <div className="flex flex-wrap gap-2">
        {palette.filter((t) => !w.distribution.some((d) => d.type === t)).map((t) => (
          <button key={t} type="button" className="btn-ghost btn-sm" onClick={() => addRow(t)}>
            <Plus className="w-3.5 h-3.5" /> {TYPE_SHORT[t]}
          </button>
        ))}
        {palette.every((t) => w.distribution.some((d) => d.type === t)) && (
          <span className="text-xs text-surface-400 self-center">All allowed types added.</span>
        )}
      </div>

      {w.distribution.length > 0 && (
        <div className={clsx('mt-4 flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5',
          ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600')}>
          {ok
            ? <><CheckCircle2 className="w-4 h-4" /> Distribution sums to {w.totalMarks} marks ({totalQ} questions) — ready.</>
            : <><AlertTriangle className="w-4 h-4" /> Sum is {sum} but the paper total is {w.totalMarks} ({sum > w.totalMarks ? 'over by' : 'short by'} {Math.abs(sum - w.totalMarks)} marks).</>}
        </div>
      )}
    </div>
  );
}

// ─── Step 13 · Availability ─────────────────────────────────────────────────
export function StepAvailability({ w, set }: BuildStepProps) {
  const [rows, setRows] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const key = `${w.chapterIds.join(',')}|${w.topicIds.join(',')}|${w.exerciseIds.join(',')}|${w.language}`;

  const fetchAvail = useCallback(async () => {
    if (!w.chapterIds.length) { setRows(null); return; }
    setLoading(true);
    try {
      const res = await v2.catalog.availability({
        chapterIds: w.chapterIds, topicIds: w.topicIds, exerciseIds: w.exerciseIds,
        language: w.language,
      });
      const map: Record<string, number> = {};
      (res.data.data as Array<{ type: string; available: number }>).forEach((r) => { map[r.type] = r.available; });
      setRows(map);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load availability');
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { fetchAvail(); }, [fetchAvail]);

  const needed = w.distribution.filter((d) => d.count > 0);
  const anyShort = needed.some((d) => (rows ? (rows[d.type] ?? 0) : 0) < d.count);
  const requiredTotal = needed.reduce((a, d) => a + d.count, 0);

  return (
    <div>
      <StepHeading
        n={13} title="Question availability" hint="Approved, in-scope questions the server can actually draw from — identical math to the generator."
        extra={<button className="btn-ghost btn-sm" onClick={fetchAvail}><RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} /> Refresh</button>}
      />
      {loading && !rows ? <LoadingCard text="Counting approved questions…" /> : !rows ? (
        <EmptyCard icon={<Eye className="w-8 h-8" />} title="Nothing to check yet" hint="Finish the distribution first." />
      ) : (
        <div className="space-y-2">
          {needed.map((d) => {
            const avail = rows[d.type] ?? 0;
            const bad = avail < d.count;
            return (
              <div key={d.type} className={clsx('card p-3 flex items-center gap-3', bad && 'border-rose-300 bg-rose-50/40')}>
                <span className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  bad ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600')}>
                  {bad ? <AlertTriangle className="w-4.5 h-4.5" /> : <CheckCircle2 className="w-4.5 h-4.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{TYPE_LABELS[d.type]}{d._diff !== 'any' && <span className="text-xs text-surface-400 font-semibold"> · {d._diff}</span>}</p>
                  <p className="text-xs text-surface-500">required {d.count} × {d.marks} marks · {d.count * d.marks} of {w.totalMarks} marks</p>
                </div>
                <div className="text-right">
                  <p className={clsx('font-extrabold text-lg leading-tight', bad ? 'text-rose-600' : 'text-emerald-600')}>
                    {avail} <span className="text-sm font-semibold text-surface-400">available</span>
                  </p>
                  <p className="text-[11px] text-surface-400">{bad ? '⚠ short' : '✓ enough'}</p>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-xs text-surface-500">{requiredTotal} questions needed in total</p>
            {anyShort ? (
              <span className="text-xs font-bold text-rose-600 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Generator would reject this — widen chapters/topics or lower counts</span>
            ) : (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Pool is sufficient for one paper</span>
            )}
          </div>
          {anyShort && (
            <div className="card bg-amber-50/70 border-amber-200 p-3 text-sm">
              <p className="font-bold text-amber-800 mb-1">Suggestions</p>
              <ul className="list-disc ml-5 text-amber-700 text-xs space-y-0.5">
                <li>Select more chapters, or the whole book</li>
                <li>Remove topic / exercise restrictions</li>
                <li>Switch to types with bigger pools</li>
                <li>Reduce the required quantity</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 14 · Selection ────────────────────────────────────────────────────
interface PoolState { rows: QuestionRowV2[]; loading: boolean; error?: string; }
const CANON_T = (t: string) => (t === 'long' ? 'essay' : t);
const poolKeyOf = (type: string, lang: string, diff: string) => `${type}|${lang}|${diff}`;

export function StepSelection({ w, set }: BuildStepProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>(w.autoSelect ? 'auto' : 'manual');
  const [search, setSearch] = useState('');
  const [pools, setPools] = useState<Record<string, PoolState>>({});
  const needRows = w.distribution.filter((d) => d.count > 0);

  const needByType = useMemo(() => {
    const m = new Map<string, number>();
    needRows.forEach((d) => m.set(d.type, (m.get(d.type) ?? 0) + d.count));
    return m;
  }, [needRows]);
  const requiredTotal = [...needByType.values()].reduce((a, b) => a + b, 0);

  const pickedCount = Object.values(w.manualIds).reduce((a, ids) => a + ids.length, 0);
  const setTypePicks = (t: string, ids: number[]) => set({ manualIds: { ...w.manualIds, [t]: ids } });

  /** fetch every page of approved questions for one type across selected chapters */
  const loadPool = useCallback(async (row: DistributionRowUI, force = false) => {
    const k = poolKeyOf(row.type, w.language, row._diff);
    const cur = pools[k];
    if (!force && cur && !cur.loading) return;
    setPools((p) => ({ ...p, [k]: { rows: cur?.rows ?? [], loading: true } }));
    try {
      const out: QuestionRowV2[] = [];
      await Promise.all(w.chapterIds.map(async (chapterId) => {
        const base: Record<string, any> = {
          status: 'approved', chapterId, type: CANON_T(row.type), limit: 100,
        };
        if (row._diff !== 'any') base.difficulty = row._diff;
        if (w.language === 'english' || w.language === 'urdu') base.language = w.language;
        let page = 1; let total = Infinity;
        while (out.length < 400 && out.length < total) {
          const res = await v2.questions.list({ ...base, page } as any);
          const rows = res.data.data as QuestionRowV2[];
          total = (res.data as any)?.pagination?.total ?? rows.length;
          out.push(...rows);
          if (!rows.length || rows.length < 100) break;
          page += 1;
        }
      }));
      // dedupe (a question belongs to one chapter so ids stay unique)
      setPools((p) => ({ ...p, [k]: { rows: out, loading: false } }));
    } catch (e: any) {
      setPools((p) => ({ ...p, [k]: { rows: [], loading: false, error: e?.message || 'Failed to load pool' } }));
    }
  }, [w.chapterIds.join(','), w.language, pools]); // eslint-disable-line react-hooks/exhaustive-deps

  const shownRows = useMemo(() => {
    const out: QuestionRowV2[] = [];
    needRows.forEach((d) => {
      const st = pools[poolKeyOf(d.type, w.language, d._diff)];
      (st?.rows ?? []).forEach((q) => out.push(q));
    });
    const term = search.trim().toLowerCase();
    return term
      ? out.filter((q) => (q.text || '').toLowerCase().includes(term) || (q.chapterName || '').toLowerCase().includes(term))
      : out;
  }, [pools, needRows, w.language, search]); // eslint-disable-line react-hooks/exhaustive-deps

  // load pools on mount / when entering with new scope
  useEffect(() => {
    needRows.forEach((d) => { loadPool(d, false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.chapterIds.join(','), w.language, needRows.map((d) => `${d.type}:${d._diff}`).join('|')]);

  const togglePick = (q: QuestionRowV2) => {
    const t = q.type;
    const cur = w.manualIds[t] ?? [];
    setTypePicks(t, cur.includes(q.id) ? cur.filter((x) => x !== q.id) : [...cur, q.id]);
  };
  const fillRandom = (t: string) => {
    const cur = w.manualIds[t] ?? [];
    const need = needByType.get(t) ?? 0;
    const poolRows = shownRows.filter((q) => q.type === t && !cur.includes(q.id));
    if (poolRows.length + cur.length < need) {
      toast.error(`Only ${poolRows.length + cur.length} candidates available for ${TYPE_LABELS[t]} (need ${need})`);
      return;
    }
    const shuffled = [...poolRows].sort(() => Math.random() - 0.5);
    setTypePicks(t, [...cur, ...shuffled.slice(0, need - cur.length).map((q) => q.id)]);
    toast.success(`${TYPE_LABELS[t]}: ${need} selected`);
  };
  const allFilled = needRows.every((d) => (w.manualIds[d.type]?.length ?? 0) >= (needByType.get(d.type) ?? 0));
  const hasDup = needRows.some((d) => new Set(w.manualIds[d.type] ?? []).size !== (w.manualIds[d.type]?.length ?? 0));

  return (
    <div>
      <StepHeading
        n={14} title="Selection"
        hint="Auto lets the server balance chapters and avoid duplicates; Manual gives full control."
        extra={<span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full">{pickedCount} / {requiredTotal} picked</span>}
      />
      <div className="flex items-center gap-2 mb-4">
        <button className={clsx('btn-sm', mode === 'auto' ? 'btn-primary' : 'btn-ghost')}
          onClick={() => { setMode('auto'); set({ autoSelect: true }); }}>
          <Wand2 className="w-4 h-4" /> Auto select (recommended)
        </button>
        <button className={clsx('btn-sm', mode === 'manual' ? 'btn-primary' : 'btn-ghost')}
          onClick={() => { setMode('manual'); set({ autoSelect: false }); }}>
          <Eye className="w-4 h-4" /> Manual pick
        </button>
      </div>

      {mode === 'auto' ? (
        <div className="card bg-emerald-50/50 border-emerald-200 p-4 text-sm">
          <p className="font-bold text-emerald-800 flex items-center gap-2"><Wand2 className="w-4 h-4" /> Server-driven round-robin</p>
          <ul className="list-disc ml-5 text-emerald-700 text-xs mt-1 space-y-1">
            <li>Chapters are balanced evenly; one paper never contains a duplicate question</li>
            <li>Multiple papers stay disjoint while the pool allows it — otherwise reuse is honest and reported as a warning</li>
            <li>Picks are only ever approved questions inside your assigned scope</li>
          </ul>
        </div>
      ) : (
        <>
          <div className="card p-3 mb-3 flex flex-wrap items-center gap-2">
            <Search className="w-4 h-4 text-surface-400" />
            <input className="input flex-1 min-w-[220px]" placeholder="Search candidates (text / chapter)…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="text-xs text-surface-400">{shownRows.length} candidates shown</span>
          </div>
          {needRows.map((d) => {
            const k = poolKeyOf(d.type, w.language, d._diff);
            const st = pools[k];
            const need = needByType.get(d.type) ?? 0;
            const picked = (w.manualIds[d.type] ?? []).length;
            const done = picked >= need;
            const rows = (st?.rows ?? []).filter((q) => !search.trim() || (q.text || '').toLowerCase().includes(search.trim().toLowerCase()) || (q.chapterName || '').toLowerCase().includes(search.trim().toLowerCase()));
            return (
              <div key={d.type} className={clsx('card p-3 mb-3', done && 'border-emerald-300 bg-emerald-50/30')}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="font-bold text-sm flex-1 min-w-[150px]">{TYPE_LABELS[d.type]}</p>
                  <span className={clsx('text-xs font-extrabold px-2.5 py-1 rounded-full', done ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-600')}>
                    {picked} / {need} picked
                  </span>
                  <button className="btn-ghost btn-sm" onClick={() => fillRandom(d.type)}><Dices className="w-3.5 h-3.5" /> Auto fill</button>
                  <button className="btn-ghost btn-sm text-rose-500" disabled={!picked} onClick={() => setTypePicks(d.type, [])}><Eraser className="w-3.5 h-3.5" /> Clear</button>
                  <button className="btn-ghost btn-sm" onClick={() => loadPool(d, true)}><RefreshCw className="w-3.5 h-3.5" /> Reload</button>
                </div>
                {st?.error && <p className="text-xs text-rose-500">{st.error}</p>}
                {!st ? null : st.loading ? (
                  <div className="flex items-center gap-2 text-xs text-surface-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading candidates…</div>
                ) : rows.length === 0 ? (
                  <p className="text-xs text-surface-400 py-1">No approved candidates in scope for this type{search.trim() ? ' matching the search' : ''}.</p>
                ) : (
                  <div className="divide-y divide-surface-100 max-h-64 overflow-auto rounded-xl border border-surface-100">
                    {rows.map((q) => {
                      const on = (w.manualIds[d.type] ?? []).includes(q.id);
                      return (
                        <button key={q.id} type="button" onClick={() => togglePick(q)}
                          className={clsx('w-full text-left flex items-start gap-2.5 px-3 py-2 hover:bg-surface-50 transition-colors', on && 'bg-brand-50')}>
                          <span className={clsx('w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center', on ? 'bg-brand-600 border-brand-600' : 'border-surface-300')}>
                            {on && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </span>
                          <span className="flex-1">
                            <span className="block text-xs text-surface-700 leading-snug">{q.text}</span>
                            <span className="text-[10.5px] text-surface-400">
                              Ch {q.chapterNumber ?? '—'} {q.chapterName ? `· ${q.chapterName}` : ''} · {q.difficulty}{q.type === 'mcq' && optionEntries(q.options).length ? ` · ${optionEntries(q.options).length} options` : ''}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {hasDup && <p className="text-xs text-rose-600 font-semibold mb-2">Duplicate question inside one type — fix before generating.</p>}
          {needRows.length > 0 && (
            <div className={clsx('rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2',
              allFilled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
              {allFilled
                ? <><CheckCircle2 className="w-4 h-4" /> Every type is filled ({pickedCount} questions) — ready to generate.</>
                : <><AlertTriangle className="w-4 h-4" /> Fill every type to the required count ({pickedCount} / {requiredTotal}).</>}
            </div>
          )}
        </>
      )}

      <div className="card p-3 mt-4">
        <p className="label">Number of papers</p>
        <div className="flex items-center gap-2">
          {[1, 2, 5, 10, 20].map((n) => (
            <button key={n} type="button" onClick={() => set({ paperCount: n })}
              className={clsx('px-4 py-2 rounded-xl font-bold text-sm border', w.paperCount === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-200 text-surface-600 hover:border-brand-300')}>
              {n}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-surface-400 mt-2">
          Tip: if the approved pool cannot stay unique across all papers, the server reports honest reuse warnings instead of silently repeating.
        </p>
      </div>
    </div>
  );
}
