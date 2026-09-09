/**
 * PHASE 2 — Paper detail / editor (v2).
 *
 * Full paper view (document render), meta editing, status (draft → final),
 * per-question replace / remove / reorder persisted through
 * PUT /v2/papers/:id/questions (server revalidates scope + approval), and
 * print/PDF export. Editing is disabled once a paper is final.
 *
 * Route: /app/papers/:id (preserved from Phase 1).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  ArrowDown, ArrowLeft, ArrowUp, Brush, CheckCircle2, Copy, Download, Eye,
  FileText, Loader2, Lock, Pencil, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v2 } from '../../api/v2';
import { v3 } from '../../api/v3';
import { EmptyState, PageHeader, Skeleton } from '../../components/ui';
import PaperBrandingModal from '../../components/papers/PaperBrandingModal';
import type { PaperV2, QuestionRowV2 } from '../../types';
import { TYPE_LABELS, TYPE_SHORT, fmtDate, optionEntries } from './generate/state';
import { PaperDoc } from './generate/PaperDoc';
import CourseLogo from '../../components/common/CourseLogo';
import { PrintSheet } from './PrintSheet';

export default function PaperDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role !== 'teacher';
  const paperId = Number(id);

  const [paper, setPaper] = useState<PaperV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [print, setPrint] = useState<PaperV2 | null>(null);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [replaceFor, setReplaceFor] = useState<{ pqOrder: number; qid: number; type: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await v2.papers.get(paperId);
      setPaper(res.data.data);
    } catch (e: any) {
      toast.error(e?.message || 'Paper not found');
      navigate('/app/papers');
    } finally {
      setLoading(false);
    }
  }, [paperId, navigate]);

  useEffect(() => { if (paperId) load(); }, [load, paperId]);

  const qs = paper?.questions ?? [];
  const editable = paper?.status !== 'final';

  const patchPaper = (p: Partial<PaperV2>) => setPaper((prev) => (prev ? { ...prev, ...p } : prev));

  const saveMeta = async () => {
    if (!paper) return;
    setBusy(true);
    try {
      await v2.papers.update(paper.id, { title: paper.title, examTitle: paper.examTitle ?? undefined });
      const schoolName = ((paper.formatting as any)?.schoolName ?? '').trim() || null;
      await v2.papers.updateFormatting(paper.id, { schoolName });
      toast.success('Details saved');
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally { setBusy(false); }
  };

  const changeStatus = async (status: 'draft' | 'final' | 'archived') => {
    if (!paper) return;
    setBusy(true);
    try {
      await v2.papers.update(paper.id, { status });
      toast.success(status === 'final' ? 'Paper finalised' : `Status → ${status}`);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Status change failed');
    } finally { setBusy(false); }
  };

  /** persist a new question order (with per-question marks) */
  const saveQuestions = async (ordered: typeof qs, marksOverride?: Record<number, number>) => {
    if (!paper) return;
    setBusy(true);
    try {
      const marksBy: Record<string, number> = {};
      ordered.forEach((q) => { marksBy[String(q.questionId)] = marksOverride?.[q.questionId] ?? q.marks ?? 1; });
      await v2.papers.replaceQuestions(paper.id, { questionIds: ordered.map((q) => q.questionId), marksByQuestion: marksBy });
      // keep header total consistent with the live sum
      const sum = ordered.reduce((a, q) => a + (marksOverride?.[q.questionId] ?? q.marks ?? 1), 0);
      if (sum !== paper.totalMarks) await v2.papers.update(paper.id, { totalMarks: sum }).catch(() => undefined);
      toast.success('Paper questions saved');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Save failed');
    } finally { setBusy(false); }
  };

  const removeQ = async (order: number) => {
    const target = qs.find((q) => q.order === order);
    if (!target) return;
    if (!window.confirm(`Remove this question (${TYPE_SHORT[target.snapshotType || target.type]}, ${target.marks} mark${target.marks === 1 ? '' : 's'})?`)) return;
    await saveQuestions(qs.filter((q) => q.order !== order));
  };

  const moveQ = (order: number, dir: -1 | 1) => {
    const idx = qs.findIndex((q) => q.order === order);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= qs.length) return;
    const copy = [...qs];
    const tmp = copy[idx].order;
    copy[idx] = { ...copy[idx], order: copy[j].order };
    copy[j] = { ...copy[j], order: tmp };
    copy.sort((a, b) => a.order - b.order);
    saveQuestions(copy);
  };

  const duplicatePaper = async () => {
    if (!paper) return;
    setBusy(true);
    try {
      const res = await v2.papers.duplicate(paper.id);
      const dup = res.data.data as PaperV2;
      toast.success('Duplicated as draft');
      navigate(`/app/papers/${dup.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Duplicate failed');
    } finally { setBusy(false); }
  };

  const deletePaper = async () => {
    if (!paper) return;
    if (!window.confirm(`Delete paper “${paper.title}” permanently?`)) return;
    setBusy(true);
    try {
      await v2.papers.remove(paper.id);
      toast.success('Paper deleted');
      navigate('/app/papers');
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    } finally { setBusy(false); }
  };

  const groupKey = useMemo(() => {
    const m = new Map<string, number>();
    qs.forEach((q) => { const t = q.snapshotType || q.type; m.set(t, (m.get(t) ?? 0) + 1); });
    return m;
  }, [qs]);

  // ── Phase-3: watermark overlay from the paper branding snapshot ──
  const wm = ((paper?.formatting as any)?.branding?.watermark ?? {}) as any;
  const wmOn = Boolean(wm.enabled);
  const wmOpacity = Number(wm.opacity ?? 0.07);
  const wmSize = Number(wm.size ?? 45);
  const wmPosition = String(wm.position ?? 'center');
  const wmLogo = ((paper?.formatting as any)?.schoolLogoUrl ?? null) as string | null;
  const wmImgSrc = wmLogo ? (wmLogo.startsWith('/api/') ? wmLogo : v3.schools.logoUrl((paper as any).schoolId ?? 0)) : '';
  const wmPosStyle: Record<string, string> = {};
  if (wmPosition.includes('top')) wmPosStyle.top = '4%';
  else if (wmPosition.includes('bottom')) wmPosStyle.bottom = '4%';
  else wmPosStyle.top = '42%';
  if (wmPosition.includes('right')) wmPosStyle.right = '3%';
  else wmPosStyle.left = '3%';

  if (loading || !paper) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <PageHeader title="Paper" description="Loading…" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <PageHeader
        title={paper.title || 'Untitled paper'}
        description={`#${paper.id} · ${paper.className} · ${paper.paperType} · ${paper.medium} · created ${fmtDate(paper.createdAt)} by ${paper.teacherName}`}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn-ghost btn-sm" to="/app/papers"><ArrowLeft className="w-4 h-4" /> My papers</Link>
            <button className="btn-ghost btn-sm" onClick={duplicatePaper} disabled={busy}><Copy className="w-4 h-4" /> Duplicate</button>
            <button className="btn-secondary btn-sm" onClick={() => setBrandingOpen(true)}><Brush className="w-4 h-4" /> Branding</button>
            <button className="btn-secondary btn-sm" onClick={() => setPrint(paper)}><Download className="w-4 h-4" /> Print / PDF</button>
            {!editable ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-4 h-4" /> Final</span>
            ) : (
              <>
                <button className="btn-success btn-sm" onClick={() => changeStatus('final')} disabled={busy}><CheckCircle2 className="w-4 h-4" /> Save as final</button>
              </>
            )}
            {isAdmin && <button className="btn-danger btn-sm" onClick={deletePaper} disabled={busy}><Trash2 className="w-4 h-4" /></button>}
          </div>
        )}
      />

      {/* meta card */}
      <div className="card p-4 grid md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={paper.title} onChange={(e) => patchPaper({ title: e.target.value })} disabled={!editable} />
        </div>
        <div>
          <label className="label">Exam title (printed)</label>
          <input className="input" value={paper.examTitle ?? ''} onChange={(e) => patchPaper({ examTitle: e.target.value })} disabled={!editable} placeholder="e.g. Class 9 Mid Term" />
        </div>
        <div>
          <label className="label">School name (printed header)</label>
          <input className="input" value={(paper.formatting as any)?.schoolName ?? ''}
            onChange={(e) => patchPaper({ formatting: { ...(paper.formatting ?? {}), schoolName: e.target.value } })}
            disabled={!editable} placeholder={user?.schoolName ?? 'School name'} />
        </div>
        <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-surface-400">
            {(paper.subjects ?? []).map((s) => s.name).join(', ') || '—'} · {paper.courseCode && <CourseLogo code={paper.courseCode} size="xs" style={{ verticalAlign: '-0.22em' }} />} {paper.courseName ?? ''} · {paper.timeLimit ?? 90} min · {paper.totalMarks} marks · Σ {qs.reduce((a, q) => a + (q.marks ?? 1), 0)}
            {paper.settings && <> · config snapshot: {paper.settings.questionCount} Qs</>}
          </p>
          <div className="flex items-center gap-2">
            {editable && <button className="btn-primary btn-sm" disabled={busy} onClick={saveMeta}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />} Save details</button>}
            <button className={clsx('btn-sm', showKey ? 'btn-primary' : 'btn-ghost')} onClick={() => setShowKey(!showKey)}><Eye className="w-4 h-4" /> Answer key</button>
          </div>
        </div>
      </div>

      {!editable && (
        <div className="rounded-xl bg-surface-100 border border-surface-200 px-4 py-2.5 text-xs font-semibold text-surface-500 flex items-center gap-2 mb-4">
          <Lock className="w-3.5 h-3.5" /> Final papers are read-only. Duplicate to keep editing a copy.
        </div>
      )}

      {/* question composer (reorder/remove) */}
      {qs.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm">Questions ({qs.length})</p>
            <p className="text-[11px] text-surface-400">Use arrows to reorder; replace swaps in a fresh approved question of the same type.</p>
          </div>
          <div className="space-y-1.5">
            {qs.map((q, i) => {
              const t = q.snapshotType || q.type;
              const g = [...groupKey.entries()].findIndex(([k]) => k === t) + 1;
              const noInSection = qs.filter((x, xi) => (x.snapshotType || x.type) === t && xi <= i).length;
              return (
                <div key={q.paperQuestionId} className={clsx('flex items-start gap-2 px-3 py-2 rounded-xl border border-surface-100 hover:border-surface-200 transition-colors',
                  !q.isSelected && 'opacity-60')}>
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    {editable && (
                      <>
                        <button className="btn-ghost p-0.5 text-surface-400 disabled:opacity-30" disabled={i === 0} onClick={() => moveQ(q.order, -1)} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button className="btn-ghost p-0.5 text-surface-400 disabled:opacity-30" disabled={i === qs.length - 1} onClick={() => moveQ(q.order, 1)} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                  <span className="mt-1 text-[11px] font-extrabold bg-surface-100 text-surface-500 rounded px-1.5 py-0.5 flex-shrink-0">S{g} Q{noInSection}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-700 leading-snug line-clamp-2">{q.text}</p>
                    {q.type === 'mcq' && optionEntries(q.options).length > 0 && (
                      <p className="text-[10.5px] text-surface-400">{optionEntries(q.options).map(([l]) => l).join(' · ')} options{q.answer ? ` · key ${q.answer}` : ''}</p>
                    )}
                    <p className="text-[10.5px] text-surface-400 mt-0.5">
                      {TYPE_LABELS[t] ?? t} · {q.difficulty} · {q.language} · snapshot{q.snapshotType && q.snapshotType !== q.type ? ' (bank type changed since)' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-surface-700 flex-shrink-0">{q.marks}</span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {editable && (
                      <>
                        <button className="btn-ghost btn-icon" title="Replace with another approved question" onClick={() => setReplaceFor({ pqOrder: q.order, qid: q.questionId, type: t })}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button className="btn-ghost btn-icon text-rose-500" title="Remove from paper" onClick={() => removeQ(q.order)}><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* document */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400">Document preview {wmOn ? '· watermark on' : ''}</p>
        {wmOn && (
          <span className="badge badge-brand">WM {Math.round(wmOpacity * 100)}% · {String(wmPosition).replace('-', ' ')}</span>
        )}
      </div>
      <div className="rounded-2xl border border-surface-200 bg-surface-100/60 p-3 md:p-5">
        {wmOn && wmLogo ? (
          <div className="relative">
            <img src={wmImgSrc} alt="watermark" aria-hidden
              className="pointer-events-none select-none"
              style={{ opacity: wmOpacity, width: `${wmSize}%`, maxWidth: 420, position: 'absolute', objectFit: 'contain', zIndex: 2, ...wmPosStyle }} />
            <div className="relative z-0"><PaperDoc paper={paper} showKey={showKey} /></div>
          </div>
        ) : (
          <PaperDoc paper={paper} showKey={showKey} />
        )}
      </div>

      {qs.length === 0 && (
        <EmptyState icon={FileText} title="Paper has no questions" description="It may have been regenerated mid-edit — go back to the wizard and generate again." />
      )}

      {replaceFor && <ReplaceModal paper={paper} replaceFor={replaceFor}
        onCancel={() => setReplaceFor(null)}
        onDone={async (newQid) => {
          const ordered = qs.map((q) => (q.order === replaceFor.pqOrder ? { ...q, questionId: newQid } : q));
          setReplaceFor(null);
          await saveQuestions(ordered);
        }} />}

      {print && <PrintSheet paper={print} onClose={() => setPrint(null)} />}
      {brandingOpen && paper && (
        <PaperBrandingModal paperId={paper.id} onClose={() => setBrandingOpen(false)} onSaved={load} />
      )}
    </div>
  );
}

// ─── replace-question modal ─────────────────────────────────────────────────
function ReplaceModal({ paper, replaceFor, onCancel, onDone }: {
  paper: PaperV2; replaceFor: { pqOrder: number; qid: number; type: string };
  onCancel: () => void; onDone: (qid: number) => void;
}) {
  const [cands, setCands] = useState<QuestionRowV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pick, setPick] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        const out: QuestionRowV2[] = [];
        const chapters = paper.chapters.map((c) => c.id);
        const exclude = new Set(paper.questions.map((q) => q.questionId));
        await Promise.all(chapters.map(async (chapterId) => {
          let page = 1; let total = Infinity;
          while (out.length < 300 && out.length < total) {
            const f: Record<string, any> = { status: 'approved', chapterId, type: replaceFor.type, limit: 100, page };
            if (paper.medium === 'english' || paper.medium === 'urdu') f.language = paper.medium;
            const res = await v2.questions.list(f);
            const rows = res.data.data as QuestionRowV2[];
            total = (res.data as any)?.pagination?.total ?? rows.length;
            rows.forEach((r) => { if (!exclude.has(r.id)) out.push(r); });
            if (rows.length < 100) break;
            page += 1;
          }
        }));
        if (live) setCands(out);
      } catch {
        if (live) toast.error('Failed to load replacement candidates');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [paper, replaceFor]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? cands.filter((c) => (c.text || '').toLowerCase().includes(term) || (c.chapterName || '').toLowerCase().includes(term))
      : cands;
  }, [cands, search]);

  const doReplace = async () => {
    if (pick == null) return;
    setSaving(true);
    try { await onDone(pick); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div ref={canvasRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[86vh] flex flex-col animate-slide-down">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div>
            <h3 className="font-bold">Replace question</h3>
            <p className="text-xs text-surface-500">Swap in another approved question of type “{TYPE_LABELS[replaceFor.type] ?? replaceFor.type}” from this paper's chapters. Marks/order are preserved.</p>
          </div>
          <button className="btn-ghost p-1.5" onClick={onCancel}><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-3 border-b border-surface-100">
          <div className="relative">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9" placeholder="Search candidates…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <p className="text-[11px] text-surface-400 mt-2">{loading ? 'Loading…' : `${cands.length} candidates (other questions already on this paper are excluded)`}</p>
        </div>
        <div className="flex-1 overflow-auto px-5 py-3 divide-y divide-surface-100">
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-surface-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading candidates…</div>
          ) : shown.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-10">No other approved {replaceFor.type} questions in this paper's chapters.</p>
          ) : shown.map((c) => (
            <button key={c.id} type="button"
              onClick={() => setPick(c.id)}
              className={clsx('w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-3', pick === c.id ? 'bg-brand-50 ring-1 ring-brand-400' : 'hover:bg-surface-50')}>
              <span className={clsx('mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center', pick === c.id ? 'border-brand-600' : 'border-surface-300')}>
                {pick === c.id && <span className="w-2 h-2 rounded-full bg-brand-600" />}
              </span>
              <span>
                <span className="block text-xs text-surface-800 leading-snug">{c.text}</span>
                <span className="text-[10.5px] text-surface-400">Ch {c.chapterNumber ?? '—'} {c.chapterName ? `· ${c.chapterName}` : ''} · {c.difficulty} · {c.language}{c.answer ? ` · key ${c.answer}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={pick == null || saving} onClick={doReplace}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Replace
          </button>
        </div>
      </div>
    </div>
  );
}
