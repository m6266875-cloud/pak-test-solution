/**
 * PHASE 4 — Step 4: server auto-generates a candidate pool (paginated) and
 * pre-checks enough questions to hit the target marks. The teacher edits the
 * selection, shuffles for a different random set, or manually searches/adds
 * within the same scope. Live running marks vs target.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Search, Plus, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { v4, CandidateQuestion } from '../../../api/v4';
import { StepHeading } from '../generate/wizUI';
import { TYPE_LABELS, TYPE_ORDER, optionEntries } from '../paperUtils';
import { selectedMarks, W5State } from './state';

export default function Step4Select({ w, set }: { w: W5State; set: (p: Partial<W5State>) => void }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateQuestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [appending, setAppending] = useState(false);

  const scopeBody = useCallback(() => ({
    courseId: w.courseId ?? null,
    classId: w.classId!,
    subjectId: w.subjectId!,
    bookId: w.bookId ?? null,
    chapterIds: w.chapterIds,
    exerciseIds: Object.values(w.exerciseSel).flat(),
    paperType: w.paperType,
    language: w.language,
  }), [w.courseId, w.classId, w.subjectId, w.bookId, w.chapterIds, w.exerciseSel, w.paperType, w.language]);

  const requiredByType = useMemo(() => {
    const m: Record<string, { count: number; marks: number }> = {};
    for (const d of w.distribution) {
      if (!m[d.type]) m[d.type] = { count: 0, marks: d.marks };
      m[d.type].count += d.count;
    }
    return m;
  }, [w.distribution]);

  /** fetch candidates + pre-select; reset selection to the auto pick. */
  const load = useCallback(async (seed: number, resetPage = true) => {
    setLoading(true);
    try {
      const r = await v4.wizard.candidates({
        ...scopeBody(), distribution: w.distribution, seed, page: 1, limit: 50,
      });
      const d = r.data.data;
      const poolRows: Record<string, CandidateQuestion[]> = {};
      const poolTotal: Record<string, number> = {};
      for (const row of d.rows) {
        (poolRows[row.type] ??= []).push(row);
      }
      for (const p of d.preselected) {
        for (const row of p.rows) {
          const arr = (poolRows[row.type] ??= []);
          if (!arr.some((x) => x.id === row.id)) arr.push(row);
        }
      }
      const selected: Record<string, number[]> = {};
      const marksByType: Record<string, number> = {};
      for (const p of d.preselected) {
        selected[p.type] = p.ids.slice();
        marksByType[p.type] = p.marks;
      }
      for (const [t, v] of Object.entries(requiredByType)) marksByType[t] ??= v.marks;
      poolTotal.all = d.pagination.total;
      set({ seed, selected, marksByType, poolRows, poolTotal, page: 1 });
    } catch (e: any) {
      console.error(e);
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeBody, JSON.stringify(w.distribution), requiredByType]);

  useEffect(() => { load(w.seed); /* on entering step 4 */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    setAppending(true);
    try {
      const r = await v4.wizard.candidates({
        ...scopeBody(), distribution: w.distribution, seed: w.seed, page: w.page + 1, limit: 50,
      });
      const d = r.data.data;
      const poolRows = { ...w.poolRows };
      for (const row of d.rows) {
        const arr = (poolRows[row.type] ??= []);
        if (!arr.some((x) => x.id === row.id)) arr.push(row);
      }
      set({ poolRows, page: w.page + 1 });
    } finally { setAppending(false); }
  };

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await v4.wizard.search({ ...scopeBody(), search: search.trim(), page: 1, limit: 20 });
      setSearchResults(r.data.data.rows ?? []);
    } finally { setSearching(false); }
  };

  const toggle = (q: CandidateQuestion) => {
    const cur = w.selected[q.type] ?? [];
    const next = cur.includes(q.id) ? cur.filter((x) => x !== q.id) : [...cur, q.id];
    set({ selected: { ...w.selected, [q.type]: next } });
  };

  const addFromSearch = (q: CandidateQuestion) => {
    const cur = w.selected[q.type] ?? [];
    if (cur.includes(q.id)) return;
    const poolRows = { ...w.poolRows };
    const arr = (poolRows[q.type] ??= []);
    if (!arr.some((x) => x.id === q.id)) arr.push(q);
    set({ selected: { ...w.selected, [q.type]: [...cur, q.id] }, poolRows });
  };

  const picked = selectedMarks(w);
  const matched = picked === w.totalMarks;

  const typesToShow = TYPE_ORDER.filter((t) => (requiredByType[t]?.count ?? 0) > 0 || (w.poolRows[t]?.length ?? 0) > 0);

  return (
    <div className="space-y-5">
      <StepHeading n={4} title="Review & select questions"
        hint="Auto-picked to hit your marks — edit freely, shuffle for a new random set, or search to add more."
        extra={
          <button type="button" onClick={() => { setSearchResults([]); load(w.seed + 1); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-full px-3 py-1.5">
            <RefreshCcw className="w-3.5 h-3.5" /> Shuffle
          </button>
        } />

      {/* running marks meter */}
      <div className={clsx('card px-4 py-3 flex items-center gap-4 border-2', matched ? 'border-brand-500 bg-brand-50' : 'border-surface-200')}>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-surface-600">Selected marks</span>
            <span className={matched ? 'text-brand-700' : 'text-amber-600'}>{picked} / {w.totalMarks}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
            <div className={clsx('h-full rounded-full transition-all', matched ? 'bg-brand-600' : 'bg-amber-500')}
              style={{ width: `${Math.min(100, (picked / Math.max(1, w.totalMarks)) * 100)}%` }} />
          </div>
        </div>
        {matched && <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700"><CheckCircle2 className="w-4 h-4" /> Matches target</span>}
      </div>

      {/* manual search within scope */}
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Search the question bank within this scope…"
          className="flex-1 rounded-xl border border-surface-200 px-4 py-2.5 text-sm" />
        <button type="button" onClick={doSearch} disabled={searching}
          className="inline-flex items-center gap-2 text-sm font-bold text-surface-700 bg-white border border-surface-200 hover:border-brand-400 rounded-xl px-4 py-2.5">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
        </button>
      </div>
      {searchResults.length > 0 && (
        <div className="card divide-y divide-surface-100 max-h-72 overflow-auto">
          {searchResults.map((q) => (
            <div key={q.id} className="px-4 py-2.5 flex items-start gap-3">
              <div className="flex-1 min-w-0 text-sm text-surface-800">
                <span className="font-bold text-[10.5px] uppercase tracking-wide text-surface-400 mr-2">{TYPE_LABELS[q.type]}</span>
                {q.text}
              </div>
              <button type="button" onClick={() => addFromSearch(q)}
                disabled={(w.selected[q.type] ?? []).includes(q.id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card py-10 flex items-center justify-center gap-3 text-surface-500">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> <span className="text-sm font-medium">Building candidate pool…</span>
        </div>
      ) : (
        <div className="space-y-5">
          {typesToShow.map((t) => {
            const rows = w.poolRows[t] ?? [];
            const need = requiredByType[t]?.count ?? 0;
            const have = (w.selected[t] ?? []).length;
            return (
              <div key={t}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold text-surface-800">{TYPE_LABELS[t]}</h3>
                  <span className={clsx('text-[11px] font-bold rounded-full px-2.5 py-0.5', have === need ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700')}>
                    {have} / {need} selected · {w.marksByType[t] ?? 1} mk each
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="text-xs text-surface-400">No approved {TYPE_LABELS[t]}s in the selected scope.</p>
                ) : (
                  <div className="card divide-y divide-surface-100">
                    {rows.map((q) => {
                      const on = (w.selected[t] ?? []).includes(q.id);
                      const opts = optionEntries(q.options);
                      return (
                        <label key={q.id} className={clsx('flex items-start gap-3 px-4 py-2.5 cursor-pointer', on && 'bg-brand-50/60')}>
                          <input type="checkbox" checked={on} onChange={() => toggle(q)} className="mt-1 w-4 h-4 accent-brand-600" />
                          <span className="flex-1 min-w-0 text-sm text-surface-800">
                            {q.text}
                            {opts.length > 0 && (
                              <span className="block text-xs text-surface-500 mt-0.5">
                                {opts.map(([l, txt]) => `${l}) ${txt}`).join('  ·  ')}
                              </span>
                            )}
                            <span className="block text-[10.5px] text-surface-400 mt-0.5">
                              Ch {q.chapterNo}{q.exerciseNo ? ` · Ex ${q.exerciseNo}` : ''} · {q.difficulty}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={loadMore} disabled={appending}
            className="w-full text-xs font-bold text-surface-600 bg-white border border-surface-200 hover:border-brand-400 rounded-xl py-2.5 inline-flex items-center justify-center gap-2">
            {appending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Load more candidates
          </button>
        </div>
      )}
    </div>
  );
}
