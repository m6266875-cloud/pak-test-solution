/**
 * PHASE 4 wizard · Step 2 — Chapters & exercises.
 * Select-all / per-chapter checkboxes with live counts, plus optional
 * exercise drill-in (fetched on expand, any-exercise-selected narrows scope).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { v2 } from '../../../../api/v2';
import type { ChapterV2, ExerciseV2 } from '../../../../types';
import type { W5State } from '../wizard5';

interface Props { state: W5State; setState: (fn: (s: W5State) => W5State) => void }

export default function ChaptersStep5({ state, setState }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingExercises, setLoadingExercises] = useState<number | null>(null);
  const fetchedFor = useRef('');
  const set = (p: Partial<W5State>) => setState((s) => ({ ...s, ...p }));

  // load chapters once per scope (refetch when book changes, skip on revisit)
  useEffect(() => {
    if (state.subjectId == null) return;
    const key = `${state.subjectId}:${state.bookId ?? 'any'}`;
    if (fetchedFor.current === key) { setLoading(false); return; }
    fetchedFor.current = key;
    let alive = true;
    setLoading(true); setError('');
    v2.catalog.subjectChapters(state.subjectId, state.bookId ?? undefined)
      .then((r) => { const rows = r.data.data as ChapterV2[];
        if (!alive) return;
        // preserve selections that still exist under the new scope
        const ids = new Set(rows.map((c) => c.id));
        setState((s) => ({
          ...s,
          chapters: rows,
          chapterIds: rows.length && !s.chapterIds.length ? rows.map((c) => c.id) : s.chapterIds.filter((id) => ids.has(id)),
        }));
      })
      .catch((e: any) => { if (alive) { setError(e.message || 'Failed to load chapters'); fetchedFor.current = ''; } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.subjectId, state.bookId]);

  const toggleChapter = (id: number) =>
    set({ chapterIds: state.chapterIds.includes(id) ? state.chapterIds.filter((c) => c !== id) : [...state.chapterIds, id] });

  const selectAll = (on: boolean) =>
    set({ chapterIds: on ? state.chapters.map((c) => c.id) : [] });

  const toggleExpand = (id: number) => {
    const expanded = state.expandedChapters.includes(id);
    set({ expandedChapters: expanded ? state.expandedChapters.filter((c) => c !== id) : [...state.expandedChapters, id] });
    if (!expanded && !state.exercisesByChapter[id]) {
      setLoadingExercises(id);
      v2.catalog.chapterExercises(id)
        .then((r) => setState((s) => ({ ...s, exercisesByChapter: { ...s.exercisesByChapter, [id]: r.data.data as ExerciseV2[] } })))
        .catch((e: any) => setError(e.message || 'Failed to load exercises'))
        .finally(() => setLoadingExercises(null));
    }
  };

  const toggleExercise = (id: number) =>
    set({ exerciseIds: state.exerciseIds.includes(id) ? state.exerciseIds.filter((e) => e !== id) : [...state.exerciseIds, id] });

  const selCounts = useMemo(
    () => state.chapters.filter((c) => state.chapterIds.includes(c.id)),
    [state.chapters, state.chapterIds],
  );
  const covered = useMemo(
    () => selCounts.reduce((a, c) => a + (c.approvedQuestionCount ?? 0), 0),
    [selCounts],
  );

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading chapters…</p>;

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {!state.chapters.length && !error && (
        <p className="py-8 text-center text-sm text-slate-500">No chapters found for this subject{state.bookId ? ' and book' : ''}.</p>
      )}
      {state.chapters.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{state.chapterIds.length}</span> of {state.chapters.length} chapters
              {' · '}<span className="font-semibold text-slate-900">{covered}</span> questions covered
              {state.exerciseIds.length > 0 && (
                <> · narrowed to <span className="font-semibold text-indigo-600">{state.exerciseIds.length} exercise{state.exerciseIds.length === 1 ? '' : 's'}</span></>
              )}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => selectAll(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">Select all</button>
              <button type="button" onClick={() => selectAll(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">Clear</button>
            </div>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {state.chapters.map((c) => {
              const checked = state.chapterIds.includes(c.id);
              const expanded = state.expandedChapters.includes(c.id);
              const exercises = state.exercisesByChapter[c.id];
              const exSel = exercises?.filter((e) => state.exerciseIds.includes(e.id)) ?? [];
              return (
                <div key={c.id} className={`rounded-xl border ${checked ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox" checked={checked} onChange={() => toggleChapter(c.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <button type="button" onClick={() => toggleChapter(c.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {c.number != null ? `Ch ${c.number} · ` : ''}{c.name}
                      </span>
                    </button>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {c.approvedQuestionCount ?? 0} Qs
                    </span>
                    <button
                      type="button" onClick={() => toggleExpand(c.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      {loadingExercises === c.id ? '…' : expanded ? 'Hide' : `Exercises${exSel.length ? ` (${exSel.length})` : ''}`}
                    </button>
                  </div>
                  {expanded && (
                    <div className="border-t border-indigo-100 px-4 py-2.5 pl-11">
                      {loadingExercises === c.id && <p className="text-xs text-slate-500">Loading exercises…</p>}
                      {exercises && !exercises.length && <p className="text-xs text-slate-500">No exercises in this chapter.</p>}
                      {exercises && exercises.length > 0 && (
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {exercises.map((e) => (
                            <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-indigo-50">
                              <input
                                type="checkbox"
                                checked={state.exerciseIds.includes(e.id)}
                                onChange={() => toggleExercise(e.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="truncate">{e.number ? `Ex ${e.number} · ` : ''}{e.name}</span>
                              <span className="ml-auto shrink-0 text-[11px] text-slate-400">{e.approvedQuestionCount ?? 0}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {state.exerciseIds.length > 0 && (
            <button
              type="button" onClick={() => set({ exerciseIds: [] })}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Clear exercise filter — use all questions from selected chapters
            </button>
          )}
        </>
      )}
    </div>
  );
}
