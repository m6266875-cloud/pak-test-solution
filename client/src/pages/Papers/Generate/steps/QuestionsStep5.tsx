/**
 * PHASE 4 wizard · Step 4 — question selection.
 * The pool is pre-filtered by the server (chapters/exercises from Step 2,
 * language + breakdown from Step 3). Review the auto-pick, swap questions,
 * shuffle for a fresh mix, or add any question manually. Pool browsing is
 * paginated so banks of any size stay fast.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v2 } from '../../../../api/v2';
import type { PreviewPoolCandidate, PreviewPoolResult } from '../../../../types';
import { TYPE_LABELS, TYPE_SHORT } from '../../shared/paperUtils';

const LANG_TAGS: Record<string, string> = { english: 'EN', urdu: 'UR', bilingual: 'BI' };
import type { W5State } from '../wizard5';
import { buildGeneratePayload5, distPayload5 } from '../wizard5';

interface Props { state: W5State; setState: (fn: (s: W5State) => W5State) => void }

const pickRowBtn =
  'rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-30';

export default function QuestionsStep5({ state, setState }: Props) {
  const [pool, setPool] = useState<PreviewPoolResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<string>('__all');
  const [cache, setCache] = useState<Record<number, PreviewPoolCandidate>>({});
  const bootedRef = useRef(false);
  const set = (p: Partial<W5State>) => setState((s) => ({ ...s, ...p }));

  const anchor = JSON.stringify({
    c: state.chapterIds, e: state.exerciseIds, l: state.language,
    p: state.paperType, d: distPayload5(state), m: state.totalMarks,
  });
  const rows = state.distribution.filter((d) => d.count > 0);
  const needByType = useMemo(() => Object.fromEntries(rows.map((d) => [d.type, d.count])), [state.distribution]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickedByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const id of state.selectedIds) {
      const t = state.selectedMeta[id];
      if (t) m[t] = (m[t] ?? 0) + 1;
    }
    return m;
  }, [state.selectedIds, state.selectedMeta]);

  const fetchPool = useCallback(async (p: number, q: string) => {
    setLoading(true); setError('');
    try {
      const payload = buildGeneratePayload5(state);
      const axiosRes = await v2.papers.previewPool({
        chapterIds: payload.chapterIds, topicIds: [], exerciseIds: payload.exerciseIds,
        language: payload.language, type: 'any', difficulty: 'any',
        search: q.trim() || undefined, paperType: payload.paperType,
        distribution: payload.distribution, excludeIds: [],
        page: p, limit: 15,
      });
      const res = axiosRes.data.data as PreviewPoolResult;
      setPool(res);
      setCache((prev) => {
        const next = { ...prev };
        for (const c of [...res.rows, ...(res.suggestedRows ?? [])]) next[c.id] = c;
        return next;
      });
      setPage(p);
      return res;
    } catch (e: any) {
      setError(e.message || 'Failed to load the question pool');
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // Initial load: auto-fill on first arrival or when the build changed since
  // the last fill; keep the teacher's manual edits when just revisiting the
  // step (the step unmounts on navigation, so the last-filled anchor must
  // live in wizard state, not in a ref).
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    fetchPool(1, '').then((res) => {
      if (!res) { bootedRef.current = false; return; }
      const byId: Record<number, PreviewPoolCandidate> = {};
      for (const c of [...res.rows, ...(res.suggestedRows ?? [])]) byId[c.id] = c;
      setState((s) => {
        if (s.selectionReady && s.lastFilledAnchor === anchor) {
          return { ...s, countsByType: res.countsByType };
        }
        const ids = (res.suggestedIds ?? []).filter((id) => byId[id]);
        const meta: Record<number, string> = {};
        for (const id of ids) meta[id] = byId[id].type;
        return { ...s, selectedIds: ids, selectedMeta: meta, selectionReady: true, lastFilledAnchor: anchor, countsByType: res.countsByType };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (c: PreviewPoolCandidate) => {
    if (state.selectedIds.includes(c.id)) return;
    if ((pickedByType[c.type] ?? 0) >= (needByType[c.type] ?? 0)) return;
    set({ selectedIds: [...state.selectedIds, c.id], selectedMeta: { ...state.selectedMeta, [c.id]: c.type } });
  };
  const remove = (id: number) =>
    set({
      selectedIds: state.selectedIds.filter((x) => x !== id),
      selectedMeta: Object.fromEntries(Object.entries(state.selectedMeta).filter(([k]) => Number(k) !== id)),
    });

  /** fresh random mix from everything seen so far (suggested + browsed) */
  const shuffle = () => {
    const seen = Object.values(cache);
    const ids: number[] = [];
    const meta: Record<number, string> = {};
    for (const row of rows) {
      const cands = seen.filter((c) => c.type === row.type && !ids.includes(c.id));
      for (let i = cands.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cands[i], cands[j]] = [cands[j], cands[i]];
      }
      for (const c of cands.slice(0, row.count)) { ids.push(c.id); meta[c.id] = c.type; }
    }
    set({ selectedIds: ids, selectedMeta: meta });
  };

  const onSearch = () => { fetchPool(1, search); };
  const filtered = useMemo(() => {
    const list = [...(pool?.rows ?? [])].sort((a, b) => a.id - b.id);
    return tab === '__all' ? list : list.filter((c) => c.type === tab);
  }, [pool, tab]);
  const totalPages = Math.max(1, Math.ceil((pool?.total ?? 0) / (pool?.limit ?? 15)));

  const langTag = (c: PreviewPoolCandidate) => LANG_TAGS[c.language] ?? c.language?.slice(0, 2).toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* ── picked column ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">
            Selected <span className="text-indigo-600">{state.selectedIds.length}</span>
            {' / '}{rows.reduce((a, r) => a + r.count, 0)}
          </p>
          <button type="button" onClick={shuffle} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
            🔀 Shuffle
          </button>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {rows.map((r) => {
            const have = pickedByType[r.type] ?? 0;
            const ok = have === r.count;
            return (
              <span key={r.type} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {TYPE_SHORT[r.type] ?? r.type}: {have}/{r.count}
              </span>
            );
          })}
          {!rows.length && <span className="text-xs text-slate-400">No breakdown rows — go back to Step 3.</span>}
        </div>
        <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
          {state.selectedIds.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
              Nothing picked yet — add from the pool or press Shuffle for an auto-mix.
            </p>
          )}
          {state.selectedIds.map((id, i) => {
            const c = cache[id];
            return (
              <div key={id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="mt-0.5 w-6 shrink-0 text-xs font-bold text-slate-400">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">{c ? c.text.replace(/<[^>]*>/g, '').slice(0, 90) : `#${id}`}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {c ? `${TYPE_LABELS[c.type] ?? c.type} · Ch ${c.chapterNumber ?? '–'} · ${c.difficulty}` : 'loading…'}
                  </p>
                </div>
                <button type="button" onClick={() => remove(id)} title="Remove" className="shrink-0 rounded px-1.5 py-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600">✕</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── pool column ── */}
      <div className="lg:col-span-3">
        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="mb-2 flex gap-2">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search the pool by keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
          />
          <button type="button" onClick={onSearch} disabled={loading} className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? '…' : 'Search'}
          </button>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button" onClick={() => setTab('__all')}
            className={`rounded-full px-3 py-1 text-xs font-bold ${tab === '__all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All ({pool?.total ?? 0})
          </button>
          {rows.map((r) => (
            <button
              key={r.type} type="button" onClick={() => setTab(r.type)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${tab === r.type ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {TYPE_LABELS[r.type] ?? r.type} ({state.countsByType[r.type] ?? 0})
            </button>
          ))}
        </div>
        <div className="max-h-[330px] space-y-1.5 overflow-y-auto pr-1">
          {loading && <p className="py-6 text-center text-sm text-slate-500">Loading pool…</p>}
          {!loading && !filtered.length && <p className="py-6 text-center text-sm text-slate-500">No questions match — widen the scope or clear the search.</p>}
          {filtered.map((c) => {
            const picked = state.selectedIds.includes(c.id);
            const full = (pickedByType[c.type] ?? 0) >= (needByType[c.type] ?? 0);
            return (
              <div key={c.id} className={`rounded-xl border px-3 py-2 ${picked ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{c.text.replace(/<[^>]*>/g, '').slice(0, 140)}{c.text.length > 140 ? '…' : ''}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">{TYPE_LABELS[c.type] ?? c.type}</span>
                      <span>Ch {c.chapterNumber ?? '–'}{c.exerciseNumber ? ` · Ex ${c.exerciseNumber}` : ''}</span>
                      <span>·</span><span>{c.difficulty}</span>
                      <span>·</span><span>{langTag(c)}</span>
                      <span>·</span><span>{c.marks} mark{c.marks === 1 ? '' : 's'}</span>
                    </p>
                  </div>
                  {picked
                    ? <button type="button" onClick={() => remove(c.id)} className="shrink-0 rounded-lg border border-indigo-300 bg-white px-2 py-0.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50">✓ Picked</button>
                    : <button type="button" onClick={() => add(c)} disabled={full} title={full ? `Row full (${needByType[c.type] ?? 0})` : 'Add to paper'} className={pickRowBtn}>+ Add</button>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <button type="button" disabled={page <= 1 || loading} onClick={() => fetchPool(page - 1, search)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40">← Prev</button>
          <span>Page <span className="font-bold text-slate-700">{page}</span> of {totalPages} · {pool?.total ?? 0} questions</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => fetchPool(page + 1, search)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Next →</button>
        </div>
      </div>
    </div>
  );
}
