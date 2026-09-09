/**
 * PHASE 4 — the 5-step paper generation wizard (replaces the old 15-step
 * flow) at /app/papers/generate.
 *
 * Steps: 1 Course & Scope · 2 Chapters · 3 Type & Marks · 4 Select ·
 * 5 Review & Save. All scope/validation is re-enforced server-side
 * (/api/v4) — the UI only ever shows what the caller may access.
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { useAppSelector } from '../../../store/hooks';
import { PageHeader } from '../../../components/ui';
import { emptyW5, W5State, W5_STEPS, canLeaveStep } from './state';
import Step1Scope from './Step1Scope';
import Step2Chapters from './Step2Chapters';
import Step3TypeMarks from './Step3TypeMarks';
import Step4Select from './Step4Select';
import Step5Review from './Step5Review';

export default function Wizard5Page() {
  const { user } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();
  const [w, setW] = useState<W5State>(emptyW5);
  const set = useCallback((p: Partial<W5State>) => setW((prev) => ({ ...prev, ...p })), []);

  const stepDef = W5_STEPS[w.step - 1];
  const canNext = canLeaveStep(w);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Generate Paper"
        description={`Five quick steps — signed in as ${user?.name ?? ''} (${user?.role ?? ''}).`}
        action={
          <button type="button" onClick={() => navigate('/app/papers')}
            className="text-sm font-bold text-surface-600 bg-white border border-surface-200 hover:border-brand-400 rounded-xl px-4 py-2">
            My Papers
          </button>
        }
      />

      {/* stepper */}
      <div className="card px-4 py-3 mb-6 flex items-center gap-1 overflow-x-auto">
        {W5_STEPS.map((s, i) => {
          const active = w.step === s.n;
          const done = w.step > s.n;
          return (
            <div key={s.n} className="flex items-center">
              <button type="button"
                onClick={() => { if (s.n < w.step || canNext) set({ step: s.n }); }}
                className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap',
                  active ? 'bg-brand-600 text-white shadow-sm' : done ? 'text-brand-700 bg-brand-50' : 'text-surface-400')}>
                <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black',
                  active ? 'bg-white text-brand-700' : done ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500')}>
                  {done ? '✓' : s.n}
                </span>
                {s.label}
              </button>
              {i < W5_STEPS.length - 1 && <span className="w-4 h-px bg-surface-200 mx-0.5" />}
            </div>
          );
        })}
      </div>

      <div className="card p-5 sm:p-7">
        {w.step === 1 && <Step1Scope w={w} set={set} />}
        {w.step === 2 && <Step2Chapters w={w} set={set} />}
        {w.step === 3 && <Step3TypeMarks w={w} set={set} />}
        {w.step === 4 && <Step4Select w={w} set={set} />}
        {w.step === 5 && <Step5Review w={w} set={set} />}

        <div className="mt-8 pt-5 border-t border-surface-100 flex items-center justify-between">
          <button type="button" disabled={w.step === 1}
            onClick={() => set({ step: w.step - 1 })}
            className="inline-flex items-center gap-2 text-sm font-bold text-surface-600 bg-white border border-surface-200 rounded-xl px-4 py-2.5 disabled:opacity-40">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs font-semibold text-surface-400">Step {w.step} of 5 — {stepDef.label}</span>
          {w.step < 5 ? (
            <button type="button" disabled={!canNext}
              onClick={() => set({ step: w.step + 1 })}
              className="inline-flex items-center gap-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 disabled:opacity-40">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-bold text-brand-700"><Wand2 className="w-4 h-4" /> Finalize in step 5</span>
          )}
        </div>
      </div>
    </div>
  );
}
