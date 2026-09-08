import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import { questionsApi } from '../../api/questions';
import { subjectsApi } from '../../api/subjects';
import { Question, QuestionType, Difficulty, ClassItem, Subject, Chapter } from '../../types';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, Edit3, Trash2, Database,
  ChevronDown, ChevronUp, X, Check, Upload, BarChart2,
} from 'lucide-react';
import clsx from 'clsx';

const TYPE_COLORS: Record<QuestionType, string> = {
  mcq:   'bg-blue-100 text-blue-700',
  short: 'bg-purple-100 text-purple-700',
  essay: 'bg-green-100 text-green-700',
};
const DIFF_COLORS: Record<Difficulty, string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
};

// ─── Add/Edit Question Modal ──────────────────────────────────────────────────
function QuestionModal({
  question, chapters, onSave, onClose,
}: {
  question?: Question | null;
  chapters: Chapter[];
  onSave: () => void;
  onClose: () => void;
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
    if (!form.chapterId)   { toast.error('Chapter is required'); return; }
    setSaving(true);
    try {
      const payload = {
        chapterId: form.chapterId,
        type: form.type,
        text: form.text.trim(),
        marks: form.marks,
        options: form.type === 'mcq' ? form.options.filter(o => o.trim()) : null,
        answer: form.answer.trim() || null,
        difficulty: form.difficulty,
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
      toast.error(e.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Question' : 'Add New Question'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Chapter */}
          <div>
            <label className="label">Chapter <span className="text-red-500">*</span></label>
            <select
              className="select"
              value={form.chapterId}
              onChange={e => setForm(f => ({ ...f, chapterId: Number(e.target.value) }))}
            >
              {chapters.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.subject?.name && `${ch.subject.name} — `}Ch {ch.number}. {ch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type & Difficulty row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Question Type</label>
              <div className="flex gap-2">
                {(['mcq', 'short', 'essay'] as QuestionType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t, marks: t === 'mcq' ? 1 : t === 'short' ? 3 : 10 }))}
                    className={clsx(
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 uppercase transition-all',
                      form.type === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select
                className="select"
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Question text */}
          <div>
            <label className="label">Question Text <span className="text-red-500">*</span></label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              placeholder="Enter the question..."
            />
          </div>

          {/* MCQ Options */}
          {form.type === 'mcq' && (
            <div>
              <label className="label">Options (A, B, C, D)</label>
              <div className="grid grid-cols-2 gap-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-500 w-5">{String.fromCharCode(65 + i)}.</span>
                    <input
                      className="input flex-1"
                      value={opt}
                      onChange={e => {
                        const opts = [...form.options];
                        opts[i] = e.target.value;
                        setForm(f => ({ ...f, options: opts }));
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                {form.type === 'mcq' ? 'Correct Answer (A/B/C/D)' : 'Model Answer'}
              </label>
              {form.type === 'mcq' ? (
                <select
                  className="select"
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                >
                  <option value="">Select correct option</option>
                  {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              ) : (
                <textarea
                  className="input min-h-[60px] resize-y"
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  placeholder="Model answer (optional)"
                />
              )}
            </div>
            <div>
              <label className="label">Marks</label>
              <input
                type="number"
                className="input"
                value={form.marks}
                onChange={e => setForm(f => ({ ...f, marks: Number(e.target.value) }))}
                min={1}
                max={20}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input
              className="input"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. algebra, equations, chapter-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────
function BulkImportModal({ chapters, onSave, onClose }: { chapters: Chapter[]; onSave: () => void; onClose: () => void }) {
  const [json, setJson] = useState('');
  const [saving, setSaving] = useState(false);

  const template = JSON.stringify([
    { chapterId: chapters[0]?.id || 1, type: 'mcq', text: 'Sample MCQ question?', marks: 1, options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'A', difficulty: 'easy', tags: ['sample'] },
    { chapterId: chapters[0]?.id || 1, type: 'short', text: 'Sample short question?', marks: 3, answer: 'Model answer here', difficulty: 'medium', tags: ['sample'] },
  ], null, 2);

  const handleImport = async () => {
    let data: any[];
    try {
      data = JSON.parse(json);
      if (!Array.isArray(data)) throw new Error('Must be an array');
    } catch {
      toast.error('Invalid JSON format. Must be an array of questions.');
      return;
    }
    setSaving(true);
    try {
      const res = await questionsApi.bulkCreate(data);
      toast.success(res.data.message);
      onSave();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally {
      setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Bulk Import Questions</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Paste a JSON array of questions. Each question must have: chapterId, type, text, marks, difficulty.
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">JSON Data</label>
              <button
                onClick={() => setJson(template)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Load template
              </button>
            </div>
            <textarea
              className="input font-mono text-xs min-h-[280px] resize-y"
              value={json}
              onChange={e => setJson(e.target.value)}
              placeholder="Paste JSON array here..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleImport} disabled={saving || !json.trim()} className="btn-primary">
            {saving ? <span className="spinner" /> : <Upload className="w-4 h-4" />}
            Import Questions
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuestionBankPage() {
  const { user } = useAppSelector(s => s.auth);
  const canEdit = user && ['super_admin', 'school_admin'].includes(user.role);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Filter state
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filters, setFilters] = useState({
    classId: 0, subjectId: 0, chapterId: 0,
    type: '' as QuestionType | '',
    difficulty: '' as Difficulty | '',
    search: '',
  });
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
      setAllChapters(prev => {
        const ids = new Set(prev.map(c => c.id));
        return [...prev, ...r.data.data.filter((c: Chapter) => !ids.has(c.id))];
      });
    });
    setFilters(f => ({ ...f, chapterId: 0 }));
  }, [filters.subjectId]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filters.chapterId) params.chapterId = filters.chapterId;
      else if (filters.subjectId) {
        // filter by chapters of this subject
      }
      if (filters.type)       params.type = filters.type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search)     params.search = filters.search;

      const [qRes, sRes] = await Promise.all([
        questionsApi.list(params),
        filters.chapterId ? questionsApi.getStats({ chapterId: filters.chapterId }) : questionsApi.getStats(),
      ]);
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
    try {
      await questionsApi.delete(id);
      toast.success('Question deleted');
      loadQuestions();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const openEdit = (q: Question) => { setEditQuestion(q); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditQuestion(null); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} questions available</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(true)} className="btn-secondary text-sm">
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button onClick={() => { setEditQuestion(null); setShowModal(true); }} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Total" value={stats.total} color="bg-gray-100 text-gray-700" />
          {(stats.byType || []).map((t: any) => (
            <StatPill key={t.type} label={t.type.toUpperCase()} value={t._count.id} color={TYPE_COLORS[t.type as QuestionType]} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search questions..."
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            />
          </div>
          <select className="select" value={filters.classId} onChange={e => { setFilters(f => ({ ...f, classId: Number(e.target.value) })); setPage(1); }}>
            <option value={0}>All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={filters.subjectId} onChange={e => { setFilters(f => ({ ...f, subjectId: Number(e.target.value) })); setPage(1); }} disabled={!filters.classId}>
            <option value={0}>All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" value={filters.type} onChange={e => { setFilters(f => ({ ...f, type: e.target.value as any })); setPage(1); }}>
            <option value="">All Types</option>
            <option value="mcq">MCQ</option>
            <option value="short">Short</option>
            <option value="essay">Essay</option>
          </select>
          <select className="select" value={filters.difficulty} onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value as any })); setPage(1); }}>
            <option value="">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex gap-4">
              <div className="w-12 h-5 bg-gray-200 rounded-full" />
              <div className="flex-1 h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="card p-16 text-center">
          <Database className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">No questions found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {Object.values(filters).some(Boolean) ? 'Try adjusting your filters' : 'Add your first question to get started'}
          </p>
          {canEdit && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="card overflow-hidden">
              {/* Question row */}
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}
              >
                <div className="flex gap-2 flex-shrink-0 mt-0.5">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold uppercase', TYPE_COLORS[q.type])}>
                    {q.type}
                  </span>
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', DIFF_COLORS[q.difficulty])}>
                    {q.difficulty}
                  </span>
                </div>
                <p className="flex-1 text-sm text-gray-800 leading-relaxed line-clamp-2">{q.text}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{q.marks}m</span>
                  {canEdit && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(q); }}
                        className="btn-ghost p-1.5 text-gray-500 hover:text-primary-600"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(q.id); }}
                        disabled={deleting === q.id}
                        className="btn-ghost p-1.5 text-gray-500 hover:text-red-600"
                      >
                        {deleting === q.id ? <span className="spinner w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                  {expanded === q.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded details */}
              {expanded === q.id && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 space-y-3">
                  {/* Chapter */}
                  {q.chapter && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Chapter:</span> {q.chapter.subject?.name} — {q.chapter.name}
                    </p>
                  )}

                  {/* MCQ options */}
                  {q.type === 'mcq' && q.options && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1.5">Options:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(q.options as string[]).map((opt, i) => (
                          <div
                            key={i}
                            className={clsx(
                              'text-xs px-3 py-1.5 rounded-lg border',
                              q.answer === String.fromCharCode(65 + i)
                                ? 'border-green-400 bg-green-50 text-green-800 font-medium'
                                : 'border-gray-200 bg-white text-gray-700'
                            )}
                          >
                            <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span>
                            {opt}
                            {q.answer === String.fromCharCode(65 + i) && ' ✓'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Answer */}
                  {q.answer && q.type !== 'mcq' && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Model Answer:</p>
                      <p className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-2.5 leading-relaxed">{q.answer}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {q.tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {q.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm">Next</button>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <QuestionModal
          question={editQuestion}
          chapters={allChapters.length ? allChapters : chapters}
          onSave={() => { closeModal(); loadQuestions(); }}
          onClose={closeModal}
        />
      )}
      {showBulk && (
        <BulkImportModal
          chapters={allChapters.length ? allChapters : chapters}
          onSave={() => { setShowBulk(false); loadQuestions(); }}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={clsx('px-4 py-2.5 rounded-xl flex items-center justify-between', color)}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}
