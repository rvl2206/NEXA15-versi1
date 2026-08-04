import React, { useState } from 'react';
import { X, BookOpen, FolderTree, Database, Rocket, Key, Smartphone } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'struktur' | 'spreadsheet' | 'deploy' | 'gemini' | 'iphone'>('struktur');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-5 text-white flex items-center justify-between border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-cyan-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Panduan Developer & Dokumentasi Sistem NEXA15 (SMA Negeri 15 Ambon Digital Presence)
              </h2>
              <p className="text-xs text-blue-200/90">
                Struktur project, Integrasi Spreadsheet, deployment, Gemini API, & penggunaan iPhone.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex overflow-x-auto gap-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('struktur')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'struktur' ? 'bg-white text-blue-700 shadow-sm' : 'hover:bg-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>1 & 2. Struktur File & Kode</span>
          </button>

          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'spreadsheet' ? 'bg-white text-blue-700 shadow-sm' : 'hover:bg-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>3. Integrasi Spreadsheet</span>
          </button>

          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'deploy' ? 'bg-white text-blue-700 shadow-sm' : 'hover:bg-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>4. Deployment</span>
          </button>

          <button
            onClick={() => setActiveTab('gemini')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'gemini' ? 'bg-white text-blue-700 shadow-sm' : 'hover:bg-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>5. Gemini API Key</span>
          </button>

          <button
            onClick={() => setActiveTab('iphone')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'iphone' ? 'bg-white text-blue-700 shadow-sm' : 'hover:bg-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>6. Panduan iPhone</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700 leading-relaxed">
          {activeTab === 'struktur' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">1. Struktur Folder Project</h3>
              <pre className="bg-slate-900 text-cyan-300 p-4 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
{`/
├── server.ts                    # Backend Server Express + Gemini AI Proxy API & Auto Sync Spreadsheet
├── index.html                   # Entry point PWA HTML
├── package.json                 # Dependencies (express, @google/genai, html5-qrcode, recharts, xlsx, jspdf)
├── metadata.json                # App Metadata & Camera Frame Permissions
├── src/
│   ├── main.tsx                 # Entry point React
│   ├── App.tsx                  # Controller Utama Layout & Routing NEXA15
│   ├── types.ts                 # Type definitions (Student, Attendance, User, ActivityLog)
│   ├── lib/
│   │   ├── store.ts             # Hybrid Local & Server State Store & Anti-duplicate Scanner Logic
│   │   ├── exportUtils.ts       # Export PDF & Excel Generator
│   │   └── seedData.ts          # Initial seed student database
│   └── components/
│       ├── Navbar.tsx           # Header bar, Jam Realtime, & User Profile
│       ├── Sidebar.tsx          # Navigation Bar Hak Akses Role
│       ├── LoginModal.tsx       # Auth Page dengan 1-Click Demo Login
│       ├── QRScanner.tsx        # Camera QR Code Reader dengan Audio Beep
│       ├── Dashboard.tsx        # Dashboard Statistik & Recharts Kehadiran
│       ├── StudentManagement.tsx# CRUD Database Siswa & Printable QR Badge Card
│       ├── AttendanceRecap.tsx  # Rekap Absensi, Filter, Manual Input, & Export
│       ├── AIAnalysis.tsx       # Modul Analisis Gemini AI Smart Kehadiran
│       ├── ActivityLogs.tsx     # Audit Trail Log Aktivitas
│       └── SettingsPage.tsx     # Pengaturan Jam Masuk & Google Apps Script Spreadsheet Config`}
              </pre>

              <h3 className="font-bold text-sm text-slate-900 border-b pb-2 pt-2">2. Deskripsi Modul Utama</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li><b>index.html / App.tsx</b>: Struktur UI modern responsive PWA dengan Tailwind CSS.</li>
                <li><b>server.ts</b>: Server Express untuk mengamankan API Key Gemini, mengelola data real-time, dan melakukan auto-pull/push ke Google Apps Script secara interval 25 detik.</li>
                <li><b>QRScanner.tsx</b>: Menggunakan library <code className="bg-slate-100 px-1 py-0.5 rounded">html5-qrcode</code> dengan kamera belakang <code className="bg-slate-100 px-1 py-0.5 rounded">facingMode: &quot;environment&quot;</code>.</li>
              </ul>
            </div>
          )}

          {activeTab === 'spreadsheet' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">3. Integrasi Google Sheets / Apps Script</h3>
              <p className="text-slate-600">
                Aplikasi ini terkoneksi murni ke Google Spreadsheet via Web App Google Apps Script.
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
                <li>Buka Google Sheets milik sekolah dan pilih <b>Extensions &gt; Apps Script</b>.</li>
                <li>Tempelkan kode Web App Apps Script pendukung (yang dapat disalin di halaman Pengaturan Aplikasi).</li>
                <li>Deploy sebagai Web App dengan akses <i>&quot;Anyone&quot;</i> (Siapa Saja).</li>
                <li>Masukkan URL Web App Apps Script ke menu Pengaturan NEXA15.</li>
                <li>Sistem secara otomatis akan melakukan dua arah sinkronisasi (Pull & Push) setiap 25-30 detik.</li>
              </ol>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">4. Cara Deploy Step by Step</h3>
              
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900">Deploy ke Cloud Run (Recommended for Full-Stack Node.js)</h4>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Jalankan command build: <code className="bg-slate-200 px-1 rounded font-mono">npm run build</code></li>
                  <li>Deploy container dengan port 3000: <code className="bg-slate-200 px-1 rounded font-mono">gcloud run deploy nexa15-app --source . --port 3000</code></li>
                  <li>Masukkan Environment Variable <code className="bg-slate-200 px-1 rounded font-mono">GEMINI_API_KEY</code> di Google Cloud Console.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'gemini' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">5. Cara Mendapatkan Gemini API Key</h3>
              <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                <li>Kunjungi Google AI Studio di <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">aistudio.google.com</a>.</li>
                <li>Login menggunakan akun Google / Gmail Anda.</li>
                <li>Klik menu <b>&quot;Get API Key&quot;</b> di panel sebelah kiri.</li>
                <li>Klik tombol <b>&quot;Create API Key&quot;</b> dan pilih Google Cloud project Anda.</li>
                <li>Salin string API Key yang dihasilkan.</li>
                <li>Pada AI Studio Build / Cloud environment ini, buka menu <b>Settings &gt; Secrets</b>, lalu tambahkan secret baru bernama <code className="bg-slate-200 px-1 rounded font-mono">GEMINI_API_KEY</code>.</li>
              </ol>
            </div>
          )}

          {activeTab === 'iphone' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">6. Cara Menjalankan & Gunakan Kamera di iPhone (Safari / PWA)</h3>
              <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                <li>Buka link URL aplikasi NEXA15 pada browser <b>Safari iPhone</b>.</li>
                <li><b>Sangat Penting (Izin Kamera Safari):</b> Saat mengklik tombol <b>&quot;Aktifkan Kamera&quot;</b>, Safari akan menampilkan pop-up <i>&quot;NEXA15 Would Like to Access the Camera&quot;</i>. Klik <b>Allow</b> (Izinkan).</li>
                <li><b>Simpan sebagai PWA (Web App):</b> Di Safari, tap ikon <b>Share</b> (kotak dengan panah ke atas di bagian bawah) &gt; pilih <b>&quot;Add to Home Screen&quot;</b>. Aplikasi kini dapat dibuka seperti aplikasi iOS native dari Home Screen!</li>
                <li>Jika kamera tidak terbuka, masuk ke <i>Settings iPhone &gt; Safari &gt; Camera &gt; ubah menjadi Allow</i>.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
