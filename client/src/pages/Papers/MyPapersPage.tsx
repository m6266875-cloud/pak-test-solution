/**
 * PHASE 2 — My Papers (v2).
 *
 * Server-paginated list of generated papers with status/scope filters,
 * batch actions (duplicate / finalise / delete) and quick navigation into
 * the paper detail page. Teachers only ever see their own papers (server
 * enforced); admins see all papers here (teacher column shown).
 *
 * Route: /app/papers (preserved from Phase 1).
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Copy, Eye, FileText,
  Filter, Loader2, Search, Trash2,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v2 } from '../../api/v2';
import { EmptyState, PageHeader, Skeleton } from '../../components/ui';
import CourseLogo from '../../components/common/CourseLogo';
import type { PaperSummaryV2 } from '../../types';
import { fmtDate } from './shared/paperUtils';

const STATUSES = ['draft', 'final', 'archived'] as const;
const LIMIT = 12;

export default function MyPapersPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role !== 'teacher';

  const [rows, setRows] = useState<PaperSummaryV2[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [courseId, setCourseId] = useState<number | undefined>();
  const [classId, setClassId] = useState<number | undefined>();
  const [courses, setCourses] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2.papers.list({
        page, limit: LIMIT, status: status || undefined,
        courseId, classId, search: search.trim() || undefined,
      });
      const d = res.data as any;
      setRows(d.data);
      setTotal(d.pagination?.total ?? 0);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, [page, status, courseId, classId, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // catalog filters for admin scope browsers
  useEffect(() => {
    v2.catalog.courses().then((r) => setCourses(r.data.data.map((c) => ({ id: c.id, code: c.code, name: `${c.code} — ${c.name}` })))).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!courseId) { setClasses([]); setClassId(undefined); return; }
    v2.catalog.courseClasses(courseId).then((r) => setClasses(r.data.data.map((c: any) => ({ id: c.id, name: c.name })))).catch(() => setClasses([]));
  }, [courseId]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  const onSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  const act = async (fn: () => Promise<any>, ok: string, id: number) => {
    setBusyId(id);
    try { await fn(); toast.success(ok); fetchRows(); }
    catch (e: any) { toast.error(e?.message || 'Action failed'); }
    finally { setBusyId(null); }
  };

  const sorted = [...rows].sort((a, b) => (sortDir === 'desc' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title={isAdmin ? 'Papers (all users)' : 'My Papers'}
        description={`${total} paper${total === 1 ? '' : 's'} · drafts, finals and archived copies.`}
        action={<button className="btn-primary" onClick={() => navigate('/app/papers/generate')}><FileText className="w-4 h-4" /> Generate new</button>}
      />

      {/* filters */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-surface-400" />
        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-9 w-56" placeholder="Search by title…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-1.5">
          {STATUSES.map((s) => (
            <button key={s} type="button"
              onClick={() => { setStatus(status === s ? '' : s); setPage(1); }}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                status === s ? 'bg-surface-800 text-white border-surface-800' : 'bg-white border-surface-200 text-surface-500 hover:border-surface-400')}>
              {s}
            </button>
          ))}
        </div>
        <select className="select w-56" value={courseId ?? ''}
          onChange={(e) => { setCourseId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(() => { const sel = courses.find((c) => c.id === courseId); return sel ? <CourseLogo code={sel.code} size="sm" /> : null; })()}
        <select className="select w-44" value={classId ?? ''} disabled={!courseId}
          onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="ml-auto text-xs text-surface-400">Sort by created</span>
        <button className="btn-ghost btn-sm" onClick={onSort}>
          {sortDir === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />} newest {sortDir === 'desc' ? 'first' : 'last'}
        </button>
      </div>

      {/* list */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={FileText} title="No papers found"
          description={search || status || courseId ? 'Try relaxing the filters.' : 'Generate your first paper from the wizard.'}
          action={<button className="btn-primary" onClick={() => navigate('/app/papers/generate')}><FileText className="w-4 h-4" /> Generate paper</button>} />
      ) : (
        <div className="space-y-2.5">
          {sorted.map((p) => (
            <div key={p.id} className={clsx('card p-4 flex flex-wrap items-center gap-3 transition-all hover:shadow-md')}>
              <button className="flex items-center gap-3 flex-1 min-w-[260px] text-left" onClick={() => navigate(`/app/papers/${p.id}`)}>
                <span className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0',
                  p.status === 'final' ? 'bg-emerald-100 text-emerald-600' : p.status === 'archived' ? 'bg-surface-200 text-surface-500' : 'bg-brand-50 text-brand-600')}>
                  <FileText className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-surface-900 truncate">{p.title}</span>
                  <span className="block text-xs text-surface-500">
                    {p.examTitle ? `${p.examTitle} · ` : ''}{p.className}
                    {p.courseCode ? (<> · <CourseLogo code={p.courseCode} size="xs" style={{ verticalAlign: '-0.22em' }} /> {p.courseCode}</>) : ''} · {(p.subjects ?? []).map((s) => s.name).join(', ') || '—'}
                  </span>
                  <span className="block text-[11px] text-surface-400 mt-0.5">
                    {p.questionCount} questions · {p.totalMarks} marks · {p.medium} · {fmtDate(p.createdAt)}
                    {isAdmin && p.teacherName ? ` · ${p.teacherName}` : ''}
                  </span>
                </span>
              </button>
              <span className={clsx('text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full',
                p.status === 'final' ? 'bg-emerald-100 text-emerald-700' : p.status === 'archived' ? 'bg-surface-100 text-surface-500' : 'bg-amber-100 text-amber-700')}>
                {p.status}
              </span>
              <span className="badge badge-gray hidden md:inline-flex">{p.paperType}</span>
              <div className="flex items-center gap-1.5 no-print">
                <button className="btn-ghost btn-icon" title="Open" onClick={() => navigate(`/app/papers/${p.id}`)}><Eye className="w-4 h-4" /></button>
                <button className="btn-ghost btn-icon" title="Duplicate as draft" disabled={busyId === p.id}
                  onClick={() => act(() => v2.papers.duplicate(p.id), 'Duplicated as draft', p.id)}>
                  {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                </button>
                {p.status !== 'final' && (
                  <button className="btn-ghost btn-icon text-emerald-600" title="Mark as final" disabled={busyId === p.id}
                    onClick={() => act(() => v2.papers.update(p.id, { status: 'final' }), 'Marked as final', p.id)}>
                    {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                )}
                <button className="btn-ghost btn-icon text-rose-500" title="Delete"
                  onClick={() => { if (window.confirm(`Delete paper “${p.title}”?`)) act(() => v2.papers.remove(p.id), 'Paper deleted', p.id); }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span className="text-xs font-bold text-surface-500">Page {page} / {pages}</span>
          <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</button>
        </div>
      )}

      {total > 0 && page > pages && (
        <p className="text-xs text-amber-600 flex items-center justify-center gap-1 mt-3"><AlertTriangle className="w-3.5 h-3.5" /> Page out of range — resetting to page {pages}.</p>
      )}
    </div>
  );
}
