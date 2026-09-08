import { useState, useEffect, useCallback } from 'react';
import { schoolsApi } from '../../api/schools';
import { School, SchoolFormData, SchoolStatus } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageHeader, EmptyState } from '../../components/ui';
import {
  Plus, Search, Edit3, X, Check, School as SchoolIcon,
  MapPin, Phone, Mail, User as UserIcon, Link2, Power, RefreshCw, Building2,
} from 'lucide-react';
import clsx from 'clsx';

const emptyForm: SchoolFormData = {
  name: '', code: '', email: '', phone: '', address: '', city: '', logoUrl: '', principal: '', status: 'active',
};

const statusStyles: Record<SchoolStatus, string> = {
  active: 'badge-green',
  inactive: 'badge-gray',
  suspended: 'badge-red',
};

/* ═══ School Modal ═══ */
function SchoolModal({ school, onSave, onClose }: { school?: School | null; onSave: () => void; onClose: () => void }) {
  const isEdit = !!school;
  const [form, setForm] = useState<SchoolFormData>(
    school
      ? {
          name: school.name, code: school.code, email: school.email || '', phone: school.phone || '',
          address: school.address || '', city: school.city || '', logoUrl: school.logoUrl || '',
          principal: school.principal || '', status: school.status,
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof SchoolFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('School name is required'); return; }
    if (!form.code.trim()) { toast.error('School code is required'); return; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { toast.error('Invalid email address'); return; }
    setSaving(true);
    try {
      if (isEdit && school) {
        await schoolsApi.update(school.id, form);
        toast.success('School updated');
      } else {
        await schoolsApi.create(form);
        toast.success('School created');
      }
      onSave();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save school');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-surface-900">{isEdit ? 'Edit School' : 'Add New School'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">School Name *</label>
              <div className="relative">
                <SchoolIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-9" value={form.name} onChange={set('name')} placeholder="Govt High School" />
              </div>
            </div>
            <div>
              <label className="label">School Code *</label>
              <input className="input" value={form.code} onChange={set('code')} placeholder="GHS-LHR-01" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select w-full" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="label">Principal</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-9" value={form.principal} onChange={set('principal')} placeholder="Principal name" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input type="email" className="input pl-9" value={form.email} onChange={set('email')} placeholder="info@school.edu.pk" />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-9" value={form.phone} onChange={set('phone')} placeholder="042-1234567" />
              </div>
            </div>
            <div>
              <label className="label">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-9" value={form.city} onChange={set('city')} placeholder="Lahore" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={set('address')} placeholder="Street address" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Logo URL</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-9" value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://... (used on printed papers)" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-100 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />} {isEdit ? 'Save Changes' : 'Create School'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SchoolStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await schoolsApi.list(params);
      setSchools(res.data.data);
      setTotal(res.data.pagination?.total ?? res.data.data.length);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch {
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  const handleToggle = async (school: School) => {
    setToggling(school.id);
    try {
      const res = await schoolsApi.toggleStatus(school.id);
      toast.success(res.data.message || `${school.name} status updated`);
      loadSchools();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update status');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Schools"
        description={`${total} schools registered on the platform`}
        action={
          <button onClick={() => { setEditSchool(null); setShowModal(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add School
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, code, city or principal..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="select w-full sm:w-44"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-3 font-semibold text-surface-600">School</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden md:table-cell">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden lg:table-cell">City</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden xl:table-cell">Principal</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600 hidden sm:table-cell">Users</th>
                <th className="text-left px-4 py-3 font-semibold text-surface-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-surface-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-surface-100 rounded animate-pulse" /></td></tr>
                ))
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Building2}
                      title="No schools found"
                      description={search || statusFilter ? 'Try adjusting your search or filters.' : 'Add your first school to start organizing teachers and subjects.'}
                    />
                  </td>
                </tr>
              ) : (
                schools.map(school => (
                  <tr key={school.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {school.logoUrl ? (
                          <img src={school.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-surface-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                            <SchoolIcon className="w-4 h-4 text-brand-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-surface-900 truncate max-w-[220px]">{school.name}</div>
                          <div className="text-xs text-surface-500 md:hidden">{school.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs bg-surface-100 px-2 py-1 rounded-md text-surface-700">{school.code}</span>
                    </td>
                    <td className="px-4 py-3 text-surface-600 hidden lg:table-cell">{school.city || '—'}</td>
                    <td className="px-4 py-3 text-surface-600 hidden xl:table-cell">{school.principal || '—'}</td>
                    <td className="px-4 py-3 text-surface-600 hidden sm:table-cell">{school._count?.users ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', statusStyles[school.status] || 'badge-gray')}>
                        {school.status.charAt(0).toUpperCase() + school.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditSchool(school); setShowModal(true); }}
                          className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600"
                          title="Edit school"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(school)}
                          disabled={toggling === school.id}
                          className={clsx(
                            'btn-ghost p-1.5',
                            school.status === 'active'
                              ? 'text-surface-500 hover:text-red-600'
                              : 'text-surface-500 hover:text-emerald-600'
                          )}
                          title={school.status === 'active' ? 'Deactivate school' : 'Activate school'}
                        >
                          {toggling === school.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {showModal && (
        <SchoolModal
          school={editSchool}
          onSave={() => { setShowModal(false); setEditSchool(null); loadSchools(); }}
          onClose={() => { setShowModal(false); setEditSchool(null); }}
        />
      )}

      {/* Footer note */}
      <p className="text-xs text-surface-400 text-center">
        Schools were last synced {format(new Date(), 'dd MMM yyyy, HH:mm')}
      </p>
    </div>
  );
}
