/**
 * PHASE 4 — Step 2: chapter checklist with live approved-question counts and
 * optional exercise drill-down per chapter. Data: /v4/wizard/chapters
 * (server-scoped for teachers).
 */
import { useEffect, useState } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import clsx from 'clsx';
import { v4 } from '../../../api/v4';
import { StepHeading, LoadingCard, EmptyCard } from '../generate/wizUI';
import type { W5State } from './state';

export default function Step2Chapters({ w, set }: { w: W5State; set: (p: Partial<W5State>) => void }) {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!w.subjectId) return;
    setLoading(true);
    v4.wizard.chapters(w.subjectId, w.bookId)
      .then((r) => set({ chapters: r.data.data ?? [] }))
      .catch(() => set({ chapters: [] }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.subjectId, w.bookId]);

  const toggleChapter = (id: number) => {
    const on = w.chapterIds.includes(id);
    const exerciseSel = { ...w.exerciseSel };
    if (on) delete exerciseSel[id];
    set({
      chapterIds: on ? w.chapterIds.filter((x) => x !== id) : [...w.chapterIds, id],
      exerciseSel,
    });
  };

  const toggleExercise = (chapterId: number, exId: number) => {
    const cur = w.exerciseSel[chapterId] ?? [];
    const next = cur.includes(exId) ? cur.filter((x) => x !== exId) : [...cur, exId];
    set({ exerciseSel: { ...w.exerciseSel, [chapterId]: next } });
  };

  const totalApproved = w.chapters
    .filter((c) => w.chapterIds.includes(c.id))
    .reduce((a, c) => {
      const exs = w.exerciseSel[c.id] ?? [];
      if (!exs.length) return a + c.approved;
      return a + c.exercises.filter((e) => exs.includes(e.id)).reduce((x, e) => x + e.approved, 0);
    }, 0);

  return (
    <div>
      <StepHeading n={2} title="Select chapters"
        hint="Tick whole chapters — or open one and narrow to specific exercises."
        extra={<span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5">{totalApproved} approved questions in scope</span>} />
      {loading ? <LoadingCard /> : w.chapters.length === 0 ? (
        <EmptyCard icon={<ListChecks className="w-8 h-8" />} title="No chapters for this book yet" hint="Ask an admin to load the syllabus." />
      ) : (
        <div className="space-y-2">
          {w.chapters.map((c) => {
            const on = w.chapterIds.includes(c.id);
            const exs = w.exerciseSel[c.id] ?? [];
            return (
              <div key={c.id} className={clsx('card overflow-hidden', on && 'border-brand-400 ring-1 ring-brand-300')}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <input id={`ch-${c.id}`} type="checkbox" checked={on} onChange={() => toggleChapter(c.id)}
                    className="w-4.5 h-4.5 accent-brand-600 cursor-pointer" />
                  <label htmlFor={`ch-${c.id}`} className="flex-1 cursor-pointer min-w-0">
                    <span className="font-semibold text-sm text-surface-900">
                      <span className="text-surface-400 font-mono mr-2">{String(c.number).padStart(2, '0')}</span>{c.name}
                    </span>
                  </label>
                  <span className="text-[11px] font-bold text-surface-500 bg-surface-100 rounded-full px-2.5 py-1" title="approved questions">
                    {c.approved} Qs
                  </span>
                  {c.exercises.length > 0 && (
                    <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)}
                      className="text-xs font-semibold text-brand-700 inline-flex items-center gap-1 hover:underline">
                      <ChevronDown className={clsx('w-4 h-4 transition-transform', open === c.id && 'rotate-180')} />
                      Exercises
                    </button>
                  )}
                </div>
                {open === c.id && c.exercises.length > 0 && (
                  <div className="border-t border-surface-100 bg-surface-50/60 px-5 py-3 space-y-1.5">
                    <p className="text-[11px] text-surface-500">Nothing ticked = the whole chapter is in scope.</p>
                    {c.exercises.map((e) => (
                      <label key={e.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                        <input type="checkbox" checked={exs.includes(e.id)} onChange={() => toggleExercise(c.id, e.id)}
                          className="w-4 h-4 accent-brand-600" />
                        <span className="font-medium text-surface-800">{e.name}</span>
                        <span className="text-[11px] font-bold text-surface-400">{e.approved} Qs</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
