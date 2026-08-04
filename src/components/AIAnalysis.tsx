import React, { useState } from 'react';
import { store } from '../lib/store';
import { Sparkles, AlertTriangle, FileText, Loader2, Copy, Check, Printer, RefreshCw, BarChart2 } from 'lucide-react';

export const AIAnalysis: React.FC = () => {
  const [analysisType, setAnalysisType] = useState<'attendance_summary' | 'risk_detection' | 'monthly_report'>(
    'attendance_summary'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>('Bulan Ini (Juli 2026)');
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua Kelas');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const runGeminiAnalysis = async (typeOverride?: 'attendance_summary' | 'risk_detection' | 'monthly_report') => {
    const activeType = typeOverride || analysisType;
    setIsLoading(true);
    setErrorMsg('');
    setResultText('');

    try {
      const attendanceData = store.getAttendance();
      const studentData = store.getStudents();

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          attendanceData,
          studentData,
          month: selectedMonth,
          kelas: selectedKelas,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal terhubung dengan layanan Gemini AI.');
      }

      setResultText(data.analysis);
    } catch (err: any) {
      console.error('Gemini Analysis Error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat meminta analisis AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 p-6 rounded-2xl text-white shadow-lg border border-blue-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Kecerdasan Buatan Gemini AI</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Analisis Kehadiran Smart AI</h2>
            <p className="text-xs text-blue-200/90 mt-1 max-w-xl">
              Memanfaatkan Gemini AI untuk menganalisis statistik kedisiplinan, mendeteksi pola siswa berisiko, dan membuat laporan bulanan otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runGeminiAnalysis()}
              disabled={isLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Jalankan Analisis AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Mode Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => {
            setAnalysisType('attendance_summary');
            runGeminiAnalysis('attendance_summary');
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            analysisType === 'attendance_summary'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart2 className="w-4 h-4" />
            <span>A. Analisis Kehadiran</span>
          </div>
          <p className="text-xs opacity-90">
            Analisis persentase tingkat kehadiran per kelas, pola keterlambatan, & saran monitoring wali kelas.
          </p>
        </button>

        <button
          onClick={() => {
            setAnalysisType('risk_detection');
            runGeminiAnalysis('risk_detection');
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            analysisType === 'risk_detection'
              ? 'bg-amber-600 text-white border-amber-500 shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>B. Deteksi Siswa Berisiko</span>
          </div>
          <p className="text-xs opacity-90">
            Deteksi otomatis siswa terlambat &gt;3x, sering alpa, dan rekomendasi pembinaan konseling.
          </p>
        </button>

        <button
          onClick={() => {
            setAnalysisType('monthly_report');
            runGeminiAnalysis('monthly_report');
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            analysisType === 'monthly_report'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>C. Laporan Otomatis</span>
          </div>
          <p className="text-xs opacity-90">
            Generasi Laporan Kehadiran Bulanan Resmi SMA lengkap dengan temuan & rekomendasi kebijakan.
          </p>
        </button>
      </div>

      {/* Output Screen */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Output Analisis Gemini AI
            </h3>
          </div>

          {resultText && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Laporan'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Laporan</span>
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-bounce">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Gemini AI Sedang Mengolah Data Kehadiran...</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Memindai ribuan data absensi siswa, menghitung persentase kedisiplinan, dan menyusun rekomendasi.
            </p>
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-xl text-xs space-y-2">
            <p className="font-bold">Gagal Menghasilkan Analisis AI:</p>
            <p>{errorMsg}</p>
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
              Pastikan environment variable GEMINI_API_KEY telah terpasang dengan benar di AI Studio Secrets.
            </p>
          </div>
        ) : resultText ? (
          <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-3 font-sans bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-line">
            {resultText}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-medium text-slate-600 dark:text-slate-300">Belum ada analisis yang dijalankan.</p>
            <p className="text-slate-400 dark:text-slate-500">
              Pilih salah satu jenis analisis di atas dan klik tombol &quot;Jalankan Analisis AI&quot;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
