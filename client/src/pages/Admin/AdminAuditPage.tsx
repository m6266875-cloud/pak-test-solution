/**
 * PHASE 3 — Activity log (real /api/v3/audit).
 *
 * Server-side paginated + filtered list (user/action/entity/school/time).
 * Schools admins only ever see their own school's log (enforced in SQL).
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, Loader2, RefreshCw, Search } from 'lucide-react';
import { v3 } from '../../api/v3';
import { EmptyState, PageHeader } from '../../components/ui';
import type { AuditRowV3 } from '../../types';

const ACTION_COLOR: Record<string, string> = {
  'school.create': 'bg-emerald-100 text-emerald-700',
  'user.teacher.create': 'bg-blue-100 text-blue-700',
  'user.admin.create': 'bg-brass-100 text-brass-800',
  'user.password-reset': 'bg-amber-100 text-amber-700',
  'paper.generate': 'bg-brand-100 text-brand-800',
  'paper.finalize': 'bg-emerald-100 text-emerald-700',
  'paper.archive': 'bg-surface-200 text-surface-600',
  'paper.download': 'bg-emerald-100 text-emerald-800',
  'paper.duplicate': 'bg-cyan-100 text-cyan-700',
  'paper.branding': 'bg-pink-100 text-pink-700',
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRowV3[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    try { const r = await v3.audit.actions(); setActions(r.data.data); } catch { /* optional */ }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v3.audit.list({ page, limit: 25, action, entity, search });
      setRows(res.data.data.rows);
      setTotal(res.data.data.total);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load activity log');
    } finally { setLoading(false); }
  }, [page, action, entity, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchActions(); }, [fetchActions]);

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader title="Activity Log" description={`${total} events · every admin/teacher action is recorded server-side`}
        action={<button className="btn-ghost btn-sm" onClick={() => { setPage(1); fetchRows(); }}><RefreshCw className="w-4 h-4" /> Refresh</button>} />

      <div className="card p-3 mb-4 grid sm:grid-cols-3 gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-9" placeholder="Search entity/action/id…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="select" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
          <option value="">All entities</option>
          {['School', 'User', 'Paper', 'PaperTemplate', 'PaperPattern', 'Question'].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="card divide-y divide-surface-100">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 animate-pulse bg-surface-50" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Clock} title="No activity yet" description="Events appear here as schools/teachers/papers/questions are created, approved or downloaded." />
      ) : (
        <>
          <div className="card divide-y divide-surface-100 overflow-hidden">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-start gap-3 text-sm">
                <div className={clsxDot(r.action)}>{r.action}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-surface-800">
                    <span className="font-semibold">{r.userName ?? 'System'}</span>
                    <span className="text-surface-400"> {r.userEmail ? `· ${r.userEmail}` : ''} → </span>
                    <span className="font-medium">{r.entity}{r.entityId ? ` #${r.entityId}` : ''}</span>
                    {r.schoolName && <span className="text-surface-400"> · {r.schoolName}</span>}
                  </p>
                  {r.details && Object.keys(r.details).length > 0 && (
                    <p className="text-[10.5px] text-surface-400 font-mono truncate mt-0.5">{JSON.stringify(r.details).slice(0, 160)}</p>
                  )}
                </div>
                <span className="text-[10.5px] text-surface-400 flex-shrink-0">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span className="text-xs text-surface-500">Page {page} / {pages}</span>
            <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

function clsxDot(action: string): string {
  return `text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${ACTION_COLOR[action] ?? 'bg-surface-100 text-surface-600'}`;
}
