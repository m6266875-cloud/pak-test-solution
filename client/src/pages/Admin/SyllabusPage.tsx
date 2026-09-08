import { useState, useEffect, useCallback } from 'react';
import { syllabusApi } from '../../api/syllabus';
import { subjectsApi } from '../../api/subjects';
import {
  Board, Book, ClassItem, Subject, SyllabusChapter, Exercise, Topic,
  Medium, BookStatus,
} from '../../types';
import toast from 'react-hot-toast';
import { PageHeader, Tabs, EmptyState } from '../../components/ui';
import {
  Plus, Search, Edit3, Trash2, X, Check, Library, BookOpen, Layers,
  Landmark, GraduationCap, BookMarked, ChevronRight, FileText, ListTree,
  RefreshCw, Link2, Globe,
} from 'lucide-react';
import clsx from 'clsx';

const mediumLabel: Record<Medium, string> = { english: 'English', urdu: 'اردو', bilingual: 'Bilingual' };
const bookStatusStyles: Record<BookStatus, string> = { active: 'badge-green', inactive: 'badge-gray', archived: 'badge-amber' };

/* ═══ Generic small modal shell ═══ */
function ModalShell({ title, onClose, onSave, saving, children, wide }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 backdrop-blur-sm p-4">
      <div className={clsx('bg-white rounded-2xl shadow-2xl w-full animate-scale-in max-h-[90vh] flex flex-col', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-surface-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-100 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Board Modal ═══ */
function BoardModal({ board, onSave, onClose }: { board?: Board | null; onSave: () => void; onClose: () => void }) {
  const isEdit = !!board;
  const [form, setForm] = useState({ name: board?.name || '', code: board?.code || '', region: board?.region || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Board name is required'); return; }
    if (!form.code.trim()) { toast.error('Board code is required'); return; }
    setSaving(true);
    try {
      if (isEdit && board) await syllabusApi.updateBoard(board.id, form);
      else await syllabusApi.createBoard(form);
      toast.success(`Board ${isEdit ? 'updated' : 'created'}`);
      onSave();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save board'); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={isEdit ? 'Edit Board' : 'Add Board'} onClose={onClose} onSave={handleSave} saving={saving}>
      <div><label className="label">Board Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="BISE Lahore" /></div>
      <div><label className="label">Code *</label><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="LHR" /></div>
      <div><label className="label">Region</label><input className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Punjab" /></div>
    </ModalShell>
  );
}

/* ═══ Book Modal ═══ */
function BookModal({ book, boards, classes, subjects, onSave, onClose }: {
  book?: Book | null; boards: Board[]; classes: ClassItem[]; subjects: Subject[];
  onSave: () => void; onClose: () => void;
}) {
  const isEdit = !!book;
  const [form, setForm] = useState({
    title: book?.title || '', publisher: book?.publisher || 'Punjab Textbook Board', edition: book?.edition || '',
    year: book?.year ? String(book.year) : '', language: (book?.language || 'english') as Medium,
    fileUrl: book?.fileUrl || '', status: (book?.status || 'active') as BookStatus,
    boardId: book?.boardId ? String(book.boardId) : '', classId: book?.classId ? String(book.classId) : '',
    subjectId: book?.subjectId ? String(book.subjectId) : '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Book title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        year: form.year || null,
        boardId: form.boardId || null,
        classId: form.classId || null,
        subjectId: form.subjectId || null,
      };
      if (isEdit && book) await syllabusApi.updateBook(book.id, payload);
      else await syllabusApi.createBook(payload);
      toast.success(`Book ${isEdit ? 'updated' : 'created'}`);
      onSave();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save book'); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title={isEdit ? 'Edit Book' : 'Add Book'} onClose={onClose} onSave={handleSave} saving={saving} wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Mathematics — Class 9" /></div>
        <div><label className="label">Publisher</label><input className="input" value={form.publisher} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} placeholder="Punjab Textbook Board" /></div>
        <div><label className="label">Edition</label><input className="input" value={form.edition} onChange={e => setForm(f => ({ ...f, edition: e.target.value }))} placeholder="2025-26" /></div>
        <div><label className="label">Year</label><input type="number" className="input" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2025" /></div>
        <div>
          <label className="label">Language</label>
          <select className="select w-full" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value as Medium }))}>
            <option value="english">English</option><option value="urdu">Urdu</option><option value="bilingual">Bilingual</option>
          </select>
        </div>
        <div>
          <label className="label">Board</label>
          <select className="select w-full" value={form.boardId} onChange={e => setForm(f => ({ ...f, boardId: e.target.value }))}>
            <option value="">— Select board —</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Class</label>
          <select className="select w-full" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
            <option value="">— Select class —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Subject</label>
          <select className="select w-full" value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
            <option value="">— Select subject —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="select w-full" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as BookStatus }))}>
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">File URL (PDF)</label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input pl-9" value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://pctb.punjab.gov.pk/..." />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ═══ Page ═══ */
export default function SyllabusPage() {
  const [tab, setTab] = useState<'boards' | 'books' | 'content'>('boards');

  // Shared reference data
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Books tab state
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [bookBoardFilter, setBookBoardFilter] = useState('');
  const [bookClassFilter, setBookClassFilter] = useState('');
  const [bookStatusFilter, setBookStatusFilter] = useState('');

  // Modals
  const [boardModal, setBoardModal] = useState<{ open: boolean; board: Board | null }>({ open: false, board: null });
  const [bookModal, setBookModal] = useState<{ open: boolean; book: Book | null }>({ open: false, book: null });

  // Drill-down tab state
  const [ddBookId, setDdBookId] = useState<number | ''>('');
  const [chapters, setChapters] = useState<SyllabusChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [ddChapterId, setDdChapterId] = useState<number | ''>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [exerciseModal, setExerciseModal] = useState<{ open: boolean; exercise: Exercise | null }>({ open: false, exercise: null });
  const [topicModal, setTopicModal] = useState<{ open: boolean; topic: Topic | null }>({ open: false, topic: null });
  const [exForm, setExForm] = useState({ name: '', number: '1' });
  const [topicForm, setTopicForm] = useState({ name: '' });
  const [savingItem, setSavingItem] = useState(false);

  /* ── Loaders ── */
  const loadBoards = useCallback(async () => {
    try {
      const res = await syllabusApi.listBoards();
      setBoards(res.data.data);
    } catch { toast.error('Failed to load boards'); }
  }, []);

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const params: any = { limit: 60 };
      if (bookSearch) params.search = bookSearch;
      if (bookBoardFilter) params.boardId = Number(bookBoardFilter);
      if (bookClassFilter) params.classId = Number(bookClassFilter);
      if (bookStatusFilter) params.status = bookStatusFilter;
      const res = await syllabusApi.listBooks(params);
      setBooks(res.data.data);
    } catch { toast.error('Failed to load books'); }
    finally { setBooksLoading(false); }
  }, [bookSearch, bookBoardFilter, bookClassFilter, bookStatusFilter]);

  const loadChapters = useCallback(async (bookId: number) => {
    setChaptersLoading(true);
    try {
      const res = await syllabusApi.listChapters({ bookId });
      setChapters(res.data.data);
    } catch { toast.error('Failed to load chapters'); }
    finally { setChaptersLoading(false); }
  }, []);

  const loadChapterContent = useCallback(async (chapterId: number) => {
    setContentLoading(true);
    try {
      const [exRes, topicRes] = await Promise.all([
        syllabusApi.listExercises({ chapterId }),
        syllabusApi.listTopics({ chapterId }),
      ]);
      setExercises(exRes.data.data);
      setTopics(topicRes.data.data);
    } catch { toast.error('Failed to load chapter content'); }
    finally { setContentLoading(false); }
  }, []);

  useEffect(() => {
    loadBoards();
    subjectsApi.getClasses().then(r => setClasses(r.data.data)).catch(() => {});
    subjectsApi.getSubjectsByClass(9).then(r => setSubjects(r.data.data)).catch(() => {});
  }, [loadBoards]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  useEffect(() => {
    if (ddChapterId !== '') loadChapterContent(Number(ddChapterId));
    else { setExercises([]); setTopics([]); }
  }, [ddChapterId, loadChapterContent]);

  /* ── Handlers ── */
  const handleDeleteBoard = async (board: Board) => {
    if (!confirm(`Delete board "${board.name}"?`)) return;
    try {
      await syllabusApi.deleteBoard(board.id);
      toast.success('Board deleted');
      loadBoards();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete board'); }
  };

  const handleDeleteBook = async (book: Book) => {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      await syllabusApi.deleteBook(book.id);
      toast.success('Book deleted');
      loadBooks();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete book'); }
  };

  const saveExercise = async () => {
    if (!exForm.name.trim()) { toast.error('Exercise name required'); return; }
    setSavingItem(true);
    try {
      if (exerciseModal.exercise) {
        await syllabusApi.updateExercise(exerciseModal.exercise.id, { name: exForm.name, number: Number(exForm.number) || 1 });
      } else {
        await syllabusApi.createExercise({ name: exForm.name, number: Number(exForm.number) || 1, chapterId: Number(ddChapterId) });
      }
      toast.success('Exercise saved');
      setExerciseModal({ open: false, exercise: null });
      if (ddChapterId !== '') loadChapterContent(Number(ddChapterId));
      if (ddBookId !== '') loadChapters(Number(ddBookId));
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save exercise'); }
    finally { setSavingItem(false); }
  };

  const saveTopic = async () => {
    if (!topicForm.name.trim()) { toast.error('Topic name required'); return; }
    setSavingItem(true);
    try {
      if (topicModal.topic) await syllabusApi.updateTopic(topicModal.topic.id, { name: topicForm.name });
      else await syllabusApi.createTopic({ name: topicForm.name, chapterId: Number(ddChapterId) });
      toast.success('Topic saved');
      setTopicModal({ open: false, topic: null });
      if (ddChapterId !== '') loadChapterContent(Number(ddChapterId));
      if (ddBookId !== '') loadChapters(Number(ddBookId));
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save topic'); }
    finally { setSavingItem(false); }
  };

  const selectedChapter = chapters.find(c => c.id === ddChapterId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Syllabus & Textbooks"
        description="Boards, PTB books, exercises and topic hierarchy"
        action={
          tab === 'boards' ? (
            <button onClick={() => setBoardModal({ open: true, board: null })} className="btn-primary"><Plus className="w-4 h-4" /> Add Board</button>
          ) : tab === 'books' ? (
            <button onClick={() => setBookModal({ open: true, book: null })} className="btn-primary"><Plus className="w-4 h-4" /> Add Book</button>
          ) : undefined
        }
      />

      <Tabs
        active={tab}
        onChange={k => setTab(k as any)}
        tabs={[
          { key: 'boards', label: 'Boards', icon: Landmark },
          { key: 'books', label: 'Books', icon: BookMarked },
          { key: 'content', label: 'Exercises & Topics', icon: ListTree },
        ]}
      />

      {/* ═══════ TAB 1: BOARDS ═══════ */}
      {tab === 'boards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.length === 0 ? (
            <div className="col-span-full card">
              <EmptyState icon={Landmark} title="No boards yet" description="Add your first board (e.g. BISE Lahore) to organize the syllabus hierarchy."
                action={<button onClick={() => setBoardModal({ open: true, board: null })} className="btn-primary"><Plus className="w-4 h-4" /> Add Board</button>} />
            </div>
          ) : boards.map(board => (
            <div key={board.id} className="card p-5 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm">
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setBoardModal({ open: true, board })} className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteBoard(board)} className="btn-ghost p-1.5 text-surface-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-surface-900">{board.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded-md text-surface-600">{board.code}</span>
                {board.region && <span className="text-xs text-surface-500 flex items-center gap-1"><Globe className="w-3 h-3" />{board.region}</span>}
              </div>
              <div className="mt-4 pt-3 border-t border-surface-100 flex items-center gap-4 text-xs text-surface-500">
                <span className="flex items-center gap-1.5"><BookMarked className="w-3.5 h-3.5" />{board._count?.books ?? 0} books</span>
                <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />{board._count?.subjects ?? 0} subjects</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ TAB 2: BOOKS ═══════ */}
      {tab === 'books' && (
        <>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input className="input pl-9" placeholder="Search titles or publishers..." value={bookSearch} onChange={e => setBookSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 lg:flex gap-3">
              <select className="select lg:w-40" value={bookBoardFilter} onChange={e => setBookBoardFilter(e.target.value)}>
                <option value="">All Boards</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
              <select className="select lg:w-36" value={bookClassFilter} onChange={e => setBookClassFilter(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="select lg:w-36" value={bookStatusFilter} onChange={e => setBookStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {booksLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="card p-5"><div className="h-4 bg-surface-100 rounded animate-pulse mb-2" /><div className="h-3 bg-surface-100 rounded animate-pulse w-2/3" /></div>)}
            </div>
          ) : books.length === 0 ? (
            <div className="card">
              <EmptyState icon={BookOpen} title="No books found" description="Add PTB textbook mappings to unlock chapter-level organization."
                action={<button onClick={() => setBookModal({ open: true, book: null })} className="btn-primary"><Plus className="w-4 h-4" /> Add Book</button>} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map(book => (
                <div key={book.id} className="card p-5 hover:shadow-lg transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={clsx('badge', bookStatusStyles[book.status])}>{book.status.charAt(0).toUpperCase() + book.status.slice(1)}</span>
                      <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setBookModal({ open: true, book })} className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteBook(book)} className="btn-ghost p-1.5 text-surface-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-surface-900 truncate" title={book.title}>{book.title}</h3>
                  <p className="text-xs text-surface-500 mt-0.5 truncate">{book.publisher || '—'}{book.edition ? ` · ${book.edition}` : ''}{book.year ? ` · ${book.year}` : ''}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {book.board && <span className="badge badge-blue">{book.board.code || book.board.name}</span>}
                    {book.class && <span className="badge badge-purple">{book.class.name}</span>}
                    {book.subject && <span className="badge badge-gray">{book.subject.name}</span>}
                    <span className={clsx('badge', book.language === 'urdu' ? 'badge-amber' : 'badge-gray')}>{mediumLabel[book.language]}</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                    <span className="text-xs text-surface-500 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />{book._count?.chapters ?? 0} chapters</span>
                    <button
                      onClick={() => { setDdBookId(book.id); setDdChapterId(''); loadChapters(book.id); setTab('content'); }}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      Open content <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════ TAB 3: EXERCISES & TOPICS DRILL-DOWN ═══════ */}
      {tab === 'content' && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Book + Chapter selection */}
          <div className="card p-5 space-y-4 h-fit">
            <div>
              <label className="label">Book / Textbook</label>
              <select
                className="select w-full"
                value={ddBookId}
                onChange={e => {
                  const v = e.target.value ? Number(e.target.value) : '';
                  setDdBookId(v); setDdChapterId(''); setChapters([]);
                  if (v !== '') loadChapters(Number(v));
                }}
              >
                <option value="">— Select a book —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>

            {ddBookId !== '' && (
              <div>
                <label className="label">Chapters</label>
                {chaptersLoading ? (
                  <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-9 bg-surface-100 rounded-lg animate-pulse" />)}</div>
                ) : chapters.length === 0 ? (
                  <p className="text-xs text-surface-500 py-3 text-center">No chapters linked to this book yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                    {chapters.map(ch => (
                      <button
                        key={ch.id}
                        onClick={() => setDdChapterId(ch.id)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                          ddChapterId === ch.id ? 'border-brand-500 bg-brand-50' : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                        )}
                      >
                        <span className={clsx('w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0', ddChapterId === ch.id ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600')}>
                          {ch.number}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-surface-900 truncate">{ch.name}</span>
                          <span className="block text-[11px] text-surface-400">
                            {(ch._count as any)?.exercises ?? ch.exercises?.length ?? 0} exercises · {(ch._count as any)?.topics ?? ch.topics?.length ?? 0} topics
                          </span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Exercises & Topics panels */}
          <div className="lg:col-span-2 space-y-5">
            {ddChapterId === '' ? (
              <div className="card">
                <EmptyState icon={ListTree} title="Select a chapter" description="Choose a book and chapter on the left to manage its exercises and topics." />
              </div>
            ) : contentLoading ? (
              <div className="card p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-surface-100 rounded animate-pulse" />)}</div>
            ) : (
              <>
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                    <div>
                      <h2 className="font-semibold text-surface-900 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-600" /> Exercises</h2>
                      <p className="text-xs text-surface-500 mt-0.5">{selectedChapter?.name}</p>
                    </div>
                    <button
                      onClick={() => { setExForm({ name: `Exercise ${selectedChapter?.number}.${exercises.length + 1}`, number: String(exercises.length + 1) }); setExerciseModal({ open: true, exercise: null }); }}
                      className="btn-secondary btn-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  {exercises.length === 0 ? (
                    <p className="text-sm text-surface-500 text-center py-8">No exercises yet — add the first one.</p>
                  ) : (
                    <div className="divide-y divide-surface-50">
                      {exercises.map(ex => (
                        <div key={ex.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors group">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{ex.number}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-surface-900">{ex.name}</span>
                            <span className="text-xs text-surface-400 ml-2">{ex._count?.questions ?? 0} questions</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setExForm({ name: ex.name, number: String(ex.number) }); setExerciseModal({ open: true, exercise: ex }); }} className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete "${ex.name}"?`)) return;
                                try { await syllabusApi.deleteExercise(ex.id); toast.success('Exercise deleted'); loadChapterContent(ddChapterId); if (ddBookId !== '') loadChapters(Number(ddBookId)); }
                                catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete'); }
                              }}
                              className="btn-ghost p-1.5 text-surface-500 hover:text-red-600"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                    <div>
                      <h2 className="font-semibold text-surface-900 flex items-center gap-2"><ListTree className="w-4 h-4 text-emerald-600" /> Topics</h2>
                      <p className="text-xs text-surface-500 mt-0.5">{selectedChapter?.name}</p>
                    </div>
                    <button onClick={() => { setTopicForm({ name: '' }); setTopicModal({ open: true, topic: null }); }} className="btn-secondary btn-sm">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  {topics.length === 0 ? (
                    <p className="text-sm text-surface-500 text-center py-8">No topics yet — add the first one.</p>
                  ) : (
                    <div className="divide-y divide-surface-50">
                      {topics.map(tp => (
                        <div key={tp.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors group">
                          <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0"><ListTree className="w-3.5 h-3.5" /></span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-surface-900">{tp.name}</span>
                            <span className="text-xs text-surface-400 ml-2">{tp._count?.questions ?? 0} questions</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setTopicForm({ name: tp.name }); setTopicModal({ open: true, topic: tp }); }} className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete topic "${tp.name}"?`)) return;
                                try { await syllabusApi.deleteTopic(tp.id); toast.success('Topic deleted'); loadChapterContent(ddChapterId); if (ddBookId !== '') loadChapters(Number(ddBookId)); }
                                catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete'); }
                              }}
                              className="btn-ghost p-1.5 text-surface-500 hover:text-red-600"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Modals ═══ */}
      {boardModal.open && (
        <BoardModal board={boardModal.board} onSave={() => { setBoardModal({ open: false, board: null }); loadBoards(); }} onClose={() => setBoardModal({ open: false, board: null })} />
      )}
      {bookModal.open && (
        <BookModal
          book={bookModal.book} boards={boards} classes={classes} subjects={subjects}
          onSave={() => { setBookModal({ open: false, book: null }); loadBooks(); }}
          onClose={() => setBookModal({ open: false, book: null })}
        />
      )}
      {exerciseModal.open && (
        <ModalShell title={exerciseModal.exercise ? 'Edit Exercise' : 'Add Exercise'} onClose={() => setExerciseModal({ open: false, exercise: null })} onSave={saveExercise} saving={savingItem}>
          <div><label className="label">Exercise Name *</label><input className="input" value={exForm.name} onChange={e => setExForm(f => ({ ...f, name: e.target.value }))} placeholder="Exercise 1.1" /></div>
          <div><label className="label">Number</label><input type="number" min={1} className="input" value={exForm.number} onChange={e => setExForm(f => ({ ...f, number: e.target.value }))} /></div>
        </ModalShell>
      )}
      {topicModal.open && (
        <ModalShell title={topicModal.topic ? 'Edit Topic' : 'Add Topic'} onClose={() => setTopicModal({ open: false, topic: null })} onSave={saveTopic} saving={savingItem}>
          <div><label className="label">Topic Name *</label><input className="input" value={topicForm.name} onChange={e => setTopicForm({ name: e.target.value })} placeholder="Rational numbers" /></div>
        </ModalShell>
      )}
    </div>
  );
}
