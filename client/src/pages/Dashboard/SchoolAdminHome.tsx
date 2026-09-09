/**
 * PHASE 4 — School Admin dashboard.
 *
 * "My school at a glance": teacher/paper counts, draft/final split, recent
 * papers from every teacher in the school, and module shortcuts. Every data
 * call is optional — admins without the analytics permission still get the
 * quick-action grid instead of an error page.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Activity, Award, Clock, Database, FilePlus, Files, LayoutTemplate, Users, Zap,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v3 } from '../../api/v3';
import { EmptyState, StatusBadge } from '../../components/ui';
import type { PaperActivityV3, SchoolDashboardV3 } from '../../types';
import { QuickLink, SectionHead, StatCard, fadeUp } from './dashUI';

export default function SchoolAdminHome() {
  const { user } = useAppSelector((s) => s.auth);
  const perms = user?.permissions ?? [];
  const can = (p: string) => user?.role === 'super_admin' || perms.includes(p);

  const [dash, setDash] = useState<SchoolDashboardV3 | null>(null);
  const [activity, setActivity] = useState<PaperActivityV3 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    const load = async () => {
      // each call degrades independently (missing perm → section hides)
      const [d, a] = await Promise.all([
        user?.schoolId ? v3.schools.dashboard(user.schoolId).then((r) => r.data.data).catch(() => null) : Promise.resolve(null),
        v3.analytics.activity().then((r) => r.data.data).catch(() => null),
      ]);
      if (!live) return;
      setDash(d);
      setActivity(a);
      setLoading(false);
    };
    load();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-36 animate-pulse bg-surface-50 p-6" />)}
      </div>
    );
  }

  const byStatus = (s: string) => dash?.counts.byStatus.find((x) => x.status === s)?.n ?? 0;
  const initial = (dash?.school.name ?? user?.schoolName ?? 'S').trim().charAt(0).toUpperCase() || 'S';

  return (
    <div className="space-y-6">
      {/* school strip */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="card flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-extrabold text-white">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-surface-900">{dash?.school.name ?? user?.schoolName ?? 'My school'}</p>
          <p className="text-xs text-surface-500">
            {dash ? `${dash.school.code} · ${dash.counts.teachers} teacher${dash.counts.teachers === 1 ? '' : 's'} · ${dash.counts.papers} papers` : 'School overview unavailable — some stats need the Analytics permission.'}
          </p>
        </div>
        {activity && (
          <div className="hidden shrink-0 items-center gap-4 sm:flex">
            {[[activity.today, 'today'], [activity.week, 'this week'], [activity.month, 'this month']].map(([v, l]) => (
              <div key={String(l)} className="text-center">
                <div className="font-mono text-xl font-medium text-brand-700">{v}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">papers {l}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* stat row */}
      {dash && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Teachers" value={dash.counts.teachers} sub="Active in school" color="from-brand-500 to-brand-600" i={0} />
          <StatCard icon={Files} label="Papers" value={dash.counts.papers} sub="All teachers" color="from-blue-500 to-blue-600" i={1} />
          <StatCard icon={Award} label="Final" value={byStatus('final')} sub="Ready to print" color="from-emerald-500 to-emerald-600" i={2} />
          <StatCard icon={Clock} label="Drafts" value={byStatus('draft')} sub="In progress" color="from-amber-500 to-amber-600" i={3} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* recent school papers */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show" className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4">
            <h2 className="font-semibold text-surface-900">Recent papers in {dash?.school.name ?? 'my school'}</h2>
            {can('generatedPapers') && (
              <Link to="/app/admin/papers" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>
            )}
          </div>
          {!dash || dash.recentPapers.length === 0 ? (
            <EmptyState
              icon={Files} title="No papers yet"
              description={dash ? 'Papers generated by your teachers will appear here.' : 'Paper stats need the Analytics permission — ask a Super Admin to grant it.'}
              action={<Link to="/app/papers/generate" className="btn-primary"><FilePlus className="h-4 w-4" /> Generate Paper</Link>}
            />
          ) : (
            <div className="divide-y divide-surface-50">
              {dash.recentPapers.map((p) => (
                <Link key={p.id} to={`/app/papers/${p.id}`} className="group flex items-center gap-4 px-6 py-3.5 transition-all hover:bg-surface-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-900 group-hover:text-brand-700">{p.title}</p>
                    <p className="mt-0.5 text-xs text-surface-500">
                      {p.teacherName} · {p.className}{p.subjects?.length ? ` · ${p.subjects.map((s) => s.name).join(', ')}` : ''} · {p.totalMarks} marks
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  <span className="hidden text-xs text-surface-400 sm:block">{format(new Date(p.createdAt), 'dd MMM')}</span>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* quick actions */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="show" className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-surface-900">Manage school</h3>
            <div className="space-y-2">
              <QuickLink to="/app/papers/generate" icon={Zap} label="Generate Paper" desc="Create a new exam paper" primary />
              <QuickLink to="/app/admin/users" icon={Users} label="Teachers" desc="Manage school staff" show={can('users')} />
              <QuickLink to="/app/admin/papers" icon={Files} label="All Papers" desc="Every teacher's papers" show={can('generatedPapers')} />
              <QuickLink to="/app/questions" icon={Database} label="Question Bank" desc="Browse & approve questions" />
              <QuickLink to="/app/admin/templates" icon={LayoutTemplate} label="Templates" desc="School paper branding" show={can('settings')} />
              <QuickLink to="/app/admin/analytics" icon={Activity} label="Analytics" desc="School-wide reports" show={can('analytics')} />
            </div>
          </div>
          <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-beige-100 p-5">
            <SectionHead icon={Users} title="New teacher?" />
            <p className="text-xs leading-relaxed text-brand-700">
              Add teachers from <span className="font-semibold">Manage Users</span> and assign their teaching subjects —
              each teacher only ever sees their own subject's questions and papers.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
