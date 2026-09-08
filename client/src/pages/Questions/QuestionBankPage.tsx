import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import { questionsApi } from '../../api/questions';
import { subjectsApi } from '../../api/subjects';
import { Question, QuestionType, Difficulty, ClassItem, Subject, Chapter } from '../../types';
import toast from 'react-hot-toast';
import { PageHeader, EmptyState } from '../../components/ui';
import {
  Plus, Search, Edit3, Trash2, Database,
  ChevronDown, ChevronUp, X, Check, Upload,
} from 'lucide-react';
import clsx from 'clsx';

const TYPE_COLORS: Record<QuestionType, string> = {
  mcq:   'badge-blue',
  short: 'badge-purple',
  essay: 'badge-green',
};
const DIFF_COLORS: Record<Difficulty, string> = {
  easy:   'badge-green',
  medium: 'badge-amber',
  hard:   'badge-red',
};

/* ═══ Question Modal ═══ */
function QuestionModal({ question, chapters, onSave, onClose }: {
  question?: Question | null; chapters: Chapter[]; onSave: () => void; onClose: () => void;
}) {
  const isEdit = !!question;
  const [form, setForm] = useState({
    chapterId: question?.chapterId || (chapters[0]?.id || 0),
    type: question?.type || 'mcq' as QuestionType,
    text: question?.text || '',
    marks: question?.marks || 1,
    options: question?.options ? [...(question.options as string[])] : ['', '', '', ''],
    answer: question?.answer || '',
    difficulty: question?.difficulty || 'easy' as Difficulty,
    tags: question?.tags?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error('Question text is required'); return; }
    setSaving(true);
    try {
      const payload = {
        chapterId: form.chapterId, type: form.type, text: form.text.trim(), marks: form.marks,
        options: form.type === 'mcq' ? form.options.filter(o => o.trim()) : null,
        answer: form.answer.trim() || null, difficulty: form.difficulty,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (isEdit && question) {
        await questionsApi.update(question.id, payload);
        toast.success('Question updated');
      } else {
        await questionsApi.create(payload);
        toast.success('Question added');
      }
      onSave();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-surface-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-bold text-surface-900">{isEdit ? 'Edit Question' : 'Add New Question'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Chapter</label>
            <select className="select" value={form.chapterId} onChange={e => setForm(f => ({ ...f, chapterId: Number(e.target.value) }))}>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.subject?.name && `${ch.subject.name} — `}Ch {ch.number}. {ch.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <div className="flex gap-2">
                {(['mcq', 'short', 'essay'] as QuestionType[]).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t, marks: t === 'mcq' ? 1 : t === 'short' ? 3 : 10 }))} className={clsx('flex-1 py-2 rounded-xl text-xs font-bold border-2 uppercase transition-all', form.type === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-600 hover:border-surface-300')}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="select" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Question Text</label>
            <textarea className="textarea" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Enter the question..." />
          </div>
          {form.type === 'mcq' && (
            <div>
              <label className="label">Options (A, B, C, D)</label>
              <div className="grid grid-cols-2 gap-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm font-bold text-surface-500 w-5">{String.fromCharCode(65 + i)}.</span>
                    <input className="input flex-1" value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm(f => ({ ...f, options: opts })); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{form.type === 'mcq' ? 'Correct Answer (A/B/C/D)' : 'Model Answer'}</label>
              {form.type === 'mcq' ? (
                <select className="select" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}>
                  <option value="">Select</option>{['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              ) : (
                <textarea className="textarea" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Model answer (optional)" />
              )}
            </div>
            <div>
              <label className="label">Marks</label>
              <input type="number" className="input" value={form.marks} onChange={e => setForm(f => ({ ...f, marks: Number(e.target.value) }))} min={1} max={20} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />} {isEdit ? 'Save Changes' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function QuestionBankPage() {
  const { user } = useAppSelector(s => s.auth);
  const canEdit = user && ['super_admin', 'school_admin'].includes(user.role);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filters, setFilters] = useState({ classId: 0, subjectId: 0, chapterId: 0, type: '' as QuestionType | '', difficulty: '' as Difficulty | '', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { subjectsApi.getClasses().then(r => setClasses(r.data.data)); }, []);
  useEffect(() => {
    if (!filters.classId) { setSubjects([]); return; }
    subjectsApi.getSubjectsByClass(filters.classId).then(r => setSubjects(r.data.data));
    setFilters(f => ({ ...f, subjectId: 0, chapterId: 0 }));
  }, [filters.classId]);
  useEffect(() => {
    if (!filters.subjectId) { setChapters([]); return; }
    subjectsApi.getChaptersBySubject(filters.subjectId).then(r => {
      setChapters(r.data.data);
      setAllChapters(prev => { const ids = new Set(prev.map(c => c.id)); return [...prev, ...r.data.data.filter((c: Chapter) => !ids.has(c.id))]; });
    });
    setFilters(f => ({ ...f, chapterId: 0 }));
  }, [filters.subjectId]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filters.chapterId) params.chapterId = filters.chapterId;
      if (filters.type) params.type = filters.type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;
      const [qRes, sRes] = await Promise.all([questionsApi.list(params), questionsApi.getStats(filters.chapterId ? { chapterId: filters.chapterId } : undefined)]);
      setQuestions(qRes.data.data);
      setTotal(qRes.data.pagination.total);
      setTotalPages(qRes.data.pagination.totalPages);
      setStats(sRes.data.data);
    } catch { toast.error('Failed to load questions'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question?')) return;
    setDeleting(id);
    try { await questionsApi.delete(id); toast.success('Question deleted'); loadQuestions(); }
    catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Question Bank"
        description={`${total.toLocaleString()} questions available`}
        action={canEdit ? (
          <button onClick={() => { setEditQuestion(null); setShowModal(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Question
          </button>
        ) : undefined}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="badge-gray px-4 py-3 rounded-xl flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold">{stats.total}</span>
          </div>
          {(stats.byType || []).map((t: any) => (
            <div key={t.type} className={clsx('px-4 py-3 rounded-xl flex items-center justify-between', TYPE_COLORS[t.type as QuestionType])}>
              <span className="text-sm font-medium">{t.type.toUpperCase()}</span>
              <span className="text-lg font-bold">{t._count.id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input pl-9" placeholder="Search questions..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
          </div>
          <select className="select" value={filters.classId} onChange={e => { setFilters(f => ({ ...f, classId: Number(e.target.value) })); setPage(1); }}>
            <option value={0}>All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={filters.subjectId} onChange={e => { setFilters(f => ({ ...f, subjectId: Number(e.target.value) })); setPage(1); }} disabled={!filters.classId}>
            <option value={0}>All Subjects</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" value={filters.type} onChange={e => { setFilters(f => ({ ...f, type: e.target.value as any })); setPage(1); }}>
            <option value="">All Types</option><option value="mcq">MCQ</option><option value="short">Short</option><option value="essay">Essay</option>
          </select>
          <select className="select" value={filters.difficulty} onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value as any })); setPage(1); }}>
            <option value="">All Levels</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-4 animate-pulse flex gap-4"><div className="w-12 h-5 bg-surface-200 rounded-full" /><div className="flex-1 h-4 bg-surface-100 rounded w-3/4" /></div>)}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState icon={Database} title="No questions found" description="Try adjusting your filters or add a new question." action={canEdit ? <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Question</button> : undefined} />
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="card overflow-hidden">
              <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-surface-50 transition-colors" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                <div className="flex gap-2 flex-shrink-0 mt-0.5">
                  <span className={TYPE_COLORS[q.type]}>{q.type.toUpperCase()}</span>
                  <span className={DIFF_COLORS[q.difficulty]}>{q.difficulty}</span>
                </div>
                <p className="flex-1 text-sm text-surface-800 leading-relaxed line-clamp-2">{q.text}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-surface-400">{q.marks}m</span>
                  {canEdit && (
                    <>
                      <button onClick={e => { e.stopPropagation(); setEditQuestion(q); setShowModal(true); }} className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(q.id); }} disabled={deleting === q.id} className="btn-ghost p-1.5 text-surface-500 hover:text-red-600">{deleting === q.id ? <span className="spinner-sm" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                    </>
                  )}
                  {expanded === q.id ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                </div>
              </div>
              {expanded === q.id && (
                <div className="px-4 pb-4 pt-2 border-t border-surface-100 bg-surface-50 space-y-3">
                  {q.chapter && <p className="text-xs text-surface-500"><span className="font-medium">Chapter:</span> {q.chapter.subject?.name} — {q.chapter.name}</p>}
                  {q.type === 'mcq' && q.options && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {(q.options as string[]).map((opt, i) => (
                        <div key={i} className={clsx('text-xs px-3 py-1.5 rounded-lg border', q.answer === String.fromCharCode(65 + i) ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-medium' : 'border-surface-200 bg-white text-surface-700')}>
                          <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span>{opt}{q.answer === String.fromCharCode(65 + i) && ' ✓'}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.answer && q.type !== 'mcq' && <div><p className="text-xs font-medium text-surface-600 mb-1">Answer:</p><p className="text-xs text-surface-700 bg-white border border-surface-200 rounded-lg p-2.5">{q.answer}</p></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Previous</button>
          <span className="text-sm text-surface-600 font-medium">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary btn-sm">Next</button>
        </div>
      )}

      {showModal && <QuestionModal question={editQuestion} chapters={allChapters.length ? allChapters : chapters} onSave={() => { setShowModal(false); setEditQuestion(null); loadQuestions(); }} onClose={() => { setShowModal(false); setEditQuestion(null); }} />}
    </div>
  );
}
