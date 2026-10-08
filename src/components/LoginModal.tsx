import React, { useState, useRef } from 'react';
import { User } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { store } from '../lib/store';
import { signInWithGoogle, sendPasswordResetLink } from '../lib/supabase';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  X,
  Mail,
  Send,
  AlertCircle,
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

interface LoginModalProps {
  onLogin: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const container = useRef<HTMLDivElement>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Forgot Password State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{ success: boolean; message: string } | null>(null);

  useGSAP(() => {
    // AWWWARDS-LEVEL MOTION
    const tl = gsap.timeline();
    
    tl.from('.gsap-bg-orb', {
      scale: 0.8,
      opacity: 0,
      duration: 2,
      ease: 'power3.out',
    })
    .from('.gsap-hero-title', {
      y: 100,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'power4.out',
    }, '-=1.5')
    .from('.gsap-hero-text', {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
    }, '-=1')
    .from('.gsap-form-container', {
      x: 100,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
    }, '-=1.2');

  }, { scope: container, dependencies: [] });

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Silakan masukkan Username atau Email Anda.');
      return;
    }
    if (!password.trim()) {
      setError('Silakan masukkan Kata Sandi.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await store.loginWithCredentials(identifier, password);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.message || 'Login gagal. Periksa kembali username dan password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      const gUser = await signInWithGoogle(store.getSupabaseConfig());
      const result = await store.loginWithGoogleUser(gUser);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.message || 'Gagal masuk dengan Google.');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal autentikasi Google. Silakan gunakan Username & Password.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    setForgotResult(null);

    try {
      const res = await sendPasswordResetLink(forgotEmail.trim(), store.getSupabaseConfig());
      if (res.success) {
        setForgotResult({ success: true, message: res.message });
      } else {
        const dbUsers = store.getUsers();
        const found = dbUsers.find(
          (u) =>
            (u.email && u.email.toLowerCase() === forgotEmail.trim().toLowerCase()) ||
            (u.username && u.username.toLowerCase() === forgotEmail.trim().toLowerCase())
        );

        if (found) {
          setForgotResult({
            success: true,
            message: `Akun "${found.name}" (@${found.username}) ditemukan dalam database lokal. Silakan hubungi Administrator / Super Admin untuk mereset kata sandi Anda melalui panel Manajemen Akun.`,
          });
        } else {
          setForgotResult({
            success: false,
            message: res.message || 'Email/Username tidak ditemukan. Jika Anda staf/guru yang dibuatkan akun secara manual, silakan hubungi Administrator sekolah.',
          });
        }
      }
    } catch (err: any) {
      setForgotResult({
        success: false,
        message: err?.message || 'Gagal memproses permintaan reset kata sandi.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div ref={container} className="min-h-screen w-full bg-[#050505] flex items-center justify-center lg:justify-between p-6 lg:p-24 overflow-hidden relative font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Orbs */}
      <div className="gsap-bg-orb absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="gsap-bg-orb absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

      {/* Hero Section (Artistic Asymmetry) */}
      <div className="hidden lg:flex flex-col justify-center relative z-10 w-1/2 pr-12">
        <SchoolLogo className="w-24 h-24 mb-12 opacity-80" />
        <h1 className="gsap-hero-title max-w-4xl text-white font-black text-[clamp(3rem,5vw,5.5rem)] leading-[1.05] tracking-tight">
          Digital Discipline.<br />
          Evolved.
        </h1>
        <p className="gsap-hero-text text-slate-400 mt-8 max-w-md text-lg leading-relaxed font-light">
          Experience the next generation of academic attendance and management. Clean, precise, and uncompromisingly fast.
        </p>
      </div>

      {/* Form Container */}
      <div className="gsap-form-container w-full max-w-md lg:max-w-[480px] relative z-20">
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 sm:p-12 shadow-2xl">
          
          <div className="lg:hidden mb-10 text-center flex flex-col items-center">
            <SchoolLogo className="w-16 h-16 mb-6 opacity-90" />
            <h2 className="text-3xl font-black text-white tracking-tight">NEXA15</h2>
          </div>

          <div className="mb-10 hidden lg:block">
            <h2 className="text-3xl font-bold text-white tracking-tight">Secure Access</h2>
            <p className="text-sm text-slate-400 mt-2">Authenticate to continue.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-start gap-3">
              <span className="font-bold text-rose-400 mt-0.5">⚠️</span>
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordLogin} autoComplete="off" className="space-y-6">
            <div className="group">
              <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 group-focus-within:border-blue-500/50 transition-colors duration-500">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors duration-500">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Identifier"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full pl-14 pr-6 py-4 bg-transparent text-white text-base focus:outline-none placeholder-slate-600 transition-all font-medium"
                />
              </div>
            </div>

            <div className="group">
              <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 group-focus-within:border-blue-500/50 transition-colors duration-500">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors duration-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passphrase"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full pl-14 pr-14 py-4 bg-transparent text-white text-base focus:outline-none placeholder-slate-600 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Recovery?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-4 px-6 bg-white text-black hover:bg-slate-200 font-bold text-base rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group overflow-hidden"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="group-hover:scale-105 transition-transform duration-700 ease-out">Initialize Session</span>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-700 ease-out" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 mb-8 border-t border-white/5 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d0d0d] px-4 text-xs font-bold text-slate-600 tracking-widest uppercase rounded-full">
               System Interface
             </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full py-4 px-6 bg-white/[0.03] hover:bg-white/[0.08] text-white font-medium text-base rounded-2xl border border-white/5 transition-all duration-500 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group"
          >
            {isGoogleLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Connecting SSO...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-700 ease-out" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                <span>Google Workspace</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden text-white shadow-2xl">
            <div className="flex items-center justify-between p-8 pb-4">
              <h3 className="font-bold text-2xl">Recovery</h3>
              <button onClick={() => setIsForgotModalOpen(false)} className="text-slate-500 hover:text-white transition-colors cursor-pointer p-2 bg-white/5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 pt-0 space-y-6">
              <p className="text-slate-400 text-sm">Enter your designated identifier to initialize the recovery sequence.</p>
              
              <form onSubmit={handleForgotPasswordSubmit} autoComplete="off" className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 focus-within:border-white/30 transition-colors duration-500">
                  <Mail className="w-5 h-5 text-slate-500 absolute left-5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Identifier"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full pl-14 pr-6 py-4 bg-transparent text-white text-base focus:outline-none placeholder-slate-600 transition-all font-medium"
                  />
                </div>

                {forgotResult && (
                  <div className={`p-4 rounded-2xl text-sm flex items-start gap-3 border ${forgotResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                    {forgotResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
                    <span className="leading-relaxed font-medium">{forgotResult.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-4 px-6 bg-white text-black hover:bg-slate-200 font-bold text-base rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Transmit Request</span>
                    </>
                  )}
                </button>
              </form>

              <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 space-y-2 text-sm text-slate-400">
                <p className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Manual Override
                </p>
                <p className="leading-relaxed">
                  Local database accounts require a system administrator to execute a manual password reset via the core management console.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginModal;
