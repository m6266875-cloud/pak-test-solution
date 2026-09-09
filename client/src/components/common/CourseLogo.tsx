/**
 * Shared course / board logo with a graceful monogram fallback.
 *
 * Logos ship as static client assets under /logos/<code>.png
 * (client/public/logos), keyed by the LOWERCASE catalog course code
 * (ptb, fbise, oup, afaq, gohar, bapu) — the same convention as the
 * `logo` paths in server/prisma/catalog/courses.json. The server's
 * CourseV2.logoUrl points at /uploads/logos/* which only resolves once an
 * operator drops files onto the server disk, so the bundled asset is always
 * preferred and a fresh clone never renders a broken image. Any load error
 * (unknown code, missing file) degrades to a small serif monogram.
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import clsx from 'clsx';

/** Static asset URL for a course code — null when no code is given. */
export const courseLogoUrl = (code?: string | null): string | null => {
  const c = (code || '').trim().toLowerCase();
  return c ? `/logos/${c}.png` : null;
};

const SIZES = {
  '2xs': 'w-4 h-4 text-[8px] rounded',
  xs: 'w-5 h-5 text-[9px] rounded',
  sm: 'w-7 h-7 text-[10px] rounded-md',
  md: 'w-9 h-9 text-xs rounded-lg',
  lg: 'w-16 h-16 text-xl rounded-xl',
} as const;

export interface CourseLogoProps {
  code?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  style?: CSSProperties;
}

export default function CourseLogo({ code, size = 'md', className, style }: CourseLogoProps) {
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const url = courseLogoUrl(code);
  const box = SIZES[size];
  const monogram = (code || '?').trim().slice(0, 2).toUpperCase();

  if (!url || failedFor === url) {
    return (
      <span
        aria-hidden="true"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif', ...style }}
        className={clsx(
          'inline-flex items-center justify-center flex-shrink-0 font-semibold',
          'bg-white border border-surface-200 text-surface-500 select-none',
          box, className,
        )}
      >
        {monogram}
      </span>
    );
  }

  return (
    <span
      style={style}
      className={clsx('inline-flex items-center justify-center flex-shrink-0 bg-white rounded-lg overflow-hidden', box, className)}
    >
      <img src={url} alt="" loading="lazy" onError={() => setFailedFor(url)} className="w-full h-full object-contain" />
    </span>
  );
}
