/**
 * PHASE 2 — Paper generator wizard (15 premium steps).
 *
 * Steps 1–8 scope (course → session → class → subject → book → chapters →
 * topics → exercises), 9–14 configuration (type, language, marks/time,
 * distribution builder, availability, selection incl. multi-paper), 15
 * preview + save/finalise/duplicate/PDF. Patterns can be saved from any
 * configured state and applied to pre-fill the whole wizard.
 *
 * Route: /app/papers/generate (preserved from Phase 1).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Copy, Download, Eye,
  FlaskConical, Loader2, Save, Sparkles,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { v2 } from '../../api/v2';
import { PageHeader } from '../../components/ui';
import type { GeneratedPaperSummary, GeneratePaperPayload, PaperV2, PatternV2 } from '../../types';
import type { WizardState } from './generate/state';
import { STEPS, TYPE_SHORT, distSum, emptyWizard, fmtDate, manualPickedCount } from './generate/state';
import ScopeSteps from './generate/stepsScope';
import {
  StepAvailability, StepDistribution, StepLanguage, StepMarks, StepSelection, StepType,
} from './generate/stepsBuild';
import { PaperDoc } from './generate/PaperDoc';
import { PrintSheet } from './PrintSheet';

export default function GeneratePaperPage() {
  const { user } = useAppSelector((s) => s.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [w, setW] = useState<WizardState>(() => emptyWizard(user?.schoolName ?? ''));
  const set = useCallback((p: Partial<WizardState>) => setW((prev) => ({ ...prev, ...p })), []);
  const [patterns, setPatterns] = useState<PatternV2[]>([]);
  const [patternModal, setPatternModal] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [patternDesc, setPatternDesc] = useState('');
  const [patternShared, setPatternShared] = useState(false);

  // generation results (step 15)
  const [generated, setGenerated] = useState<GeneratedPaperSummary[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [papers, setPapers] = useState<Record<number, PaperV2>>({});
  const [viewIdx, setViewIdx] = useState(0);
  const [showKey, setShowKey] = useState(false);
  const [printPaper, setPrintPaper] = useState<PaperV2 | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const step = w.step;
  const stepDef = STEPS[step - 1];
  const canLeave = stepDef?.canLeave(w) ?? false;
  const inScope = step >= 1 && step <= 8;

  const listPatterns = () =>
    v2.patterns.list().then((r) => setPatterns(r.data.data as PatternV2[])).catch(() => undefined);

  useEffect(() => { listPatterns(); }, []);

  // deep link: /app/papers/generate?pattern=<id> pre-fills the whole wizard
  const appliedRef = useRef(false);
  useEffect(() => {
    if (appliedRef.current) return;
    const pid = new URLSearchParams(location.search).get('pattern');
    if (!pid) return;
    appliedRef.current = true;
    if (!patterns.length) {
      v2.patterns.get(Number(pid)).then((r) => {
        const p = r.data.data as PatternV2;
        if (p) { applyPattern(p); navigate('/app/papers/generate', { replace: true }); }
      }).catch(() => navigate('/app/papers/generate', { replace: true }));
      return;
    }
    const p = patterns.find((x) => x.id === Number(pid));
    if (p) applyPattern(p);
    navigate('/app/papers/generate', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns]);

  // ═══ navigation ══════════════════════════════════════════════════════════
  const go = (n: number) => {
    if (n < 1 || n > 15) return;
    if (n > step) {
      for (let i = step; i < n; i += 1) {
        if (!STEPS[i - 1].canLeave(w)) {
          toast.error(`Step ${i} (${STEPS[i - 1].label}) is incomplete`);
          return;
        }
      }
    }
    set({ step: n });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ═══ generation ══════════════════════════════════════════════════════════
  const buildPayload = (): GeneratePaperPayload => ({
    courseId: w.courseId,
    sessionId: w.sessionId,
    classId: w.classId!,
    subjectIds: w.subjectIds,
    bookId: w.bookId,
    chapterIds: w.chapterIds,
    topicIds: w.topicIds,
    exerciseIds: w.exerciseIds,
    paperType: w.paperType,
    language: w.language,
    totalMarks: w.totalMarks,
    distribution: w.distribution.filter((d) => d.count > 0)
      .map((d) => ({ type: d.type, count: d.count, marks: d.marks, difficulty: d._diff })),
    timeLimit: w.timeLimit,
    paperCount: w.paperCount,
    autoSelect: w.autoSelect,
    title: w.title.trim() || undefined,
    examTitle: w.examTitle.trim() || undefined,
    description: w.description.trim() || undefined,
    ...(!w.autoSelect && {
      questionIds: w.distribution.filter((d) => d.count > 0)
        .flatMap((d) => w.manualIds[d.type] ?? []),
    }),
  });

  const loadPaper = async (id: number, silent = false) => {
    try {
      const res = await v2.papers.get(id);
      setPapers((prev) => ({ ...prev, [id]: res.data.data }));
      return res.data.data as PaperV2;
    } catch (e: any) {
      if (!silent) toast.error(e?.message || 'Failed to load paper');
      return null;
    }
  };

  const runGenerate = async () => {
    if (w.classId == null || !w.chapterIds.length) { toast.error('Finish the scope steps first'); return; }
    if (!w.autoSelect && manualPickedCount(w) === 0) { toast.error('Pick questions manually or switch to Auto select'); return; }
    if (distSum(w) !== w.totalMarks) { toast.error('Distribution must sum to the total marks'); return; }
    setGenerating(true);
    try {
      const res = await v2.papers.generate(buildPayload());
      const data = res.data.data as { papers: GeneratedPaperSummary[]; warnings: string[] };
      setGenerated(data.papers);
      setWarnings(data.warnings ?? []);
      setPapers({});
      setViewIdx(0);
      if (data.papers[0]) await loadPaper(data.papers[0].id, true);
      set({ step: 15 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`${data.papers.length} paper(s) generated as draft`);
    } catch (e: any) {
      const body = e?.response?.data;
      const msg = body?.message || e?.message || 'Generation failed';
      const d = body?.details;
      if (d?.shortages?.length) {
        toast.error(`Insufficient approved questions: ${d.shortages.join('; ')}`);
      } else if (Array.isArray(d)) {
        toast.error(`${msg} ${d.map((x) => JSON.stringify(x)).join(' · ')}`);
      } else {
        toast.error(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const viewPaper = papers[generated[viewIdx]?.id ?? -1] ?? null;

  const persistMeta = async (only: GeneratedPaperSummary[]) => {
    setSavingMeta(true);
    try {
      for (const g of only.length ? only : generated) {
        const p = papers[g.id];
        if (!p) continue;
        await v2.papers.update(g.id, {
          title: p.title, examTitle: p.examTitle ?? undefined, status: p.status,
        });
        const schoolName = ((p.formatting as any)?.schoolName ?? '').trim() || null;
        await v2.papers.updateFormatting(g.id, { schoolName });
      }
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save paper details');
      return false;
    } finally {
      setSavingMeta(false);
    }
  };

  const finalise = async () => {
    const ok = await persistMeta(generated);
    if (!ok) return;
    try {
      for (const g of generated) await v2.papers.update(g.id, { status: 'final' });
      for (const g of generated) await loadPaper(g.id, true);
      toast.success(`${generated.length} paper(s) marked as final`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to finalise paper');
    }
  };

  const duplicateCurrent = async () => {
    const g = generated[viewIdx];
    if (!g) return;
    try {
      const res = await v2.papers.duplicate(g.id);
      const dup = res.data.data as PaperV2;
      setGenerated((prev) => (prev.some((x) => x.id === dup.id)
        ? prev
        : [...prev, { id: dup.id, title: dup.title, totalMarks: dup.totalMarks, paperType: dup.paperType, questionCount: dup.questions?.length ?? 0, paperIndex: prev.length + 1, paperCount: prev.length + 1 }]));
      toast.success('Duplicated as draft');
    } catch (e: any) {
      toast.error(e?.message || 'Duplicate failed');
    }
  };

  // ═══ patterns ════════════════════════════════════════════════════════════
  const patternConfig = () => ({
    courseId: w.courseId, sessionId: w.sessionId, classId: w.classId,
    subjectIds: w.subjectIds, bookId: w.bookId, chapterIds: w.chapterIds,
    topicIds: w.topicIds, exerciseIds: w.exerciseIds,
    paperType: w.paperType, language: w.language, totalMarks: w.totalMarks,
    distribution: w.distribution.filter((d) => d.count > 0)
      .map((d) => ({ type: d.type, count: d.count, marks: d.marks, difficulty: d._diff })),
    timeLimit: w.timeLimit, paperCount: w.paperCount,
    autoSelect: w.autoSelect, manualIds: w.manualIds, schoolName: w.schoolName,
  });

  const savePattern = async () => {
    if (!patternName.trim()) { toast.error('Pattern name is required'); return; }
    try {
      await v2.patterns.create({
        name: patternName.trim(), description: patternDesc.trim() || undefined,
        config: patternConfig(), isShared: patternShared,
      });
      toast.success('Pattern saved');
      setPatternModal(false);
      setPatternName(''); setPatternDesc(''); setPatternShared(false);
      listPatterns();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save pattern');
    }
  };

  const applyPattern = async (p: PatternV2) => {
    try {
      const cfg = (p.config ?? {}) as Record<string, any>;
      const next: Partial<WizardState> = {
        courseId: cfg.courseId, sessionId: cfg.sessionId, classId: cfg.classId,
        subjectIds: cfg.subjectIds ?? [], bookId: cfg.bookId,
        chapterIds: cfg.chapterIds ?? [], topicIds: cfg.topicIds ?? [], exerciseIds: cfg.exerciseIds ?? [],
        paperType: cfg.paperType ?? 'mixed', language: cfg.language ?? 'english',
        totalMarks: cfg.totalMarks ?? 75, timeLimit: cfg.timeLimit ?? 90,
        paperCount: cfg.paperCount ?? 1, autoSelect: cfg.autoSelect !== false,
        manualIds: cfg.manualIds ?? {}, schoolName: cfg.schoolName ?? user?.schoolName ?? '',
        distribution: (cfg.distribution ?? []).map((d: any) => ({
          type: d.type, count: d.count, marks: d.marks,
          difficulty: d.difficulty === 'any' ? undefined : d.difficulty,
          _diff: d.difficulty ?? 'any',
        })),
        title: '', examTitle: '', description: '',
        step: 14,
      };
      set(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Pattern “${p.name}” applied — review & generate`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to apply pattern');
    }
  };

  const removePattern = async (p: PatternV2) => {
    if (!window.confirm(`Delete pattern “${p.name}”?`)) return;
    try { await v2.patterns.remove(p.id); listPatterns(); toast.success('Pattern deleted'); }
    catch (e: any) { toast.error(e?.message || 'Delete failed'); }
  };

  // ═══ render ══════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title="Paper Generator"
        description="Premium 15-step flow — scope, configure, check availability, select, preview, save."
        action={(
          <button className="btn-ghost btn-sm" onClick={() => setPatternModal(true)}>
            <Save className="w-4 h-4" /> Save as pattern
          </button>
        )}
      />

      {/* patterns strip */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold text-surface-400 uppercase tracking-wide flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Patterns
        </span>
        {patterns.length === 0 && <span className="text-xs text-surface-400">None yet — configure once, then “Save as pattern”.</span>}
        {patterns.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 text-xs font-semibold bg-surface-100 text-surface-700 rounded-full py-1 pl-2 pr-1">
            {p.isShared && <span className="text-[9px] font-extrabold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">shared</span>}
            <button type="button" className="hover:text-brand-700 font-bold" title="Apply this pattern (pre-fills all steps)" onClick={() => applyPattern(p)}>
              {p.name}
            </button>
            {p.ownerName && p.ownerName !== user?.name && <span className="text-surface-400 font-normal">· {p.ownerName}</span>}
            <button type="button" className="p-1 text-surface-400 hover:text-rose-500" title="Delete pattern" onClick={() => removePattern(p)}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
        ))}
      </div>

      {/* step rail */}
      <div className="card p-3 mb-4 overflow-x-auto no-print">
        <div className="flex items-center min-w-max gap-1">
          {STEPS.map((s) => {
            const past = s.n < step;
            const current = s.n === step;
            return (
              <button key={s.n} type="button"
                onClick={() => s.n <= step && go(s.n)}
                className={clsx('flex flex-col items-center px-2.5 py-1.5 rounded-xl transition-all min-w-[52px]', s.n <= step ? 'hover:bg-surface-50 cursor-pointer' : 'cursor-not-allowed opacity-35')}>
                <span className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold mb-1 border-2',
                  current ? 'bg-brand-600 border-brand-600 text-white shadow-brand'
                    : past ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-white border-surface-200 text-surface-400')}>
                  {past ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
                </span>
                <span className={clsx('text-[9.5px] font-bold uppercase tracking-wide', current ? 'text-brand-700' : 'text-surface-500')}>
                  {s.label.length > 9 ? `${s.label.slice(0, 8)}…` : s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* step content */}
      <div className="card p-5 md:p-7 mb-4 animate-fade-in" key={`step-${step}`}>
        {inScope && <ScopeSteps w={w} set={set} onEnter={(n) => go(n)} />}
        {step === 9 && <StepType w={w} set={set} />}
        {step === 10 && <StepLanguage w={w} set={set} />}
        {step === 11 && <StepMarks w={w} set={set} />}
        {step === 12 && <StepDistribution w={w} set={set} />}
        {step === 13 && <StepAvailability w={w} set={set} />}
        {step === 14 && <StepSelection w={w} set={set} />}
        {step === 15 && <StepPreview />}
      </div>

      {/* bottom nav */}
      {step < 15 && (
        <div className="flex items-center justify-between gap-3">
          <button className="btn-ghost" disabled={step <= 1} onClick={() => go(step - 1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step === 14 ? (
            <button className="btn-primary" disabled={generating} onClick={runGenerate}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              {generating ? 'Generating…' : `Generate ${w.paperCount > 1 ? `${w.paperCount} papers` : 'paper'} & preview`}
            </button>
          ) : (
            <button className={clsx('btn-primary', !canLeave && 'opacity-40')}
              onClick={() => { if (!canLeave) { toast.error(`Step ${step} (${stepDef.label}) is incomplete`); return; } go(step + 1); }}>
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* pattern modal */}
      {patternModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setPatternModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 animate-slide-down">
            <h3 className="font-bold text-lg">Save configuration as pattern</h3>
            <p className="text-xs text-surface-500 mb-4">Scope + distribution reusable in one click. Private unless shared.</p>
            <label className="label">Name *</label>
            <input className="input mb-3" placeholder="e.g. Grade 9 Math — Mixed 75" value={patternName} onChange={(e) => setPatternName(e.target.value)} />
            <label className="label">Description</label>
            <textarea className="textarea mb-3" rows={2} placeholder="Optional note…" value={patternDesc} onChange={(e) => setPatternDesc(e.target.value)} />
            <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 mb-4">
              <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={patternShared} onChange={(e) => setPatternShared(e.target.checked)} />
              Share with teachers in your organisation
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setPatternModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={savePattern}><Save className="w-4 h-4" /> Save pattern</button>
            </div>
          </div>
        </div>
      )}

      {/* print sheet */}
      {printPaper && <PrintSheet paper={printPaper} onClose={() => setPrintPaper(null)} />}
    </div>
  );

  // ─── step 15 ──────────────────────────────────────────────────────────────
  function StepPreview() {
    return (
      <div className="space-y-4">
        {warnings.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" /> Honest pool warnings
            </p>
            <ul className="list-disc ml-5 text-xs text-amber-700 space-y-0.5">{warnings.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}

        {!generated.length ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm text-surface-500">Nothing generated yet — run generation from step 14.</p>
            <button className="btn-primary btn-sm" onClick={() => go(14)}>Back to selection</button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-surface-400 uppercase tracking-wide">Batch ({generated.length})</span>
              {generated.map((g, i) => (
                <button key={g.id} type="button"
                  onClick={() => { setViewIdx(i); if (!papers[g.id]) loadPaper(g.id); }}
                  className={clsx('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                    i === viewIdx ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-surface-200 text-surface-600 hover:border-brand-300')}>
                  {generated.length > 1 ? `Paper ${i + 1}` : 'Paper'} · {g.totalMarks} marks
                </button>
              ))}
            </div>

            {!viewPaper ? (
              <div className="flex items-center gap-2 justify-center py-6 text-surface-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading paper preview…
              </div>
            ) : (
              <>
                {/* meta editing */}
                <div className="card p-4 grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Paper title</label>
                    <input className="input" value={viewPaper.title}
                      onChange={(e) => setPapers((prev) => ({ ...prev, [viewPaper.id]: { ...viewPaper, title: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="label">Exam title (printed header)</label>
                    <input className="input" placeholder="e.g. Class 9 — Mid Term Examination"
                      value={viewPaper.examTitle ?? ''}
                      onChange={(e) => setPapers((prev) => ({ ...prev, [viewPaper.id]: { ...viewPaper, examTitle: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="label">School name (printed header)</label>
                    <input className="input"
                      value={(viewPaper.formatting as any)?.schoolName ?? ''}
                      placeholder={user?.schoolName ?? 'School name'}
                      onChange={(e) => setPapers((prev) => ({
                        ...prev,
                        [viewPaper.id]: { ...viewPaper, formatting: { ...(viewPaper.formatting ?? {}), schoolName: e.target.value } },
                      }))} />
                  </div>
                  <div className="flex items-end">
                    <p className="text-xs text-surface-400">
                      {viewPaper.className} · {viewPaper.courseName ?? ''} · {viewPaper.medium} · {viewPaper.timeLimit ?? 90} min ·
                      {viewPaper.paperType} · created {fmtDate(viewPaper.createdAt)}
                    </p>
                  </div>
                </div>

                {/* composition chips */}
                <div className="flex flex-wrap gap-2 items-center">
                  {groupCounts(viewPaper).map(([t, n, m]) => (
                    <span key={t} className="text-xs font-bold bg-surface-100 text-surface-600 px-2.5 py-1 rounded-full">
                      {TYPE_SHORT[t]} × {n} @ {m} = {n * m}
                    </span>
                  ))}
                  <span className={clsx('text-xs font-extrabold px-2.5 py-1 rounded-full',
                    sumMarks(viewPaper) === viewPaper.totalMarks ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                    Σ {sumMarks(viewPaper)} / {viewPaper.totalMarks} marks
                  </span>
                </div>

                {/* doc */}
                <div className="rounded-2xl border border-surface-200 bg-surface-100/60 p-3 md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 no-print">
                    <div className="flex items-center gap-2">
                      <button className={clsx('btn-sm', showKey ? 'btn-primary' : 'btn-ghost')} onClick={() => setShowKey(!showKey)}>
                        <Eye className="w-4 h-4" /> {showKey ? 'Answer key on' : 'Answer key'}
                      </button>
                      <span className="text-[11px] text-surface-400">bubble letters · matching columns · Urdu RTL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost btn-sm" onClick={duplicateCurrent}><Copy className="w-4 h-4" /> Duplicate</button>
                      <button className="btn-secondary btn-sm" onClick={() => setPrintPaper(viewPaper)}>
                        <Download className="w-4 h-4" /> Print / PDF
                      </button>
                    </div>
                  </div>
                  <PaperDoc paper={viewPaper} showKey={showKey} />
                </div>

                {/* save row */}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button className="btn-ghost" onClick={() => go(14)}><ArrowLeft className="w-4 h-4" /> Adjust selection</button>
                  <button className="btn-ghost" disabled={savingMeta}
                    onClick={async () => { if (await persistMeta(generated)) toast.success('Details saved'); }}>
                    {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save details
                  </button>
                  <button className="btn-success" disabled={viewPaper.status === 'final'} onClick={finalise}>
                    <CheckCircle2 className="w-4 h-4" />
                    {viewPaper.status === 'final' ? 'Paper is final' : `Mark ${generated.length > 1 ? `all ${generated.length}` : 'paper'} as final`}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────
const groupCounts = (p: PaperV2): Array<[string, number, number]> => {
  const by = new Map<string, { n: number; m: number }>();
  (p.questions ?? []).forEach((q) => {
    const t = q.snapshotType || q.type;
    const cur = by.get(t) ?? { n: 0, m: q.marks ?? 1 };
    cur.n += 1;
    by.set(t, cur);
  });
  return [...by.entries()].map(([t, v]) => [t, v.n, v.m]);
};
const sumMarks = (p: PaperV2) => (p.questions ?? []).reduce((a, q) => a + (q.marks ?? 1), 0);
