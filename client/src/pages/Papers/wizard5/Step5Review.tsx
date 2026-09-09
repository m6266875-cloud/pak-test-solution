/**
 * PHASE 4 — Step 5: review, finalize & output. Finalizing persists through
 * /v4/wizard/generate (server revalidates scope + distribution); edits after
 * finalize use replaceQuestions so the wizard never restarts. Reuses the
 * Phase-3 PDF pipeline (branded A4, watermark, EN/UR/bilingual) and the
 * shared PaperDoc preview + PrintSheet.
 */
import { useState } from 'react';
import { Download, Eye, EyeOff, Loader2, Pencil, Printer, Save, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v2 } from '../../../api/v2';
import { v3 } from '../../../api/v3';
import { v4 } from '../../../api/v4';
import type { PaperV2 } from '../../../types';
import { StepHeading } from '../generate/wizUI';
import { PaperDoc } from '../generate/PaperDoc';
import { PrintSheet } from '../PrintSheet';
import { W5State } from './state';

export default function Step5Review({ w, set }: { w: W5State; set: (p: Partial<W5State>) => void }) {
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [printing, setPrinting] = useState<PaperV2 | null>(null);

  const questionIds = Object.values(w.selected).flat();

  const scopeBody = () => ({
    courseId: w.courseId ?? null,
    classId: w.classId!,
    subjectId: w.subjectId!,
    bookId: w.bookId ?? null,
    chapterIds: w.chapterIds,
    exerciseIds: Object.values(w.exerciseSel).flat(),
    paperType: w.paperType,
    language: w.language,
  });

  const refreshPaper = async (id: number) => {
    const r = await v2.papers.get(id);
    set({ paper: r.data.data as PaperV2 });
  };

  const finalize = async () => {
    setBusy(true);
    try {
      if (!w.paper) {
        const r = await v4.wizard.generate({
          ...scopeBody(),
          distribution: w.distribution,
          totalMarks: w.totalMarks,
          timeLimit: w.timeLimit,
          title: w.title || undefined,
          examTitle: w.examTitle || undefined,
          questionIds,
          status: 'draft',
        });
        const id = r.data.data.paper.id as number;
        (r.data.data.warnings ?? []).forEach((x: string) => toast(x, { icon: '⚠️' }));
        await refreshPaper(id);
        toast.success('Paper saved to My Papers (draft)');
      } else {
        await v2.papers.replaceQuestions(w.paper.id, { questionIds });
        await refreshPaper(w.paper.id);
        toast.success('Paper updated');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to finalize');
    } finally { setBusy(false); }
  };

  const setStatus = async (status: 'draft' | 'final') => {
    if (!w.paper) return;
    setBusy(true);
    try {
      await v2.papers.update(w.paper.id, { status });
      await refreshPaper(w.paper.id);
      toast.success(status === 'final' ? 'Paper marked Final' : 'Saved as draft');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <StepHeading n={5} title="Review, finalize & output"
        hint="School branding (logo, name, watermark) is applied automatically from your school." />

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-surface-500">Paper title
          <input value={w.title} onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Mathematics — Monthly Test (October)"
            className="mt-1 w-full rounded-xl border border-surface-200 px-3 py-2.5 text-sm font-medium normal-case" />
        </label>
        <label className="text-xs font-bold text-surface-500">Exam header (optional)
          <input value={w.examTitle} onChange={(e) => set({ examTitle: e.target.value })}
            placeholder="e.g. Monthly Test — October 2026"
            className="mt-1 w-full rounded-xl border border-surface-200 px-3 py-2.5 text-sm font-medium normal-case" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={finalize} disabled={busy}
          className="inline-flex items-center gap-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2.5 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {w.paper ? 'Apply changes' : 'Finalize & save (Draft)'}
        </button>
        {w.paper && (
          <>
            <button type="button" onClick={() => set({ step: 4 })}
              className="inline-flex items-center gap-2 text-sm font-bold text-surface-700 bg-white border border-surface-200 hover:border-brand-400 rounded-xl px-4 py-2.5">
              <Pencil className="w-4 h-4" /> Edit selection
            </button>
            <button type="button" onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-2 text-sm font-bold text-surface-700 bg-white border border-surface-200 hover:border-brand-400 rounded-xl px-4 py-2.5">
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} View paper
            </button>
            <button type="button" onClick={() => { if (w.paper) setPrinting(w.paper); }}
              className="inline-flex items-center gap-2 text-sm font-bold text-surface-700 bg-white border border-surface-200 hover:border-brand-400 rounded-xl px-4 py-2.5">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button type="button" onClick={() => { if (w.paper) v3.papers.downloadPdf(w.paper.id); }}
              className="inline-flex items-center gap-2 text-sm font-bold text-surface-700 bg-white border border-surface-200 hover:border-brand-400 rounded-xl px-4 py-2.5">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button type="button" onClick={() => { if (w.paper) setStatus(w.paper.status === 'final' ? 'draft' : 'final'); }} disabled={busy}
              className="inline-flex items-center gap-2 text-sm font-bold text-white bg-surface-900 hover:bg-black rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4" /> {w.paper.status === 'final' ? 'Revert to draft' : 'Mark Final'}
            </button>
          </>
        )}
      </div>

      {w.paper && showPreview && (
        <div className="card p-5 bg-white overflow-auto max-h-[70vh]">
          <PaperDoc paper={w.paper} showKey={false} />
        </div>
      )}
      {w.paper && (
        <p className="text-xs text-surface-500">
          Status: <span className="font-bold uppercase">{w.paper.status}</span> · {w.paper.questions.length} questions · {w.paper.totalMarks} marks · {w.paper.timeLimit} min
        </p>
      )}
      {printing && <PrintSheet paper={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}
