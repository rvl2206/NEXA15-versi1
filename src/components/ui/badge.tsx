import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variant === 'default' && 'bg-blue-600 text-white shadow hover:bg-blue-700',
        variant === 'secondary' && 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
        variant === 'destructive' && 'bg-rose-500/15 text-rose-500 border border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400',
        variant === 'success' && 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400',
        variant === 'warning' && 'bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400',
        variant === 'info' && 'bg-cyan-500/15 text-cyan-600 border border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-400',
        variant === 'outline' && 'text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
