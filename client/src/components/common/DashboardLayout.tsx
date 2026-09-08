import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, FilePlus, Files, Database,
  Users, ClipboardList, User, LogOut, Menu, X,
  BookOpen, ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard',      href: '/app/dashboard',       icon: LayoutDashboard, roles: ['super_admin','school_admin','teacher'] },
  { label: 'Generate Paper', href: '/app/papers/generate', icon: FilePlus,         roles: ['super_admin','school_admin','teacher'] },
  { label: 'My Papers',      href: '/app/papers',           icon: Files,            roles: ['super_admin','school_admin','teacher'] },
  { label: 'Question Bank',  href: '/app/questions',        icon: Database,         roles: ['super_admin','school_admin','teacher'] },
  { label: 'Manage Users',   href: '/app/admin/users',      icon: Users,            roles: ['super_admin','school_admin'] },
  { label: 'Audit Logs',     href: '/app/admin/audit',      icon: ClipboardList,    roles: ['super_admin'] },
  { label: 'My Profile',     href: '/app/profile',          icon: User,             roles: ['super_admin','school_admin','teacher'] },
];

export default function DashboardLayout() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const allowedNav = navItems.filter(n => user && n.roles.includes(user.role));

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    dispatch(logout());
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">Pak Test Solution</div>
            <div className="text-xs text-gray-500">Punjab Board · 1–12</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
        {allowedNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'active')
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setProfileOpen(!profileOpen)}>
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 truncate capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
          <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', profileOpen && 'rotate-180')} />
        </div>
        {profileOpen && (
          <div className="mt-1 px-3 space-y-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white shadow-xl flex flex-col">
            <button className="absolute top-4 right-4 text-gray-500" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <button className="lg:hidden text-gray-500 hover:text-gray-900" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.schoolName || 'Pak Test Solution'}</span>
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
