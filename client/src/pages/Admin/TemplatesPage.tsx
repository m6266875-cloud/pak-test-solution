/**
 * PHASE 3 — Paper templates (real /api/v3/templates).
 *
 * Kinds: School Exam / Monthly / Mid Term / Final Term / Practice / Board.
 * Templates bundle header, footer, logo & watermark switches, school info,
 * instructions, numbering and page-number settings. System templates have
 * schoolId null (Super Admin); school admins manage their own school's.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  LayoutTemplate, Loader2, Pencil, Plus, Star, Trash2, X,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v3 } from '../../api/v3';
import { EmptyState, PageHeader, Skeleton } from '../../components/ui';
import { TEMPLATE_KIND_LABELS_V3, TemplateKindV3 } from '../../types';
import type { TemplateV3 } from '../../types';

const KINDS = Object.keys(TEMPLATE_KIND_LABELS_V3) as TemplateKindV3[];

export default function TemplatesPage() {
  const { user: me } = useAppSelector((s) => s.auth);
  const isSuper = me?.role === 'super_admin';
  const [rows, setRows] = useState<TemplateV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TemplateV3 | null | 'new'>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v3.templates.list();
      setRows(res.data.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load templates');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const remove = async (t: TemplateV3) => {
    if (!window.confirm(`Delete template “${t.name}”?`)) return;
    try { await v3.templates.remove(t.id); toast.success('Template deleted'); fetchRows(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const system = rows.filter((t) => t.schoolId == null);
  const school = rows.filter((t) => t.schoolId != null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader title="Templates" description="Reusable paper layouts (header / footer / logo / watermark / instructions / numbering)"
        action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> New template</button>} />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="No templates yet" description="Create one — templates drive the printed header, watermark and instructions of generated papers." />
      ) : (
        <div className="space-y-6">
          {[{ label: isSuper ? 'System templates' : 'Templates', list: isSuper ? system : school }, ...(isSuper ? [{ label: 'School templates', list: school }] : [])].map((group) => (
            group.list.length > 0 && (
              <div key={group.label}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">{group.label} ({group.list.length})</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.list.map((t) => (
                    <div key={t.id} className="card p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0"><LayoutTemplate className="w-4.5 h-4.5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-surface-900 text-sm truncate flex items-center gap-1.5">
                            {t.name} {t.isDefault && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                          </div>
                          <div className="text-[10.5px] text-surface-400">{TEMPLATE_KIND_LABELS_V3[t.kind] ?? t.kind}{t.schoolName ? ` · ${t.schoolName}` : ' · System'}</div>
                        </div>
                        {!t.isActive && <span className="badge badge-gray">inactive</span>}
                      </div>
                      <div className="text-[11px] text-surface-500 leading-relaxed min-h-10">
                        {t.config?.instructions ? <span className="line-clamp-2">“{String(t.config.instructions).slice(0, 90)}”</span> : (
                          <span className="text-surface-300">No instructions set.</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
                        <span className="badge badge-gray">WM: {t.config?.watermark?.enabled ? 'on' : 'off'}</span>
                        <span className="badge badge-gray">Header school: {t.config?.header?.showSchoolName !== false ? 'on' : 'off'}</span>
                        <span className="badge badge-gray">Numbering: {String(t.config?.numbering ?? 'global')}</span>
                        <span className="badge badge-gray">Page numbers: {t.config?.pageNumbers === false ? 'off' : 'on'}</span>
                      </div>
                      <div className="flex gap-1.5 pt-2 border-t border-surface-100 mt-auto">
                        <button className="btn-ghost btn-sm" onClick={() => setEditing(t)}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                        <button className="btn-ghost btn-sm text-red-500 ml-auto" onClick={() => remove(t)}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor template={editing === 'new' ? null : editing} isSuper={isSuper}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchRows(); }} />
      )}
    </div>
  );
}

// ─── template create/edit ───────────────────────────────────────────────────
function TemplateEditor({ template, isSuper, onClose, onSaved }: {
  template: TemplateV3 | null; isSuper: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { user: me } = useAppSelector((s) => s.auth);
  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [name, setName] = useState(template?.name ?? '');
  const [kind, setKind] = useState<TemplateKindV3>(template?.kind ?? 'school_exam');
  const [isDefault, setIsDefault] = useState(Boolean(template?.isDefault));
  const [schoolId, setSchoolId] = useState('');
  const [instructions, setInstructions] = useState<string>(template?.config?.instructions ?? '');
  const [wmEnabled, setWmEnabled] = useState(Boolean(template?.config?.watermark?.enabled ?? false));
  const [showSchool, setShowSchool] = useState(template?.config?.header?.showSchoolName !== false);
  const [showLogo, setShowLogo] = useState(template?.config?.header?.showLogo !== false);
  const [numbering, setNumbering] = useState(String(template?.config?.numbering ?? 'global'));
  const [pageNumbers, setPageNumbers] = useState(template?.config?.pageNumbers !== false);
  const [footerNote, setFooterNote] = useState(String(template?.config?.footer?.note ?? ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isSuper) v3.schools.list({ page: 1, limit: 200 }).then((r) => setSchools(r.data.data.rows)).catch(() => undefined);
    if (isSuper && template?.schoolId) setSchoolId(String(template.schoolId));
  }, [isSuper, template]);

  const submit = async () => {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(), kind,
        isDefault,
        config: {
          schoolId: schoolId ? Number(schoolId) : null,
          header: { showSchoolName: showSchool, showLogo: showLogo },
          watermark: { enabled: wmEnabled, opacity: Number(template?.config?.watermark?.opacity ?? 0.07), size: Number(template?.config?.watermark?.size ?? 45), position: template?.config?.watermark?.position ?? 'center' },
          instructions: instructions.trim() || null,
          numbering,
          pageNumbers,
          footer: { note: footerNote.trim() },
        },
      };
      if (template) await v3.templates.update(template.id, payload);
      else await v3.templates.create(payload);
      toast.success(template ? 'Template updated' : 'Template created');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-down">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div>
            <h3 className="font-bold">{template ? 'Edit template' : 'New template'}</h3>
            <p className="text-xs text-surface-500">Applied when a paper is generated or re-branded.</p>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Name *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PTB Grade 9 — Final Term" /></div>
            <div><label className="label">Kind</label>
              <select className="select" value={kind} onChange={(e) => setKind(e.target.value as TemplateKindV3)}>
                {KINDS.map((k) => <option key={k} value={k}>{TEMPLATE_KIND_LABELS_V3[k]}</option>)}
              </select></div>
          </div>
          {isSuper && (
            <div><label className="label">Scope</label>
              <select className="select" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                <option value="">System template (all schools)</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
          )}
          {!isSuper && <p className="text-xs text-surface-500">This template is scoped to your school ({me?.schoolName}).</p>}

          <div><label className="label">Instructions (printed above questions)</label>
            <textarea className="input min-h-16" value={instructions} onChange={(e) => setInstructions(e.target.value)}
              placeholder="Attempt all questions. Marks for each question are shown on the right…" /></div>
          <div><label className="label">Footer note</label>
            <input className="input" value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder="— Best of luck —" /></div>

          <div className="rounded-xl border border-surface-200 p-3 space-y-2">
            <p className="text-xs font-bold">Header & watermark</p>
            <div className="grid sm:grid-cols-2 gap-1">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="toggle-checkbox" checked={showSchool} onChange={(e) => setShowSchool(e.target.checked)} /> School name in header</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="toggle-checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} /> School logo in header</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="toggle-checkbox" checked={wmEnabled} onChange={(e) => setWmEnabled(e.target.checked)} /> Watermark logo</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="toggle-checkbox" checked={pageNumbers} onChange={(e) => setPageNumbers(e.target.checked)} /> Page numbers</label>
            </div>
          </div>

          <div><label className="label">Numbering</label>
            <select className="select" value={numbering} onChange={(e) => setNumbering(e.target.value)}>
              <option value="global">Q.1 … Q.n across the paper</option>
              <option value="per-section">Reset per section</option>
              <option value="none">No numbers</option>
            </select></div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="toggle-checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Default template for {schoolId || !isSuper ? 'this school' : 'the system scope'} (used when generating)
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {template ? 'Save changes' : 'Create template'}
          </button>
        </div>
      </div>
    </div>
  );
}
