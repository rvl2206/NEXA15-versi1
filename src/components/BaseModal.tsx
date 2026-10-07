import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string;
}

export function BaseModal({ isOpen, onClose, title, children, icon, maxWidth = 'max-w-md' }: BaseModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
    } else {
      setTimeout(() => setShouldRender(false), 300);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-[#1a1b1e]/90 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl p-6 transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-indigo-400">
              {icon}
            </div>
          )}
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
