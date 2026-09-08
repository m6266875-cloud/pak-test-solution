import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import { Avatar } from '../ui';
import {
  LayoutDashboard, FilePlus, Files, FileStack, Sparkles, Database,
  Users, ClipboardList, User, LogOut, Menu, X,
  BookOpen, ChevronDown, Search, Bell,
  BarChart3, School, Library, LayoutTemplate,
} from 'lucide-react';
import clsx from 'clsx';

type NavItem = { label: string; href: string; icon: any; roles: string[]; perm?: string };
const ALL_PERMS = ['users', 'schools', 'courses', 'books', 'syllabus', 'questionBank', 'paperGeneration', 'generatedPapers', 'analytics', 'settings', 'audit'];

const getNavItems = (user: { role?: string; permissions?: string[] }) => {
  const role = user?.role || 'teacher';
  const perms = user?.permissions ?? [];
  const has = (perm?: string) => {
    if (!perm) return true;                     // core items: everyone
    if (role === 'super_admin') return true;    // super admin: every module
    return perms.includes(perm);                // school admin: module permission only
  };
  const all: NavItem[] = [
    { label: 'Dashboard',      href: '/app/dashboard',       icon: LayoutDashboard, roles: ['super_admin','school_admin','teacher'] },
    { label: 'Generate Paper', href: '/app/papers/generate', icon: FilePlus,         roles: ['super_admin','school_admin','teacher'] },
    { label: 'My Papers',      href: '/app/papers',           icon: Files,            roles: ['super_admin','school_admin','teacher'] },
    { label: 'Patterns',       href: '/app/patterns',         icon: Sparkles,         roles: ['super_admin','school_admin','teacher'] },
    { label: 'Question Bank',  href: '/app/questions',        icon: Database,         roles: ['super_admin','school_admin','teacher'] },
  ];
  const admin: NavItem[] = [
    { label: 'Manage Users',   href: '/app/admin/users',      icon: Users,            roles: ['super_admin','school_admin'], perm: 'users' },
    { label: 'Schools',        href: '/app/admin/schools',    icon: School,           roles: ['super_admin','school_admin'], perm: 'schools' },
    { label: 'Syllabus',       href: '/app/admin/syllabus',   icon: Library,          roles: ['super_admin','school_admin'], perm: 'syllabus' },
    { label: 'Templates',      href: '/app/admin/templates',  icon: LayoutTemplate,   roles: ['super_admin','school_admin'], perm: 'settings' },
    { label: 'Papers (All)',   href: '/app/admin/papers',     icon: FileStack,        roles: ['super_admin','school_admin'], perm: 'generatedPapers' },
    { label: 'Analytics',      href: '/app/admin/analytics',  icon: BarChart3,        roles: ['super_admin','school_admin'], perm: 'analytics' },
    { label: 'Audit Logs',     href: '/app/admin/audit',      icon: ClipboardList,    roles: ['super_admin','school_admin'], perm: 'audit' },
  ];
  const bottom: NavItem[] = [
    { label: 'Profile',        href: '/app/profile',          icon: User,             roles: ['super_admin','school_admin','teacher'] },
  ];
  const items = [...all];
  if (role === 'school_admin' || role === 'super_admin') items.push(...admin.filter((n) => has(n.perm)));
  return { main: items.filter((n) => n.roles.includes(role) && has(n.perm)), bottom: bottom.filter((n) => n.roles.includes(role)) };
};

export default function DashboardLayout() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { main, bottom } = getNavItems({ role: user?.role, permissions: user?.permissions });

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    dispatch(logout());
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const currentPage = main.find(item => location.pathname.startsWith(item.href));

  return (
    <div className="flex h-screen bg-surface-50">
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-surface-200 flex-shrink-0">
        <SidebarContent
          main={main}
          bottom={bottom}
          onLogout={handleLogout}
          onClose={() => {}}
        />
      </aside>

      {/* ═══ MOBILE SIDEBAR ═══ */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white shadow-2xl flex flex-col animate-slide-down">
            <button className="absolute top-4 right-4 btn-ghost p-1.5" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              main={main}
              bottom={bottom}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-surface-200 px-4 lg:px-6 h-16 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden btn-ghost p-2" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-surface-400">Pak Test</span>
              <span className="text-surface-300">/</span>
              <span className="text-surface-700 font-medium">{currentPage?.label || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <button className="btn-ghost p-2.5 hidden sm:flex" title="Search">
              <Search className="w-4.5 h-4.5 text-surface-500" />
            </button>

            {/* Notifications */}
            <button className="btn-ghost p-2.5 relative" title="Notifications">
              <Bell className="w-4.5 h-4.5 text-surface-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-50 transition-all"
              >
                <Avatar name={user?.name || 'U'} size="sm" />
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-surface-900 leading-tight">{user?.name}</div>
                  <div className="text-xs text-surface-500 capitalize leading-tight">{user?.role?.replace('_', ' ')}</div>
                </div>
                <ChevronDown className={clsx('w-4 h-4 text-surface-400 transition-transform hidden sm:block', profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-surface-200 py-2 z-50 animate-scale-in">
                    <div className="px-4 py-2.5 border-b border-surface-100">
                      <div className="text-sm font-semibold text-surface-900">{user?.name}</div>
                      <div className="text-xs text-surface-500 truncate">{user?.email}</div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { navigate('/app/profile'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                      >
                        <User className="w-4 h-4" /> My Profile
                      </button>
                    </div>
                    <div className="border-t border-surface-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══ SIDEBAR CONTENT ═══ */
function SidebarContent({ main, bottom, onLogout, onClose }: {
  main: any[];
  bottom: any[];
  onLogout: () => void;
  onClose: () => void;
}) {
  const { user } = useAppSelector((s) => s.auth);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-brand">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-surface-900 leading-tight font-display">Pak Test</div>
            <div className="text-xs text-surface-500">Paper Generator</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">Main Menu</p>
        {main.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {main.some((i) => i.perm) && (
          <>
            <p className="px-3 pt-4 text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">Administration</p>
            {main.filter((i) => i.perm).map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-surface-100">
        {bottom.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* User card */}
        <div className="mt-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name || 'U'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-surface-900 truncate">{user?.name}</div>
              <div className="text-xs text-surface-500 truncate">{user?.schoolName || 'Pak Test Software'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
