import React from 'react';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  QrCode,
  Users,
  FileSpreadsheet,
  Menu,
  UserCheck,
  Settings,
  Sparkles,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
  onOpenMobileMenu: () => void;
  offlineQueueCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  userRole = 'Admin',
  onOpenMobileMenu,
  offlineQueueCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Beranda',
      icon: LayoutDashboard,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
    {
      id: 'scan',
      label: 'Scan QR/RFID',
      icon: QrCode,
      roles: ['Admin', 'Guru'],
      isPrimary: true,
    },
    {
      id: 'recap',
      label: 'Log Presensi',
      icon: FileSpreadsheet,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
    {
      id: 'students',
      label: 'Data Siswa',
      icon: Users,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/85 dark:bg-slate-950/85 backdrop-blur-2xl border-t border-white/10 text-slate-300 px-1 py-1.5 shadow-2xl safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`tour-step-${item.id} flex flex-col items-center justify-center p-1 -mt-4 transition-all duration-200 cursor-pointer active:scale-95 group`}
                title={item.label}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-transparent shadow-blue-500/30'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 tracking-tight ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`tour-step-${item.id} flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.id === 'recap' && offlineQueueCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-amber-300 animate-bounce">
                    !
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 truncate max-w-[64px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}

        {/* Menu Toggle for More Pages */}
        <button
          onClick={onOpenMobileMenu}
          className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-95"
          title="Semua Menu"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Lainnya</span>
        </button>
      </div>
    </nav>
  );
};
