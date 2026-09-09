/**
 * PHASE 4 — Paper generator wizard (5 steps).
 *
 * Step 1 Scope (course → class → subject → book) · 2 Chapters (+ exercise
 * drill-in) · 3 Type & marks (paper type, language, totals, breakdown) ·
 * 4 Questions (auto-pool review, shuffle, manual add) · 5 Review (branded
 * preview, edit/print/PDF/save/finalise).
 *
 * Phase-4 decisions: single subject per paper, one paper per run, no session
 * step (the server stamps the course's current session), topics hidden from
 * the wizard. Saved patterns from the old 15-step wizard still apply.
 *
 * Route: /app/papers/generate (preserved from Phase 1/2).
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  ArrowLeft, ArrowRight, CheckCircle2, FlaskConical, Loader2, Save, Sparkles,
} from 'lucide-react';
import { useAppSelector } from '../../../store/hooks';
import { v2 } from '../../../api/v2';
import { PageHeader } from '../../../components/ui';
import type { GenerateResult, PaperV2, PatternV2 } from '../../../types';
import { StepHeading } from '../shared/wizUI';
import { PrintSheet } from '../PrintSheet';
import type { W5State } from './wizard5';
import { STEPS5, buildGeneratePayload5, distSum5, emptyW5, patternConfig5, patternToW5, selectionExact5 } from './wizard5';
import ScopeStep5 from './steps/ScopeStep5';
import ChaptersStep5 from './steps/ChaptersStep5';
import TypeMarksStep5 from './steps/TypeMarksStep5';
import QuestionsStep5 from './steps/QuestionsStep5';
import ReviewStep5 from './steps/ReviewStep5';

const STEP_META = [
  { n: 1, title: 'Scope', hint: 'Pick the course, class, subject and (optionally) the book.' },
  { n: 2, title: 'Chapters', hint: 'Choose the chapters to draw from — optionally narrow to exercises.' },
  { n: 3, title: 'Type & marks', hint: 'Paper type, language, totals and the mark breakdown.' },
  { n: 4, title: 'Questions', hint: 'Review the auto-pick, swap questions, shuffle or add manually.' },
  { n: 5, title: 'Review', hint: 'Branded preview — edit headings, print / PDF, save or finalise.' },
];

export default function GeneratePaperPage5() {
  const { user } = useAppSelector((s) => s.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [s, setS] = useState<W5State>(emptyW5);
  const setState = useCallback((fn: (prev: W5State) => W5State) => setS(fn), []);
  const [patterns, setPatterns] = useState<PatternV2[]>([]);
  const [patternModal, setPatternModal] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [patternDesc, setPatternDesc] = useState('');
  const [patternShared, setPatternShared] = useState(false);

  // generation results (step 5)
  const [paper, setPaper] = useState<PaperV2 | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [printPaper, setPrintPaper] = useState<PaperV2 | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const step = s.step;
  const stepDef = STEPS5[step - 1];
  const canLeave = stepDef?.canLeave(s) ?? false;

  const go = (n: number) => {
    setS((prev) => ({ ...prev, step: Math.min(5, Math.max(1, n)) }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── patterns ─────────────────────────────────────────────────────────────
  const listPatterns = useCallback(() => {
    v2.patterns.list().then((r) => setPatterns(r.data.data as PatternV2[])).catch(() => undefined);
  }, []);
  useEffect(() => { listPatterns(); }, [listPatterns]);

  const applyPattern = (p: PatternV2) => {
    setS((prev) => ({ ...prev, ...patternToW5((p.config ?? {}) as Record<string, any>), step: 1 }));
    setPaper(null);
    setShowKey(false);
    toast.success(`Pattern “${p.name}” applied — review from Step 1`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // deep link: /app/papers/generate?pattern=<id> pre-fills the whole wizard
  useEffect(() => {
    const pid = new URLSearchParams(location.search).get('pattern');
    if (!pid) return;
    v2.patterns.get(Number(pid)).then((r) => {
      const p = r.data.data as PatternV2;
      if (p) { applyPattern(p); navigate('/app/papers/generate', { replace: true }); }
    }).catch(() => navigate('/app/papers/generate', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePattern = async () => {
    if (!patternName.trim()) { toast.error('Pattern name is required'); return; }
    try {
      await v2.patterns.create({
        name: patternName.trim(), description: patternDesc.trim() || undefined,
        config: patternConfig5(s), isShared: patternShared,
      });
      toast.success('Pattern saved');
      setPatternModal(false);
      setPatternName(''); setPatternDesc(''); setPatternShared(false);
      listPatterns();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save pattern');
    }
  };

  const removePattern = async (p: PatternV2) => {
    if (!window.confirm(`Delete pattern “${p.name}”?`)) return;
    try { await v2.patterns.remove(p.id); listPatterns(); toast.success('Pattern deleted'); }
    catch (e: any) { toast.error(e?.message || 'Delete failed'); }
  };

  // ─── generation ───────────────────────────────────────────────────────────
  const loadPaper = async (id: number) => {
    const res = await v2.papers.get(id);
    const p = res.data.data as PaperV2;
    setPaper(p);
    return p;
  };

  const runGenerate = async () => {
    if (s.classId == null || !s.chapterIds.length) { toast.error('Finish the scope steps first'); return; }
    if (distSum5(s) !== s.totalMarks) { toast.error('Distribution must sum to the total marks'); return; }
    if (!selectionExact5(s)) { toast.error('Selection does not match the breakdown yet'); return; }
    setGenerating(true);
    try {
      const res = await v2.papers.generate(buildGeneratePayload5(s));
      const data = res.data.data as GenerateResult;
      const first = data.papers[0];
      if (!first) throw new Error('The server returned no paper');
      setS((prev) => ({ ...prev, paperId: first.id, warnings: data.warnings ?? [] }));
      await loadPaper(first.id);
      setShowKey(false);
      go(5);
      toast.success('Paper generated as draft');
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

  const patchPaper = (patch: Partial<PaperV2>, schoolName?: string) => {
    setPaper((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (schoolName !== undefined) next.formatting = { ...(prev.formatting ?? {}), schoolName } as any;
      return next;
    });
  };

  const saveDetails = async () => {
    if (!paper) return false;
    setSavingMeta(true);
    try {
      await v2.papers.update(paper.id, {
        title: paper.title, examTitle: paper.examTitle ?? undefined, status: paper.status,
      });
      const schoolName = ((paper.formatting as any)?.schoolName ?? '').trim() || null;
      await v2.papers.updateFormatting(paper.id, { schoolName });
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save paper details');
      return false;
    } finally {
      setSavingMeta(false);
    }
  };

  const finalise = async () => {
    if (!paper) return;
    const ok = await saveDetails();
    if (!ok) return;
    try {
      await v2.papers.update(paper.id, { status: 'final' });
      await loadPaper(paper.id);
      toast.success('Paper marked as final');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to finalise paper');
    }
  };

  const duplicateCurrent = async () => {
    if (!paper) return;
    try {
      const res = await v2.papers.duplicate(paper.id);
      const dup = res.data.data as PaperV2;
      await loadPaper(dup.id);
      setS((prev) => ({ ...prev, paperId: dup.id }));
      toast.success('Duplicated as draft — now reviewing the copy');
    } catch (e: any) {
      toast.error(e?.message || 'Duplicate failed');
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────
  const meta = STEP_META[step - 1];
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        title="Paper Generator"
        description="Five steps — scope, chapters, type & marks, questions, review."
        action={(
          <button className="btn-ghost btn-sm" onClick={() => setPatternModal(true)}>
            <Save className="h-4 w-4" /> Save as pattern
          </button>
        )}
      />

      {/* patterns strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-surface-400">
          <Sparkles className="h-3.5 w-3.5" /> Patterns
        </span>
        {patterns.length === 0 && <span className="text-xs text-surface-400">None yet — configure once, then “Save as pattern”.</span>}
        {patterns.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-surface-100 py-1 pl-2 pr-1 text-xs font-semibold text-surface-700">
            {p.isShared && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">shared</span>}
            <button type="button" className="font-bold hover:text-brand-700" title="Apply this pattern (pre-fills all steps)" onClick={() => applyPattern(p)}>
              {p.name}
            </button>
            {p.ownerName && p.ownerName !== user?.name && <span className="font-normal text-surface-400">· {p.ownerName}</span>}
            <button type="button" className="p-1 text-surface-400 hover:text-rose-500" title="Delete pattern" onClick={() => removePattern(p)}>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
        ))}
      </div>

      {/* step rail */}
      <div className="card no-print mb-4 overflow-x-auto p-3">
        <div className="flex min-w-max items-center gap-1">
          {STEPS5.map((d) => {
            const past = d.n < step;
            const current = d.n === step;
            const locked = d.n > step && (d.n === 5 ? !s.paperId : false);
            return (
              <button key={d.n} type="button"
                onClick={() => { if (!locked) go(d.n); }}
                className={clsx('flex min-w-[120px] flex-1 flex-col items-center rounded-xl px-2.5 py-1.5 transition-all',
                  locked ? 'cursor-not-allowed opacity-35' : 'cursor-pointer hover:bg-surface-50')}>
                <span className={clsx('mb-1 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-extrabold',
                  current ? 'border-brand-600 bg-brand-600 text-white shadow-brand'
                    : past ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-surface-200 bg-white text-surface-400')}>
                  {past ? <CheckCircle2 className="h-3.5 w-3.5" /> : d.n}
                </span>
                <span className={clsx('text-[10px] font-bold uppercase tracking-wide', current ? 'text-brand-700' : 'text-surface-500')}>
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* step content */}
      <div className="card animate-fade-in mb-4 p-5 md:p-7" key={`step-${step}`}>
        <StepHeading n={meta.n} title={meta.title} hint={meta.hint} />
        <div className="mt-4">
          {step === 1 && <ScopeStep5 state={s} setState={setState} />}
          {step === 2 && <ChaptersStep5 state={s} setState={setState} />}
          {step === 3 && <TypeMarksStep5 state={s} setState={setState} />}
          {step === 4 && <QuestionsStep5 state={s} setState={setState} />}
          {step === 5 && (paper
            ? (
              <ReviewStep5
                paper={paper} warnings={s.warnings}
                showKey={showKey} savingMeta={savingMeta}
                onToggleKey={() => setShowKey(!showKey)}
                onPatchPaper={patchPaper}
                onPrint={() => setPrintPaper(paper)}
                onDuplicate={duplicateCurrent}
                onSaveDetails={async () => { if (await saveDetails()) toast.success('Details saved'); }}
                onFinalise={finalise}
                onAdjust={() => go(4)}
              />
            )
            : <p className="py-8 text-center text-sm text-surface-400">No paper yet — generate one from Step 4.</p>)}
        </div>
      </div>

      {/* bottom nav */}
      {step < 5 && (
        <div className="flex items-center justify-between gap-3">
          <button className="btn-ghost" disabled={step <= 1} onClick={() => go(step - 1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step === 4 ? (
            <button className="btn-primary" disabled={generating} onClick={runGenerate}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate paper & preview'}
            </button>
          ) : (
            <button className={clsx('btn-primary', !canLeave && 'opacity-40')}
              onClick={() => { if (!canLeave) { toast.error(`Step ${step} (${stepDef.label}) is incomplete`); return; } go(step + 1); }}>
              Next <ArrowRight className="h-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* pattern modal */}
      {patternModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setPatternModal(false)} />
          <div className="animate-slide-down relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold">Save configuration as pattern</h3>
            <p className="mb-4 text-xs text-surface-500">Scope + distribution reusable in one click. Private unless shared.</p>
            <label className="label">Name *</label>
            <input className="input mb-3" placeholder="e.g. Grade 9 Math — Mixed 75" value={patternName} onChange={(e) => setPatternName(e.target.value)} />
            <label className="label">Description</label>
            <textarea className="textarea mb-3" rows={2} placeholder="Optional note…" value={patternDesc} onChange={(e) => setPatternDesc(e.target.value)} />
            <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-700">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={patternShared} onChange={(e) => setPatternShared(e.target.checked)} />
              Share with teachers in your organisation
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setPatternModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={savePattern}><Save className="h-4 w-4" /> Save pattern</button>
            </div>
          </div>
        </div>
      )}

      {/* print sheet */}
      {printPaper && <PrintSheet paper={printPaper} onClose={() => setPrintPaper(null)} />}
    </div>
  );
}
