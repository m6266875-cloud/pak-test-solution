/**
 * PakTest Solution — brand logo (SVG mark + wordmark).
 *
 * The mark is an abstract document-fold / open-book sheet with a checkmark
 * cut through it: "the right paper, checked". Stroke-based and drawn with
 * currentColor so the same component serves light and dark surfaces.
 *
 *   <Logo />                  → dark wordmark for light surfaces
 *   <Logo variant="light" />  → cream wordmark for the deep-green surfaces
 *   <LogoMark className="…"/> → mark alone (inherits currentColor)
 */
import clsx from 'clsx';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" focusable="false">
      {/* sheet with folded corner */}
      <path
        d="M8 3h11.2L26 9.8V26a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"
        stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round"
      />
      {/* fold */}
      <path
        d="M18.9 3.4V9a1.4 1.4 0 0 0 1.4 1.4h5.4"
        stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* check */}
      <path
        d="M10.6 18.1l3.5 3.5 7-7.9"
        stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export interface LogoProps {
  variant?: 'dark' | 'light';
  /** hide the "SOLUTION" kicker under the wordmark */
  compact?: boolean;
  className?: string;
  markClassName?: string;
}

export default function Logo({ variant = 'dark', compact = false, className, markClassName }: LogoProps) {
  const light = variant === 'light';
  return (
    <span className={clsx('inline-flex items-center gap-2.5 select-none', className)}>
      <span
        className={clsx(
          'inline-flex items-center justify-center rounded-xl flex-shrink-0',
          light ? 'bg-[#F5F0E8] text-brand-700' : 'bg-brand-600 text-[#F5F0E8]',
          'w-9 h-9',
          markClassName,
        )}
      >
        <LogoMark className="w-[19px] h-[19px]" />
      </span>
      <span className="leading-none">
        <span
          className={clsx(
            'font-serif font-semibold tracking-[-0.01em] text-[17px]',
            light ? 'text-[#FAF9F6]' : 'text-surface-900',
          )}
          style={{ display: 'block' }}
        >
          PakTest
        </span>
        {!compact && (
          <span
            className={clsx(
              'text-[9.5px] font-sans font-semibold uppercase tracking-[0.28em] mt-1',
              light ? 'text-[#B8945F]' : 'text-brass-600',
            )}
            style={{ display: 'block' }}
          >
            Solution
          </span>
        )}
      </span>
    </span>
  );
}
