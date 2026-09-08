/**
 * PHASE 2 — Question Bank (v2).
 *
 * Admin workflow: add / edit / archive / approve / reject / bulk / import /
 * export. Teacher view: browse own approved scope (server-enforced), create
 * drafts, edit/duplicate/archive own questions. Server-side pagination and
 * cascading catalog filters — the bank is never loaded wholesale.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  Plus, Search, RefreshCw, CheckCircle2, XCircle, Archive, Copy, Upload, Download,
  ChevronDown, ChevronUp, Eye, Pencil, Trash2, Database, FileSpreadsheet, Filter,
} from 'lucide-react';
import { v2 } from '../../api/v2';
import { PageHeader, Skeleton, EmptyState } from '../../components/ui';
import type {
  BookV2, ChapterV2, ClassV2, CourseV2, Difficulty, ExerciseV2, Medium,
  QuestionCategory, QuestionRowV2, QuestionStatus, QuestionType, SubjectV2, TopicV2,
} from '../../types';

const TYPES: QuestionType[] = ['mcq', 'true_false', 'fill_blank', 'matching', 'short', 'long', 'numerical', 'conceptual'] as any;
const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ', true_false: 'True / False', fill_blank: 'Fill in the Blank',
  matching: 'Matching', short: 'Short Question', essay: 'Long Question', long: 'Long Question',
  numerical: 'Numerical / Problem', conceptual: 'Conceptual',
};
const STATUSES: QuestionStatus[] = ['draft', 'pending', 'approved', 'rejected', 'archived'];
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
const LANG: Medium[] = ['english', 'urdu', 'bilingual'];
const CATS: QuestionCategory[] = ['exercise', 'example', 'review', 'past_paper', 'conceptual', 'practice'];
const CANON_TYPE = (t: string) => (t === 'long' ? 'essay' : t);
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const normType = (t: string): QuestionType => {
  const v = t === 'long' ? 'essay' : t;
  if (!TYPES.map(CANON_TYPE).includes(v as QuestionType)) return 'mcq';
  return v as QuestionType;
};

interface FilterState {
  courseId?: number; classId?: number; subjectId?: number; bookId?: number;
  chapterId?: number; topicId?: number; exerciseId?: number;
  type?: string; status?: string; difficulty?: string; language?: string; category?: string;
  marksEq?: number; search?: string;
}

export default function QuestionBankPage() {
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role !== 'teacher';
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [rows, setRows] = useState<QuestionRowV2[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editor, setEditor] = useState<null | { mode: 'create' } | { mode: 'edit'; q: QuestionRowV2 }>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [f, setF] = useState<FilterState>({});
  const [searchInput, setSearchInput] = useState('');

  // cascading catalog lists
  const [courses, setCourses] = useState<CourseV2[]>([]);
  const [classes, setClasses] = useState<ClassV2[]>([]);
  const [subjects, setSubjects] = useState<SubjectV2[]>([]);
  const [books, setBooks] = useState<BookV2[]>([]);
  const [chapters, setChapters] = useState<ChapterV2[]>([]);
  const [topics, setTopics] = useState<TopicV2[]>([]);
  const [exercises, setExercises] = useState<ExerciseV2[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2.questions.list({
        page, limit,
        courseId: f.courseId, classId: f.classId, subjectId: f.subjectId, bookId: f.bookId,
        chapterId: f.chapterId, topicId: f.topicId, exerciseId: f.exerciseId,
        type: f.type, status: f.status, difficulty: f.difficulty, language: f.language,
        category: f.category, search: f.search,
      });
      setRows(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [page, limit, f]);

  const loadStats = useCallback(async () => {
    try {
      const res = await v2.questions.stats({
        courseId: f.courseId, classId: f.classId, subjectId: f.subjectId, bookId: f.bookId,
        chapterId: f.chapterId, topicId: f.topicId, exerciseId: f.exerciseId,
      });
      setStats(res.data.data);
    } catch { /* stats are decorative */ }
  }, [f.courseId, f.classId, f.subjectId, f.bookId, f.chapterId, f.topicId, f.exerciseId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { v2.catalog.courses().then((r) => setCourses(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { if (f.courseId) v2.catalog.courseClasses(f.courseId).then((r) => setClasses(r.data.data)); else setClasses([]); }, [f.courseId]);
  useEffect(() => { if (f.classId && f.courseId) v2.catalog.classSubjects(f.classId, f.courseId).then((r) => setSubjects(r.data.data)); else setSubjects([]); }, [f.classId, f.courseId]);
  useEffect(() => { if (f.subjectId) { v2.catalog.subjectBooks(f.subjectId).then((r) => setBooks(r.data.data)); v2.catalog.subjectChapters(f.subjectId).then((r) => setChapters(r.data.data)); } else { setBooks([]); setChapters([]); } }, [f.subjectId]);
  useEffect(() => { if (f.chapterId) { v2.catalog.chapterTopics(f.chapterId).then((r) => setTopics(r.data.data)).catch(() => setTopics([])); v2.catalog.chapterExercises(f.chapterId).then((r) => setExercises(r.data.data)).catch(() => setExercises([])); } else { setTopics([]); setExercises([]); } }, [f.chapterId]);

  const setFilter = (k: keyof FilterState, v: any, cascade: string[] = []) => {
    setF((prev) => {
      const next = { ...prev, [k]: v || undefined };
      cascade.forEach((c) => delete (next as any)[c]);
      return next;
    });
    setPage(1);
  };
  const applySearch = () => { setF((p) => ({ ...p, search: searchInput || undefined })); setPage(1); };

  const isSel = (id: number) => selected.includes(id);
  const toggleSel = (id: number) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const pageIds = rows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(isSel);
  const togglePage = () => setSelected((p) => (allPageSelected ? p.filter((x) => !pageIds.includes(x)) : [...new Set([...p, ...pageIds])]));

  const refresh = () => { load(); loadStats(); };
  const clearFilters = () => { setF({}); setSearchInput(''); setPage(1); };

  const canEdit = (q: QuestionRowV2) => isAdmin || q.createdById === user?.id;

  const action = async (fn: () => Promise<any>, okMsg: string) => {
    try { await fn(); toast.success(okMsg); refresh(); } catch (e: any) { toast.error(e?.response?.data?.message || 'Action failed'); }
  };
  const approve = (id: number) => action(() => v2.questions.approve(id), 'Question approved');
  const doReject = (id: number) => action(() => v2.questions.reject(id, reason || undefined), 'Question rejected');
  const archiveOne = (id: number) => action(() => v2.questions.archive(id), 'Question archived');
  const duplicate = (id: number) => action(() => v2.questions.duplicate(id), 'Duplicated as draft');
  const bulk = (status: string) => action(() => v2.questions.bulkStatus(selected, status), `${selected.length} question(s) → ${status}`);

  const statBadge = (s: string) => stats?.byStatus?.find((x: any) => x.status === s)?.n ?? 0;

  // question type guard for rendering list text
  const typeLabel = (t: string) => TYPE_LABELS[CANON_TYPE(t)] ?? t;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <PageHeader
        title="Question Bank"
        description={isAdmin ? 'Review, approve and curate the central question bank.' : 'Browse approved questions in your assigned subjects; your drafts are visible to you only.'}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4" /> Import</button>
            <a className="btn-secondary btn-sm" href={v2.questions.exportUrl({ ...f, limit: 1000 }, 'csv')}><Download className="w-4 h-4" /> Export CSV</a>
            <button className="btn-primary btn-sm" onClick={() => setEditor({ mode: 'create' })}><Plus className="w-4 h-4" /> Add Question</button>
          </div>
        }
      />

      {/* ═══ status chips ═══ */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter('status', f.status === s ? '' : s)} className={clsx('card px-4 py-3 text-left transition-all hover:shadow-md', f.status === s && 'ring-2 ring-brand-500')}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-surface-400">{s}</span>
                {s === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {s === 'rejected' && <XCircle className="w-4 h-4 text-red-500" />}
                {s === 'draft' && <Pencil className="w-4 h-4 text-amber-500" />}
                {s === 'pending' && <RefreshCw className="w-4 h-4 text-blue-500" />}
                {s === 'archived' && <Archive className="w-4 h-4 text-surface-400" />}
              </div>
              <div className="text-2xl font-bold mt-1">{statBadge(s)}</div>
            </button>
          ))}
        </div>
      )}

      {/* ═══ filter bar ═══ */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-surface-700"><Filter className="w-4 h-4" /> Filters</div>
          {Object.keys(f).length > 0 && (
            <button className="text-xs text-brand-600 font-semibold hover:underline" onClick={clearFilters}>Clear all</button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <select className="select" value={f.courseId ?? ''} onChange={(e) => setFilter('courseId', Number(e.target.value) || undefined, ['classId', 'subjectId', 'bookId', 'chapterId', 'topicId', 'exerciseId'])}>
            <option value="">Course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
          <select className="select" value={f.classId ?? ''} disabled={!classes.length} onChange={(e) => setFilter('classId', Number(e.target.value) || undefined, ['subjectId', 'bookId', 'chapterId', 'topicId', 'exerciseId'])}>
            <option value="">Class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={f.subjectId ?? ''} disabled={!subjects.length} onChange={(e) => setFilter('subjectId', Number(e.target.value) || undefined, ['bookId', 'chapterId', 'topicId', 'exerciseId'])}>
            <option value="">Subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" value={f.bookId ?? ''} disabled={!books.length} onChange={(e) => setFilter('bookId', Number(e.target.value) || undefined)}>
            <option value="">Book</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <select className="select" value={f.chapterId ?? ''} disabled={!chapters.length} onChange={(e) => setFilter('chapterId', Number(e.target.value) || undefined, ['topicId', 'exerciseId'])}>
            <option value="">Chapter</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>Ch {c.number}: {c.name}</option>)}
          </select>
          <select className="select" value={f.topicId ?? ''} disabled={!topics.length} onChange={(e) => setFilter('topicId', Number(e.target.value) || undefined)}>
            <option value="">Topic</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select" value={f.exerciseId ?? ''} disabled={!exercises.length} onChange={(e) => setFilter('exerciseId', Number(e.target.value) || undefined)}>
            <option value="">Exercise</option>
            {exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="input" placeholder="Search…" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()} />
            <button className="btn-secondary" onClick={applySearch}><Search className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
          <select className="select" value={f.type ?? ''} onChange={(e) => setFilter('type', e.target.value || undefined)}>
            <option value="">Type</option>
            {TYPES.map((t) => <option key={t} value={CANON_TYPE(t)}>{typeLabel(t)}</option>)}
          </select>
          <select className="select" value={f.difficulty ?? ''} onChange={(e) => setFilter('difficulty', e.target.value || undefined)}>
            <option value="">Difficulty</option>
            {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="select" value={f.language ?? ''} onChange={(e) => setFilter('language', e.target.value || undefined)}>
            <option value="">Language</option>
            {LANG.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="select" value={f.category ?? ''} onChange={(e) => setFilter('category', e.target.value || undefined)}>
            <option value="">Category</option>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="select" value={f.status ?? ''} onChange={(e) => setFilter('status', e.target.value || undefined)}>
            <option value="">Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" type="number" min={0} placeholder="Marks ="
            value={f.marksEq ?? ''} onChange={(e) => { const v = Number(e.target.value); setFilter('marksEq', e.target.value === '' ? undefined : (Number.isFinite(v) ? v : undefined)); }} />
          <button className="btn-ghost btn-sm" onClick={refresh}><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
        {!isAdmin && f.status && f.status !== 'approved' && (
          <p className="text-xs text-amber-600">Teachers only see their own {f.status} questions (server-enforced).</p>
        )}
      </div>

      {/* ═══ bulk bar ═══ */}
      {selected.length > 0 && isAdmin && (
        <div className="card p-3 flex items-center gap-3 flex-wrap bg-brand-50/40 border-brand-200">
          <span className="text-sm font-semibold text-brand-800">{selected.length} selected</span>
          <button className="btn-success btn-sm" onClick={() => bulk('approved')}><CheckCircle2 className="w-4 h-4" /> Approve</button>
          <button className="btn-danger btn-sm" onClick={() => { setReason(''); setRejectTarget(-1); bulk('rejected'); }}><XCircle className="w-4 h-4" /> Reject</button>
          <button className="btn-secondary btn-sm" onClick={() => bulk('archived')}><Archive className="w-4 h-4" /> Archive</button>
          <button className="btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {/* ═══ table ═══ */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-2/3" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Database} title="No questions found" description="Adjust filters or add the first question to this selection." action={<button className="btn-primary" onClick={() => setEditor({ mode: 'create' })}><Plus className="w-4 h-4" /> Add Question</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
                  <th className="px-4 py-3 w-10"><input type="checkbox" className="accent-brand-600 w-4 h-4" checked={allPageSelected} onChange={togglePage} /></th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Chain</th>
                  <th className="px-4 py-3 text-center">Marks</th>
                  <th className="px-4 py-3">Diff</th>
                  <th className="px-4 py-3">Lang</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {rows.map((q) => (
                  <QuestionRowView key={q.id}
                    q={q} typeLabel={typeLabel}
                    selected={isSel(q.id)} onToggle={() => toggleSel(q.id)}
                    expanded={expanded === q.id} onExpand={() => setExpanded(expanded === q.id ? null : q.id)}
                    isAdmin={isAdmin} canEdit={canEdit(q)}
                    onApprove={() => approve(q.id)}
                    onReject={() => { setRejectTarget(q.id); setReason(''); }}
                    onArchive={() => archiveOne(q.id)}
                    onDuplicate={() => duplicate(q.id)}
                    onEdit={() => setEditor({ mode: 'edit', q })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ pagination ═══ */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-surface-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="text-sm text-surface-600 self-center">Page {page} / {Math.max(1, Math.ceil(total / limit))}</span>
            <button className="btn-secondary btn-sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {rejectTarget !== null && rejectTarget > 0 && (
        <Modal title="Reject question" onClose={() => setRejectTarget(null)}>
          <textarea className="textarea" placeholder="Reason (optional) — teachers will see the question as rejected"
            value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
            <button className="btn-danger" onClick={() => { doReject(rejectTarget); setRejectTarget(null); }}>Reject</button>
          </div>
        </Modal>
      )}

      {importOpen && (
        <ImportModal isAdmin={isAdmin} onClose={() => setImportOpen(false)} onDone={() => { refresh(); }} />
      )}

      {editor && (
        <QuestionEditor
          mode={editor.mode}
          question={editor.mode === 'edit' ? editor.q : undefined}
          initialFilters={f}
          isAdmin={isAdmin}
          onClose={() => setEditor(null)}
          onSaved={() => { refresh(); }}
        />
      )}
    </div>
  );
}

/* ─── row ─────────────────────────────────────────────────────────────────── */
function QuestionRowView(props: {
  q: QuestionRowV2; typeLabel: (t: string) => string; selected: boolean; onToggle: () => void;
  expanded: boolean; onExpand: () => void; isAdmin: boolean; canEdit: boolean;
  onApprove: () => void; onReject: () => void; onArchive: () => void; onDuplicate: () => void; onEdit: () => void;
}) {
  const { q } = props;
  const statusColor: Record<string, string> = {
    approved: 'badge-green', pending: 'badge-blue', draft: 'badge-gray', rejected: 'badge-red', archived: 'badge-amber',
  };
  return (
    <>
      <tr className={clsx('hover:bg-surface-50/70 transition-colors', !q.isActive && 'opacity-60')}>
        <td className="px-4 py-3"><input type="checkbox" className="accent-brand-600 w-4 h-4" checked={props.selected} onChange={props.onToggle} /></td>
        <td className="px-4 py-3 max-w-md">
          <div className="font-medium text-surface-800 line-clamp-2">{q.text}</div>
          <div className="text-xs text-surface-400 mt-0.5 flex items-center gap-2 flex-wrap">
            {q.bankNo && <span className="font-mono">{q.bankNo}</span>}
            {q.createdByName && <span>by {q.createdByName}</span>}
            <span>{new Date(q.createdAt).toLocaleDateString('en-GB')}</span>
          </div>
        </td>
        <td className="px-4 py-3"><span className="badge-gray whitespace-nowrap">{props.typeLabel(q.type)}</span></td>
        <td className="px-4 py-3 max-w-[220px]">
          <div className="text-surface-600 truncate">{q.subjectName || '—'}</div>
          <div className="text-xs text-surface-400 truncate">
            {[q.courseCode, q.className, q.chapterNumber ? `Ch ${q.chapterNumber}` : '', q.topicName ?? q.exerciseName ?? ''].filter(Boolean).join(' · ')}
          </div>
        </td>
        <td className="px-4 py-3 text-center font-semibold">{q.marks}</td>
        <td className="px-4 py-3 capitalize">{q.difficulty}</td>
        <td className="px-4 py-3 capitalize">{q.language}</td>
        <td className="px-4 py-3"><span className={statusColor[q.status] || 'badge-gray'}>{q.status}</span></td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button className="btn-icon" title="Preview" onClick={props.onExpand}>{props.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
            {props.isAdmin && q.status === 'pending' && (
              <>
                <button className="btn-icon text-emerald-600" title="Approve" onClick={props.onApprove}><CheckCircle2 className="w-4 h-4" /></button>
                <button className="btn-icon text-red-500" title="Reject" onClick={props.onReject}><XCircle className="w-4 h-4" /></button>
              </>
            )}
            {props.canEdit && (
              <>
                <button className="btn-icon" title="Edit" onClick={props.onEdit}><Pencil className="w-4 h-4" /></button>
                <button className="btn-icon" title="Duplicate" onClick={props.onDuplicate}><Copy className="w-4 h-4" /></button>
                <button className="btn-icon text-red-500" title="Archive" onClick={props.onArchive}><Trash2 className="w-4 h-4" /></button>
              </>
            )}
            <button className="btn-icon" title="Preview question"><Eye className="w-4 h-4" onClick={props.onExpand} /></button>
          </div>
        </td>
      </tr>
      {props.expanded && (
        <tr className="bg-surface-50/60">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs font-bold uppercase text-surface-400 mb-1">Answer</div>
                {q.type === 'mcq' && Array.isArray(q.options) && (
                  <div className="space-y-1">
                    {q.options.map((o, i) => (
                      <div key={i} className={clsx('flex gap-2', String.fromCharCode(65 + i) === q.answer && 'text-emerald-700 font-semibold')}>
                        <span>{String.fromCharCode(65 + i)}.</span><span>{o}</span>{String.fromCharCode(65 + i) === q.answer && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'matching' && Array.isArray(q.options) && (
                  <div className="space-y-1">{q.options.map((p: any, i: number) => (
                    <div key={i} className="flex gap-2"><span className="text-surface-400">{p?.left}</span><span>→</span><span className="font-medium">{p?.right}</span></div>
                  ))}</div>
                )}
                {!['mcq', 'matching'].includes(q.type) && <div className="whitespace-pre-wrap">{q.answer || '—'}</div>}
                {q.hint && <div className="mt-2 text-xs text-amber-700"><b>Hint:</b> {q.hint}</div>}
                {q.explanation && <div className="mt-1 text-xs text-surface-500"><b>Explanation:</b> {q.explanation}</div>}
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-surface-400 mb-1">Context</div>
                <dl className="space-y-1 text-xs">
                  {[['Book', q.bookTitle], ['Chapter', q.chapterName], ['Topic', q.topicName], ['Exercise', q.exerciseName], ['Page', q.pageRef], ['Source', q.sourceRef], ['Category', q.category], ['Tags', q.tags?.join(', ')]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string} className="flex gap-2"><dt className="text-surface-400 w-20 flex-shrink-0">{k}</dt><dd className="text-surface-700 break-all">{v}</dd></div>
                  ))}
                </dl>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── shared modal shell ──────────────────────────────────────────────────── */
function Modal(props: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-surface-900/50 backdrop-blur-sm" onClick={props.onClose}>
      <div className={clsx('card w-full my-8 animate-slide-down', props.wide ? 'max-w-4xl' : 'max-w-xl')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="text-lg font-bold text-surface-900">{props.title}</h3>
          <button className="btn-icon" onClick={props.onClose}><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{props.children}</div>
      </div>
    </div>
  );
}

/* ─── import ──────────────────────────────────────────────────────────────── */
function ImportModal(props: { isAdmin: boolean; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const submit = async () => {
    setBusy(true);
    try {
      let rows: any;
      try {
        rows = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON — paste an array of question objects');
      }
      if (!Array.isArray(rows)) throw new Error('JSON must be an array of question objects');
      const res = await v2.questions.bulkImport(rows);
      setResult(res.data.data);
      if (res.data.data.errors?.length) toast.error(`${res.data.data.errors.length} row(s) failed`);
      else toast.success('Import complete');
      props.onDone();
    } catch (e: any) {
      toast.error(e?.message || e?.response?.data?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Import questions (as drafts)" onClose={props.onClose} wide>
      {props.isAdmin ? (
        <>
          <p className="text-sm text-surface-500 mb-2">Paste a JSON array. Each row needs <code className="text-xs bg-surface-100 px-1 rounded">chapterId</code> (or <code className="text-xs bg-surface-100 px-1 rounded">bookId</code>+<code className="text-xs bg-surface-100 px-1 rounded">chapterNumber</code>) plus <code className="text-xs bg-surface-100 px-1 rounded">type</code>, <code className="text-xs bg-surface-100 px-1 rounded">text</code>, <code className="text-xs bg-surface-100 px-1 rounded">marks</code>. Imported rows always land as <b>draft</b> for review — never auto-approved.</p>
          <textarea className="textarea font-mono text-xs" rows={10} placeholder='[{"chapterId": 5, "type": "mcq", "text": "…", "marks": 1, "options": ["a","b","c","d"], "answer": "a", "difficulty": "easy"}]' value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            {result && <span className="text-sm text-surface-600 self-center mr-auto">{result.created} imported{result.errors?.length ? `, ${result.errors.length} errors` : ''}</span>}
            <button className="btn-secondary" onClick={props.onClose}>Close</button>
            <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Importing…' : 'Import'}</button>
          </div>
        </>
      ) : (
        <p className="text-sm text-surface-500">Only admins can bulk-import questions.</p>
      )}
    </Modal>
  );
}

/* ─── add / edit editor ───────────────────────────────────────────────────── */
function QuestionEditor(props: {
  mode: 'create' | 'edit'; question?: QuestionRowV2; initialFilters: FilterState;
  isAdmin: boolean; onClose: () => void; onSaved: () => void;
}) {
  const q0 = props.question;
  const [form, setForm] = useState<any>(() => ({
    courseId: props.initialFilters.courseId ?? undefined,
    classId: props.initialFilters.classId ?? undefined,
    subjectId: props.initialFilters.subjectId ?? undefined,
    bookId: props.initialFilters.bookId ?? undefined,
    chapterId: q0?.chapterId ?? props.initialFilters.chapterId ?? undefined,
    topicId: q0?.topicId ?? undefined,
    exerciseId: q0?.exerciseId ?? undefined,
    type: q0?.type ?? 'mcq',
    text: q0?.text ?? '',
    marks: q0?.marks ?? 1,
    options: q0?.options ?? [],
    answer: q0?.answer ?? '',
    difficulty: q0?.difficulty ?? 'easy',
    language: q0?.language ?? 'english',
    category: q0?.category ?? 'exercise',
    source: q0?.source ?? 'manual',
    status: q0?.status ?? 'draft',
    hint: q0?.hint ?? '',
    explanation: q0?.explanation ?? '',
    tags: (q0?.tags ?? []).join(', '),
    bankNo: q0?.bankNo ?? '',
    pageRef: q0?.pageRef ?? '',
  }));
  const [courses, setCourses] = useState<CourseV2[]>([]);
  const [classes, setClasses] = useState<ClassV2[]>([]);
  const [subjects, setSubjects] = useState<SubjectV2[]>([]);
  const [books, setBooks] = useState<BookV2[]>([]);
  const [chapters, setChapters] = useState<ChapterV2[]>([]);
  const [topics, setTopics] = useState<TopicV2[]>([]);
  const [exercises, setExercises] = useState<ExerciseV2[]>([]);
  const [busy, setBusy] = useState(false);
  const [mcqOptions, setMcqOptions] = useState<string[]>(() => {
    if (q0?.type === 'mcq' && Array.isArray(q0.options)) return q0.options.map(String);
    return ['', '', '', ''];
  });
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>(() => {
    if (q0?.type === 'matching' && Array.isArray(q0.options)) return q0.options.map((x: any) => ({ left: String(x?.left ?? ''), right: String(x?.right ?? '') }));
    return [{ left: '', right: '' }, { left: '', right: '' }];
  });

  useEffect(() => { v2.catalog.courses().then((r) => setCourses(r.data.data)).catch(() => {}); }, []);
  const chain = async (key: string, loader: () => Promise<any>) => {
    try { const r = await loader(); if (key === 'classes') setClasses(r.data.data); if (key === 'subjects') setSubjects(r.data.data); if (key === 'books') setBooks(r.data.data); if (key === 'chapters') setChapters(r.data.data); if (key === 'topics') setTopics(r.data.data); if (key === 'exercises') setExercises(r.data.data); } catch { /* scoped lists may be empty for a teacher */ }
  };
  useEffect(() => { if (form.courseId) chain('classes', () => v2.catalog.courseClasses(form.courseId)); else setClasses([]); }, [form.courseId]);
  useEffect(() => { if (form.classId && form.courseId) chain('subjects', () => v2.catalog.classSubjects(form.classId, form.courseId)); else setSubjects([]); }, [form.classId, form.courseId]);
  useEffect(() => { if (form.subjectId) { chain('books', () => v2.catalog.subjectBooks(form.subjectId)); chain('chapters', () => v2.catalog.subjectChapters(form.subjectId)); } else { setBooks([]); setChapters([]); } }, [form.subjectId]);
  useEffect(() => { if (form.chapterId) { chain('topics', () => v2.catalog.chapterTopics(form.chapterId)); chain('exercises', () => v2.catalog.chapterExercises(form.chapterId)); } else { setTopics([]); setExercises([]); } }, [form.chapterId]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const type = normType(form.type);

  const buildPayload = () => {
    const payload: any = {
      chapterId: Number(form.chapterId),
      exerciseId: form.exerciseId ? Number(form.exerciseId) : null,
      topicId: form.topicId ? Number(form.topicId) : null,
      bookId: form.bookId ? Number(form.bookId) : null,
      type: CANON_TYPE(form.type),
      text: form.text.trim(),
      marks: Number(form.marks) || 1,
      difficulty: form.difficulty,
      language: form.language,
      source: form.source,
      category: form.category,
      hint: form.hint?.trim() || null,
      explanation: form.explanation?.trim() || null,
      bankNo: form.bankNo?.trim() || null,
      pageRef: form.pageRef?.trim() || null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    };
    if (type === 'mcq') {
      const opts = mcqOptions.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) throw new Error('MCQ needs at least 2 options');
      const ansIdx = LETTERS.indexOf(form.answer ?? '');
      if (ansIdx < 0 || ansIdx >= opts.length) throw new Error('Select the correct option');
      payload.options = opts;
      payload.answer = LETTERS[ansIdx];
    } else if (type === 'true_false') {
      if (!['true', 'false'].includes(form.answer)) throw new Error('Select True or False');
      payload.answer = form.answer;
      payload.options = null;
    } else if (type === 'fill_blank') {
      payload.answer = form.answer?.trim() || null;
      payload.options = null;
    } else if (type === 'matching') {
      const pairs = matchingPairs.filter((p) => p.left.trim() && p.right.trim());
      if (pairs.length < 2) throw new Error('Matching needs at least 2 pairs');
      payload.options = pairs;
      payload.answer = JSON.stringify(pairs);
    } else {
      payload.answer = form.answer?.trim() || null;
      payload.options = null;
    }
    return payload;
  };

  const save = async () => {
    try {
      const payload = buildPayload();
      setBusy(true);
      if (props.mode === 'create') {
        const res = await v2.questions.create(payload);
        toast.success(`Question #${res.data.data.id} created (${res.data.data.status})`);
      } else {
        await v2.questions.update(props.question!.id, payload);
        toast.success('Question updated');
      }
      props.onSaved();
      props.onClose();
    } catch (e: any) {
      toast.error(e?.message || e?.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const typeOptions = useMemo(() => {
    const groups: Array<{ label: string; types: QuestionType[] }> = [
      { label: 'Objective', types: ['mcq', 'true_false', 'fill_blank', 'matching'] },
      { label: 'Subjective', types: ['short', 'essay', 'numerical', 'conceptual'] },
    ];
    return groups;
  }, []);

  return (
    <Modal title={props.mode === 'create' ? 'Add question' : `Edit question #${q0?.id}`} onClose={props.onClose} wide>
      <div className="grid md:grid-cols-2 gap-3">
        <select className="select" value={form.courseId ?? ''} onChange={(e) => { set('courseId', Number(e.target.value) || undefined); set('classId', undefined); set('subjectId', undefined); set('bookId', undefined); set('chapterId', undefined); }}>
          <option value="">Course *</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
        <select className="select" value={form.classId ?? ''} disabled={!classes.length} onChange={(e) => { set('classId', Number(e.target.value) || undefined); set('subjectId', undefined); set('bookId', undefined); set('chapterId', undefined); }}>
          <option value="">Class *</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={form.subjectId ?? ''} disabled={!subjects.length} onChange={(e) => { set('subjectId', Number(e.target.value) || undefined); set('bookId', undefined); set('chapterId', undefined); }}>
          <option value="">Subject *</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select" value={form.bookId ?? ''} disabled={!books.length} onChange={(e) => set('bookId', Number(e.target.value) || undefined)}>
          <option value="">Book (optional)</option>
          {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
        <select className="select" value={form.chapterId ?? ''} disabled={!chapters.length} onChange={(e) => { set('chapterId', Number(e.target.value) || undefined); set('topicId', undefined); set('exerciseId', undefined); }}>
          <option value="">Chapter *</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>Ch {c.number}: {c.name}</option>)}
        </select>
        <select className="select" value={form.topicId ?? ''} disabled={!topics.length} onChange={(e) => set('topicId', Number(e.target.value) || undefined)}>
          <option value="">Topic (optional)</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="select" value={form.exerciseId ?? ''} disabled={!exercises.length} onChange={(e) => set('exerciseId', Number(e.target.value) || undefined)}>
          <option value="">Exercise (optional)</option>
          {exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <input className="input" placeholder="Bank no (optional, e.g. PTB-9-MATH-001)" value={form.bankNo} onChange={(e) => set('bankNo', e.target.value)} />
      </div>

      <div className="mt-4">
        <label className="label">Question type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {typeOptions.flatMap((g) => g.types.map((t) => (
            <button key={t} type="button"
              onClick={() => { set('type', t); set('answer', t === 'mcq' ? 'A' : t === 'true_false' ? 'true' : ''); }}
              className={clsx('px-3 py-2 rounded-xl border text-sm font-medium transition-all', type === t ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-400' : 'border-surface-200 text-surface-600 hover:border-surface-300')}>
              {TYPE_LABELS[t]}
            </button>
          )))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <textarea className="textarea" rows={3} placeholder="Question text *" value={form.text} onChange={(e) => set('text', e.target.value)} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="select" value={form.marks} onChange={(e) => set('marks', Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((m) => <option key={m} value={m}>{m} mark{m > 1 ? 's' : ''}</option>)}
          </select>
          <select className="select" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
            {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="select" value={form.language} onChange={(e) => set('language', e.target.value)}>
            {LANG.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {type === 'mcq' && (
          <div className="space-y-2">
            {mcqOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-sm font-bold text-surface-400">{LETTERS[i]}.</span>
                <input className="input flex-1" placeholder={`Option ${LETTERS[i]}`} value={opt}
                  onChange={(e) => setMcqOptions((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
                <input type="radio" name="correct" title="Correct option"
                  className="accent-emerald-600 w-4 h-4"
                  checked={form.answer === LETTERS[i]}
                  onChange={() => set('answer', LETTERS[i])} />
              </div>
            ))}
            {mcqOptions.length < 6 && <button className="text-xs text-brand-600 font-semibold" onClick={() => setMcqOptions((p) => [...p, ''])}>+ Add option</button>}
          </div>
        )}
        {type === 'true_false' && (
          <div className="flex gap-3">
            {['true', 'false'].map((v) => (
              <button key={v} type="button" onClick={() => set('answer', v)}
                className={clsx('px-6 py-2.5 rounded-xl border font-semibold capitalize', form.answer === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-surface-200 text-surface-500')}>
                {v}
              </button>
            ))}
          </div>
        )}
        {type === 'matching' && (
          <div className="space-y-2">
            {matchingPairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="input" placeholder={`Left ${i + 1} (e.g. term)`} value={pair.left}
                  onChange={(e) => setMatchingPairs((p) => p.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)))} />
                <span className="text-surface-400">→</span>
                <input className="input" placeholder={`Right ${i + 1} (e.g. definition)`} value={pair.right}
                  onChange={(e) => setMatchingPairs((p) => p.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)))} />
              </div>
            ))}
            <button className="text-xs text-brand-600 font-semibold" onClick={() => setMatchingPairs((p) => [...p, { left: '', right: '' }])}>+ Add pair</button>
          </div>
        )}
        {(type === 'short' || type === 'essay' || type === 'numerical' || type === 'conceptual' || type === 'fill_blank') && (
          <textarea className="textarea" rows={2} placeholder={type === 'fill_blank' ? 'Correct answer (use ___ in the question text for the blank)' : 'Model answer / marking notes (optional)'}
            value={form.answer} onChange={(e) => set('answer', e.target.value)} />
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Hint (optional)" value={form.hint} onChange={(e) => set('hint', e.target.value)} />
          <input className="input" placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </div>
        <input className="input" placeholder="Page reference (e.g. p. 42)" value={form.pageRef} onChange={(e) => set('pageRef', e.target.value)} />
        <textarea className="textarea" rows={2} placeholder="Explanation (optional)" value={form.explanation} onChange={(e) => set('explanation', e.target.value)} />

        {props.isAdmin && (
          <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>Status: {s}</option>)}
          </select>
        )}
        {!props.isAdmin && <p className="text-xs text-surface-400">Your questions are saved as <b>draft</b>; an admin must approve them before they appear in paper generation.</p>}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button className="btn-secondary" onClick={props.onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : props.mode === 'create' ? 'Create question' : 'Save changes'}</button>
      </div>
    </Modal>
  );
}
