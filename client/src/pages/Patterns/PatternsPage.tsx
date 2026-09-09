/**
 * PHASE 2 — Patterns manager.
 *
 * Lists patterns visible to the current user (own + shared), shows their
 * stored scope/distribution config, lets teachers delete their own and
 * admins pin/unpin shared patterns. Applying a pattern happens in the
 * generator wizard (one click pre-fills all 15 steps).
 *
 * Route: /app/patterns.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Copy, Globe, Lock, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v2 } from '../../api/v2';
import { EmptyState, PageHeader, Skeleton } from '../../components/ui';
import type { PatternV2 } from '../../types';
import { fmtDate, TYPE_SHORT } from '../Papers/shared/paperUtils';

export default function PatternsPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role !== 'teacher';
  const [rows, setRows] = useState<PatternV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    v2.patterns.list()
      .then((r) => setRows(r.data.data as PatternV2[]))
      .catch((e: any) => toast.error(e?.message || 'Failed to load patterns'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id: number, fn: () => Promise<any>, ok: string) => {
    setBusy(id);
    try { await fn(); toast.success(ok); load(); }
    catch (e: any) { toast.error(e?.message || 'Action failed'); }
    finally { setBusy(null); }
  };

  const summarize = (cfg: any): string => {
    if (!cfg) return 'Empty config';
    const dist = Array.isArray(cfg.distribution) ? cfg.distribution : [];
    const parts = dist.filter((d: any) => d.count > 0).map((d: any) => `${TYPE_SHORT[d.type] ?? d.type} ${d.count}×${d.marks}`);
    return [cfg.totalMarks ? `${cfg.totalMarks} marks` : '', cfg.language, parts.join(' · ')].filter(Boolean).join(' — ');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title="Paper Patterns"
        description="Reusable scope + distribution configurations. Apply them inside the generator wizard."
        action={<button className="btn-primary" onClick={() => navigate('/app/papers/generate')}><Plus className="w-4 h-4" /> New pattern</button>}
      />

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Sparkles} title="No patterns yet"
          description="Configure the wizard once, hit “Save as pattern”, and reuse it with one click later."
          action={<button className="btn-primary" onClick={() => navigate('/app/papers/generate')}><Plus className="w-4 h-4" /> Open the wizard</button>} />
      ) : (
        <div className="space-y-2.5">
          {rows.map((p) => {
            const own = p.createdById === user?.id;
            const cfg = p.config ?? {};
            return (
              <div key={p.id} className="card p-4 flex flex-wrap items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-[220px]">
                  <p className="font-bold text-sm text-surface-900 flex items-center gap-2 flex-wrap">
                    {p.name}
                    {p.isShared
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-brand-600 text-white px-2 py-0.5 rounded-full"><Globe className="w-3 h-3" /> shared</span>
                      : <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-surface-200 text-surface-600 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" /> private</span>}
                    {!own && p.ownerName && <span className="text-[11px] font-semibold text-surface-400">by {p.ownerName}</span>}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">{summarize(cfg)}</p>
                  <p className="text-[11px] text-surface-400 mt-0.5">{p.description || '—'} · saved {fmtDate(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="btn-primary btn-sm" onClick={() => navigate('/app/papers/generate?pattern=' + p.id)} title="Apply inside the wizard">
                    <Copy className="w-3.5 h-3.5" /> Apply
                  </button>
                  {own && (
                    <button className="btn-ghost btn-icon text-rose-500" title="Delete pattern"
                      onClick={() => { if (window.confirm(`Delete pattern “${p.name}”?`)) act(p.id, () => v2.patterns.remove(p.id), 'Pattern deleted'); }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && (
                    <button className={clsx('btn-ghost btn-sm', p.isShared && 'text-brand-600')} disabled={busy === p.id}
                      title={p.isShared ? 'Unshare (back to private)' : 'Share with all teachers'}
                      onClick={() => act(p.id, () => v2.patterns.update(p.id, { isShared: !p.isShared }), p.isShared ? 'Pattern is now private' : 'Pattern shared')}>
                      <Globe className="w-3.5 h-3.5" /> {p.isShared ? 'Unshare' : 'Share'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
