import * as React from 'react';
import { cn } from '../../lib/utils';
import { Info, CheckCircle2, AlertTriangle, XCircle, Bell } from 'lucide-react';

export interface CalloutProps {
  title: string;
  children?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const Callout: React.FC<CalloutProps> = ({
  title,
  children,
  icon: CustomIcon,
  variant = 'info',
  action,
  className,
}) => {
  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle,
    neutral: Bell,
  };

  const Icon = CustomIcon || iconMap[variant];

  const variantStyles = {
    info: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
    neutral: 'bg-slate-800/60 border-slate-700/80 text-slate-200',
  };

  const iconStyles = {
    info: 'text-cyan-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-rose-400',
    neutral: 'text-slate-400',
  };

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 p-4 rounded-2xl border backdrop-blur-md transition-all text-xs sm:text-sm',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconStyles[variant])} />
        <div className="space-y-1 min-w-0">
          <h4 className="font-bold leading-tight text-white">{title}</h4>
          {children && <div className="text-slate-300 leading-relaxed font-normal">{children}</div>}
        </div>
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
