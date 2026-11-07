import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User, SchoolSettings, UserRole } from './types';
import { store } from './lib/store';
import { toast } from './lib/toast';
import { onSupabaseAuthStateChange, signOutSupabase } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './components/Dashboard';
import { QRScanner } from './components/QRScanner';
import { ToastContainer } from './components/ToastContainer';
import { UnsyncedDataWarning } from './components/UnsyncedDataWarning';
import { ExitUnsyncedDataModal } from './components/ExitUnsyncedDataModal';
import { GuidedTour } from './components/GuidedTour';
import { ForceChangePasswordModal } from './components/ForceChangePasswordModal';

// Lazy-loaded heavy modules for optimized bundle splitting & faster initial load
const StudentManagement = lazy(() => import('./components/StudentManagement').then((m) => ({ default: m.StudentManagement })));
const DigitalCardTemplate = lazy(() => import('./components/DigitalCardTemplate').then((m) => ({ default: m.DigitalCardTemplate })));
const AttendanceRecap = lazy(() => import('./components/AttendanceRecap').then((m) => ({ default: m.AttendanceRecap })));
const TeacherManagement = lazy(() => import('./components/TeacherManagement').then((m) => ({ default: m.TeacherManagement })));
const TeacherAttendanceRecap = lazy(() => import('./components/TeacherAttendanceRecap').then((m) => ({ default: m.TeacherAttendanceRecap })));
const WaliKelasDispatch = lazy(() => import('./components/WaliKelasDispatch').then((m) => ({ default: m.WaliKelasDispatch })));
const ActivityLogs = lazy(() => import('./components/ActivityLogs').then((m) => ({ default: m.ActivityLogs })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const UserManagement = lazy(() => import('./components/UserManagement').then((m) => ({ default: m.UserManagement })));

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center">
      <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-300">Memuat modul...</p>
      <p className="text-xs text-slate-500 mt-1">Mengoptimalkan tampilan data</p>
    </div>
  );
}

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      return store.getCurrentUser();
    } catch (e) {
      console.warn('Error reading current user:', e);
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [settings, setSettings] = useState<SchoolSettings>(() => {
    try {
      return store.getSettings();
    } catch (e) {
      console.warn('Error reading settings:', e);
      return {
        schoolName: 'SMA Negeri 15 Ambon',
        schoolNPSN: '69933068',
      } as any;
    }
  });

  // Force dark mode on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  
  const [runTour, setRunTour] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser && !localStorage.getItem('nexa15_tour_completed')) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleTourFinish = () => {
    setRunTour(false);
    localStorage.setItem('nexa15_tour_completed', 'true');
  };

  const startTourManually = () => {
    setRunTour(true);
  };


  useEffect(() => {
    setSettings(store.getSettings());
    setCurrentUser(store.getCurrentUser());
    const unsubscribe = store.subscribe(() => {
      setSettings(store.getSettings());
      setCurrentUser(store.getCurrentUser());
    });

    // Listen to Google OAuth return & Supabase session
    const unsubAuth = onSupabaseAuthStateChange(async (gUser) => {
      if (gUser && gUser.email) {
        const current = store.getCurrentUser();
        if (!current) {
          try {
            const res = await store.loginWithGoogleUser(gUser);
            if (res.success && res.user) {
              setCurrentUser(res.user);
              toast.success('Login Berhasil', res.message);
            }
          } catch (e) {
            console.warn('Auto login with Google session error:', e);
          }
        }
      }
    }, store.getSupabaseConfig());

    return () => {
      unsubscribe();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const rolePermissions: Record<UserRole, string[]> = {
      Admin: ['dashboard', 'users', 'scan', 'recap', 'teacher-recap', 'wali-kelas-dispatch', 'students', 'teachers', 'card-template', 'logs', 'settings'],
      Guru: ['scan', 'dashboard', 'recap', 'teacher-recap', 'wali-kelas-dispatch', 'students', 'teachers', 'card-template'],
      'Kepala Sekolah': ['dashboard', 'recap', 'teacher-recap', 'wali-kelas-dispatch', 'students', 'teachers', 'logs', 'settings'],
    };

    const allowed = rolePermissions[currentUser.role] || rolePermissions.Admin;
    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        store.addLog(
          'LOGOUT_AUTO',
          `Sesi pengguna ${currentUser.name} (${currentUser.role}) dikeluarkan otomatis karena tidak ada aktivitas selama 30 menit.`
        );
        toast.warning(
          'Sesi Berakhir Otomatis',
          'Anda telah dikeluarkan secara otomatis karena tidak ada aktivitas selama 30 menit.',
          8000
        );
        store.setCurrentUser(null);
        setCurrentUser(null);
        signOutSupabase(store.getSupabaseConfig()).catch(() => {});
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents: (keyof WindowEventMap)[] = ['keydown', 'click', 'touchstart'];

    resetInactivityTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [currentUser]);

  // Antisipasi data tidak terekam: Peringatkan pengguna jika menutup browser saat ada data belum terkirim
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (store.getOfflineQueueCount() > 0) {
        e.preventDefault();
        e.returnValue = 'Peringatan: Terdapat data presensi/sistem yang belum terkirim ke database Cloud. Yakin ingin keluar dari aplikasi?';
        return e.returnValue;
      }
    };

    // Mobile & browser back button trap when unsynced data exists
    try {
      window.history.pushState({ app: 'nexa15' }, '', window.location.href);
    } catch {
      // Ignore
    }

    const handlePopState = () => {
      const unsyncedCount = store.getOfflineQueueCount();
      if (unsyncedCount > 0) {
        try {
          window.history.pushState({ app: 'nexa15' }, '', window.location.href);
        } catch {
          // Ignore
        }
        setShowExitModal(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleLogout = () => {
    const unsyncedCount = store.getOfflineQueueCount();
    if (unsyncedCount > 0) {
      // Tampilkan popup modal peringatan jika ada data yang belum terkirim ke database
      setShowExitModal(true);
      return;
    }
    // Jika data sudah bersih / terkirim semua, keluar langsung dengan aman
    store.setCurrentUser(null);
    setCurrentUser(null);
    signOutSupabase(store.getSupabaseConfig()).catch(() => {});
  };

  const handleForceConfirmExit = () => {
    setShowExitModal(false);
    store.setCurrentUser(null);
    setCurrentUser(null);
    signOutSupabase(store.getSupabaseConfig()).catch(() => {});
  };

  const handleLoginSuccess = (user: User) => {
    store.setCurrentUser(user);
    setCurrentUser(user);
    if (user.role === 'Guru') {
      setActiveTab('scan');
    } else {
      setActiveTab('dashboard');
    }
    store.addLog('LOGIN', `Pengguna ${user.name} (${user.role}) berhasil masuk.`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
        <ToastContainer />
        <LoginModal onLogin={handleLoginSuccess} />
      </div>
    );
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigateTab={setActiveTab} />;
      case 'users':
        return <UserManagement />;
      case 'scan':
        return <QRScanner currentOfficer={currentUser?.role === 'Admin' ? 'Administrator' : currentUser?.role === 'Kepala Sekolah' ? 'Kepala Sekolah' : 'Petugas Piket'} />;
      case 'students':
        return <StudentManagement userRole={currentUser?.role} />;
      case 'teachers':
        return <TeacherManagement userRole={currentUser?.role} />;
      case 'card-template':
        return <DigitalCardTemplate />;
      case 'recap':
        return <AttendanceRecap currentOfficer={currentUser?.role === 'Admin' ? 'Administrator' : currentUser?.role === 'Kepala Sekolah' ? 'Kepala Sekolah' : 'Petugas Piket'} />;
      case 'teacher-recap':
        return <TeacherAttendanceRecap userRole={currentUser?.role} currentOfficer={currentUser?.role === 'Admin' ? 'Administrator' : currentUser?.role === 'Kepala Sekolah' ? 'Kepala Sekolah' : 'Petugas Piket'} />;
      case 'wali-kelas-dispatch':
        return (
          <WaliKelasDispatch
            students={store.getStudents()}
            teachers={store.getTeachers()}
            attendance={store.getAttendance()}
            settings={settings}
            currentUserRole={currentUser?.role}
          />
        );
      case 'logs':
        return <ActivityLogs />;
      case 'settings':
        return <SettingsPage userRole={currentUser?.role} />;
      default:
        return <Dashboard onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 antialiased selection:bg-blue-600 selection:text-white w-full max-w-full overflow-x-hidden">
      <GuidedTour run={runTour} onFinish={handleTourFinish} activeTab={activeTab} />
      <ToastContainer />
      <ExitUnsyncedDataModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirmExit={handleForceConfirmExit}
      />
      {currentUser.mustChangePassword && (
        <ForceChangePasswordModal
          user={currentUser}
          onSuccess={() => {
            const updated = store.getCurrentUser();
            setCurrentUser(updated);
          }}
        />
      )}
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onStartTour={startTourManually}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-full min-w-0 overflow-x-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={currentUser?.role}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-28 md:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto overflow-x-hidden">
          <UnsyncedDataWarning onNavigateToSettings={() => setActiveTab('settings')} />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <Suspense fallback={<TabLoadingFallback />}>
                {renderActiveTabContent()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser?.role}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        offlineQueueCount={store.getOfflineQueueCount()}
      />
    </div>
  );
}

export default App;
