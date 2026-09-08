import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { papersApi } from '../../api/papers';
import { PaperListItem, PaperStatus } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  FilePlus, Search, Filter, Eye, Download,
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
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Papers</h1>
          <p className="text-sm text-gray-500">{papers.length} paper{papers.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/app/papers/generate" className="btn-primary self-start">
          <FilePlus className="w-4 h-4" /> Generate New Paper
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search papers by title, class, or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                statusFilter === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-gray-100 rounded flex-1" />
                <div className="h-8 bg-gray-100 rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {search ? 'No papers match your search' : 'No papers yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {search ? 'Try a different search term' : 'Generate your first exam paper to get started'}
          </p>
          <Link to="/app/papers/generate" className="btn-primary inline-flex">
            <FilePlus className="w-4 h-4" /> Generate Paper
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(paper => (
            <div key={paper.id} className="card flex flex-col hover:shadow-md transition-shadow">
              <div className="p-5 flex-1">
                {/* Status & Date */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <StatusBadge status={paper.status} />
                  <span className="text-xs text-gray-400">{format(new Date(paper.createdAt), 'dd MMM yyyy')}</span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
                  {paper.title}
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  {paper.class.name} · {paper.paperSubjects.map(ps => ps.subject.name).join(', ')}
                </p>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5">
                  <MetaChip icon={Award} label={`${paper.totalMarks} marks`} />
                  <MetaChip icon={Clock} label={`${paper.timeLimit} min`} />
                  {paper.paperSettings && (
                    <MetaChip
                      icon={FileText}
                      label={`${paper.paperSettings.mcqCount + paper.paperSettings.shortCount + paper.paperSettings.essayCount} Qs`}
                    />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
                <Link to={`/papers/${paper.id}`} className="btn-secondary flex-1 text-xs py-1.5">
                  <Eye className="w-3.5 h-3.5" /> View
                </Link>
                <button
                  onClick={() => handleDownload(paper.id)}
                  className="btn-primary flex-1 text-xs py-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => handleDelete(paper.id, paper.title)}
                  disabled={deleting === paper.id}
                  className="btn-ghost text-red-500 hover:bg-red-50 px-2.5 py-1.5"
                >
                  {deleting === paper.id
                    ? <span className="spinner w-3.5 h-3.5" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PaperStatus }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      status === 'final'    && 'bg-green-100 text-green-700',
      status === 'draft'    && 'bg-gray-100 text-gray-600',
      status === 'archived' && 'bg-amber-100 text-amber-700',
    )}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MetaChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
