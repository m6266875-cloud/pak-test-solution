/**
 * PHASE 3 — Schools management (real /api/v3 backend).
 *
 * List/search/filter schools, create/edit, status workflow
 * (active/pending/suspended/archived), logo upload (PNG/JPG/SVG),
 * branding (watermark + header + footer defaults) and per-school dashboard.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  BarChart3, CheckCircle2, ImagePlus, Loader2, Pencil, Plus, School as SchoolIcon,
  Search, Trash2, Upload, X,
} from 'lucide-react';
import { v3 } from '../../api/v3';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import type { SchoolV3, SchoolDashboardV3 } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  archived: 'bg-surface-200 text-surface-500',
};

export default function SchoolsPage() {
  const [rows, setRows] = useState<SchoolV3[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<SchoolV3 | null>(null); // null = closed
  const [creating, setCreating] = useState(false);
  const [dash, setDash] = useState<SchoolDashboardV3 | null>(null);
  const [dashBusy, setDashBusy] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v3.schools.list({ search, status, page, limit: 12 });
      setRows(res.data.data.rows);
      setTotal(res.data.data.total);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load schools');
    } finally { setLoading(false); }
  }, [search, status, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const changeStatus = async (s: SchoolV3, next: string) => {
    try {
      await v3.schools.setStatus(s.id, next);
      toast.success(`School → ${next}`);
      fetchRows();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Status change failed'); }
  };

  const showDashboard = async (s: SchoolV3) => {
    setDashBusy(true);
    try {
      const res = await v3.schools.dashboard(s.id);
      setDash(res.data.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Dashboard unavailable');
    } finally { setDashBusy(false); }
  };

  const pages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader
        title="Schools"
        description={`${total} school${total === 1 ? '' : 's'} · Active / Pending / Suspended / Archived`}
        action={<button className="btn-primary btn-sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New school</button>}
      />

      {/* filters */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-9" placeholder="Search name / code / city…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {(['', 'active', 'pending', 'suspended', 'archived'] as const).map((st) => (
          <button key={st} onClick={() => { setStatus(st); setPage(1); }}
            className={clsx('badge cursor-pointer capitalize', st === status ? 'badge-brand' : 'badge-gray')}>
            {st || 'all'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"><CardSkeletons /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={SchoolIcon} title="No schools found"
          description="Create your first school or change the filters." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((s) => (
              <div key={s.id} className="card p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-100 border border-surface-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {s.logoUrl
                      ? <img src={v3.schools.logoUrl(s.id)} alt={s.name} className="w-full h-full object-contain" />
                      : <SchoolIcon className="w-6 h-6 text-surface-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-surface-900 truncate">{s.name}</div>
                    <div className="text-xs text-surface-500">{s.code}{s.city ? ` · ${s.city}` : ''}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', STATUS_STYLES[s.status])}>{s.status}</span>
                      <span className="text-[10px] text-surface-400">{s.teacherCount ?? 0} teachers · {s.paperCount ?? 0} papers</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-surface-500 space-y-0.5 min-h-[42px]">
                  <p className="truncate">{s.email || '—'}{s.phone ? ` · ${s.phone}` : ''}</p>
                  <p className="truncate">{s.principalName ? `Principal: ${s.principalName}` : s.address || '—'}</p>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-surface-100">
                  <button className="btn-ghost btn-sm" onClick={() => setEdit(s)}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button className="btn-ghost btn-sm" onClick={() => showDashboard(s)}><BarChart3 className="w-3.5 h-3.5" /> Dashboard</button>
                  {s.status !== 'archived' && (
                    <button className="btn-ghost btn-sm text-red-500 ml-auto" onClick={() => changeStatus(s, 'archived')}><Trash2 className="w-3.5 h-3.5" /> Archive</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span className="text-xs text-surface-500">Page {page} / {pages}</span>
            <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </>
      )}

      {(creating || edit) && (
        <SchoolEditor school={edit ?? null}
          onClose={() => { setEdit(null); setCreating(false); }}
          onSaved={() => { setEdit(null); setCreating(false); fetchRows(); }} />
      )}

      {dash && (
        <DashboardModal data={dash} busy={dashBusy} onClose={() => setDash(null)} />
      )}
    </div>
  );
}

function CardSkeletons() {
  return <>{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</>;
}

// ─── create / edit school + logo + branding ─────────────────────────────────
function SchoolEditor({ school, onClose, onSaved }: { school: SchoolV3 | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: school?.name ?? '', code: school?.code ?? '', email: school?.email ?? '',
    phone: school?.phone ?? '', address: school?.address ?? '', city: school?.city ?? '',
    principal: school?.principalName ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState('');
  const [wm, setWm] = useState({
    enabled: Boolean(school?.branding?.watermark?.enabled),
    opacity: Number(school?.branding?.watermark?.opacity ?? 0.07),
    size: Number(school?.branding?.watermark?.size ?? 45),
    position: String(school?.branding?.watermark?.position ?? 'center'),
  });
  const [showContact, setShowContact] = useState(Boolean(school?.branding?.header?.showContact));

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and code are required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), code: form.code.trim(), email: form.email.trim() || null,
        phone: form.phone.trim() || null, address: form.address.trim() || null,
        city: form.city.trim() || null, principal: form.principal.trim() || null,
      };
      let id = school?.id;
      if (school) await v3.schools.update(school.id, payload);
      else { const r = await v3.schools.create(payload); id = r.data.data.id; }
      if (id != null) {
        await v3.schools.saveBranding(id, {
          watermark: { enabled: wm.enabled, opacity: Number(wm.opacity) || 0.07, size: Number(wm.size) || 45, position: wm.position },
          header: { showSchoolName: true, showLogo: true, showContact },
          footer: { enabled: true, note: school?.branding?.footer?.note ?? '' },
        });
        if (logoFile) {
          setUploading(true);
          try {
            const fd = new FormData();
            fd.append('logo', logoFile);
            await v3.schools.uploadLogo(id, logoFile);
            toast.success('Logo uploaded');
          } finally { setUploading(false); }
        }
      }
      toast.success(school ? 'School updated' : 'School created');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const pickLogo = (f: File | null) => {
    setLogoError('');
    if (!f) return;
    const okType = ['image/png', 'image/jpeg', 'image/svg+xml'].includes(f.type);
    if (!okType) { setLogoError('Only PNG, JPG/JPEG or SVG logos are allowed'); return; }
    if (f.size > 2 * 1024 * 1024) { setLogoError('Logo must be at most 2 MB'); return; }
    setLogoFile(f);
  };

  const field = (label: string, key: keyof typeof form, ph = '') => (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={String(form[key])} placeholder={ph}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-down">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div>
            <h3 className="font-bold">{school ? 'Edit school' : 'New school'}</h3>
            <p className="text-xs text-surface-500">Logo, branding (watermark defaults) and profile are saved server-side.</p>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {field('School name *', 'name')}
            {field('Code *', 'code', 'e.g. PTB-9 or DPS-LHR')}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {field('Email', 'email')}
            {field('Phone', 'phone')}
          </div>
          {field('Address', 'address')}
          <div className="grid sm:grid-cols-2 gap-3">
            {field('City', 'city')}
            {field('Principal / Head', 'principal')}
          </div>

          {/* logo */}
          <div className="rounded-xl border border-dashed border-surface-300 p-3 bg-surface-50">
            <p className="text-xs font-bold mb-1.5">School logo (PNG / JPG / SVG ≤ 2 MB)</p>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white border border-surface-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoFile
                  ? <img src={URL.createObjectURL(logoFile)} alt="new logo" className="w-full h-full object-contain" />
                  : school?.logoUrl
                    ? <img src={v3.schools.logoUrl(school.id)} alt={school.name} className="w-full h-full object-contain" />
                    : <SchoolIcon className="w-7 h-7 text-surface-300" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="btn-secondary btn-sm cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5" /> {school?.logoUrl ? 'Replace logo' : 'Upload logo'}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
                    onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
                </label>
                {school?.logoUrl && (
                  <button className="btn-ghost btn-sm text-red-500" onClick={async () => {
                    try { await v3.schools.removeLogo(school.id); toast.success('Logo removed'); onSaved(); }
                    catch (e: any) { toast.error(e?.response?.data?.message || 'Remove failed'); }
                  }}><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                )}
              </div>
            </div>
            {logoError && <p className="text-xs text-red-500 mt-1.5">{logoError}</p>}
            {school?.logoUrl && (
              <p className="text-[10.5px] text-surface-400 mt-1.5">Current: {school.logoUrl}{school.branding?.watermark?.enabled ? ' · used as watermark default' : ''}</p>
            )}
          </div>

          {/* branding defaults */}
          <div className="rounded-xl border border-surface-200 p-3 space-y-2.5">
            <p className="text-xs font-bold">Branding defaults (applied automatically to this school's papers)</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="toggle-checkbox" checked={wm.enabled} onChange={(e) => setWm((w) => ({ ...w, enabled: e.target.checked }))} />
              Watermark on new papers
            </label>
            {wm.enabled && (
              <div className="grid grid-cols-3 gap-2 pl-6">
                <div><label className="label">Opacity</label>
                  <input type="number" min={0.02} max={0.5} step={0.01} className="input" value={wm.opacity} onChange={(e) => setWm((w) => ({ ...w, opacity: Number(e.target.value) }))} /></div>
                <div><label className="label">Size %</label>
                  <input type="number" min={10} max={90} className="input" value={wm.size} onChange={(e) => setWm((w) => ({ ...w, size: Number(e.target.value) }))} /></div>
                <div><label className="label">Position</label>
                  <select className="select" value={wm.position} onChange={(e) => setWm((w) => ({ ...w, position: e.target.value }))}>
                    {['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].map((p) => <option key={p}>{p}</option>)}
                  </select></div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="toggle-checkbox" checked={showContact} onChange={(e) => setShowContact(e.target.checked)} />
              Print school address / phone on paper headers
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving || uploading} onClick={save}>
            {saving || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {school ? 'Save changes' : 'Create school'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── school dashboard modal ─────────────────────────────────────────────────
function DashboardModal({ data, busy, onClose }: { data: SchoolDashboardV3; busy: boolean; onClose: () => void }) {
  const { counts } = data;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-auto animate-slide-down">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center overflow-hidden">
              {data.school.logoUrl
                ? <img src={v3.schools.logoUrl(data.school.id)} alt="" className="w-full h-full object-contain" />
                : <SchoolIcon className="w-5 h-5 text-surface-400" />}
            </div>
            <div>
              <h3 className="font-bold">{data.school.name}</h3>
              <p className="text-xs text-surface-500">{data.school.code} · <span className="capitalize">{data.school.status}</span></p>
            </div>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        {busy ? (
          <div className="p-10 text-center text-surface-400 text-sm flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                ['Teachers', counts.teachers], ['Papers', counts.papers],
                ['Courses', counts.courses], ['Classes', counts.classes],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-surface-50 border border-surface-100 p-3 text-center">
                  <div className="text-2xl font-extrabold text-brand-700">{v}</div>
                  <div className="text-[11px] text-surface-500 font-semibold uppercase tracking-wide">{l}</div>
                </div>
              ))}
            </div>
            {(counts.byStatus?.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {counts.byStatus.map((x) => (
                  <span key={x.status} className="badge capitalize">{x.status}: {x.n}</span>
                ))}
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-wide text-surface-500 mb-2">Recent papers</p>
            {data.recentPapers.length === 0 ? (
              <p className="text-sm text-surface-400">No papers generated for this school yet.</p>
            ) : (
              <div className="divide-y divide-surface-100 border border-surface-100 rounded-xl">
                {data.recentPapers.slice(0, 6).map((p) => (
                  <div key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-surface-800 truncate">{p.title}</p>
                      <p className="text-[11px] text-surface-400">{p.teacherName} · {p.className} · {(p.subjects ?? []).map((x) => x.name).join(', ') || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold">{p.totalMarks} marks</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
