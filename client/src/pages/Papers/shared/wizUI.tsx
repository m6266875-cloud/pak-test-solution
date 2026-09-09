/** Tiny presentational atoms shared across wizard steps (avoids repetition). */
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export function StepHeading({ n, title, hint, extra }: { n: number; title: string; hint?: string; extra?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold shadow-brand flex-shrink-0">
          {n}
        </span>
        <div>
          <h2 className="text-lg font-bold text-surface-900 leading-tight">{title}</h2>
          {hint && <p className="text-sm text-surface-500 mt-0.5">{hint}</p>}
        </div>
      </div>
      {extra}
    </div>
  );
}

export function PickCard({ active, onClick, icon, title, sub, disabled, tag }: {
  active?: boolean; onClick: () => void; icon?: ReactNode; title: ReactNode;
  sub?: ReactNode; disabled?: boolean; tag?: string;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={clsx(
        'relative flex items-start gap-3 px-4 py-3 rounded-2xl border text-left transition-all w-full',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-400 shadow-sm'
          : 'border-surface-200 bg-white text-surface-800 hover:border-brand-300 hover:bg-brand-50/40',
        disabled && 'opacity-45 cursor-not-allowed hover:border-surface-200 hover:bg-white'
      )}>
      {tag && (
        <span className={clsx(
          'absolute top-2 right-3 text-[10.5px] font-bold px-2 py-0.5 rounded-full',
          active ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'
        )}>{tag}</span>
      )}
      {icon && (
        <span className={clsx(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
          active ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600'
        )}>{icon}</span>
      )}
      <span className="min-w-0">
        <span className="block font-semibold text-sm leading-snug">{title}</span>
        {sub && <span className={clsx('block text-xs mt-0.5', active ? 'text-brand-700' : 'text-surface-500')}>{sub}</span>}
      </span>
      {active && (
        <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center mt-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </span>
      )}
    </button>
  );
}

export function LoadingCard({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="card flex items-center justify-center gap-3 py-10 text-surface-500">
      <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

export function EmptyCard({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="card border-dashed flex flex-col items-center gap-1 py-10 text-center">
      {icon && <span className="text-surface-300 mb-1">{icon}</span>}
      <p className="font-semibold text-sm text-surface-600">{title}</p>
      {hint && <p className="text-xs text-surface-400">{hint}</p>}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
        onClick ? 'cursor-pointer' : 'cursor-default',
        on ? 'bg-brand-600 border-brand-600 text-white shadow-sm' : 'bg-white border-surface-200 text-surface-600'
      )}>
      {children}
    </button>
  );
}
