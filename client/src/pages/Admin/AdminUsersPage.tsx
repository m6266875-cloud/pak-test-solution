import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import { User, Role } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  UserPlus, Search, Edit3, Power, Shield, User as UserIcon,
  X, Check, Mail, Phone, Building2, Eye, EyeOff,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Create/Edit User Modal ───────────────────────────────────────────────────
function UserModal({ user, onSave, onClose }: { user?: User | null; onSave: () => void; onClose: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'teacher' as Role,
    schoolName: user?.schoolName || '',
    phone: user?.phone || '',
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!isEdit && !form.email.trim()) { toast.error('Email is required'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required for new users'); return; }
    setSaving(true);
    try {
      if (isEdit && user) {
        await adminApi.updateUser(user.id, { name: form.name, role: form.role, schoolName: form.schoolName, phone: form.phone });
        toast.success('User updated');
      } else {
        await adminApi.createUser(form);
        toast.success('User created');
      }
      onSave();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const roleOptions: { value: Role; label: string; desc: string }[] = [
    { value: 'teacher',      label: 'Teacher',      desc: 'Can generate and manage own papers' },
    { value: 'school_admin', label: 'School Admin',  desc: 'Can manage teachers in their school' },
    { value: 'super_admin',  label: 'Super Admin',   desc: 'Full system access' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-9" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Muhammad Ali" />
            </div>
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="label">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" className="input pl-9" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="teacher@school.edu.pk" />
                </div>
              </div>
              <div>
                <label className="label">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars, upper + lower + number" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="label">Role</label>
            <div className="space-y-2">
              {roleOptions.map(r => (
                <label key={r.value} className={clsx(
                  'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  form.role === r.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                )}>
                  <input type="radio" name="role" className="mt-1 accent-primary-600" checked={form.role === r.value} onChange={() => setForm(f => ({ ...f, role: r.value }))} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.label}</div>
                    <div className="text-xs text-gray-500">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">School Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9" value={form.schoolName} onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))} placeholder="School name" />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="03XX-XXXXXXX" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    super_admin:  'bg-red-100 text-red-700',
    school_admin: 'bg-purple-100 text-purple-700',
    teacher:      'bg-blue-100 text-blue-700',
  };
  const labels: Record<Role, string> = {
    super_admin: 'Super Admin', school_admin: 'School Admin', teacher: 'Teacher',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', styles[role])}>
      <Shield className="w-3 h-3" />
      {labels[role]}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (search)     params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await adminApi.listUsers(params);
      setUsers(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggle = async (user: User) => {
    setToggling(user.id);
    try {
      await adminApi.toggleUser(user.id);
      toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch { toast.error('Failed to update status'); }
    finally { setToggling(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">{total} user{total !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary self-start">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="select w-full sm:w-44"
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value as any); setPage(1); }}
        >
          <option value="">All Roles</option>
          <option value="teacher">Teacher</option>
          <option value="school_admin">School Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">School</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Last Login</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-500">
                    <UserIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    No users found
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {user.schoolName || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                    {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'dd MMM yyyy, HH:mm') : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditUser(user); setShowModal(true); }}
                        className="btn-ghost p-1.5 text-gray-500 hover:text-primary-600"
                        title="Edit user"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(user)}
                        disabled={toggling === user.id}
                        className={clsx('btn-ghost p-1.5', user.isActive ? 'text-gray-500 hover:text-red-600' : 'text-gray-500 hover:text-green-600')}
                        title={user.isActive ? 'Deactivate user' : 'Activate user'}
                      >
                        {toggling === user.id ? <span className="spinner w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm py-1">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editUser}
          onSave={() => { setShowModal(false); setEditUser(null); loadUsers(); }}
          onClose={() => { setShowModal(false); setEditUser(null); }}
        />
      )}
    </div>
  );
}
