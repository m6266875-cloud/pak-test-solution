/**
 * PHASE 4 — Super Admin dashboard.
 *
 * Platform-wide command view: schools/teachers/papers/questions totals,
 * generation activity, paper & question status funnels, top schools and
 * teachers, the latest audit trail entries, and shortcuts to every master
 * (schools, users, courses, syllabus, analytics, audit).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Activity, BarChart3, BookOpen, Building2, ClipboardList, Database, FilePlus,
  Files, GraduationCap, Landmark, Layers, Library, School as SchoolIcon,
  Users, Zap,
} from 'lucide-react';
import { v3 } from '../../api/v3';
import { EmptyState, StatusBadge } from '../../components/ui';
import type { AnalyticsOverviewV3, AuditRowV3, PaperActivityV3, TopListsV3 } from '../../types';
import { QuickLink, SectionHead, StatCard, fadeUp } from './dashUI';

export default function SuperAdminHome() {
  const [overview, setOverview] = useState<AnalyticsOverviewV3 | null>(null);
  const [activity, setActivity] = useState<PaperActivityV3 | null>(null);
  const [top, setTop] = useState<TopListsV3 | null>(null);
  const [audit, setAudit] = useState<AuditRowV3[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    const load = async () => {
      const [o, a, t, au] = await Promise.all([
        v3.analytics.overview().then((r) => r.data.data).catch(() => null),
        v3.analytics.activity().then((r) => r.data.data).catch(() => null),
        v3.analytics.top().then((r) => r.data.data).catch(() => null),
        v3.audit.list({ limit: 8 }).then((r) => r.data.data.rows).catch(() => [] as AuditRowV3[]),
      ]);
      if (!live) return;
      setOverview(o); setActivity(a); setTop(t); setAudit(au);
      setLoading(false);
    };
    load();
    return () => { live = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-36 animate-pulse bg-surface-50 p-6" />)}
      </div>
    );
  }

  if (!overview) {
    return (
      <EmptyState
        icon={BarChart3} title="Analytics unavailable"
        description="The platform overview could not be loaded. Check your connection and try again."
        action={<button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>}
      />
    );
  }

  const pending = overview.questionsByStatus.find((x) => x.status === 'pending')?.n ?? 0;
  const maxDaily = Math.max(1, ...(activity?.daily ?? []).map((d) => d.n));

  return (
    <div className="space-y-6">
      {/* stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={SchoolIcon} label="Schools" value={overview.totals.schools} sub="Onboarded" color="from-brand-500 to-brand-600" i={0} />
        <StatCard icon={Users} label="Teachers" value={overview.totals.teachers} sub="Active accounts" color="from-emerald-500 to-emerald-600" i={1} />
        <StatCard icon={Files} label="Papers" value={overview.totals.papers} sub="Generated" color="from-blue-500 to-blue-600" i={2} />
        <StatCard icon={Database} label="Questions" value={overview.totals.questions.toLocaleString()} sub="In bank" color="from-amber-500 to-amber-600" i={3} />
      </div>

      {/* syllabus strip */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show">
        <SectionHead icon={Library} title="Catalog overview" linkTo="/app/admin/syllabus" linkLabel="Manage syllabus" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { icon: Landmark, label: 'Courses', value: overview.totals.courses, to: '/app/admin/courses' },
            { icon: Layers, label: 'Books', value: overview.totals.books, to: '/app/admin/syllabus' },
            { icon: GraduationCap, label: 'Classes', value: overview.totals.classes, to: '/app/admin/syllabus' },
            { icon: BookOpen, label: 'Papers', value: overview.totals.papers, to: '/app/admin/papers' },
            { icon: Database, label: 'Questions', value: overview.totals.questions, to: '/app/questions' },
            { icon: ClipboardList, label: 'Pending', value: pending, to: '/app/questions' },
          ].map((item) => (
            <Link key={item.label} to={item.to} className="card block p-4 text-center transition-all hover:shadow-md">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="font-mono text-xl font-medium text-surface-900">{item.value}</div>
              <div className="text-xs font-medium text-surface-500">{item.label}</div>
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* activity */}
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
                <Activity className="h-4 w-4 text-brand-600" /> Generation activity
              </h3>
              <Link to="/app/admin/analytics" className="text-xs font-medium text-brand-600 hover:text-brand-700">Full analytics</Link>
            </div>
            {activity && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {[['Today', activity.today], ['This week', activity.week], ['This month', activity.month]].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl border border-surface-100 bg-surface-50 p-2.5 text-center">
                    <div className="text-lg font-extrabold text-brand-700">{v}</div>
                    <div className="text-[10px] font-semibold text-surface-500">{l}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex h-20 items-end gap-1">
              {(activity?.daily ?? []).map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] text-surface-400 opacity-0 group-hover:opacity-100">{d.n}</span>
                  <div className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${Math.max(3, (d.n / maxDaily) * 100)}%` }} title={`${d.day}: ${d.n}`} />
                </div>
              ))}
              {!activity?.daily?.length && <p className="text-xs text-surface-300">No daily data yet</p>}
            </div>
          </motion.div>

          {/* tops */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TopCard title="Most active schools" icon={Building2}
              items={(top?.schools ?? []).map((x) => ({ name: x.name, sub: x.code, n: x.papers }))} empty="No school activity yet." />
            <TopCard title="Most active teachers" icon={GraduationCap}
              items={(top?.teachers ?? []).map((x) => ({ name: x.name, sub: x.email, n: x.papers }))} empty="No teacher activity yet." />
          </div>

          {/* audit */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4">
              <h2 className="font-semibold text-surface-900">Latest activity</h2>
              <Link to="/app/admin/audit" className="text-sm font-medium text-brand-600 hover:text-brand-700">Audit logs</Link>
            </div>
            {audit.length === 0 ? (
              <p className="px-6 py-6 text-sm text-surface-400">No audit entries yet.</p>
            ) : (
              <div className="divide-y divide-surface-50">
                {audit.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                    <span className="w-40 shrink-0 truncate font-mono text-xs font-semibold text-surface-700">{a.action}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-surface-500">
                      {a.entity}{a.entityId ? ` #${a.entityId}` : ''} · {a.userName ?? a.userEmail ?? 'system'}{a.schoolName ? ` · ${a.schoolName}` : ''}
                    </span>
                    <span className="shrink-0 text-xs text-surface-400">{format(new Date(a.createdAt), 'dd MMM HH:mm')}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* right rail */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-surface-900">Platform</h3>
            <div className="space-y-2">
              <QuickLink to="/app/papers/generate" icon={Zap} label="Generate Paper" desc="Create a new exam paper" primary />
              <QuickLink to="/app/admin/schools" icon={SchoolIcon} label="Schools" desc="Onboard & branding" />
              <QuickLink to="/app/admin/users" icon={Users} label="Users" desc="Teachers & admins" />
              <QuickLink to="/app/admin/courses" icon={Landmark} label="Courses" desc="Boards & sessions" />
              <QuickLink to="/app/admin/syllabus" icon={Library} label="Syllabus" desc="Books & chapters" />
              <QuickLink to="/app/admin/papers" icon={Files} label="All Papers" desc="Every school's papers" />
              <QuickLink to="/app/admin/analytics" icon={BarChart3} label="Analytics" desc="Platform reports" />
              <QuickLink to="/app/admin/audit" icon={ClipboardList} label="Audit Logs" desc="Who did what" />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-surface-900">Papers by status</h3>
            <div className="space-y-2.5">
              {overview.papersByStatus.map((x) => (
                <div key={x.status} className="flex items-center justify-between text-xs">
                  <StatusBadge status={x.status} />
                  <span className="font-semibold text-surface-500">{x.n}</span>
                </div>
              ))}
              {!overview.papersByStatus.length && <p className="text-xs text-surface-300">No papers yet.</p>}
            </div>
            {pending > 0 && (
              <Link to="/app/questions" className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                <FilePlus className="h-4 w-4" /> {pending} question{pending === 1 ? '' : 's'} awaiting approval
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TopCard({ title, icon: Icon, items, empty }: {
  title: string; icon: any; items: Array<{ name: string; sub: string; n: number }>; empty: string;
}) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-surface-300" />
        <p className="text-xs font-bold uppercase tracking-wide text-surface-500">{title}</p>
      </div>
      {items.length === 0 ? <p className="text-xs text-surface-300">{empty}</p> : (
        <div className="space-y-1.5">
          {items.slice(0, 5).map((x, i) => (
            <div key={`${x.name}-${i}`} className="flex items-center gap-2 text-xs">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-500'}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-surface-800">{x.name}</p>
                <p className="truncate text-[10px] text-surface-400">{x.sub}</p>
              </div>
              <span className="font-bold text-surface-700">{x.n}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
