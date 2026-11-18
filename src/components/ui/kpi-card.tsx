import * as React from 'react';
import { cn, formatNumber } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  delta?: {
    value: string | number;
    type: 'increase' | 'decrease' | 'neutral';
    label?: string;
  };
  progress?: {
    value: number; // 0 to 100
    targetLabel?: string;
  };
  accentColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'cyan' | 'slate';
  className?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  delta,
  progress,
  accentColor = 'blue',
  className,
  onClick,
}) => {
  const accentBorderMap = {
    emerald: 'border-t-emerald-500',
    amber: 'border-t-amber-500',
    rose: 'border-t-rose-500',
    blue: 'border-t-blue-500',
    indigo: 'border-t-indigo-500',
    cyan: 'border-t-cyan-500',
    slate: 'border-t-slate-500',
  };

  const accentBgMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    blue: 'bg-blue-500/10 text-blue-400',
    indigo: 'bg-indigo-500/10 text-indigo-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    slate: 'bg-slate-500/10 text-slate-400',
  };

  const progressBgMap = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    cyan: 'bg-cyan-500',
    slate: 'bg-slate-500',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md transition-all duration-300 border-t-4',
        accentBorderMap[accentColor],
        onClick && 'cursor-pointer hover:border-slate-700 hover:scale-[1.02] active:scale-[0.99]',
        className
      )}
    >
      {/* Header: Title & Icon */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={cn('p-2 rounded-xl flex items-center justify-center', accentBgMap[accentColor])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-1">
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
      </div>

      {/* Delta Badge & Subtitle */}
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-xs">
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px]',
              delta.type === 'increase' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
              delta.type === 'decrease' && 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
              delta.type === 'neutral' && 'bg-slate-800 text-slate-400 border border-slate-700'
            )}
          >
            {delta.type === 'increase' && <TrendingUp className="w-3 h-3" />}
            {delta.type === 'decrease' && <TrendingDown className="w-3 h-3" />}
            {delta.type === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{delta.value}</span>
          </span>
        )}

        {subtitle && (
          <span className="text-slate-400 truncate text-[11px]">
            {subtitle}
          </span>
        )}
      </div>

      {/* Progress Bar (if provided) */}
      {progress && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
            <span>Tingkat Kehadiran</span>
            <span>{progress.value.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn('h-1.5 rounded-full transition-all duration-700', progressBgMap[accentColor])}
              style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
            />
          </div>
          {progress.targetLabel && (
            <span className="text-[10px] text-slate-500 mt-1 block">
              {progress.targetLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
