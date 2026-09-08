import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import { ActivityLog } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ClipboardList, Search, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const ACTION_COLORS: Record<string, string> = {
  login:          'bg-blue-100 text-blue-700',
  logout:         'bg-gray-100 text-gray-600',
  register:       'bg-green-100 text-green-700',
  generate_paper: 'bg-purple-100 text-purple-700',
  download_paper: 'bg-amber-100 text-amber-700',
  delete_paper:   'bg-red-100 text-red-700',
  create_user:    'bg-teal-100 text-teal-700',
  update_user:    'bg-cyan-100 text-cyan-700',
  activate_user:  'bg-green-100 text-green-700',
  deactivate_user:'bg-orange-100 text-orange-700',
  change_password:'bg-indigo-100 text-indigo-700',
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 25 };
      if (actionFilter) params.action = actionFilter;
      const res = await adminApi.getAuditLogs(params);
      setLogs(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page, actionFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter(log =>
    !search || log.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    log.action.includes(search.toLowerCase())
  );

  const actionLabel = (action: string) => action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} events recorded</p>
        </div>
        <button onClick={loadLogs} disabled={loading} className="btn-secondary self-start">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by user or action..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-full sm:w-52" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="generate_paper">Generate Paper</option>
          <option value="download_paper">Download Paper</option>
          <option value="delete_paper">Delete Paper</option>
          <option value="create_user">Create User</option>
          <option value="change_password">Change Password</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Details</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500">No audit logs found</p>
                  </td>
                </tr>
              ) : filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                        {log.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{log.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{log.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'
                    )}>
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500 max-w-xs">
                    {log.details ? (
                      <span className="font-mono bg-gray-50 px-2 py-0.5 rounded text-xs">
                        {JSON.stringify(log.details).slice(0, 80)}{JSON.stringify(log.details).length > 80 ? '…' : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd MMM yyyy')}
                    <br />
                    <span className="text-gray-400">{format(new Date(log.createdAt), 'HH:mm:ss')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm py-1">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
