import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { store } from '../lib/store';
import { Student } from '../types';
import { downloadStudentImportTemplate, parseStudentImportFile } from '../lib/exportUtils';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsLength: number;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  studentsLength,
}) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<Student, 'id' | 'createdAt'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importTotalRows, setImportTotalRows] = useState(0);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const selected = files[0];
      setImportFile(selected);
      setIsParsing(true);
      const res = await parseStudentImportFile(selected);
      setIsParsing(false);
      setImportPreview(res.data);
      setImportErrors(res.errors);
      setImportTotalRows(res.totalRows);
    }
  };

  const handleExecuteImport = () => {
    if (importPreview.length === 0) return;
    store.importStudents(importPreview, importMode);
    resetImportModal();
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setImportTotalRows(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl shadow-xl border border-white/10 max-w-2xl w-full overflow-hidden transition-colors flex flex-col max-h-[90vh]">
        <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Import Data Siswa dari Template Excel / CSV
            </h3>
            <p className="text-[11px] text-emerald-100 mt-0.5">Unggah berkas Excel berisi data siswa untuk dimasukkan otomatis ke database.</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* Step 1: Download Template */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
            <div>
              <h4 className="font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Langkah 1: Gunakan Template Standar
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                Template Excel hanya memerlukan kolom: <code>Nama</code>, <code>NISN</code>, dan <code>Kelas</code>.
              </p>
            </div>
            <button
              onClick={downloadStudentImportTemplate}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template .xlsx</span>
            </button>
          </div>

          {/* Automatic QR Generation Info Badge */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">⚡ Auto-Generate Kode QR Presensi:</p>
              <p className="text-[10px] text-blue-700 dark:text-blue-300">
                Sistem akan secara otomatis membuat <strong>ID QR presensi</strong> untuk setiap siswa saat import dengan format NPSN resmi: <code>69933068.[NISN].[NAMA]</code> yang langsung dapat dicetak dan dipindai.
              </p>
            </div>
          </div>

          {/* Step 2: Upload File */}
          <div className="space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              Langkah 2: Pilih File Excel (.xlsx / .xls / .csv)
            </h4>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white/5 backdrop-blur-xl/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              {importFile ? (
                <div>
                  <p className="font-bold text-white text-xs">{importFile.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{(importFile.size / 1024).toFixed(1)} KB • Klik untuk ganti file</p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Klik di sini untuk memilih file Excel</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Mendukung format .xlsx, .xls, dan .csv</p>
                </div>
              )}
            </div>
          </div>

          {/* Parsing State */}
          {isParsing && (
            <div className="p-4 text-center text-slate-500 font-medium animate-pulse">
              Membaca dan memvalidasi file Excel...
            </div>
          )}

          {/* Import Options & Preview */}
          {importPreview.length > 0 && !isParsing && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Pratinjau Data ({importPreview.length} Siswa Valid Dari {importTotalRows} Baris)
                </h4>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-400">Mode Import:</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                    className="px-2 py-1 text-[11px] border border-white/10 dark:bg-slate-800 rounded-lg font-bold"
                  >
                    <option value="replace">Ganti Total DB (Hapus Data Lama & Ganti Baru)</option>
                    <option value="append">Tambah / Gabung ke DB Saat Ini ({studentsLength} Siswa)</option>
                  </select>
                </div>
              </div>

              {/* Errors warning */}
              {importErrors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Catatan Baris Dilewati ({importErrors.length}):
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 max-h-20 overflow-y-auto">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="max-h-44 overflow-y-auto border border-white/10 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-white/5 backdrop-blur-xl font-bold sticky top-0">
                    <tr>
                      <th className="p-2">No</th>
                      <th className="p-2">Nama</th>
                      <th className="p-2">NISN</th>
                      <th className="p-2">Kelas</th>
                      <th className="p-2">ID QR Auto-Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {importPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5/40">
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-bold">{item.nama}</td>
                        <td className="p-2 font-mono">{item.nisn}</td>
                        <td className="p-2 font-semibold">{item.kelas}</td>
                        <td className="p-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/40 px-2 py-0.5 rounded w-max">
                          {item.id_qr}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white/5 backdrop-blur-xl/60 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetImportModal}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={importPreview.length === 0}
            onClick={handleExecuteImport}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan & Import {importPreview.length} Siswa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
