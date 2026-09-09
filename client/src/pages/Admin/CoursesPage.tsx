/**
 * PHASE 4 — Course master (Part A).
 *
 * Super Admin owns the master Course system: add/edit/archive courses,
 * per-course session status (exactly one `current`), and the valid class
 * links that decide which classes exist for a course. Admins holding the
 * `courses` permission can view; every write is super_admin-only (the
 * server enforces this too — the buttons simply hide).
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Landmark, Loader2, Plus, Save, Trash2, Unlink } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v3 } from '../../api/v3';
import { EmptyState, PageHeader } from '../../components/ui';
import type {
  AcademicSessionV3, CatalogOptionsV3, CourseAdminV3, CourseDetailV3,
} from '../../types';

const TYPES = ['board', 'publisher', 'program'] as const;
const STATUSES = ['active', 'inactive', 'archived'] as const;
const SESSION_STATUSES = ['upcoming', 'current', 'previous', 'archived'] as const;

const statusTint = (s: string) =>
  s === 'active' || s === 'current' ? 'bg-emerald-100 text-emerald-700'
    : s === 'archived' ? 'bg-surface-100 text-surface-500'
      : 'bg-amber-100 text-amber-700';

export default function CoursesPage() {
  const { user } = useAppSelector((s) => s.auth);
  const canWrite = user?.role === 'super_admin';

  const [courses, setCourses] = useState<CourseAdminV3[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CourseDetailV3 | null>(null);
  const [sessions, setSessions] = useState<AcademicSessionV3[]>([]);
  const [catalog, setCatalog] = useState<CatalogOptionsV3 | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({ code: '', name: '', shortName: '', type: 'board', region: '', website: '', description: '', status: 'active', displayOrder: 0 });
  const [linkSessionId, setLinkSessionId] = useState('');
  const [linkSessionStatus, setLinkSessionStatus] = useState('upcoming');
  const [linkClassId, setLinkClassId] = useState('');

  const loadList = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([v3.courses.list(), v3.courses.sessions()]);
      setCourses(c.data.data);
      setSessions(s.data.data);
      setSelectedId((prev) => prev ?? c.data.data[0]?.id ?? null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    v3.catalog.options().then((r) => setCatalog(r.data.data)).catch(() => undefined);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const r = await v3.courses.get(id);
      const d = r.data.data;
      setDetail(d);
      setForm({
        code: d.code, name: d.name, shortName: d.shortName ?? '', type: d.type,
        region: d.region ?? '', website: d.website ?? '', description: d.description ?? '',
        status: d.status, displayOrder: d.displayOrder,
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load course');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId != null && !creating) loadDetail(selectedId);
  }, [selectedId, creating, loadDetail]);

  const refreshAfterWrite = (d: CourseDetailV3) => {
    setDetail(d);
    setCourses((prev) => prev.map((c) => (c.id === d.id
      ? { ...c, name: d.name, shortName: d.shortName, type: d.type, region: d.region, website: d.website, description: d.description, status: d.status, displayOrder: d.displayOrder, classCount: d.classes.length, currentSession: d.sessions.find((x) => x.status === 'current') ? { status: 'current', sessionId: d.sessions.find((x) => x.status === 'current')!.sessionId, code: d.sessions.find((x) => x.status === 'current')!.code, name: d.sessions.find((x) => x.status === 'current')!.name } : null }
      : c)));
  };

  const err = (e: any, fallback: string) => toast.error(e?.response?.data?.message || e?.message || fallback);

  const startCreate = () => {
    setCreating(true);
    setDetail(null);
    setForm({ code: '', name: '', shortName: '', type: 'board', region: '', website: '', description: '', status: 'active', displayOrder: courses.length });
  };

  const saveCourse = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(), shortName: form.shortName.trim() || null, type: form.type,
        region: form.region.trim() || null, website: form.website.trim() || null,
        description: form.description.trim() || null, status: form.status, displayOrder: Number(form.displayOrder) || 0,
      };
      if (creating) {
        const r = await v3.courses.create({ ...body, code: form.code.trim().toUpperCase() });
        toast.success('Course created');
        setCreating(false);
        setCourses((prev) => [...prev, r.data.data]);
        setSelectedId(r.data.data.id);
        refreshAfterWrite(r.data.data);
      } else if (selectedId != null) {
        const r = await v3.courses.update(selectedId, body);
        toast.success('Course updated');
        refreshAfterWrite(r.data.data);
      }
    } catch (e: any) { err(e, 'Save failed'); } finally { setSaving(false); }
  };

  const setSession = async (sessionId: number, status: string) => {
    if (selectedId == null) return;
    try {
      const r = await v3.courses.setSession(selectedId, { sessionId, status });
      toast.success('Session status updated');
      refreshAfterWrite(r.data.data);
    } catch (e: any) { err(e, 'Session update failed'); }
  };

  const linkSession = async () => {
    if (selectedId == null || !linkSessionId) return;
    await setSession(Number(linkSessionId), linkSessionStatus);
    setLinkSessionId('');
  };

  const linkClass = async () => {
    if (selectedId == null || !linkClassId) return;
    try {
      const r = await v3.courses.linkClass(selectedId, Number(linkClassId));
      toast.success('Class linked');
      refreshAfterWrite(r.data.data);
      setLinkClassId('');
    } catch (e: any) { err(e, 'Link failed'); }
  };

  const unlinkClass = async (classId: number, name: string) => {
    if (selectedId == null) return;
    if (!window.confirm(`Unlink “${name}” from this course? The link is deactivated (history kept), and the unlink is refused while active subjects exist.`)) return;
    try {
      const r = await v3.courses.unlinkClass(selectedId, classId);
      toast.success('Class unlinked');
      refreshAfterWrite(r.data.data as CourseDetailV3);
    } catch (e: any) { err(e, 'Unlink failed'); }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <PageHeader title="Courses" description="Loading…" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-40 animate-pulse bg-surface-50" />)}
        </div>
      </div>
    );
  }

  const linkedSessionIds = new Set((detail?.sessions ?? []).map((x) => x.sessionId));
  const linkedClassIds = new Set((detail?.classes ?? []).map((x) => x.classId));
  const unlinkedSessions = sessions.filter((x) => !linkedSessionIds.has(x.id));
  const unlinkedClasses = (catalog?.classes ?? []).filter((x) => !linkedClassIds.has(x.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <PageHeader
        title="Courses"
        description={canWrite ? 'Boards, publishers & programs — sessions and class links included.' : 'Course catalog (read-only — only Super Admins can edit).'}
        action={canWrite ? (
          <button className="btn-primary btn-sm" onClick={startCreate}><Plus className="h-4 w-4" /> New course</button>
        ) : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* list */}
        <div className="space-y-2">
          {courses.length === 0 && (
            <EmptyState icon={Landmark} title="No courses yet" description="Create the first board, publisher or program." />
          )}
          {courses.map((c) => (
            <button
              key={c.id} onClick={() => { setCreating(false); setSelectedId(c.id); }}
              className={clsx('card w-full p-4 text-left transition-all hover:shadow-md',
                selectedId === c.id && !creating && 'ring-2 ring-brand-500')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-extrabold text-brand-700">{c.code}</span>
                <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold', statusTint(c.status))}>{c.status}</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-surface-900">{c.name}</p>
              <p className="mt-0.5 text-[11px] capitalize text-surface-500">
                {c.type}{c.region ? ` · ${c.region}` : ''} · {c.classCount} classes · {c.subjectCount} subjects · {c.bookCount} books
              </p>
              <p className="mt-1 text-[11px] text-surface-400">
                Session: {c.currentSession ? <span className="font-semibold text-emerald-700">{c.currentSession.name}</span> : <span className="italic">none current</span>}
              </p>
            </button>
          ))}
        </div>

        {/* detail */}
        <div className="lg:col-span-2">
          {creating || detail ? (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-surface-900">{creating ? 'New course' : `Edit — ${detail?.code}`}</h3>
                  {creating && <button className="btn-ghost btn-sm" onClick={() => { setCreating(false); if (selectedId != null) loadDetail(selectedId); }}>Cancel</button>}
                </div>
                {detailLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label">Code *{!creating && ' (immutable)'}</label>
                        <input className="input font-mono" value={form.code} disabled={!creating || !canWrite}
                          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PTB" />
                      </div>
                      <div>
                        <label className="label">Name *</label>
                        <input className="input" value={form.name} disabled={!canWrite}
                          onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Punjab Textbook Board" />
                      </div>
                      <div>
                        <label className="label">Short name</label>
                        <input className="input" value={form.shortName} disabled={!canWrite}
                          onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Type</label>
                          <select className="input capitalize" value={form.type} disabled={!canWrite}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Status</label>
                          <select className="input capitalize" value={form.status} disabled={!canWrite}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            {STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label">Region</label>
                        <input className="input" value={form.region} disabled={!canWrite}
                          onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Punjab" />
                      </div>
                      <div>
                        <label className="label">Website</label>
                        <input className="input" value={form.website} disabled={!canWrite}
                          onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Description</label>
                        <textarea className="textarea" rows={2} value={form.description} disabled={!canWrite}
                          onChange={(e) => setForm({ ...form, description: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Display order</label>
                        <input className="input" type="number" value={form.displayOrder} disabled={!canWrite}
                          onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
                      </div>
                    </div>
                    {canWrite && (
                      <div className="mt-4 flex justify-end">
                        <button className="btn-primary" disabled={saving} onClick={saveCourse}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {creating ? 'Create course' : 'Save changes'}
                        </button>
                      </div>
                    )}
                    {!creating && (
                      <p className="mt-3 text-[11px] text-surface-400">
                        Courses are never deleted — archive one to retire it. Every change is written to the audit log.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* sessions + classes (existing courses only) */}
              {!creating && detail && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card p-5">
                    <h3 className="mb-3 font-bold text-surface-900">Sessions</h3>
                    <div className="space-y-2">
                      {detail.sessions.map((x) => (
                        <div key={x.sessionId} className="flex items-center gap-2 rounded-xl border border-surface-100 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-surface-800">{x.name}</p>
                            <p className="text-[10px] text-surface-400">{x.code} · {x.startYear}–{x.endYear}</p>
                          </div>
                          {canWrite ? (
                            <select className="input !w-auto !py-1 text-xs capitalize" value={x.status}
                              onChange={(e) => setSession(x.sessionId, e.target.value)}>
                              {SESSION_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          ) : (
                            <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', statusTint(x.status))}>{x.status}</span>
                          )}
                        </div>
                      ))}
                      {detail.sessions.length === 0 && <p className="text-xs text-surface-400">No sessions linked yet.</p>}
                    </div>
                    {canWrite && unlinkedSessions.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        <select className="input text-xs" value={linkSessionId} onChange={(e) => setLinkSessionId(e.target.value)}>
                          <option value="">Link a session…</option>
                          {unlinkedSessions.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}
                        </select>
                        <select className="input !w-auto text-xs capitalize" value={linkSessionStatus} onChange={(e) => setLinkSessionStatus(e.target.value)}>
                          {SESSION_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button className="btn-secondary btn-sm shrink-0" disabled={!linkSessionId} onClick={linkSession}>Link</button>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-surface-400">Exactly one session may be <span className="font-semibold">current</span> — the generator stamps it onto new papers.</p>
                  </div>

                  <div className="card p-5">
                    <h3 className="mb-3 font-bold text-surface-900">Classes</h3>
                    <div className="space-y-2">
                      {detail.classes.map((x) => (
                        <div key={x.classId} className="flex items-center gap-2 rounded-xl border border-surface-100 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-surface-800">{x.name}</p>
                            <p className="text-[10px] text-surface-400">{x.subjectCount} active subject{x.subjectCount === 1 ? '' : 's'}</p>
                          </div>
                          {canWrite && (
                            <button className="rounded-lg p-1.5 text-surface-400 hover:bg-rose-50 hover:text-rose-600" title="Unlink class"
                              onClick={() => unlinkClass(x.classId, x.name)}>
                              <Unlink className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {detail.classes.length === 0 && <p className="text-xs text-surface-400">No classes linked yet.</p>}
                    </div>
                    {canWrite && unlinkedClasses.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        <select className="input text-xs" value={linkClassId} onChange={(e) => setLinkClassId(e.target.value)}>
                          <option value="">Link a class…</option>
                          {unlinkedClasses.map((x) => <option key={x.id} value={x.id}>{x.className} (Grade {x.grade})</option>)}
                        </select>
                        <button className="btn-secondary btn-sm shrink-0" disabled={!linkClassId} onClick={linkClass}>Link</button>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-surface-400">Only linked classes appear in the generator for this course.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Landmark} title="Select a course" description="Pick a course from the list to view and edit it." />
          )}
        </div>
      </div>
    </div>
  );
}

