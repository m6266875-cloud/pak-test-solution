/**
 * PHASE 3 — Teacher & Admin management (real /api/v3 backend).
 *
 * Teachers: create with school + course→class→subject assignments from the
 * live catalog (validateAssignments runs server-side), search, deactivate,
 * password reset. Admins: Super Admin creates school admins with module
 * permission sets (checked server-side through hasPerm on every route).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  KeyRound, Loader2, Plus, Search, ShieldCheck, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v3 } from '../../api/v3';
import { EmptyState, PageHeader, Skeleton } from '../../components/ui';
import {
  ADMIN_PERMISSIONS_V3, PERMISSION_LABELS_V3, Role,
} from '../../types';
import type { CatalogClassOptionV3, SchoolV3, UserRowV3 } from '../../types';

type Tab = 'teacher' | 'school_admin';

export default function AdminUsersPage() {
  const { user: me } = useAppSelector((s) => s.auth);
  const isSuper = me?.role === 'super_admin';
  const [tab, setTab] = useState<Tab>('teacher');
  const [rows, setRows] = useState<UserRowV3[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [schools, setSchools] = useState<SchoolV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSuper) return;
    v3.schools.list({ page: 1, limit: 200 }).then((r) => setSchools(r.data.data.rows)).catch(() => undefined);
  }, [isSuper]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v3.users.list({
        role: tab, search,
        schoolId: schoolFilter ? Number(schoolFilter) : undefined,
        page, limit: 12,
      });
      setRows(res.data.data.rows);
      setTotal(res.data.data.total);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load users');
    } finally { setLoading(false); }
  }, [tab, search, schoolFilter, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const toggleActive = async (u: UserRowV3) => {
    try {
      await v3.users.update(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Account deactivated' : 'Account activated');
      fetchRows();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Update failed'); }
  };

  const resetPassword = async (u: UserRowV3) => {
    try {
      const res = await v3.users.resetPassword(u.id);
      window.prompt(`Temporary password for ${u.email} (copy it — shown once):`, res.data.data.tempPassword);
      toast.success('Password reset');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Reset failed'); }
  };

  const pages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title={tab === 'teacher' ? 'Teachers' : 'Admins'}
        description={`${total} account${total === 1 ? '' : 's'} · role, school and permission enforcement happens on the server`}
        action={
          <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> {tab === 'teacher' ? 'New teacher' : 'New admin'}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="card p-1 flex gap-1">
          {(['teacher', 'school_admin'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors', tab === t ? 'bg-brand-600 text-white' : 'text-surface-500 hover:bg-surface-100')}>
              {t === 'teacher' ? 'Teachers' : 'Admins (school)'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-52">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-9" placeholder="Search name or email…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {isSuper && (
          <select className="select max-w-56" value={schoolFilter} onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}>
            <option value="">All schools</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={tab === 'teacher' ? Users : ShieldCheck}
          title={tab === 'teacher' ? 'No teachers found' : 'No admins found'}
          description="Use “New” to create an account — it gets real scoped access immediately." />
      ) : (
        <>
          <div className="card divide-y divide-surface-100 overflow-hidden">
            {rows.map((u) => (
              <div key={u.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0',
                  u.role === 'school_admin' ? 'bg-brand-600' : 'bg-brand-600')}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-40">
                  <div className="text-sm font-semibold text-surface-900">{u.name}</div>
                  <div className="text-xs text-surface-500">{u.email}</div>
                </div>
                <div className="min-w-36 max-w-56">
                  <div className="text-xs font-medium text-surface-700">{u.schoolName ?? '—'}</div>
                  {u.subjects?.length ? (
                    <div className="text-[10.5px] text-surface-400 truncate">{u.subjects.join(', ')}</div>
                  ) : u.role === 'school_admin' ? (
                    <div className="text-[10.5px] text-surface-400 truncate">{u.permissions?.length ?? 0} permission{(u.permissions?.length ?? 0) === 1 ? '' : 's'}</div>
                  ) : (
                    <div className="text-[10.5px] text-surface-400">no subject assignments</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={clsx('badge', u.isActive ? 'badge-green' : 'badge-gray')}>{u.isActive ? 'active' : 'disabled'}</span>
                  <button className="btn-ghost btn-icon" title="Reset password" onClick={() => resetPassword(u)}><KeyRound className="w-3.5 h-3.5" /></button>
                  <button className="btn-ghost btn-icon text-surface-400" title={u.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span className="text-xs text-surface-500">Page {page} / {pages}</span>
            <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </>
      )}

      {open && (
        <UserEditor tab={tab} isSuper={isSuper} schools={schools}
          onClose={() => setOpen(false)} onSaved={() => { setOpen(false); fetchRows(); }} />
      )}
    </div>
  );
}

// ─── create teacher/admin editor ────────────────────────────────────────────
function UserEditor({ tab, isSuper, schools, onClose, onSaved }: {
  tab: 'teacher' | 'school_admin'; isSuper: boolean; schools: SchoolV3[];
  onClose: () => void; onSaved: () => void;
}) {
  const { user: me } = useAppSelector((s) => s.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState<string>(tab === 'school_admin' ? '' : String(me?.schoolId ?? schools[0]?.id ?? ''));
  const [catalog, setCatalog] = useState<{ courses: Array<{ id: number; code: string; name: string }>; classes: CatalogClassOptionV3[] } | null>(null);
  const [classId, setClassId] = useState('');
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [perms, setPerms] = useState<string[]>(['users', 'schools', 'generatedPapers', 'analytics']);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    v3.catalog.options().then((r) => {
      setCatalog(r.data.data);
      const first = r.data.data.classes.find((c) => c.subjects.length > 0);
      if (first) { setClassId(String(first.id)); setSubjectIds([first.subjects[0].id]); }
    }).catch(() => toast.error('Failed to load class/subject catalog'));
  }, []);

  const availableSubjects = useMemo(() => {
    if (!classId) return [];
    return catalog?.classes.find((c) => String(c.id) === String(classId))?.subjects ?? [];
  }, [catalog, classId]);

  const toggleSubject = (id: number) => setSubjectIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const classes = useMemo(() => (catalog?.classes ?? []).slice().sort((a, b) => a.grade - b.grade || a.courseCode.localeCompare(b.courseCode)), [catalog]);

  const submit = async () => {
    if (!name.trim() || !email.trim()) { toast.error('Name and email are required'); return; }
    if (tab === 'school_admin' && !schoolId) { toast.error('A school admin must belong to a school'); return; }
    if (tab === 'teacher' && !schoolId) { toast.error('A teacher must belong to a school'); return; }
    setSaving(true);
    try {
      const base = { name: name.trim(), email: email.trim(), password: password.trim() || undefined, schoolId: schoolId ? Number(schoolId) : null };
      let res;
      if (tab === 'teacher') {
        const assignments = subjectIds.length ? [{ classId: Number(classId), subjectIds }] : [];
        res = await v3.users.createTeacher({ ...base, assignments });
      } else {
        res = await v3.users.createAdmin({ ...base, role: 'school_admin', permissions: perms });
      }
      const temp = (res.data.data as any)?.tempPassword;
      setResult(temp
        ? `Account created. Temporary password (shown once): ${temp}`
        : `Account for ${email.trim()} created with the password you provided.`);
      setName(''); setEmail(''); setPassword('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Create failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-down">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            {tab === 'teacher' ? <UserPlus className="w-5 h-5 text-brand-600" /> : <ShieldCheck className="w-5 h-5 text-brass-600" />}
            <div>
              <h3 className="font-bold">{tab === 'teacher' ? 'Create teacher' : 'Create school admin'}</h3>
              <p className="text-xs text-surface-500">
                {tab === 'teacher' ? 'Assign a school + class subjects — content is restricted server-side.' : 'Choose the module permissions this admin may manage.'}
              </p>
            </div>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Full name *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label">Email *</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Password (blank = auto-generate)</label>
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Auto-generate" /></div>
            <div><label className="label">School *</label>
              <select className="select" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} disabled={!isSuper && tab === 'teacher'}>
                {!isSuper && <option value={String(me?.schoolId ?? '')}>{me?.schoolName ?? 'My school'}</option>}
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select></div>
          </div>

          {result && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-mono break-all">
              {result}
            </div>
          )}

          {tab === 'teacher' && catalog && (
            <div className="rounded-xl border border-surface-200 p-3 space-y-2.5">
              <p className="text-xs font-bold">Subject assignment (course → class → subject)</p>
              <div>
                <label className="label">Class</label>
                <select className="select" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectIds([]); }}>
                  {classes.map((c) => <option key={`${c.id}-${c.courseId}`} value={c.id}>Grade {c.grade} {c.className} — {c.courseCode}</option>)}
                </select>
              </div>
              {availableSubjects.length > 0 && (
                <>
                  <label className="label">Subjects (select one or more)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubjects.map((s) => (
                      <button key={s.id} type="button" onClick={() => toggleSubject(s.id)}
                        className={clsx('badge cursor-pointer', subjectIds.includes(s.id) ? 'badge-brand' : 'badge-gray')}>
                        {s.name} · {s.medium}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'school_admin' && (
            <div className="rounded-xl border border-surface-200 p-3">
              <p className="text-xs font-bold mb-2">Module permissions</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {ADMIN_PERMISSIONS_V3.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface-50 rounded-lg px-2 py-1">
                    <input type="checkbox" className="toggle-checkbox" checked={perms.includes(p)}
                      onChange={() => setPerms((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])} />
                    {PERMISSION_LABELS_V3[p]}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-surface-400 mt-2">School admins manage only their own school; Super Admin always has every permission.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create account
          </button>
        </div>
      </div>
    </div>
  );
}
