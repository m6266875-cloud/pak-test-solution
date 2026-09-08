import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { adminApi } from '../../api/admin';
import { v2 } from '../../api/v2';
import { DashboardStats, PaperSummaryV2 } from '../../types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { PageHeader, StatusBadge, EmptyState } from '../../components/ui';
import {
  FilePlus, Files, Database, TrendingUp,
  BookOpen, Clock, Award, Users, ArrowRight,
  Zap, Calendar, School, Landmark, BookMarked, Layers,
  ListTree, GraduationCap, ClipboardCheck, BookOpenCheck, Languages, Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

interface SubjectCardData {
  key: string;
  subject: { id: number; name: string; medium: string };
  course: { code: string; name: string };
  klass: { id: number; name: string; grade: number };
  chapterCount: number;
  approvedQuestions: number;
  papers: PaperSummaryV2[];
  papersTotal: number;
  loading: boolean;
}

/** Teacher home: one card per assigned subject (each teacher in the demo is
 *  scoped to exactly one subject — PTB Grade-9 Mathematics / English /
 *  Physics / Chemistry / Biology). All numbers come from the scoped v2 API. */
function TeacherHome() {
  const { user } = useAppSelector((s) => s.auth);
  const [cards, setCards] = useState<SubjectCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<{ papers: number; final: number; drafts: number; approved: number } | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        // 1) teacher's own totals (all scoped by the API)
        const [papers, finals, drafts, qb] = await Promise.all([
          v2.papers.list({ limit: 1 }),
          v2.papers.list({ status: 'final', limit: 1 }),
          v2.papers.list({ status: 'draft', limit: 1 }),
          v2.questions.list({ limit: 1 }),
        ]);
        if (!live) return;
        setTotals({
          papers: papers.data.pagination?.total ?? 0,
          final: finals.data.pagination?.total ?? 0,
          drafts: drafts.data.pagination?.total ?? 0,
          approved: qb.data.pagination?.total ?? 0,
        });

        // 2) catalog chain course → classes → subjects (teacher-scoped)
        const courses = (await v2.catalog.courses()).data.data as any[];
        const chain: SubjectCardData[] = [];
        for (const course of courses) {
          const classes = (await v2.catalog.courseClasses(course.id)).data.data as any[];
          for (const klass of classes) {
            const subjects = (await v2.catalog.classSubjects(klass.id, course.id)).data.data as any[];
            for (const subject of subjects) {
              chain.push({
                key: `${course.id}-${klass.id}-${subject.id}`,
                subject: { id: subject.id, name: subject.name, medium: subject.medium },
                course: { code: course.code, name: course.name },
                klass: { id: klass.id, name: klass.name, grade: klass.grade },
                chapterCount: subject.chapterCount ?? 0,
                approvedQuestions: 0,
                papers: [],
                papersTotal: 0,
                loading: true,
              });
            }
          }
        }
        if (!live) return;
        setCards(chain);
        // 3) per-subject stats (chapters + approved + recent papers)
        const filled = await Promise.all(chain.map(async (c) => {
          try {
            const [chapters, recent] = await Promise.all([
              v2.catalog.subjectChapters(c.subject.id),
              v2.papers.list({ subjectId: c.subject.id, limit: 4 }),
            ]);
            const chs = (chapters.data.data as any[]) || [];
            return {
              ...c,
              loading: false,
              chapterCount: chs.length,
              approvedQuestions: chs.reduce((n, ch) => n + (ch.approvedQuestionCount ?? 0), 0),
              papers: (recent.data.data as PaperSummaryV2[]) || [],
              papersTotal: recent.data.pagination?.total ?? 0,
            };
          } catch {
            return { ...c, loading: false };
          }
        }));
        if (live) setCards(filled);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load your dashboard');
      } finally {
        if (live) setLoading(false);
      }
    };
    load();
    return () => { live = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-44 animate-pulse bg-surface-50" />)}
      </div>
    );
  }

  const subjectCount = cards.length;
  return (
    <div className="space-y-6">
      {/* stat row */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Files, label: 'My Papers', value: totals.papers, sub: 'All time', color: 'from-brand-500 to-brand-600' },
            { icon: Award, label: 'Final', value: totals.final, sub: 'Ready to print', color: 'from-emerald-500 to-emerald-600' },
            { icon: Clock, label: 'Drafts', value: totals.drafts, sub: 'In progress', color: 'from-amber-500 to-amber-600' },
            { icon: Database, label: 'Approved Questions', value: totals.approved, sub: 'In your scope', color: 'from-purple-500 to-purple-600' },
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

      {/* subject home cards */}
      {cards.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="No subjects assigned yet"
          description="Your school admin will assign you teaching subjects. Once assigned, your subjects will appear here."
          action={<Link to="/app/papers/generate" className="btn-primary"><FilePlus className="w-4 h-4" /> Browse generator</Link>} />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              My Teaching {subjectCount === 1 ? 'Subject' : 'Subjects'}
            </h2>
            <span className="text-[11px] font-semibold text-surface-400">PTB · Grade 9 · own subject only</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {cards.map((c, i) => (
              <motion.div key={c.key} custom={i} variants={fadeUp} initial="hidden" animate="show"
                className="card overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="h-1.5 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600" />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <BookOpenCheck className="w-6 h-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-surface-900 truncate">{c.subject.name}</p>
                        <p className="text-xs text-surface-500 flex items-center gap-1 capitalize">
                          <Languages className="w-3 h-3" /> {c.subject.medium} · {c.klass.name}
                        </p>
                      </div>
                    </div>
                    <span className="badge-brand shrink-0">{c.course.code}</span>
                  </div>

                  {c.loading ? (
                    <div className="my-4 flex justify-center"><Loader2 className="w-5 h-5 text-brand-500 animate-spin" /></div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 my-4 text-center">
                      {[
                        { v: c.chapterCount, l: 'Chapters' },
                        { v: c.approvedQuestions, l: 'Questions' },
                        { v: c.papersTotal, l: 'Papers' },
                      ].map((s) => (
                        <div key={s.l} className="rounded-xl bg-surface-50 py-2.5">
                          <div className="text-lg font-bold text-surface-900 font-display">{s.v}</div>
                          <div className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide">{s.l}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto space-y-1.5">
                    {c.papers.slice(0, 2).map((p) => (
                      <Link key={p.id} to={`/app/papers/${p.id}`}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-50 group">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                        <span className="text-xs text-surface-600 truncate flex-1 group-hover:text-brand-700">{p.title}</span>
                        <StatusBadge status={p.status} />
                      </Link>
                    ))}
                    {c.papers.length === 0 && !c.loading && (
                      <p className="text-xs text-surface-400 px-2.5 py-1.5">No papers for {c.subject.name} yet.</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Link to="/app/papers/generate" className="btn-primary btn-sm flex-1 justify-center">
                        <FilePlus className="w-3.5 h-3.5" /> Generate {c.subject.name} Paper
                      </Link>
                      <Link to={`/app/questions`} className="btn-ghost btn-sm" title="Browse question bank">
                        <Database className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] text-surface-400 mt-3">
            You are signed in as <span className="font-semibold text-surface-500">{user?.email}</span> — you can only
            view questions, generate papers and manage patterns for the subject{subjectCount === 1 ? '' : 's'} assigned to you.
          </p>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAppSelector((s) => s.auth);
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user && ['super_admin', 'school_admin'].includes(user.role);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [myPapers, setMyPapers] = useState<PaperSummaryV2[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // v2 recent papers — teacher: own; admin: across all teachers
        const papersRes = await v2.papers.list({ limit: 8 });
        setMyPapers(papersRes.data.data as PaperSummaryV2[]);
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

      {/* ═══ TEACHER: per-subject dashboard ═══ */}
      {isTeacher && <TeacherHome />}

      {/* ═══ ADMIN STATS (Phase-1 endpoint; hidden when unavailable) ═══ */}
      {isAdmin && stats && (
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
                    <item.icon className="w-5 h-5" />
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
        {/* Recent Papers (v2 — works for teachers and admins) */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
            <h2 className="font-semibold text-surface-900">Recent Papers</h2>
            <Link to={isAdmin ? '/app/admin/papers' : '/app/papers'} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
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
              description="Generate your first paper — pick the scope, layout and marks, then preview it like a printed exam sheet."
              action={
                <Link to="/app/papers/generate" className="btn-primary">
                  <FilePlus className="w-4 h-4" /> Generate Paper
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-surface-50">
              {myPapers.map((paper) => (
                <Link key={paper.id} to={`/app/papers/${paper.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-all group">
                  <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                    <Files className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate group-hover:text-brand-700 transition-colors">{paper.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {paper.className}{paper.grade ? ` · Grade ${paper.grade}` : ''}
                      {paper.subjects?.length ? ` · ${paper.subjects.map((s) => s.name).join(', ')}` : ''} · {paper.totalMarks} marks
                      {isAdmin ? ` · ${paper.teacherName}` : ''}
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
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Generate Paper</div>
                  <div className="text-xs text-brand-200">Create a new exam paper</div>
                </div>
              </Link>
              <QuickAction to="/app/questions" icon={Database} label="Question Bank" desc="Browse questions" />
              <QuickAction to={isAdmin ? '/app/admin/papers' : '/app/papers'} icon={Files} label={isAdmin ? 'Papers (All)' : 'My Papers'} desc="View all papers" />
              <QuickAction to="/app/patterns" icon={BookMarked} label="Patterns" desc="Saved paper layouts" />
              {isAdmin && <QuickAction to="/app/admin/users" icon={Users} label="Manage Users" desc="Teachers & admins" />}
            </div>
          </div>

          {/* Pro tip */}
          <div className="card p-5 bg-gradient-to-br from-brand-50 to-purple-50 border-brand-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-brand-900 mb-1">Subject-scoped</h4>
                <p className="text-xs text-brand-700 leading-relaxed">
                  Every teacher account is limited to its assigned subject{isTeacher ? ' — you can only generate papers for the subject you teach' : ''}. Try signing in with a different subject teacher to see their own dashboard.
                </p>
              </div>
            </div>
          </div>

          {isTeacher && (
            <div className="card p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-surface-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-surface-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-900 mb-1">Demo accounts</h4>
                  <p className="text-xs text-surface-500 leading-relaxed">
                    maths, english, physics, chemistry & biology — all at <span className="font-mono">*.teacher@demo.test / Teacher@123456</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-all group">
      <div className="w-9 h-9 bg-surface-100 rounded-lg flex items-center justify-center group-hover:bg-surface-200 transition-colors">
        <Icon className="w-5 h-5 text-surface-600" />
      </div>
      <div>
        <div className="text-sm font-medium text-surface-900">{label}</div>
        <div className="text-xs text-surface-500">{desc}</div>
      </div>
    </Link>
  );
}
