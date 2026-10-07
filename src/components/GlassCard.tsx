import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-xl ${className}`}>
      {children}
    </div>
  );
}
