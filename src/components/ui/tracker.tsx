import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TrackerItem {
  key?: string | number;
  color: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'cyan' | 'slate';
  tooltip?: string;
}

export interface TrackerProps {
  data: TrackerItem[];
  className?: string;
}

export const Tracker: React.FC<TrackerProps> = ({ data, className }) => {
  const colorMap = {
    emerald: 'bg-emerald-500 hover:bg-emerald-400',
    amber: 'bg-amber-500 hover:bg-amber-400',
    rose: 'bg-rose-500 hover:bg-rose-400',
    blue: 'bg-blue-500 hover:bg-blue-400',
    indigo: 'bg-indigo-500 hover:bg-indigo-400',
    cyan: 'bg-cyan-500 hover:bg-cyan-400',
    slate: 'bg-slate-700 hover:bg-slate-600',
  };

  return (
    <div className={cn('flex items-center gap-1 w-full h-8 overflow-hidden rounded-xl bg-slate-900/60 p-1 border border-slate-800', className)}>
      {data.map((item, index) => (
        <div
          key={item.key || index}
          className={cn(
            'flex-1 h-full rounded-md transition-all cursor-pointer relative group',
            colorMap[item.color]
          )}
          title={item.tooltip}
        >
          {item.tooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
              <span className="px-2 py-1 text-[10px] font-bold text-white bg-slate-950 border border-slate-800 rounded-md shadow-xl whitespace-nowrap">
                {item.tooltip}
              </span>
              <div className="w-1.5 h-1.5 rotate-45 bg-slate-950 border-r border-b border-slate-800 -mt-1" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
