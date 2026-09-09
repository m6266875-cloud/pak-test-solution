/**
 * PHASE 4 — Step 1: Course → Class → Subject → Book (auto-pick when a single
 * cleaned-up book exists, shown for confirmation). Options come from the
 * scoped v2 catalog endpoints (teacher sees only assigned courses/subjects).
 */
import { useEffect } from 'react';
import { BookOpen, GraduationCap, Layers, School } from 'lucide-react';
import { v2 } from '../../../api/v2';
import type { BookV2, ClassV2, CourseV2, SubjectV2 } from '../../../types';
import { StepHeading, PickCard, LoadingCard, EmptyCard } from '../generate/wizUI';
import type { W5State } from './state';

export default function Step1Scope({ w, set }: { w: W5State; set: (p: Partial<W5State>) => void }) {
  useEffect(() => {
    v2.catalog.courses().then((r) => set({ courses: (r.data.data ?? []) as CourseV2[] })).catch(() => set({ courses: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!w.courseId) return;
    set({ classes: [], classId: undefined, subjects: [], subjectId: undefined, books: [], bookId: null, bookConfirmed: false });
    v2.catalog.courseClasses(w.courseId).then((r) => set({ classes: (r.data.data ?? []) as ClassV2[] })).catch(() => set({ classes: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.courseId]);

  useEffect(() => {
    if (!w.classId) return;
    set({ subjects: [], subjectId: undefined, books: [], bookId: null, bookConfirmed: false });
    v2.catalog.classSubjects(w.classId, w.courseId).then((r) => set({ subjects: (r.data.data ?? []) as SubjectV2[] })).catch(() => set({ subjects: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.classId]);

  useEffect(() => {
    if (!w.subjectId) return;
    set({ books: [], bookId: null, bookConfirmed: false });
    v2.catalog.subjectBooks(w.subjectId).then((r) => {
      const books = (r.data.data ?? []) as BookV2[];
      // Part-B cleanup ⇒ normally exactly ONE active book: auto-select it.
      set({ books, bookId: books.length === 1 ? books[0].id : null, bookConfirmed: books.length === 1 });
    }).catch(() => set({ books: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.subjectId]);

  return (
    <div className="space-y-6">
      <div>
        <StepHeading n={1} title="Choose the course / board" hint="Only courses you can access are shown." />
        {w.courses.length === 0 ? <EmptyCard icon={<School className="w-8 h-8" />} title="No courses available" hint="Ask an admin to assign you subjects." /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {w.courses.map((c) => (
              <PickCard key={c.id} active={w.courseId === c.id} onClick={() => set({ courseId: c.id })}
                icon={<School className="w-4.5 h-4.5" />} title={c.name}
                sub={`${c.classCount ?? ''} classes · ${c.currentSession ? `session ${c.currentSession.code}` : ''}`} />
            ))}
          </div>
        )}
      </div>

      {w.courseId != null && (
        <div>
          <StepHeading n={1} title="Choose the class" hint="Classes offered by this course." />
          {w.classes.length === 0 ? <LoadingCard /> : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {w.classes.map((c) => (
                <PickCard key={c.id} active={w.classId === c.id} onClick={() => set({ classId: c.id })} title={c.name} sub={`${c.subjectCount} subjects`} />
              ))}
            </div>
          )}
        </div>
      )}

      {w.classId != null && (
        <div>
          <StepHeading n={1} title="Choose the subject" hint="Subjects available for this class." />
          {w.subjects.length === 0 ? <LoadingCard /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {w.subjects.map((s) => (
                <PickCard key={s.id} active={w.subjectId === s.id} onClick={() => set({ subjectId: s.id })}
                  icon={<Layers className="w-4 h-4" />} title={s.name} sub={`${s.medium} · ${s.bookCount} book(s) · ${s.chapterCount} chapters`} />
              ))}
            </div>
          )}
        </div>
      )}

      {w.subjectId != null && (
        <div>
          <StepHeading n={1} title="Confirm the book"
            hint={w.books.length === 1 ? 'Single current syllabus book — auto-selected.' : 'Pick the book this paper is based on.'} />
          {w.books.length === 0 ? <EmptyCard icon={<BookOpen className="w-8 h-8" />} title="No active book for this subject" /> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {w.books.map((b) => (
                <PickCard key={b.id} active={w.bookId === b.id}
                  onClick={() => set({ bookId: b.id, bookConfirmed: true })}
                  icon={<BookOpen className="w-4 h-4" />} title={b.title}
                  sub={`${b.edition ?? ''}${b.year ? ` · ${b.year}` : ''} · ${b.chapterCount} chapters`} />
              ))}
            </div>
          )}
          {w.bookConfirmed && (
            <p className="mt-3 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 inline-flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Scope locked — continue to chapters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
