import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import { User } from '../types';

interface ForceChangePasswordModalProps {
  user: User;
  onSuccess: () => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({ user, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const forbiddenDefaults = ['admin', 'piket', 'kepsek', 'wali', '123456', 'password'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass || cleanPass.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (forbiddenDefaults.includes(cleanPass.toLowerCase())) {
      setError('Kata sandi terlalu mudah ditebak. Jangan gunakan kata sandi bawaan.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await store.changeMyPassword(cleanPass);
      if (res.success) {
        toast.success('Kata Sandi Diperbarui', 'Kata sandi berhasil diganti. Selamat datang di sistem NEXA15!');
        onSuccess();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-blue-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Wajib Ubah Kata Sandi</h3>
            <p className="text-xs text-slate-400">Pembaruan Keamanan Sesi Pertama</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-2xl">
          Halo, <span className="font-semibold text-white">{user.name}</span>! Anda masuk menggunakan kata sandi bawaan sistem. Demi keamanan data presensi dan sistem sekolah, Anda diwajibkan membuat kata sandi baru sebelum melanjutkan.
        </p>

        {error && (
          <div className="mb-4 p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kata Sandi Baru</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-4 py-3 pr-11 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Konfirmasi Kata Sandi Baru</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan Kata Sandi...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Simpan Kata Sandi & Lanjutkan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
