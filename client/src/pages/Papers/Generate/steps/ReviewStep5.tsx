/**
 * PHASE 4 wizard · Step 5 — branded review.
 * Edit the printed headings, toggle the answer key, print / PDF, save
 * details, mark final, or jump back to adjust the selection.
 */
import clsx from 'clsx';
import { ArrowLeft, CheckCircle2, Copy, Download, Eye, Loader2, Save } from 'lucide-react';
import type { PaperV2 } from '../../../../types';
import CourseLogo from '../../../../components/common/CourseLogo';
import { PaperDoc } from '../../shared/PaperDoc';
import { TYPE_SHORT, fmtDate } from '../../shared/paperUtils';

interface Props {
  paper: PaperV2;
  warnings: string[];
  showKey: boolean;
  savingMeta: boolean;
  onToggleKey: () => void;
  onPatchPaper: (patch: Partial<PaperV2>, schoolName?: string) => void;
  onPrint: () => void;
  onDuplicate: () => void;
  onSaveDetails: () => void;
  onFinalise: () => void;
  onAdjust: () => void;
}

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
const sumMarks = (p: PaperV2) => (p.questions ?? []).reduce((a, q) => a + (q.marks ?? 0), 0);

export default function ReviewStep5(props: Props) {
  const { paper: p } = props;
  return (
    <div className="space-y-4">
      {props.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <p className="font-bold">Generator notices</p>
          <ul className="mt-1 list-disc pl-5">{props.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {/* meta editing */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="label">Paper title</label>
          <input className="input" value={p.title} onChange={(e) => props.onPatchPaper({ title: e.target.value })} />
        </div>
        <div>
          <label className="label">Exam title (printed header)</label>
          <input className="input" placeholder="e.g. Class 9 — Mid Term Examination"
            value={p.examTitle ?? ''} onChange={(e) => props.onPatchPaper({ examTitle: e.target.value })} />
        </div>
        <div>
          <label className="label">School name (printed header)</label>
          <input className="input" value={(p.formatting as any)?.schoolName ?? ''} placeholder="School name"
            onChange={(e) => props.onPatchPaper({}, e.target.value)} />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-surface-400">
            {p.className} · {p.courseCode && <CourseLogo code={p.courseCode} size="xs" style={{ verticalAlign: '-0.22em' }} />} {p.courseName ?? ''} · {p.medium} · {p.timeLimit ?? 90} min · {p.paperType} · created {fmtDate(p.createdAt)}
          </p>
        </div>
      </div>

      {/* composition chips */}
      <div className="flex flex-wrap items-center gap-2">
        {groupCounts(p).map(([t, n, m]) => (
          <span key={t} className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-bold text-surface-600">
            {TYPE_SHORT[t]} × {n} @ {m} = {n * m}
          </span>
        ))}
        <span className={clsx('rounded-full px-2.5 py-1 text-xs font-extrabold',
          sumMarks(p) === p.totalMarks ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
          Σ {sumMarks(p)} / {p.totalMarks} marks
        </span>
        <span className={clsx('rounded-full px-2.5 py-1 text-xs font-extrabold',
          p.status === 'final' ? 'bg-indigo-100 text-indigo-700' : 'bg-surface-100 text-surface-600')}>
          {p.status === 'final' ? 'Final' : 'Draft'}
        </span>
      </div>

      {/* doc */}
      <div className="rounded-2xl border border-surface-200 bg-surface-100/60 p-3 md:p-5">
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
          <button className={clsx('btn-sm', props.showKey ? 'btn-primary' : 'btn-ghost')} onClick={props.onToggleKey}>
            <Eye className="h-4 w-4" /> {props.showKey ? 'Answer key on' : 'Answer key'}
          </button>
          <div className="flex items-center gap-2">
            <button className="btn-ghost btn-sm" onClick={props.onDuplicate}><Copy className="h-4 w-4" /> Duplicate</button>
            <button className="btn-secondary btn-sm" onClick={props.onPrint}><Download className="h-4 w-4" /> Print / PDF</button>
          </div>
        </div>
        <PaperDoc paper={p} showKey={props.showKey} />
      </div>

      {/* save row */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button className="btn-ghost" onClick={props.onAdjust}><ArrowLeft className="h-4 w-4" /> Adjust selection</button>
        <button className="btn-ghost" disabled={props.savingMeta} onClick={props.onSaveDetails}>
          {props.savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details
        </button>
        <button className="btn-success" disabled={p.status === 'final'} onClick={props.onFinalise}>
          <CheckCircle2 className="h-4 w-4" /> {p.status === 'final' ? 'Paper is final' : 'Mark paper as final'}
        </button>
      </div>
    </div>
  );
}
