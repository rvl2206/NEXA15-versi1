import React, { useState, useEffect } from 'react';
import { User, SchoolSettings, UserRole } from './types';
import { store } from './lib/store';
import { toast } from './lib/toast';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './components/Dashboard';
import { QRScanner } from './components/QRScanner';
import { StudentManagement } from './components/StudentManagement';
import { DigitalCardTemplate } from './components/DigitalCardTemplate';
import { AttendanceRecap } from './components/AttendanceRecap';
import { TeacherManagement } from './components/TeacherManagement';
import { TeacherAttendanceRecap } from './components/TeacherAttendanceRecap';
import { AIAnalysis } from './components/AIAnalysis';
import { ActivityLogs } from './components/ActivityLogs';
import { SettingsPage } from './components/SettingsPage';
import { SetupGuideModal } from './components/SetupGuideModal';
import { ToastContainer } from './components/ToastContainer';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => store.getCurrentUser());

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<SchoolSettings>(store.getSettings());

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('nexa15_theme') || localStorage.getItem('sapasiswa_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

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
      Admin: ['dashboard', 'scan', 'recap', 'teacher-recap', 'students', 'teachers', 'card-template', 'ai-analysis', 'logs', 'settings'],
      Guru: ['scan', 'dashboard', 'recap', 'teacher-recap', 'students', 'teachers', 'card-template'],
      'Kepala Sekolah': ['dashboard', 'recap', 'teacher-recap', 'students', 'teachers', 'ai-analysis', 'logs', 'settings'],
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

    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
      'pointerdown',
    ];

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

  const handleLogout = () => {
    store.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: User) => {
    store.setCurrentUser(user);
    setCurrentUser(user);
    // Auto switch tab based on role
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
        <SetupGuideModal isOpen={isSetupGuideOpen} onClose={() => setIsSetupGuideOpen(false)} />
      </div>
    );
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
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
      case 'ai-analysis':
        return <AIAnalysis />;
      case 'logs':
        return <ActivityLogs />;
      case 'settings':
        return <SettingsPage userRole={currentUser?.role} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 antialiased selection:bg-blue-600 selection:text-white">
      <ToastContainer />
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row pb-16 md:pb-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={currentUser?.role} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {renderActiveTabContent()}
        </main>
      </div>

      {/* Developer & User Setup Guide Modal */}
      <SetupGuideModal isOpen={isSetupGuideOpen} onClose={() => setIsSetupGuideOpen(false)} />
    </div>
  );
}

export default App;
