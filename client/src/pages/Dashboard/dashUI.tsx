/**
 * PHASE 4 — shared dashboard building blocks for the role homes.
 * (Teacher home keeps its own cards inside DashboardPage.)
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function StatCard({ icon: Icon, label, value, sub, color, i = 0 }: {
  icon: any; label: string; value: string | number; sub: string; color: string; i?: number;
}) {
  return (
    <motion.div custom={i} variants={fadeUp} initial="hidden" animate="show" className="card p-5">
      <div className={clsx('mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-mono text-2xl font-medium text-surface-900">{value}</div>
      <div className="text-sm font-medium text-surface-700">{label}</div>
      <div className="mt-0.5 text-xs text-surface-400">{sub}</div>
    </motion.div>
  );
}

export function QuickLink({ to, icon: Icon, label, desc, show = true, primary = false }: {
  to: string; icon: any; label: string; desc: string; show?: boolean; primary?: boolean;
}) {
  if (!show) return null;
  return (
    <Link
      to={to}
      className={primary
        ? 'flex items-center gap-3 rounded-xl bg-brand-600 p-3 text-white transition-all hover:bg-brand-700'
        : 'flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-surface-50'}
    >
      <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg',
        primary ? 'bg-white/20' : 'bg-surface-100')}>
        <Icon className={clsx('h-5 w-5', primary ? '' : 'text-surface-600')} />
      </div>
      <div>
        <div className={clsx('text-sm', primary ? 'font-semibold' : 'font-medium text-surface-900')}>{label}</div>
        <div className={clsx('text-xs', primary ? 'text-brand-200' : 'text-surface-500')}>{desc}</div>
      </div>
    </Link>
  );
}

export function SectionHead({ icon: Icon, title, linkTo, linkLabel }: {
  icon: any; title: string; linkTo?: string; linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-700">
        <Icon className="h-4 w-4 text-brand-600" /> {title}
      </h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs font-medium text-brand-600 hover:text-brand-700">{linkLabel ?? 'View all'}</Link>
      )}
    </div>
  );
}
