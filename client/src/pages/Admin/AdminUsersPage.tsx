import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import { User, Role } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageHeader, Avatar, RoleBadge } from '../../components/ui';
import { UserPlus, Search, Edit3, Power, X, Check, Mail, Phone, Building2, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';

/* ═══ User Modal ═══ */
function UserModal({ user, onSave, onClose }: { user?: User | null; onSave: () => void; onClose: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', role: user?.role || 'teacher' as Role, schoolName: user?.schoolName || '', phone: user?.phone || '' });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!isEdit && !form.email.trim()) { toast.error('Email is required'); return; }
    if (!isEdit && !form.password) { toast.error('Password required for new users'); return; }
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
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-bold text-surface-900">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" /><input className="input pl-9" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Muhammad Ali" /></div>
          </div>
          {!isEdit && (<>
            <div><label className="label">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" /><input type="email" className="input pl-9" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="teacher@school.edu.pk" /></div></div>
            <div><label className="label">Password</label><div className="relative"><input type={showPass ? 'text' : 'password'} className="input pr-10" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
          </>)}
          <div>
            <label className="label">Role</label>
            <div className="space-y-2">
              {[{ value: 'teacher' as Role, label: 'Teacher', desc: 'Generate and manage own papers' }, { value: 'school_admin' as Role, label: 'School Admin', desc: 'Manage teachers in school' }, { value: 'super_admin' as Role, label: 'Super Admin', desc: 'Full system access' }].map(r => (
                <label key={r.value} className={clsx('flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', form.role === r.value ? 'border-brand-500 bg-brand-50' : 'border-surface-200 hover:border-surface-300')}>
                  <input type="radio" name="role" className="mt-1 accent-brand-600" checked={form.role === r.value} onChange={() => setForm(f => ({ ...f, role: r.value }))} />
                  <div><div className="text-sm font-medium text-surface-900">{r.label}</div><div className="text-xs text-surface-500">{r.desc}</div></div>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">School</label><div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" /><input className="input pl-9" value={form.schoolName} onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))} /></div></div>
            <div><label className="label">Phone</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" /><input className="input pl-9" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <span className="spinner" /> : <Check className="w-4 h-4" />} {isEdit ? 'Save' : 'Create User'}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */
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
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await adminApi.listUsers(params);
      setUsers(res.data.data); setTotal(res.data.pagination.total); setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggle = async (user: User) => {
    setToggling(user.id);
    try { await adminApi.toggleUser(user.id); toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}`); loadUsers(); }
    catch { toast.error('Failed to update'); }
    finally { setToggling(null); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader title="User Management" description={`${total} users registered`} action={<button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary"><UserPlus className="w-4 h-4" /> Add User</button>} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" /><input className="input pl-9" placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="select w-full sm:w-44" value={roleFilter} onChange={e => { setRoleFilter(e.target.value as any); setPage(1); }}>
          <option value="">All Roles</option><option value="teacher">Teacher</option><option value="school_admin">School Admin</option><option value="super_admin">Super Admin</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-3 font-semibold text-surface-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden md:table-cell">School</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden lg:table-cell">Last Login</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-surface-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-surface-100 rounded animate-pulse" /></td></tr>)
              : users.length === 0 ? <tr><td colSpan={6} className="px-4 py-16 text-center text-surface-500">No users found</td></tr>
              : users.map(u => (
                <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} size="sm" /><div><div className="font-medium text-surface-900">{u.name}</div><div className="text-xs text-surface-500">{u.email}</div></div></div></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-surface-600 hidden md:table-cell">{u.schoolName || '—'}</td>
                  <td className="px-4 py-3 text-surface-500 hidden lg:table-cell text-xs">{u.lastLoginAt ? format(new Date(u.lastLoginAt), 'dd MMM yyyy, HH:mm') : 'Never'}</td>
                  <td className="px-4 py-3"><span className={clsx('badge', u.isActive ? 'badge-green' : 'badge-gray')}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditUser(u); setShowModal(true); }} className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleToggle(u)} disabled={toggling === u.id} className={clsx('btn-ghost p-1.5', u.isActive ? 'text-surface-500 hover:text-red-600' : 'text-surface-500 hover:text-emerald-600')}>{toggling === u.id ? <span className="spinner-sm" /> : <Power className="w-3.5 h-3.5" />}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
            <span className="text-sm text-surface-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && <UserModal user={editUser} onSave={() => { setShowModal(false); setEditUser(null); loadUsers(); }} onClose={() => { setShowModal(false); setEditUser(null); }} />}
    </div>
  );
}
