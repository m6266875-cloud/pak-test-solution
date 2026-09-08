import { ReactNode } from 'react';
import clsx from 'clsx';

/* ═══ EMPTY STATE ═══ */
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: any;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-surface-400" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900 mb-2">{title}</h3>
      <p className="text-sm text-surface-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

/* ═══ LOADING SKELETON ═══ */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  );
}

/* ═══ TOGGLE SWITCH ═══ */
export function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx('toggle-track mt-0.5', checked ? 'toggle-track-on' : 'toggle-track-off')}
      >
        <span className={clsx(checked ? 'toggle-thumb-on' : 'toggle-thumb-off')} />
      </button>
      <div className="flex-1">
        <div className="text-sm font-medium text-surface-900">{label}</div>
        {description && <div className="text-xs text-surface-500 mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

/* ═══ AVATAR ═══ */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-lg' };
  return (
    <div className={clsx(
      'bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold flex-shrink-0',
      sizes[size],
      className
    )}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

/* ═══ STATUS BADGE ═══ */
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    final: 'badge-green',
    draft: 'badge-gray',
    archived: 'badge-amber',
    active: 'badge-green',
    inactive: 'badge-gray',
  };
  return (
    <span className={styles[status] || 'badge-gray'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ═══ ROLE BADGE ═══ */
export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    super_admin: 'badge-red',
    school_admin: 'badge-purple',
    teacher: 'badge-blue',
  };
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    school_admin: 'School Admin',
    teacher: 'Teacher',
  };
  return <span className={styles[role] || 'badge-gray'}>{labels[role] || role}</span>;
}

/* ═══ PAGE HEADER ═══ */
export function PageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="text-sm text-surface-500 mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ═══ TABS ═══ */
export function Tabs({ tabs, active, onChange }: {
  tabs: { key: string; label: string; icon?: any }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-surface-200 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap',
            active === tab.key
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
          )}
        >
          {tab.icon && <tab.icon className="w-4 h-4" />}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ═══ PROGRESS BAR ═══ */
export function ProgressBar({ value, max = 100, color = 'brand' }: {
  value: number;
  max?: number;
  color?: 'brand' | 'green' | 'amber';
}) {
  const percent = Math.min((value / max) * 100, 100);
  const colors = {
    brand: 'bg-brand-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  };
  return (
    <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
      <div
        className={clsx('h-full rounded-full transition-all duration-500', colors[color])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/* ═══ TOOLTIP ═══ */
export function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-surface-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-surface-900" />
      </div>
    </div>
  );
}
