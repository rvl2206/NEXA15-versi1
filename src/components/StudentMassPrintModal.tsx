import React, { useState, useDeferredValue, useEffect } from 'react';
import { X, Printer, Search, CreditCard } from 'lucide-react';
import { Student } from '../types';
import { OfficialStudentIDCardFront, OfficialStudentIDCardBack } from './OfficialStudentIDCard';
import { printElement } from '../lib/exportUtils';
import { CardSizeOption, CARD_SIZE_CONFIGS } from '../lib/printConfig';

interface StudentMassPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialSelectedIds: string[];
  initialKelasFilter?: string;
}

export const StudentMassPrintModal: React.FC<StudentMassPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  initialSelectedIds,
  initialKelasFilter = 'Semua',
}) => {
  const [cardSize, setCardSize] = useState<CardSizeOption>('CR80');
  const [massPrintSide, setMassPrintSide] = useState<'both' | 'front' | 'back'>('both');
  const [massPrintKelasFilter, setMassPrintKelasFilter] = useState(initialKelasFilter);
  const [massPrintSearch, setMassPrintSearch] = useState('');
  const [massPrintSelectedIds, setMassPrintSelectedIds] = useState<string[]>([]);
  const deferredMassPrintSearch = useDeferredValue(massPrintSearch);

  useEffect(() => {
    if (isOpen) {
      setMassPrintSelectedIds(initialSelectedIds);
      setMassPrintKelasFilter(initialKelasFilter);
      setMassPrintSearch('');
    }
  }, [isOpen, initialSelectedIds, initialKelasFilter]);

  if (!isOpen) return null;

  const activeConfig = CARD_SIZE_CONFIGS[cardSize];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-5xl w-full h-[92vh] flex flex-col overflow-hidden text-white">
        {/* Modal Header */}
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-900/30 p-2 rounded-xl border border-cyan-800/50">
              <Printer className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                Cetak Kartu Masal
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total {massPrintSelectedIds.length} dari {students.length} kartu terpilih untuk dicetak ({activeConfig.name}).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                printElement(
                  'printable-mass-cards',
                  'Cetak Kartu Presensi Masal',
                  activeConfig.widthMM,
                  activeConfig.heightMM
                )
              }}
              disabled={massPrintSelectedIds.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-400/30"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {massPrintSelectedIds.length} Kartu</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Toolbar */}
        <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex flex-col sm:flex-row gap-3 justify-between shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                Ukuran:
              </span>
              <select
                value={cardSize}
                onChange={(e) => setCardSize(e.target.value as CardSizeOption)}
                className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="CR80">CR80 Standar (53.98 x 85.60 mm)</option>
                <option value="B2">Plastik B2 (70 x 100 mm)</option>
                <option value="B1">Plastik B1 (55 x 90 mm)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Sisi Kartu:</span>
              <select
                value={massPrintSide}
                onChange={(e) => setMassPrintSide(e.target.value as 'both' | 'front' | 'back')}
                className="bg-slate-800 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="both">Depan &amp; Belakang</option>
                <option value="front">Hanya Depan</option>
                <option value="back">Hanya Belakang</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Kelas:</span>
              <select
                value={massPrintKelasFilter}
                onChange={(e) => {
                  const newKelas = e.target.value;
                  setMassPrintKelasFilter(newKelas);
                  // Auto select students in this class
                  const matching = students.filter(
                    (s) => newKelas === 'Semua' || s.kelas === newKelas
                  );
                  setMassPrintSelectedIds(matching.map((s) => s.id));
                }}
                className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="Semua">Semua Kelas ({students.length})</option>
                {Array.from(new Set(students.map((s) => s.kelas)))
                  .sort()
                  .map((k) => (
                    <option key={k} value={k}>
                      Kelas {k} ({students.filter((s) => s.kelas === k).length})
                    </option>
                  ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={massPrintSearch}
                onChange={(e) => setMassPrintSearch(e.target.value)}
                placeholder="Cari nama / NISN..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const visibleIds = students
                  .filter((s) => {
                    const matchK = massPrintKelasFilter === 'Semua' || s.kelas === massPrintKelasFilter;
                    const matchS =
                      !deferredMassPrintSearch ||
                      s.nama.toLowerCase().includes(deferredMassPrintSearch.toLowerCase()) ||
                      s.nisn.includes(deferredMassPrintSearch);
                    return matchK && matchS;
                  })
                  .map((s) => s.id);
                setMassPrintSelectedIds(visibleIds);
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700 cursor-pointer"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={() => setMassPrintSelectedIds([])}
              className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700 cursor-pointer"
            >
              Kosongkan
            </button>
          </div>
        </div>

        {/* Cards Grid Preview Area */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950">
          <div
            id="printable-mass-cards"
            className="flex flex-wrap justify-center gap-3"
          >
            {students
              .filter((s) => {
                const matchK = massPrintKelasFilter === 'Semua' || s.kelas === massPrintKelasFilter;
                const matchS =
                  !deferredMassPrintSearch ||
                  s.nama.toLowerCase().includes(deferredMassPrintSearch.toLowerCase()) ||
                  s.nisn.includes(deferredMassPrintSearch);
                return matchK && matchS;
              })
              .map((student) => {
                const isSelected = massPrintSelectedIds.includes(student.id);

                return (
                  <React.Fragment key={student.id}>
                    {/* FRONT SIDE CARD */}
                    {(massPrintSide === 'both' || massPrintSide === 'front') && (
                      <OfficialStudentIDCardFront
                        nama={student.nama}
                        nisn={student.nisn}
                        kelas={student.kelas}
                        isSelected={isSelected}
                        showCheckbox={true}
                        cardSize={cardSize}
                        onClick={() => {
                          if (isSelected) {
                            setMassPrintSelectedIds(massPrintSelectedIds.filter((id) => id !== student.id));
                          } else {
                            setMassPrintSelectedIds([...massPrintSelectedIds, student.id]);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    )}

                    {/* BACK SIDE CARD */}
                    {(massPrintSide === 'both' || massPrintSide === 'back') && (
                      <OfficialStudentIDCardBack
                        isSelected={isSelected}
                        showCheckbox={true}
                        cardSize={cardSize}
                        onClick={() => {
                          if (isSelected) {
                            setMassPrintSelectedIds(massPrintSelectedIds.filter((id) => id !== student.id));
                          } else {
                            setMassPrintSelectedIds([...massPrintSelectedIds, student.id]);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    )}
                  </React.Fragment>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
