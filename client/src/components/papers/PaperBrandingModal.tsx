/**
 * PHASE 3 — Paper branding editor (modal).
 *
 * Live form for the fields the server persists through
 * PUT /api/v3/papers/:id/branding (school name line, header note,
 * footer, instructions, date, logo/name/contact toggles, watermark,
 * template choice). State is seeded from the server preview context
 * (GET /api/v3/papers/:id/preview), so teachers get their school's
 * defaults and admins get the paper's current snapshot.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Brush, Loader2, Save, X } from 'lucide-react';
import { v3 } from '../../api/v3';
import { useAppSelector } from '../../store/hooks';
import type { TemplateV3 } from '../../types';

export interface PreviewCtx {
  paper: any; school: any; watermark: any;
  formatting: { schoolName: string | null; headerNote: string | null; footerNote: string | null; schoolLogoUrl: string | null; branding: any };
}

export default function PaperBrandingModal({ paperId, onClose, onSaved }: {
  paperId: number; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAppSelector((s) => s.auth);
  const [ctx, setCtx] = useState<PreviewCtx | null>(null);
  const [templates, setTemplates] = useState<TemplateV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    templateId: '' as string,
    schoolName: '', headerNote: '', footerNote: '', instructions: '', date: '',
    showSchoolName: true, showLogo: true, showContact: false,
    wmEnabled: false, wmOpacity: 0.07, wmSize: 45, wmPosition: 'center',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v3.papers.preview(paperId);
      const c = res.data.data as PreviewCtx;
      setCtx(c);
      const br = c.formatting.branding ?? {};
      const wm = c.watermark ?? br.watermark ?? {};
      setF({
        templateId: wm.templateId ? String(wm.templateId) : '',
        schoolName: c.formatting.schoolName ?? c.school?.name ?? '',
        headerNote: c.formatting.headerNote ?? '',
        footerNote: c.formatting.footerNote ?? '',
        instructions: String(br.instructions ?? ''),
        date: String(br.date ?? ''),
        showSchoolName: br.header?.showSchoolName ?? true,
        showLogo: br.header?.showLogo ?? true,
        showContact: br.header?.showContact ?? false,
        wmEnabled: Boolean(wm.enabled),
        wmOpacity: Number(wm.opacity ?? 0.07),
        wmSize: Number(wm.size ?? 45),
        wmPosition: String(wm.position ?? 'center'),
      });
      try {
        const t = await v3.templates.forSchool(c.school?.id ?? undefined);
        setTemplates(t.data.data);
      } catch { setTemplates([]); }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load branding context');
      onClose();
    } finally { setLoading(false); }
  }, [paperId, onClose]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await v3.papers.saveBranding(paperId, {
        templateId: f.templateId ? Number(f.templateId) : null,
        schoolName: f.schoolName || null,
        headerNote: f.headerNote || null,
        footerNote: f.footerNote || null,
        instructions: f.instructions || null,
        date: f.date || null,
        showSchoolName: f.showSchoolName,
        showLogo: f.showLogo,
        showContact: f.showContact,
        watermark: {
          enabled: f.wmEnabled, opacity: f.wmOpacity, size: f.wmSize, position: f.wmPosition,
        },
      });
      toast.success('Branding saved — applied to this paper');
      onSaved();
      onClose();
      return res;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const logoUrl = ctx?.formatting.schoolLogoUrl ?? ctx?.school?.logoUrl;
  const schoolLogoId = ctx?.school?.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-slide-down">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center"><Brush className="w-4.5 h-4.5" /></div>
            <div>
              <h3 className="font-bold">Branding &amp; layout</h3>
              <p className="text-xs text-surface-500">
                Paper #{paperId}{user?.schoolName ? ` · ${user.schoolName}` : ''} — saved server-side into the paper snapshot
              </p>
            </div>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading || !ctx ? (
            <div className="flex items-center justify-center gap-2 py-16 text-surface-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading branding context…</div>
          ) : (
            <div className="space-y-4">
              {/* logo + header row */}
              <div className="flex items-center gap-4 flex-wrap">
                {logoUrl && (
                  <div className="w-14 h-14 rounded-xl border border-surface-200 bg-white p-1 flex items-center justify-center overflow-hidden">
                    <img src={schoolLogoId ? v3.schools.logoUrl(schoolLogoId) : logoUrl} alt="school logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 min-w-56">
                  <label className="label">School name printed on top</label>
                  <input className="input" value={f.schoolName} onChange={(e) => setF((x) => ({ ...x, schoolName: e.target.value }))} placeholder={ctx.school?.name ?? 'School name'} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">Header note (line under school name)</label>
                  <input className="input" value={f.headerNote} onChange={(e) => setF((x) => ({ ...x, headerNote: e.target.value }))} placeholder="e.g. Mid Term Examination 2026" /></div>
                <div><label className="label">Date shown on the paper</label>
                  <input className="input" value={f.date} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} placeholder="e.g. September 2026" /></div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">Template (applies header/watermark/instructions config)</label>
                  <select className="select" value={f.templateId} onChange={(e) => setF((x) => ({ ...x, templateId: e.target.value }))}>
                    <option value="">None — keep current</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind}){t.isDefault ? ' ★' : ''}</option>)}
                  </select></div>
                <div><label className="label">Footer note</label>
                  <input className="input" value={f.footerNote} onChange={(e) => setF((x) => ({ ...x, footerNote: e.target.value }))} placeholder="— Best of luck —" /></div>
              </div>

              <div><label className="label">Instructions (above the questions)</label>
                <textarea className="input min-h-14" value={f.instructions} onChange={(e) => setF((x) => ({ ...x, instructions: e.target.value }))}
                  placeholder="Attempt all questions. Marks for each question are shown on the right…" /></div>

              {/* toggles */}
              <div className="grid sm:grid-cols-3 gap-2 rounded-xl border border-surface-200 p-3">
                {([
                  ['showSchoolName', 'School name'], ['showLogo', 'Logo'], ['showContact', 'Address / phone'],
                ] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="toggle-checkbox" checked={f[k]}
                      onChange={(e) => setF((x) => ({ ...x, [k]: e.target.checked }))} /> {label}
                  </label>
                ))}
              </div>

              {/* watermark */}
              <div className="rounded-xl border border-surface-200 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input type="checkbox" className="toggle-checkbox" checked={f.wmEnabled}
                      onChange={(e) => setF((x) => ({ ...x, wmEnabled: e.target.checked }))} />
                    Watermark ({logoUrl ? 'uses school logo' : 'no logo available — text watermark'})
                  </label>
                  {f.wmEnabled && <span className="text-[11px] text-surface-400">preview shows in print/PDF</span>}
                </div>
                {f.wmEnabled && (
                  <div className="grid grid-cols-3 gap-3 pl-7">
                    <div><label className="label">Opacity ({Math.round(f.wmOpacity * 100)}%)</label>
                      <input type="range" min={2} max={50} className="w-full accent-brand-600" value={Math.round(f.wmOpacity * 100)}
                        onChange={(e) => setF((x) => ({ ...x, wmOpacity: Number(e.target.value) / 100 }))} /></div>
                    <div><label className="label">Size ({f.wmSize}%)</label>
                      <input type="range" min={10} max={90} className="w-full accent-brand-600" value={f.wmSize}
                        onChange={(e) => setF((x) => ({ ...x, wmSize: Number(e.target.value) }))} /></div>
                    <div><label className="label">Position</label>
                      <select className="select" value={f.wmPosition} onChange={(e) => setF((x) => ({ ...x, wmPosition: e.target.value }))}>
                        {['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].map((p) => <option key={p}>{p}</option>)}
                      </select></div>
                  </div>
                )}
                {f.wmEnabled && (
                  <div className={clsx('relative h-28 rounded-lg border border-surface-200 overflow-hidden bg-surface-50/50 flex items-center justify-center')}>
                    <p className="text-[10px] text-surface-300 select-none">Branded preview area</p>
                    {logoUrl && (
                      <img src={schoolLogoId ? v3.schools.logoUrl(schoolLogoId) : logoUrl} alt="watermark"
                        className="absolute pointer-events-none"
                        style={{
                          opacity: f.wmOpacity, width: `${f.wmSize}%`, objectFit: 'contain',
                          left: f.wmPosition.includes('right') ? 'auto' : '50%',
                          right: f.wmPosition.includes('right') ? '2%' : 'auto',
                          top: f.wmPosition.includes('bottom') ? 'auto' : '50%',
                          bottom: f.wmPosition.includes('bottom') ? '2%' : 'auto',
                          transform: f.wmPosition === 'center' || f.wmPosition.includes('middle') ? 'translate(-50%, -50%)' : f.wmPosition.startsWith('top') ? 'translateX(-50%)' : 'translate(-50%, 0)',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving || loading} onClick={save}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save branding
          </button>
        </div>
      </div>
    </div>
  );
}
