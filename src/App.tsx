import React, { useState, useEffect } from 'react';
import { User, SchoolSettings, UserRole } from './types';
import { store } from './lib/store';
import { toast } from './lib/toast';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './components/Dashboard';
import { QRScanner } from './components/QRScanner';
import { StudentManagement } from './components/StudentManagement';
import { DigitalCardTemplate } from './components/DigitalCardTemplate';
import { AttendanceRecap } from './components/AttendanceRecap';
import { TeacherManagement } from './components/TeacherManagement';
import { TeacherAttendanceRecap } from './components/TeacherAttendanceRecap';
import { WaliKelasDispatch } from './components/WaliKelasDispatch';
import { ActivityLogs } from './components/ActivityLogs';
import { SettingsPage } from './components/SettingsPage';
import { UserManagement } from './components/UserManagement';
import { ToastContainer } from './components/ToastContainer';
import { UnsyncedDataWarning } from './components/UnsyncedDataWarning';
import { ExitUnsyncedDataModal } from './components/ExitUnsyncedDataModal';
import { GuidedTour } from './components/GuidedTour';

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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('nexa15_theme') || localStorage.getItem('sapasiswa_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });
  
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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('nexa15_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    setSettings(store.getSettings());
    setCurrentUser(store.getCurrentUser());
    const unsubscribe = store.subscribe(() => {
      setSettings(store.getSettings());
      setCurrentUser(store.getCurrentUser());
    });
    return () => unsubscribe();
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
        setCurrentUser(null);
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
  };

  const handleForceConfirmExit = () => {
    setShowExitModal(false);
    store.setCurrentUser(null);
    setCurrentUser(null);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 antialiased selection:bg-blue-600 selection:text-white w-full max-w-full overflow-x-hidden">
      <GuidedTour run={runTour} onFinish={handleTourFinish} activeTab={activeTab} />
      <ToastContainer />
      <ExitUnsyncedDataModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirmExit={handleForceConfirmExit}
      />
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
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
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto overflow-x-hidden">
          <UnsyncedDataWarning onNavigateToSettings={() => setActiveTab('settings')} />
          {renderActiveTabContent()}
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
