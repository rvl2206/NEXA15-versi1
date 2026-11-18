import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'success'
    | 'kiosk';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer',
          variant === 'default' &&
            'bg-blue-600 text-white shadow hover:bg-blue-700',
          variant === 'destructive' &&
            'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
          variant === 'outline' &&
            'border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100',
          variant === 'secondary' &&
            'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
          variant === 'ghost' &&
            'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
          variant === 'link' &&
            'text-blue-600 underline-offset-4 hover:underline dark:text-blue-400',
          variant === 'success' &&
            'bg-emerald-600 text-white shadow hover:bg-emerald-700',
          variant === 'kiosk' &&
            'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black shadow-md hover:from-emerald-400 hover:to-cyan-400',
          size === 'default' && 'h-10 px-4 py-2',
          size === 'sm' && 'h-8 rounded-lg px-3 text-xs',
          size === 'lg' && 'h-12 rounded-2xl px-6 text-base font-bold',
          size === 'icon' && 'h-9 w-9 rounded-xl',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
