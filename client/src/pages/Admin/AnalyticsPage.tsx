/**
 * PHASE 3 — Analytics (real /api/v3/analytics).
 *
 * Overview totals + paper statuses + question type/status breakdown,
 * paper activity (today/week/month + last-14-days), and top
 * schools/teachers/subjects. All numbers are SQL aggregates — the server
 * never ships question rows to the browser for counting.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity, BarChart3, BookOpen, Building2, FileStack, GraduationCap,
  Layers, Loader2, School as SchoolIcon, Users,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v3 } from '../../api/v3';
import { PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import type { AnalyticsOverviewV3, PaperActivityV3, TopListsV3 } from '../../types';

export default function AnalyticsPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [overview, setOverview] = useState<AnalyticsOverviewV3 | null>(null);
  const [activity, setActivity] = useState<PaperActivityV3 | null>(null);
  const [top, setTop] = useState<TopListsV3 | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, a, t] = await Promise.all([v3.analytics.overview(), v3.analytics.activity(), v3.analytics.top()]);
      setOverview(o.data.data); setActivity(a.data.data); setTop(t.data.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load analytics');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !overview) {
    return <div className="max-w-7xl mx-auto px-4 py-6"><PageHeader title="Analytics" description="Loading…" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></div>;
  }

  const isSchoolScope = user?.role === 'school_admin';
  const totals = [
    { label: 'Teachers', value: overview.totals.teachers, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Papers', value: overview.totals.papers, icon: FileStack, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Courses', value: overview.totals.courses, icon: BookOpen, color: 'bg-purple-50 text-purple-600' },
    { label: 'Classes', value: overview.totals.classes, icon: GraduationCap, color: 'bg-amber-50 text-amber-600' },
    ...(isSchoolScope ? [] : [
      { label: 'Schools', value: overview.totals.schools, icon: SchoolIcon, color: 'bg-indigo-50 text-indigo-600' },
      { label: 'Books', value: overview.totals.books, icon: Layers, color: 'bg-rose-50 text-rose-600' },
      { label: 'Questions', value: overview.totals.questions, icon: BarChart3, color: 'bg-teal-50 text-teal-600' },
    ]),
  ];
  const maxDaily = Math.max(1, ...(activity?.daily ?? []).map((d) => d.n));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Analytics" description={isSchoolScope ? `Scope: ${user?.schoolName ?? 'my school'}` : 'Scope: all schools (system-wide)'} />

      {/* totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
        {totals.map((t) => (
          <div key={t.label} className="card p-3.5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.color}`}><t.icon className="w-5 h-5" /></div>
            <div>
              <div className="text-xl font-extrabold text-surface-900 leading-tight">{t.value}</div>
              <div className="text-[11px] text-surface-500 font-semibold uppercase tracking-wide">{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* paper statuses */}
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-surface-500 mb-3">Papers by status</p>
          <StatusRows items={overview.papersByStatus} total={overview.totals.papers} />
        </div>
        {/* activity */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-surface-500">Paper generation activity</p>
            <Activity className="w-4 h-4 text-surface-300" />
          </div>
          {activity && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['Today', activity.today], ['This week', activity.week], ['This month', activity.month]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-surface-50 border border-surface-100 p-2.5 text-center">
                  <div className="text-lg font-extrabold text-brand-700">{v}</div>
                  <div className="text-[10px] text-surface-500 font-semibold">{l}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1 h-20">
            {(activity?.daily ?? []).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[9px] text-surface-400 opacity-0 group-hover:opacity-100">{d.n}</span>
                <div className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${Math.max(3, (d.n / maxDaily) * 100)}%` }} title={`${d.day}: ${d.n}`} />
              </div>
            ))}
            {!activity?.daily?.length && <p className="text-xs text-surface-300">No daily data yet</p>}
          </div>
          {activity?.daily?.length ? <p className="text-[10px] text-surface-400 mt-1 text-right">last {activity.daily.length} days</p> : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* question breakdown */}
        <div className="card p-4 lg:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-surface-500 mb-3">Question stats</p>
          <div className="space-y-2">
            {overview.questionsByType.map((x) => <MiniBar key={x.type} label={x.type.replace('_', ' ')} n={x.n} total={Math.max(1, overview.questionsByType.reduce((a, b) => a + b.n, 0))} />)}
            {!overview.questionsByType.length && <p className="text-xs text-surface-300">No questions</p>}
          </div>
        </div>
        {/* top lists */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {!isSchoolScope && top && (
            <TopList title="Most active schools" items={top.schools.map((s) => ({ id: s.id, name: s.name, sub: s.code, n: s.papers }))} />
          )}
          {top && (
            <TopList title="Most active teachers" items={top.teachers.map((t) => ({ id: t.id, name: t.name, sub: t.email, n: t.papers }))} />
          )}
          {top && (
            <TopList title="Most generated subjects" items={top.subjects.map((s) => ({ id: s.id, name: s.name, sub: s.medium, n: s.papers }))} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRows({ items, total }: { items: Array<{ status: string; n: number }>; total: number }) {
  if (!items.length) return <p className="text-xs text-surface-300">No papers yet.</p>;
  return (
    <div className="space-y-2">
      {items.map((x) => (
        <div key={x.status}>
          <div className="flex items-center justify-between text-xs mb-1">
            <StatusBadge status={x.status} />
            <span className="text-surface-500 font-semibold">{x.n} · {total ? Math.round((x.n / total) * 100) : 0}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: `${total ? (x.n / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBar({ label, n, total }: { label: string; n: number; total: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="capitalize text-surface-600">{label}</span>
        <span className="font-bold text-surface-700">{n}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(n / total) * 100}%` }} />
      </div>
    </div>
  );
}

function TopList({ title, items }: { title: string; items: Array<{ id: number; name: string; sub: string; n: number }> }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2.5"><Building2 className="w-4 h-4 text-surface-300" />
        <p className="text-xs font-bold uppercase tracking-wide text-surface-500">{title}</p></div>
      {items.length === 0 ? <p className="text-xs text-surface-300">No data yet.</p> : (
        <div className="space-y-1.5">
          {items.map((x, i) => (
            <div key={x.id} className="flex items-center gap-2 text-xs">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[10px] ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-500'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-surface-800 font-medium truncate">{x.name}</p>
                <p className="text-[10px] text-surface-400 truncate">{x.sub}</p>
              </div>
              <span className="font-bold text-surface-700">{x.n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
