/**
 * PHASE 2 — Wizard scope steps (1 Course → 8 Exercises).
 *
 * Every list is fetched server-side per selection (teacher scope enforced by
 * /api/v2/catalog). Steps 7/8 degrade gracefully when the syllabus has no
 * topics/exercises rows yet (shown, skippable — never a broken dropdown).
 */
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays, CheckSquare, ChevronDown, Layers,
  ListChecks, ListTree, MonitorPlay, Shapes, BookMarked,
} from 'lucide-react';
import { v2 } from '../../../api/v2';
import type { BookV2, SubjectV2 } from '../../../types';
import type { WizardState } from './state';
import { EmptyCard, LoadingCard, PickCard, StepHeading } from './wizUI';
import CourseLogo from '../../../components/common/CourseLogo';

export interface ScopeStepProps {
  w: WizardState;
  set: (p: Partial<WizardState>) => void;
  onEnter: (n: number) => void;
}

type Patch = Partial<WizardState>;
const clearBase = (): Patch => ({
  sessions: [], sessionId: undefined, classes: [], classId: undefined, subjects: [], subjectIds: [],
  books: [], bookId: undefined, chapters: [], chapterIds: [], topics: [], topicIds: [],
  exercises: [], exerciseIds: [], distribution: [], availability: {}, manualIds: {},
});
/** clear lists below the step being edited — never the step's own key */
const clearFrom = (point: number): Patch => {
  const p = clearBase();
  if (point <= 1) return p;                        // 1: course → wipe everything below
  if (point <= 2) { delete p.sessions; delete p.sessionId; return p; }   // 2: session
  if (point <= 3) { delete p.classes; delete p.classId; return p; }      // 3: class
  if (point <= 4) { delete p.subjects; delete p.subjectIds; return p; }  // 4: subject
  if (point <= 5) { delete p.books; delete p.bookId; return p; }         // 5: book
  if (point <= 6) { delete p.chapters; delete p.chapterIds; return p; }  // 6: chapter
  if (point <= 7) { delete p.topics; delete p.topicIds; return p; }      // 7: topic
  delete p.exercises; delete p.exerciseIds; return p;                    // 8+: exercise
};

// ─── Step 1 · Course ────────────────────────────────────────────────────────
function StepCourse({ w, set, onEnter }: ScopeStepProps) {
  useEffect(() => {
    if (!w.courses.length) {
      v2.catalog.courses().then((res) => set({ courses: res.data.data })).catch((e: any) => toast.error(e?.message || 'Failed to load courses'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <StepHeading n={1} title="Choose the course / board" hint="Only courses you can access are shown." />
      <div className="grid md:grid-cols-2 gap-3">
        {w.courses.map((c) => (
          <PickCard
            key={c.id} active={w.courseId === c.id} tag={c.code}
            onClick={() => {
              set({ courseId: c.id, ...clearFrom(1) });
              onEnter(2);
            }}
            title={c.name}
            sub={`${c.classCount} classes · ${c.subjectCount} subjects · ${c.bookCount} books${c.currentSession ? ` · session ${c.currentSession.code}` : ''}`}
            icon={<CourseLogo code={c.code} size="md" className="rounded-xl" />}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 · Session ───────────────────────────────────────────────────────
function StepSession({ w, set, onEnter }: ScopeStepProps) {
  const loading = !w.sessions.length;
  useEffect(() => {
    if (!w.courseId) return;
    if (w.sessions.length) return;
    let live = true;
    v2.catalog.courseSessions(w.courseId).then((res) => {
      if (!live) return;
      const sessions = res.data.data as any[];
      // preserve an already chosen (pattern) session when still valid
      const chosen = w.sessionId != null && sessions.some((s) => s.id === w.sessionId)
        ? w.sessionId
        : (sessions.find((s: any) => s.status === 'current') ?? sessions[0])?.id;
      set({ sessions, sessionId: chosen ?? undefined });
    }).catch((e: any) => toast.error(e?.message || 'Failed to load sessions'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.courseId]);
  return (
    <div>
      <StepHeading n={2} title="Choose the academic session" hint="Papers snapshot the session of the syllabus version used." />
      {loading ? <LoadingCard text="Loading sessions…" /> : (
        <div className="grid md:grid-cols-3 gap-3">
          {w.sessions.map((s) => (
            <PickCard
              key={s.id} active={w.sessionId === s.id}
              tag={s.status === 'current' ? 'current' : s.status}
              onClick={() => { set({ sessionId: s.id, ...clearFrom(2) }); onEnter(3); }}
              title={s.name} sub={`${s.startYear} – ${s.endYear}`} icon={<CalendarDays className="w-4.5 h-4.5" />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 3 · Class ─────────────────────────────────────────────────────────
function StepClass({ w, set, onEnter }: ScopeStepProps) {
  useEffect(() => {
    if (!w.courseId) return;
    if (w.classes.length) return;
    let live = true;
    v2.catalog.courseClasses(w.courseId).then((res) => {
      if (!live) return;
      const classes = res.data.data as any[];
      const keep = w.classId != null && classes.some((c) => c.id === w.classId) ? w.classId : undefined;
      set({ classes, ...(keep !== w.classId ? { classId: keep, ...clearFrom(3) } : {}) });
    }).catch((e: any) => toast.error(e?.message || 'Failed to load classes'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.courseId]);
  return (
    <div>
      <StepHeading n={3} title="Choose the class" hint="Classes of the selected course." />
      {!w.classes.length ? <LoadingCard text="Loading classes…" /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {w.classes.map((c) => (
            <PickCard
              key={c.id} active={w.classId === c.id} tag={`${c.subjectCount} subjects`}
              onClick={() => { set({ classId: c.id, ...clearFrom(3) }); onEnter(4); }}
              title={c.name} sub={c.grade ? `Grade ${c.grade}` : undefined}
              icon={<MonitorPlay className="w-4.5 h-4.5" />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 4 · Subject (multi-select) ────────────────────────────────────────
function StepSubject({ w, set, onEnter }: ScopeStepProps) {
  useEffect(() => {
    if (!w.courseId || !w.classId) return;
    if (w.subjects.length) return;
    let live = true;
    v2.catalog.classSubjects(w.classId, w.courseId).then((res) => {
      if (!live) return;
      const subjects = res.data.data as any[];
      const chosen = (w.subjectIds ?? []).filter((id) => subjects.some((s: any) => s.id === id));
      // single-subject default for clarity (spec step 4)
      const ids = chosen.length ? chosen : subjects.length === 1 ? [subjects[0].id] : [];
      const changed = ids.join(',') !== (w.subjectIds ?? []).join(',');
      set({ subjects, subjectIds: ids, ...(changed ? clearFrom(4) : {}) });
    }).catch((e: any) => toast.error(e?.message || 'Failed to load subjects'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.courseId, w.classId]);
  const toggle = (id: number) => {
    const on = w.subjectIds.includes(id);
    const next = on ? w.subjectIds.filter((x) => x !== id) : [...w.subjectIds, id];
    set({ subjectIds: next, ...clearFrom(4) });
  };
  return (
    <div>
      <StepHeading
        n={4} title="Choose subject(s)" hint="Multi-select is allowed; single subject keeps book/chapter steps simple."
        extra={<span className="text-xs font-bold bg-surface-100 text-surface-600 px-3 py-1.5 rounded-full">{w.subjectIds.length} selected</span>}
      />
      {!w.subjects.length ? <LoadingCard text="Loading subjects…" /> : (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            {w.subjects.map((s) => (
              <PickCard
                key={s.id} active={w.subjectIds.includes(s.id)}
                tag={`${s.chapterCount} chapters`}
                onClick={() => toggle(s.id)}
                title={s.name}
                sub={s.code ? `Code ${s.code}` : `${s.bookCount} book(s)`}
                icon={<Layers className="w-4.5 h-4.5" />}
              />
            ))}
          </div>
          {w.subjectIds.length === 0 && w.subjects.length > 1 && (
            <p className="text-xs text-amber-600 mt-3">Select at least one subject to continue.</p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Step 5 · Book ──────────────────────────────────────────────────────────
function StepBook({ w, set }: ScopeStepProps) {
  const multi = w.subjectIds.length > 1;
  const subjectOf = (b: BookV2) => w.subjects.find((s: SubjectV2) => s.id === (b as any).subjectId);
  useEffect(() => {
    if (!w.subjectIds.length) return;
    if (w.books.length) return;
    let live = true;
    Promise.all(w.subjectIds.map((sid) => v2.catalog.subjectBooks(sid, w.sessionId)))
      .then((res) => {
        if (!live) return;
        const books = res.flatMap((r, i) => (r.data.data as any[]).map((b) => ({ ...b, subjectId: w.subjectIds[i] })));
        set({ books });
      })
      .catch((e: any) => toast.error(e?.message || 'Failed to load books'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.subjectIds.join(',')]);
  return (
    <div>
      <StepHeading
        n={5} title="Book / syllabus version (optional)" hint="Optional — generation works from chapters alone. Book id is stored on the paper for provenance."
        extra={w.bookId ? <span className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full">book selected</span> : undefined}
      />
      {!w.books.length ? <LoadingCard text="Loading books…" /> : (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            {w.books.map((b) => (
              <PickCard
                key={b.id} active={w.bookId === b.id}
                tag={b.language}
                onClick={() => {
                  const next = w.bookId === b.id ? undefined : b.id;
                  set({ bookId: next, chapters: [], chapterIds: [], topics: [], topicIds: [], exercises: [], exerciseIds: [], distribution: [], availability: {}, manualIds: {} });
                }}
                title={b.title}
                sub={`${b.edition ?? '—'}${multi ? ` · ${subjectOf(b)?.name ?? 'subject'}` : ''}`}
                icon={<BookMarked className="w-4.5 h-4.5" />}
              />
            ))}
          </div>
          <p className="text-xs text-surface-400 mt-3">Tip: choosing a book filters chapters to that book's chapter list.</p>
        </>
      )}
    </div>
  );
}

// ─── Step 6 · Chapters ──────────────────────────────────────────────────────
function StepChapter({ w, set, onEnter }: ScopeStepProps) {
  const bookSubjectId = w.bookId != null ? (w.books.find((b) => b.id === w.bookId) as any)?.subjectId : null;
  const key = `${w.subjectIds.join(',')}|${w.bookId ?? ''}`;
  useEffect(() => {
    if (!w.subjectIds.length) return;
    const coversCurrent = w.chapters.length > 0 && (w.chapterIds ?? []).every((id) => w.chapters.some((c) => c.id === id));
    if (coversCurrent) return;
    let live = true;
    Promise.all(w.subjectIds.map(async (sid) => {
      const bookScope = w.subjectIds.length === 1 ? (w.bookId ?? undefined) : (bookSubjectId === sid ? w.bookId ?? undefined : undefined);
      const res = await v2.catalog.subjectChapters(sid, bookScope);
      return (res.data.data as any[]).map((c) => ({ ...c, subjectId: sid }));
    })).then((nested) => {
      if (!live) return;
      const chapters: any[] = nested.flat();
      const ids = (w.chapterIds ?? []).filter((id) => chapters.some((c) => c.id === id));
      const changed = ids.join(',') !== (w.chapterIds ?? []).join(',');
      set({ chapters, chapterIds: ids, ...(changed ? clearFrom(6) : {}) });
    }).catch((e: any) => toast.error(e?.message || 'Failed to load chapters'));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const all = w.chapters.length > 0 && w.chapterIds.length === w.chapters.length;
  const toggle = (id: number) => {
    const on = w.chapterIds.includes(id);
    const ids = on ? w.chapterIds.filter((x) => x !== id) : [...w.chapterIds, id];
    set({ chapterIds: ids, ...clearFrom(6) });
  };
  const toggleAll = () => {
    set(all
      ? { chapterIds: [], ...clearFrom(6) }
      : { chapterIds: w.chapters.map((c) => c.id), ...clearFrom(6) });
  };
  return (
    <div>
      <StepHeading
        n={6} title="Pick chapters" hint="Approved questions are drawn only from the chapters you pick."
        extra={(
          <button className="btn-ghost btn-sm" onClick={toggleAll}>
            <CheckSquare className="w-4 h-4" /> {all ? 'Clear all' : `Select all (${w.chapters.length})`}
          </button>
        )}
      />
      {!w.chapters.length ? <LoadingCard text="Loading chapters…" /> : (
        <div className="grid md:grid-cols-2 gap-2">
          {w.chapters.map((c: any) => (
            <PickCard
              key={c.id} active={w.chapterIds.includes(c.id)}
              tag={`${c.approvedQuestionCount ?? 0} approved`}
              onClick={() => toggle(c.id)}
              title={<span>Ch {c.number} — {c.name}</span>}
              sub={c.description || undefined}
              icon={<ListTree className="w-4.5 h-4.5" />}
            />
          ))}
        </div>
      )}
      {w.chapters.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-surface-500">{w.chapterIds.length} of {w.chapters.length} chapters selected</p>
          {w.chapterIds.length > 0 && (
            <button className="btn-primary btn-sm" onClick={() => onEnter(7)}>Continue to topics <ChevronDown className="w-4 h-4 rotate-270" /></button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Steps 7/8 · Topics / Exercises (graceful empty) ───────────────────────
function StepTopicExercise({ w, set, which }: ScopeStepProps & { which: 'topic' | 'exercise' }) {
  const list = which === 'topic' ? w.topics : w.exercises;
  const picked = which === 'topic' ? w.topicIds : w.exerciseIds;
  const setPicked = (ids: number[]) => set(which === 'topic' ? { topicIds: ids } : { exerciseIds: ids });
  const chapterName = (chapterId: number) => w.chapters.find((c) => c.id === chapterId)?.name;
  const key = w.chapterIds.join(',');
  const isTopic = which === 'topic';

  useEffect(() => {
    if (!w.chapterIds.length) return;
    const coversCurrent = list.length > 0 && (picked ?? []).every((id) => list.some((x) => x.id === id));
    if (coversCurrent) return;
    let live = true;
    const fetcher = isTopic ? v2.catalog.chapterTopics : v2.catalog.chapterExercises;
    Promise.all(w.chapterIds.map((cid) => fetcher(cid).then((r) =>
      (r.data.data as any[]).map((x: any) => ({ ...x, chapterId: cid }))
    ))).then((nested) => {
      if (!live) return;
      const flat = nested.flat();
      const prev = isTopic ? (w.topicIds ?? []) : (w.exerciseIds ?? []);
      const ids = prev.filter((id) => flat.some((x) => x.id === id));
      if (isTopic) set({ topics: flat, topicIds: ids }); else set({ exercises: flat, exerciseIds: ids });
    }).catch((e: any) => toast.error(e?.message || `Failed to load ${which}s`));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const allOn = list.length > 0 && picked.length === list.length;
  const toggle = (id: number) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const toggleAll = () => setPicked(allOn ? [] : list.map((x) => x.id));

  return (
    <div>
      <StepHeading
        n={isTopic ? 7 : 8}
        title={isTopic ? 'Topics (optional)' : 'Exercises (optional)'}
        hint={isTopic
          ? 'Narrow the draw to specific topics of the selected chapters.'
          : 'Restrict questions to specific exercises where the syllabus defines them.'}
      />
      {!w.chapterIds.length ? (
        <EmptyCard title="Select chapters first" hint="Go back to the Chapters step." />
      ) : !list.length ? (
        <EmptyCard
          icon={<Shapes className="w-8 h-8" />}
          title={isTopic ? 'No topics found in the selected chapters' : 'No exercises available for these chapters'}
          hint={isTopic ? 'This is fine — continue without a topic filter.' : 'Continue without an exercise filter; the chapter pool stays in scope.'}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-surface-500">{list.length} available across {w.chapterIds.length} chapter(s)</p>
            <button className="btn-ghost btn-sm" onClick={toggleAll}>
              <CheckSquare className="w-4 h-4" /> {allOn ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {list.map((x: any) => (
              <PickCard
                key={x.id} active={picked.includes(x.id)}
                tag={`${x.approvedQuestionCount ?? 0} approved`}
                onClick={() => toggle(x.id)}
                title={x.name}
                sub={isTopic ? undefined : chapterName(x.chapterId) ? `Ex ${x.number} · ${chapterName(x.chapterId)}` : undefined}
                icon={<ListChecks className="w-4.5 h-4.5" />}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── dispatcher ─────────────────────────────────────────────────────────────
export default function ScopeSteps(props: ScopeStepProps) {
  const { w } = props;
  return (
    <div key={w.step}>
      {w.step === 1 && <StepCourse {...props} />}
      {w.step === 2 && <StepSession {...props} />}
      {w.step === 3 && <StepClass {...props} />}
      {w.step === 4 && <StepSubject {...props} />}
      {w.step === 5 && <StepBook {...props} />}
      {w.step === 6 && <StepChapter {...props} />}
      {w.step === 7 && <StepTopicExercise {...props} which="topic" />}
      {w.step === 8 && <StepTopicExercise {...props} which="exercise" />}
    </div>
  );
}
