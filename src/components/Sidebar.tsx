import React from 'react';
import { UserRole, User } from '../types';
import { SchoolLogo } from './SchoolLogo';
import {
  LayoutDashboard,
  QrCode,
  Users,
  FileSpreadsheet,
  History,
  Settings,
  ShieldAlert,
  CreditCard,
  Briefcase,
  UserCheck,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  School,
  LogOut,
  Sun,
  Moon,
  BookOpen,
  Wifi,
  WifiOff,
  Menu,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole = 'Admin',
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  currentUser,
  onLogout,
}) => {
  const menuSections = [
    {
      title: 'Presensi & Operasional',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Kehadiran',
          icon: LayoutDashboard,
          roles: ['Admin', 'Guru', 'Kepala Sekolah'],
        },
        {
          id: 'scan',
          label: 'Scanner Absensi QR',
          icon: QrCode,
          roles: ['Admin', 'Guru'],
          badge: 'Utama',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
        },
        {
          id: 'recap',
          label: 'Log Absensi Siswa',
          icon: FileSpreadsheet,
          roles: ['Admin', 'Guru', 'Kepala Sekolah'],
        },
        {
          id: 'teacher-recap',
          label: 'Log Presensi Guru',
          icon: UserCheck,
          roles: ['Admin', 'Guru', 'Kepala Sekolah'],
          badge: 'Guru',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
        },
        {
          id: 'wali-kelas-dispatch',
          label: 'Disposisi Siswa ke Wali Kelas',
          icon: ShieldAlert,
          roles: ['Admin', 'Guru', 'Kepala Sekolah'],
          badge: 'Wali Kelas',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
        },
      ],
    },
    {
      title: 'Database & Kartu',
      items: [
        {
          id: 'students',
          label: 'Database Siswa',
          icon: Users,
          roles: ['Admin', 'Guru', 'Kepala Sekolah'],
        },
        {
          id: 'teachers',
          label: 'Database Guru (NIP)',
          icon: Briefcase,
          roles: ['Admin', 'Guru', 'Kepala Sekolah'],
          badge: 'NIP',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
        },
        {
          id: 'card-template',
          label: 'Template Kartu ID',
          icon: CreditCard,
          roles: ['Admin', 'Guru'],
          badge: 'Resmi',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
        },
      ],
    },
    {
      title: 'Sistem',
      items: [
        {
          id: 'users',
          label: 'Manajemen Akun',
          icon: Users,
          roles: ['Admin'],
        },
        {
          id: 'logs',
          label: 'Log Aktivitas Sistem',
          icon: History,
          roles: ['Admin', 'Kepala Sekolah'],
        },
        {
          id: 'settings',
          label: 'Pengaturan Sekolah',
          icon: Settings,
          roles: ['Admin', 'Kepala Sekolah'],
        },
      ],
    },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'Admin':
        return (
          <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30 inline-flex items-center gap-1 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-amber-400" /> Admin
          </span>
        );
      case 'Guru':
        return (
          <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 inline-flex items-center gap-1 shadow-xs">
            <UserCheck className="w-3 h-3 text-emerald-400" /> Guru Piket
          </span>
        );
      case 'Kepala Sekolah':
        return (
          <span className="bg-purple-400/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-400/30 inline-flex items-center gap-1 shadow-xs">
            <School className="w-3 h-3 text-purple-400" /> KepSek
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* 1. Desktop & Tablet Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-slate-900/95 dark:bg-slate-950/95 text-slate-300 min-h-[calc(100vh-4rem)] p-3 border-r border-slate-800/80 backdrop-blur-md transition-all duration-300 shrink-0 sticky top-16 z-20`}
      >
        {/* User Role & Collapse Toggle */}
        <div className="mb-6 flex items-center justify-between px-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 px-1">
               <ShieldCheck className="w-4 h-4 text-cyan-400/80" />
               <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">{userRole}</span>
            </div>
          )}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
              aria-label="Toggle Sidebar"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-4 overflow-y-auto pr-0.5 no-scrollbar">
          {menuSections.map((section, sIdx) => {
            const sectionItems = section.items.filter((item) => item.roles.includes(userRole));
            if (sectionItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1 mb-4">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    {section.title}
                  </p>
                )}
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`tour-step-${item.id} w-full flex items-center ${
                        isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                      } rounded-xl font-medium text-xs transition-all duration-200 cursor-pointer group btn-press ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate text-left">{item.label}</span>}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Desktop Sidebar Footer */}
        {!isCollapsed && (
          <div className="pt-3 border-t border-slate-800/80 mt-auto text-xs text-slate-500 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <SchoolLogo className="w-5 h-5 drop-shadow-sm" />
              <span className="font-black text-cyan-400 tracking-wider text-xs">NEXA15 SMART</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">SMA Negeri 15 Ambon</p>
            <p className="text-[9px] text-slate-400/80 mt-0.5 font-mono">v2.5 • Sidebar Mode</p>
          </div>
        )}
      </aside>

      {/* 2. Mobile Slide-Over Drawer Sidebar (Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Container */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900/95 dark:bg-slate-950/95 border-r border-white/10 shadow-2xl z-50 h-full overflow-hidden animate-in slide-in-from-left duration-300 backdrop-blur-xl">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleSelectTab('dashboard')}>
                <SchoolLogo className="w-8 h-8 drop-shadow-md" />
                <div>
                  <h2 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1">
                    <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent font-black">
                      NEXA15
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-cyan-300 font-bold border border-cyan-400/30">
                      SMART
                    </span>
                  </h2>
                  <p className="text-[9px] text-slate-400 font-medium">SMA Negeri 15 Ambon</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10"
                aria-label="Tutup Menu Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current User Info Card */}
            {currentUser && (
              <div className="m-4 p-3.5 bg-white/5 rounded-2xl border border-white/5 shadow-sm flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  <div className="mt-1">{getRoleBadge(currentUser.role)}</div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
            )}

            {/* Mobile Navigation List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 no-scrollbar">
              {menuSections.map((section, sIdx) => {
                const sectionItems = section.items.filter((item) => item.roles.includes(userRole));
                if (sectionItems.length === 0) return null;

                return (
                  <div key={sIdx} className="space-y-1 mb-4">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      {section.title}
                    </p>
                    {sectionItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs transition-all cursor-pointer btn-press ${
                            isActive
                              ? 'bg-white/10 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate text-left">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase shrink-0 ${
                                isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-white/5 text-slate-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Mobile Drawer Footer Actions */}
            <div className="p-4 border-t border-white/10 space-y-3">

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                    onLogout();
                  }}
                  className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer btn-press"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar / Ganti Akun</span>
                </button>
              )}

              <p className="text-[9px] text-slate-500 text-center pt-1 font-mono">
                NEXA15 Digital Attendance • Mobile Sidebar
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

