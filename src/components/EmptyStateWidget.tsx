import React from 'react';
import { PackageOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateWidgetProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyStateWidget: React.FC<EmptyStateWidgetProps> = ({ 
  icon = <PackageOpen className="w-12 h-12 text-slate-500/50" />, 
  title, 
  message, 
  action 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full flex flex-col items-center justify-center py-16 px-6 text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl"
    >
      <div className="w-24 h-24 bg-black/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-black text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">{message}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </motion.div>
  );
};
