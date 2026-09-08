import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { adminApi } from '../../api/admin';
import { papersApi } from '../../api/papers';
import { DashboardStats, PaperListItem } from '../../types';
import { format } from 'date-fns';
import {
  FilePlus, Files, Database, TrendingUp,
  BookOpen, Clock, Award, Users, ArrowRight, Download,
} from 'lucide-react';
import clsx from 'clsx';

const StatusBadge = ({ status }: { status: string }) => (
  <span className={clsx(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    status === 'final'    && 'bg-green-100 text-green-700',
    status === 'draft'    && 'bg-gray-100 text-gray-600',
    status === 'archived' && 'bg-amber-100 text-amber-700',
  )}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.schoolName || 'Pak Test Solution'} · {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/app/papers/generate" className="btn-primary self-start sm:self-auto">
          <FilePlus className="w-4 h-4" />
          Generate New Paper
        </Link>
      </div>

      {/* Stats Grid */}
      {isAdmin && stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Files} label="Total Papers" value={stats.totalPapers} sub="All time" color="bg-blue-50 text-blue-600" />
          <StatCard icon={Database} label="Questions" value={stats.totalQuestions.toLocaleString()} sub="In question bank" color="bg-purple-50 text-purple-600" />
          <StatCard icon={Users} label="Active Users" value={stats.totalUsers} sub="Teachers & admins" color="bg-green-50 text-green-600" />
          <StatCard icon={TrendingUp} label="This Month" value={myPapers.length} sub="Papers generated" color="bg-amber-50 text-amber-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Files} label="My Papers" value={myPapers.length} sub="Generated" color="bg-blue-50 text-blue-600" />
          <StatCard icon={Award} label="Finals" value={myPapers.filter(p => p.status === 'final').length} sub="Ready to print" color="bg-green-50 text-green-600" />
          <StatCard icon={Clock} label="Drafts" value={myPapers.filter(p => p.status === 'draft').length} sub="In progress" color="bg-amber-50 text-amber-600" />
        </div>
      )}

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Papers */}
        <div className="lg:col-span-2 card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Papers</h2>
            <Link to="/app/papers" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="spinner text-primary-500" />
            </div>
          ) : myPapers.length === 0 ? (
            <div className="p-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No papers yet</p>
              <p className="text-sm text-gray-400 mt-1">Generate your first exam paper to get started</p>
              <Link to="/app/papers/generate" className="btn-primary mt-4 inline-flex">
                <FilePlus className="w-4 h-4" /> Generate Paper
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {myPapers.map((paper) => (
                <Link key={paper.id} to={`/papers/${paper.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                    <Files className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{paper.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {paper.class.name} · {paper.paperSubjects.map(ps => ps.subject.name).join(', ')} · {paper.totalMarks} marks · {paper.timeLimit} min
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={paper.status} />
                    <span className="text-xs text-gray-400">{format(new Date(paper.createdAt), 'dd MMM')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction to="/app/papers/generate" icon={FilePlus} label="Generate Paper" desc="Create a new exam paper" primary />
              <QuickAction to="/app/questions" icon={Database} label="Question Bank" desc="Browse & manage questions" />
              <QuickAction to="/app/papers" icon={Files} label="My Papers" desc="View all your papers" />
              {isAdmin && <QuickAction to="/app/admin/users" icon={Users} label="Manage Users" desc="Add teachers & admins" />}
            </div>
          </div>

          {/* Tips card */}
          <div className="card p-5 bg-primary-50 border-primary-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary-900 mb-1">Pro Tip</h3>
                <p className="text-xs text-primary-700 leading-relaxed">
                  Enable randomization when generating papers to ensure each student receives a unique question order — great for exam integrity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="stat-card">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center mb-3', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, desc, primary }: any) {
  return (
    <Link to={to} className={clsx(
      'flex items-center gap-3 p-3 rounded-lg transition-colors',
      primary ? 'bg-primary-600 text-white hover:bg-primary-700' : 'hover:bg-gray-50 text-gray-700'
    )}>
      <Icon className={clsx('w-4 h-4 flex-shrink-0', primary ? 'text-white' : 'text-gray-500')} />
      <div>
        <div className={clsx('text-sm font-medium', primary ? 'text-white' : 'text-gray-900')}>{label}</div>
        <div className={clsx('text-xs', primary ? 'text-primary-200' : 'text-gray-500')}>{desc}</div>
      </div>
    </Link>
  );
}
