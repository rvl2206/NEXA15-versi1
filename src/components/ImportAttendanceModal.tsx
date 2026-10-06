import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Student, AttendanceRecord } from '../types';
import { parseAttendanceImportFile, downloadAttendanceImportTemplate } from '../lib/exportUtils';
import { toast } from '../lib/toast';

export interface ImportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentOfficer: string;
  onExecuteImport: (records: Omit<AttendanceRecord, 'id'>[], mode: 'append' | 'replace') => void;
}

export const ImportAttendanceModal: React.FC<ImportAttendanceModalProps> = ({
  isOpen,
  onClose,
  students,
  currentOfficer,
  onExecuteImport,
}) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<AttendanceRecord, 'id'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importTotalRows, setImportTotalRows] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selected = files[0];
      setImportFile(selected);
      setIsParsing(true);
      try {
        const res = await parseAttendanceImportFile(selected, students, currentOfficer);
        setIsParsing(false);
        setImportPreview(res.data);
        setImportErrors(res.errors);
        setImportTotalRows(res.totalRows);
      } catch (err: any) {
        setIsParsing(false);
        toast.error('Gagal membaca file', err.message);
      }
    }
  };

  const handleExecuteImport = () => {
    if (importPreview.length === 0) return;
    onExecuteImport(importPreview, importMode);
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden transition-colors flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Import Manual Data Kehadiran dari Template Excel / CSV
            </h3>
            <p className="text-[11px] text-blue-100 mt-0.5">
              Unggah berkas Excel berisi riwayat atau data presensi harian siswa.
            </p>
          </div>
          <button onClick={resetImportModal} className="text-blue-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                <p className="font-bold mb-1">Panduan Import Data Kehadiran Manual</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Data siswa (NISN/NIS) harus sesuai dengan data pada sistem.</li>
                  <li>Kolom <b>Status</b> diisi dengan: Hadir, Izin, Sakit, Alpa, atau Terlambat.</li>
                  <li>Format tanggal yang diterima: YYYY-MM-DD (contoh: 2024-05-20).</li>
                </ol>
                <div className="mt-3">
                  <button
                    onClick={downloadAttendanceImportTemplate}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Template Excel Kosong</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Upload File (Excel/CSV)</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {importFile ? (
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{importFile.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{(importFile.size / 1024).toFixed(1)} KB • Klik untuk ganti file</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2 text-slate-400" />
                      <p className="mb-1 text-xs text-slate-500 dark:text-slate-400"><span className="font-semibold">Klik untuk upload</span> atau drag and drop</p>
                      <p className="text-[10px] text-slate-400">.xlsx, .xls, .csv</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </label>
            </div>

            {isParsing && (
              <div className="p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Memproses file...
              </div>
            )}

            {/* Import Options & Preview */}
            {importPreview.length > 0 && !isParsing && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Pratinjau Kehadiran ({importPreview.length} Baris Valid Dari {importTotalRows} Baris)
                  </h4>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Mode Import:</label>
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                      className="px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg font-bold"
                    >
                      <option value="append">Tambah (Abaikan Duplikat)</option>
                      <option value="replace">Timpa Data Eksisting (Siswa & Tanggal Sama)</option>
                    </select>
                  </div>
                </div>

                {importErrors.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Catatan Baris Dilewati ({importErrors.length}):
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 max-h-20 overflow-y-auto">
                      {importErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2 w-10">No</th>
                        <th className="p-2">Tanggal</th>
                        <th className="p-2">NISN</th>
                        <th className="p-2">Nama</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {importPreview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2 text-slate-400">{idx + 1}</td>
                          <td className="p-2">{item.tanggal}</td>
                          <td className="p-2">{item.nisn}</td>
                          <td className="p-2 font-medium">{item.nama}</td>
                          <td className="p-2 font-bold text-blue-600 dark:text-blue-400">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button
            onClick={resetImportModal}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            disabled={importPreview.length === 0}
            onClick={handleExecuteImport}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition-all flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Simpan & Import {importPreview.length} Record Kehadiran</span>
          </button>
        </div>
      </div>
    </div>
  );
};
