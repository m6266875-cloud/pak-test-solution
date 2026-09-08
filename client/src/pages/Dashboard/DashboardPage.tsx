import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { adminApi } from '../../api/admin';
import { papersApi } from '../../api/papers';
import { DashboardStats, PaperListItem } from '../../types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { PageHeader, StatusBadge, EmptyState } from '../../components/ui';
import {
  FilePlus, Files, Database, TrendingUp,
  BookOpen, Clock, Award, Users, ArrowRight,
  Zap, Calendar, School, Landmark, BookMarked, Layers,
  ListTree, GraduationCap, ClipboardCheck,
} from 'lucide-react';
import clsx from 'clsx';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }
  }),
};

export default function DashboardPage() {
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user && ['super_admin', 'school_admin'].includes(user.role);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [myPapers, setMyPapers] = useState<PaperListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const papersRes = await papersApi.list({ limit: 5 });
        setMyPapers(papersRes.data.data);
        if (isAdmin) {
          const statsRes = await adminApi.getDashboard();
          setStats(statsRes.data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ═══ HEADER ═══ */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={`${greeting}, ${user?.name?.split(' ')[0]} 👋`}
          description={user?.schoolName || 'Pak Test Software'}
          action={
            <Link to="/app/papers/generate" className="btn-primary">
              <FilePlus className="w-4 h-4" /> Generate Paper
            </Link>
          }
        />
      </motion.div>

      {/* ═══ STATS GRID ═══ */}
      {isAdmin && stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Files, label: 'Total Papers', value: stats.totalPapers, sub: 'All time', color: 'from-blue-500 to-blue-600' },
            { icon: Database, label: 'Questions', value: stats.totalQuestions.toLocaleString(), sub: 'In bank', color: 'from-purple-500 to-purple-600' },
            { icon: Users, label: 'Active Users', value: stats.totalUsers, sub: 'Teachers & admins', color: 'from-emerald-500 to-emerald-600' },
            { icon: TrendingUp, label: 'This Month', value: myPapers.length, sub: 'Papers generated', color: 'from-amber-500 to-amber-600' },
          ].map((stat, i) => (
            <motion.div key={stat.label} custom={i} variants={fadeUp} initial="hidden" animate="show" className="card p-5">
              <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 text-white shadow-sm', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-surface-900 font-display">{stat.value}</div>
              <div className="text-sm font-medium text-surface-700">{stat.label}</div>
              <div className="text-xs text-surface-400 mt-0.5">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Files, label: 'My Papers', value: myPapers.length, sub: 'Generated', color: 'from-brand-500 to-brand-600' },
            { icon: Award, label: 'Final', value: myPapers.filter(p => p.status === 'final').length, sub: 'Ready to print', color: 'from-emerald-500 to-emerald-600' },
            { icon: Clock, label: 'Drafts', value: myPapers.filter(p => p.status === 'draft').length, sub: 'In progress', color: 'from-amber-500 to-amber-600' },
            { icon: Calendar, label: 'This Month', value: myPapers.filter(p => new Date(p.createdAt).getMonth() === new Date().getMonth()).length, sub: 'Papers created', color: 'from-purple-500 to-purple-600' },
          ].map((stat, i) => (
            <motion.div key={stat.label} custom={i} variants={fadeUp} initial="hidden" animate="show" className="card p-5">
              <div className={clsx('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 text-white shadow-sm', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-surface-900 font-display">{stat.value}</div>
              <div className="text-sm font-medium text-surface-700">{stat.label}</div>
              <div className="text-xs text-surface-400 mt-0.5">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ═══ SYLLABUS STATS ROW (Admin System Upgrade) ═══ */}
      {isAdmin && stats?.syllabus && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-brand-600" /> Syllabus Overview
            </h2>
            <Link to="/app/admin/syllabus" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Manage syllabus <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { icon: School,         label: 'Schools',   value: stats.syllabus.schools,   to: '/app/admin/schools',  tint: 'bg-rose-50 text-rose-600' },
              { icon: Landmark,       label: 'Boards',    value: stats.syllabus.boards,    to: '/app/admin/syllabus', tint: 'bg-indigo-50 text-indigo-600' },
              { icon: BookMarked,     label: 'Books',     value: stats.syllabus.books,     to: '/app/admin/syllabus', tint: 'bg-emerald-50 text-emerald-600' },
              { icon: GraduationCap,  label: 'Classes',   value: stats.syllabus.classes,   to: '',                   tint: 'bg-sky-50 text-sky-600' },
              { icon: Layers,         label: 'Chapters',  value: stats.syllabus.chapters,  to: '/app/admin/syllabus', tint: 'bg-purple-50 text-purple-600' },
              { icon: FilePlus,       label: 'Exercises', value: stats.syllabus.exercises, to: '/app/admin/syllabus', tint: 'bg-amber-50 text-amber-600' },
            ].map((item) => {
              const inner = (
                <div className="card p-4 text-center hover:shadow-md transition-all h-full">
                  <div className={clsx('w-9 h-9 rounded-xl mx-auto flex items-center justify-center mb-2', item.tint)}>
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-xl font-bold text-surface-900 font-display">{item.value}</div>
                  <div className="text-xs text-surface-500 font-medium">{item.label}</div>
                </div>
              );
              return item.to
                ? <Link key={item.label} to={item.to} className="block">{inner}</Link>
                : <div key={item.label}>{inner}</div>;
            })}
          </div>

          {/* Topics + pending approvals mini-row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="card px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <ListTree className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-surface-900">{stats.syllabus.topics}</span>
                <span className="text-sm text-surface-500 ml-1.5">topics mapped across the syllabus</span>
              </div>
            </div>
            {stats.questionBreakdown && (
              <Link to="/app/questions" className="card px-4 py-3 flex items-center gap-3 hover:shadow-md transition-all">
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  stats.questionBreakdown.pending > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                )}>
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-surface-900">{stats.questionBreakdown.pending}</span>
                  <span className="text-sm text-surface-500 ml-1.5">
                    questions {stats.questionBreakdown.pending > 0 ? 'awaiting approval' : 'pending — all caught up'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-surface-300" />
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ MAIN CONTENT GRID ═══ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Papers */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
            <h2 className="font-semibold text-surface-900">Recent Papers</h2>
            <Link to="/app/papers" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="spinner text-brand-500" />
            </div>
          ) : myPapers.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No papers yet"
              description="You haven't generated any papers. Create your first paper in less than 2 minutes."
              action={
                <Link to="/app/papers/generate" className="btn-primary">
                  <FilePlus className="w-4 h-4" /> Generate Paper
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-surface-50">
              {myPapers.map((paper) => (
                <Link key={paper.id} to={`/papers/${paper.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-all group">
                  <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                    <Files className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate group-hover:text-brand-700 transition-colors">{paper.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {paper.class.name} · {paper.paperSubjects.map(ps => ps.subject.name).join(', ')} · {paper.totalMarks} marks
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={paper.status} />
                    <span className="text-xs text-surface-400 hidden sm:block">{format(new Date(paper.createdAt), 'dd MMM')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-5">
          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/app/papers/generate" className="flex items-center gap-3 p-3 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-all group">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Generate Paper</div>
                  <div className="text-xs text-brand-200">Create a new exam paper</div>
                </div>
              </Link>
              <QuickAction to="/app/questions" icon={Database} label="Question Bank" desc="Browse questions" />
              <QuickAction to="/app/papers" icon={Files} label="My Papers" desc="View all papers" />
              {isAdmin && <QuickAction to="/app/admin/users" icon={Users} label="Manage Users" desc="Teachers & admins" />}
            </div>
          </div>

          {/* Pro tip */}
          <div className="card p-5 bg-gradient-to-br from-brand-50 to-purple-50 border-brand-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-brand-900 mb-1">Pro Tip</h4>
                <p className="text-xs text-brand-700 leading-relaxed">
                  Enable randomization when generating papers to ensure each student gets a unique question order — ideal for exam integrity.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-all group">
      <div className="w-9 h-9 bg-surface-100 rounded-lg flex items-center justify-center group-hover:bg-surface-200 transition-colors">
        <Icon className="w-4.5 h-4.5 text-surface-600" />
      </div>
      <div>
        <div className="text-sm font-medium text-surface-900">{label}</div>
        <div className="text-xs text-surface-500">{desc}</div>
      </div>
    </Link>
  );
}
