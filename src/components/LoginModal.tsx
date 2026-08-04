import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { store } from '../lib/store';
import { Lock, Mail, ShieldCheck, UserCheck, School, ArrowRight, Sparkles, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

interface LoginModalProps {
  onLogin: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('piket.smanlibas@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('Guru');
  const [error, setError] = useState('');
  const [infoHint, setInfoHint] = useState<string>('Silakan klik salah satu akun demo di atas atau ketik password Anda.');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Harap isi email/username dan password.');
      return;
    }

    const lowerEmail = email.toLowerCase().trim();

    // Check Admin Password
    if (lowerEmail === 'smanlibas@gmail.com' || lowerEmail.includes('admin')) {
      const activeAdminPass = store.getAdminPassword();
      if (password !== activeAdminPass) {
        setError('Password Admin salah! Silakan periksa kembali password Anda.');
        return;
      }
      onLogin({
        uid: 'usr-admin',
        email: 'smanlibas@gmail.com',
        name: 'Administrator',
        role: 'Admin',
      });
      return;
    }

    // Check Kepala Sekolah Password
    if (lowerEmail === 'kepsek.smanlibas@gmail.com' || lowerEmail.includes('kepsek')) {
      if (password !== 'KepsekNexa15!' && password !== 'kepsek123') {
        setError('Password Kepala Sekolah salah! Silakan periksa kembali password Anda.');
        return;
      }
      onLogin({
        uid: 'usr-kepsek',
        email: 'kepsek.smanlibas@gmail.com',
        name: 'Kepala Sekolah',
        role: 'Kepala Sekolah',
      });
      return;
    }

    // Check Guru Piket Password
    if (lowerEmail === 'piket.smanlibas@gmail.com' || lowerEmail.includes('piket') || lowerEmail.includes('guru')) {
      if (password !== 'piket123') {
        setError('Password Guru Piket salah! Silakan periksa kembali password Anda.');
        return;
      }
      onLogin({
        uid: 'usr-guru',
        email: 'piket.smanlibas@gmail.com',
        name: 'Petugas Piket',
        role: 'Guru',
      });
      return;
    }

    // General fallback login
    const userRole: UserRole = role;
    const cleanRoleName = userRole === 'Admin' ? 'Administrator' : userRole === 'Kepala Sekolah' ? 'Kepala Sekolah' : 'Petugas Piket';
    onLogin({
      uid: 'user-' + Date.now(),
      email,
      name: cleanRoleName,
      role: userRole,
    });
  };

  const selectDemoRole = (demoRole: UserRole) => {
    setError('');
    setPassword(''); // Reset password field, do not auto-fill or display password
    switch (demoRole) {
      case 'Guru':
        setEmail('piket.smanlibas@gmail.com');
        setRole('Guru');
        setInfoHint('Email Guru Piket terisi otomatis. Silakan ketik password Anda.');
        break;
      case 'Kepala Sekolah':
        setEmail('kepsek.smanlibas@gmail.com');
        setRole('Kepala Sekolah');
        setInfoHint('Email Kepala Sekolah terisi otomatis. Silakan ketik password Anda.');
        break;
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients & Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full my-auto">
        {/* Main Card Container */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden transition-all">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-[#071a3d] via-slate-900 to-[#071a3d] p-7 text-white text-center relative overflow-hidden border-b border-amber-500/20">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Prominent School Logo Container */}
            <div className="relative inline-flex items-center justify-center p-2.5 mb-3 bg-white/10 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-amber-400/30 shadow-xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-blue-500/30 rounded-2xl blur-xs"></div>
              <SchoolLogo className="w-16 h-16 relative drop-shadow-md transition-transform hover:scale-105" />
            </div>

            <div className="block">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 rounded-full border border-amber-400/30 text-amber-300 text-[11px] font-extrabold mb-2">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>SMA NEGERI 15 AMBON</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase">
              <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">NEXA15</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed font-medium">
              Sistem Presensi & Management Kehadiran Digital
            </p>
          </div>

          {/* Form & Role Selector Body */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Quick Access Role Selection (Only 2 Roles: Guru Piket & KepSek) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pilih Akun Cepat (Isi Email)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => selectDemoRole('Guru')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center group shadow-2xs active:scale-95 cursor-pointer ${
                    role === 'Guru' && email.includes('piket')
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">Guru Piket</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate max-w-full">Petugas Piket Harian</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectDemoRole('Kepala Sekolah')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center group shadow-2xs active:scale-95 cursor-pointer ${
                    role === 'Kepala Sekolah'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 ring-2 ring-purple-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/30'
                  }`}
                >
                  <School className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">Kepala Sekolah</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate max-w-full">Pimpinan Sekolah</span>
                </button>
              </div>
            </div>

            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Atau Ketik Manual
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            {infoHint && !error && (
              <div className="p-3 text-xs bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-800 dark:text-blue-200 rounded-2xl flex items-center gap-2 font-medium">
                <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>{infoHint}</span>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl flex items-center gap-2 font-medium">
                <span className="font-bold">❌</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email / Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white transition-all font-medium"
                    placeholder="piket.smanlibas@gmail.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white transition-all font-medium"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-700/25 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <span>Masuk Aplikasi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* School Footer Note */}
            <div className="pt-2 text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium border-t border-slate-100 dark:border-slate-800/80">
              © 2026 NEXA15 — SMAN 15 Ambon Smart Attendance System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


