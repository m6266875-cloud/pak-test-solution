import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import { ActivityLog } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageHeader, Avatar } from '../../components/ui';
import { ClipboardList, Search, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const ACTION_COLORS: Record<string, string> = {
  login: 'badge-blue', logout: 'badge-gray', register: 'badge-green',
  generate_paper: 'badge-purple', download_paper: 'badge-amber',
  delete_paper: 'badge-red', create_user: 'badge-blue',
  update_user: 'badge-blue', activate_user: 'badge-green',
  deactivate_user: 'badge-amber', change_password: 'badge-purple',
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
      setLogs(res.data.data); setTotal(res.data.pagination.total); setTotalPages(res.data.pagination.totalPages);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Audit Logs"
        description={`${total.toLocaleString()} events recorded`}
        action={<button onClick={loadLogs} disabled={loading} className="btn-secondary"><RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} /> Refresh</button>}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" /><input className="input pl-9" placeholder="Search by user or action..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="select w-full sm:w-52" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="login">Login</option><option value="generate_paper">Generate Paper</option>
          <option value="download_paper">Download Paper</option><option value="delete_paper">Delete Paper</option>
          <option value="create_user">Create User</option><option value="change_password">Change Password</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-3 font-semibold text-surface-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden md:table-cell">Details</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? [...Array(8)].map((_, i) => <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-surface-100 rounded animate-pulse" /></td></tr>)
              : filtered.length === 0 ? <tr><td colSpan={4} className="px-4 py-16 text-center text-surface-500"><ClipboardList className="w-10 h-10 text-surface-200 mx-auto mb-2" />No audit logs found</td></tr>
              : filtered.map(log => (
                <tr key={log.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={log.user?.name || '?'} size="sm" />
                      <div><div className="font-medium text-surface-900">{log.user?.name || 'Unknown'}</div><div className="text-xs text-surface-500">{log.user?.email}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={ACTION_COLORS[log.action] || 'badge-gray'}>{actionLabel(log.action)}</span></td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-surface-500 max-w-xs">{log.details ? <span className="font-mono bg-surface-50 px-2 py-0.5 rounded text-xs">{JSON.stringify(log.details).slice(0, 80)}{JSON.stringify(log.details).length > 80 ? '…' : ''}</span> : '—'}</td>
                  <td className="px-4 py-3 text-xs text-surface-500 whitespace-nowrap">{format(new Date(log.createdAt), 'dd MMM yyyy')}<br /><span className="text-surface-400">{format(new Date(log.createdAt), 'HH:mm:ss')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
            <span className="text-sm text-surface-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
