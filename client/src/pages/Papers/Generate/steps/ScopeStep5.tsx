/**
 * PHASE 4 wizard · Step 1 — Scope.
 * Course → Class → Subject (single) → Book (optional, auto-picked when only 1).
 */
import { useEffect, useRef, useState } from 'react';
import { v2 } from '../../../../api/v2';
import type { W5State } from '../wizard5';

interface Props { state: W5State; setState: (fn: (s: W5State) => W5State) => void }

export default function ScopeStep5({ state, setState }: Props) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const backfilled = useRef(new Set<string>());
  const set = (p: Partial<W5State>) => setState((s) => ({ ...s, ...p }));

  // courses on mount
  useEffect(() => {
    let alive = true;
    setLoading('courses');
    v2.catalog.courses()
      .then((r) => { if (alive) set({ courses: r.data.data }); })
      .catch((e: any) => { if (alive) setError(e.message || 'Failed to load courses'); })
      .finally(() => { if (alive) setLoading(''); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickCourse = (id?: number) => {
    set({
      courseId: id, classId: undefined, subjectId: undefined, bookId: undefined,
      classes: [], subjects: [], books: [], chapters: [],
      chapterIds: [], exercisesByChapter: {}, exerciseIds: [],
      expandedChapters: [], countsByType: {}, selectedIds: [],
      selectedMeta: {}, selectionReady: false,
      paperId: undefined, warnings: [],
    });
    if (id == null) return;
    setLoading('classes'); setError('');
    v2.catalog.courseClasses(id)
      .then((r) => set({ classes: r.data.data }))
      .catch((e: any) => setError(e.message || 'Failed to load classes'))
      .finally(() => setLoading(''));
  };

  const pickClass = (id?: number) => {
    set({
      classId: id, subjectId: undefined, bookId: undefined,
      subjects: [], books: [], chapters: [],
      chapterIds: [], exercisesByChapter: {}, exerciseIds: [],
      expandedChapters: [], countsByType: {}, selectedIds: [],
      selectedMeta: {}, selectionReady: false,
      paperId: undefined, warnings: [],
    });
    if (id == null) return;
    setLoading('subjects'); setError('');
    v2.catalog.classSubjects(id, state.courseId ?? undefined)
      .then((r) => set({ subjects: r.data.data }))

      .catch((e: any) => setError(e.message || 'Failed to load subjects'))
      .finally(() => setLoading(''));
  };

  const pickSubject = (id?: number) => {
    set({
      subjectId: id, bookId: undefined, books: [], chapters: [],
      chapterIds: [], exercisesByChapter: {}, exerciseIds: [],
      expandedChapters: [], countsByType: {}, selectedIds: [],
      selectedMeta: {}, selectionReady: false,
      paperId: undefined, warnings: [],
    });
    if (id == null) return;
    setLoading('books'); setError('');
    v2.catalog.subjectBooks(id)
      .then((r) => { const rows = r.data.data; return set({
        books: rows,
        // single book available for this subject → select it automatically
        bookId: rows.length === 1 ? rows[0].id : undefined,
      }); })
      .catch((e: any) => setError(e.message || 'Failed to load books'))
      .finally(() => setLoading(''));
  };

  const cascade4 = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4';
  const sel =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400';
  const lab = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div>
      <div className={cascade4}>
        <div>
          <label className={lab}>Board / Course</label>
          <select
            className={sel}
            value={state.courseId ?? ''}
            onChange={(e) => pickCourse(e.target.value ? Number(e.target.value) : undefined)}
            disabled={loading === 'courses'}
          >
            <option value="">{loading === 'courses' ? 'Loading…' : 'Select course…'}</option>
            {state.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>Class</label>
          <select
            className={sel}
            value={state.classId ?? ''}
            onChange={(e) => pickClass(e.target.value ? Number(e.target.value) : undefined)}
            disabled={state.courseId == null || loading === 'classes'}
          >
            <option value="">{loading === 'classes' ? 'Loading…' : state.courseId == null ? 'Pick a course first' : 'Select class…'}</option>
            {state.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>Subject</label>
          <select
            className={sel}
            value={state.subjectId ?? ''}
            onChange={(e) => pickSubject(e.target.value ? Number(e.target.value) : undefined)}
            disabled={state.classId == null || loading === 'subjects'}
          >
            <option value="">{loading === 'subjects' ? 'Loading…' : state.classId == null ? 'Pick a class first' : 'Select subject…'}</option>
            {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lab}>Book <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <select
            className={sel}
            value={state.bookId ?? ''}
            onChange={(e) => set({ bookId: e.target.value ? Number(e.target.value) : undefined })}
            disabled={state.subjectId == null || loading === 'books'}
          >
            <option value="">{loading === 'books' ? 'Loading…' : state.books.length ? 'Any book' : 'No books linked'}</option>
            {state.books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {state.subjectId != null && state.books.length <= 1 && (
        <p className="mt-3 text-xs text-slate-500">
          {state.books.length === 1
            ? 'Only one book is linked to this subject — it is selected automatically.'
            : 'No books are linked to this subject — your paper will draw from all subject questions.'}
        </p>
      )}
    </div>
  );
}
