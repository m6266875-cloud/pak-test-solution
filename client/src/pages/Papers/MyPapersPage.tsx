import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { papersApi } from '../../api/papers';
import { PaperListItem, PaperStatus } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageHeader, EmptyState, StatusBadge } from '../../components/ui';
import {
  FilePlus, Search, Eye, Download,
  Trash2, FileText, Clock, Award,
} from 'lucide-react';
import clsx from 'clsx';

const STATUS_TABS: { label: string; value: PaperStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Final', value: 'final' },
  { label: 'Archived', value: 'archived' },
];

export default function MyPapersPage() {
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaperStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      const res = await papersApi.list(params);
      setPapers(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch {
      toast.error('Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { loadPapers(); }, [loadPapers]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await papersApi.delete(id);
      toast.success('Paper deleted');
      loadPapers();
    } catch {
      toast.error('Failed to delete paper');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (id: number) => {
    window.open(papersApi.getDownloadUrl(id), '_blank');
  };

  const filtered = papers.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.class.name.toLowerCase().includes(search.toLowerCase()) ||
    p.paperSubjects.some(ps => ps.subject.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="My Papers"
        description={`${papers.length} paper${papers.length !== 1 ? 's' : ''} total`}
        action={
          <Link to="/app/papers/generate" className="btn-primary">
            <FilePlus className="w-4 h-4" /> Generate New Paper
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            className="input pl-11"
            placeholder="Search papers by title, class, or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                statusFilter === tab.value
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Papers Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-surface-200 rounded w-3/4" />
              <div className="h-3 bg-surface-100 rounded w-1/2" />
              <div className="h-3 bg-surface-100 rounded w-2/3" />
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-surface-100 rounded flex-1" />
                <div className="h-8 bg-surface-100 rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'No papers match your search' : 'No papers yet'}
          description={search ? 'Try a different search term' : "You haven't generated any papers. Create your first paper in less than 2 minutes."}
          action={
            !search ? (
              <Link to="/app/papers/generate" className="btn-primary">
                <FilePlus className="w-4 h-4" /> Generate Paper
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(paper => (
            <div key={paper.id} className="card flex flex-col hover:shadow-lg transition-all group">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <StatusBadge status={paper.status} />
                  <span className="text-xs text-surface-400">{format(new Date(paper.createdAt), 'dd MMM yyyy')}</span>
                </div>

                <h3 className="font-semibold text-surface-900 text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-brand-700 transition-colors">
                  {paper.title}
                </h3>
                <p className="text-xs text-surface-500 mb-3">
                  {paper.class.name} · {paper.paperSubjects.map(ps => ps.subject.name).join(', ')}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-50 rounded-full text-xs text-surface-600 font-medium">
                    <Award className="w-3 h-3" />{paper.totalMarks} marks
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-50 rounded-full text-xs text-surface-600 font-medium">
                    <Clock className="w-3 h-3" />{paper.timeLimit} min
                  </span>
                  {paper.paperSettings && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-50 rounded-full text-xs text-surface-600 font-medium">
                      <FileText className="w-3 h-3" />
                      {paper.paperSettings.mcqCount + paper.paperSettings.shortCount + paper.paperSettings.essayCount} Qs
                    </span>
                  )}
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-surface-100 flex gap-2">
                <Link to={`/papers/${paper.id}`} className="btn-secondary flex-1 btn-sm">
                  <Eye className="w-3.5 h-3.5" /> View
                </Link>
                <button onClick={() => handleDownload(paper.id)} className="btn-primary flex-1 btn-sm">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => handleDelete(paper.id, paper.title)}
                  disabled={deleting === paper.id}
                  className="btn-ghost text-red-500 hover:bg-red-50 btn-sm px-2.5"
                >
                  {deleting === paper.id ? <span className="spinner-sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">
            Previous
          </button>
          <span className="text-sm text-surface-600 font-medium">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary btn-sm">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
