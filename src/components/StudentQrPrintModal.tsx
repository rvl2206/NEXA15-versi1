import React from 'react';
import { X, Printer, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Student } from '../types';
import { useState } from 'react';
import { SchoolLogo } from './SchoolLogo';
import { printElement } from '../lib/exportUtils';
import { CardSizeOption, CARD_SIZE_CONFIGS } from '../lib/printConfig';

interface StudentQrPrintModalProps {
  qrModalStudent: Student | null;
  onClose: () => void;
  }

export function StudentQrPrintModal({ qrModalStudent, onClose }: StudentQrPrintModalProps) {
  const [cardSize, setCardSize] = useState<CardSizeOption>('CR80');
  if (!qrModalStudent) return null;

  const activeConfig = CARD_SIZE_CONFIGS[cardSize];

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* Floating close button on backdrop */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition-colors shadow-lg border border-slate-700 cursor-pointer"
        title="Tutup Modal"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Size Selector Bar */}
      <div
        className="mb-3 bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center gap-2 print:hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-300">Ukuran Kartu:</span>
        <select
          value={cardSize}
          onChange={(e) => setCardSize(e.target.value as CardSizeOption)}
          className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
        >
          <option value="CR80">CR80 Standar (53.98 x 85.60 mm / KTP/ATM)</option>
          <option value="B2">Plastik B2 (70 x 100 mm / 7 x 10 cm)</option>
          <option value="B1">Plastik B1 (55 x 90 mm / 5,5 x 9 cm)</option>
        </select>
      </div>

      {/* ID Badge Card */}
      <div
        id="printable-card"
        onClick={(e) => {
          e.stopPropagation();
          printElement(
            'printable-card',
            `Kartu Presensi - ${qrModalStudent.nama}`,
            activeConfig.widthMM,
            activeConfig.heightMM
          );
        }}
        style={{
          width: `${activeConfig.widthMM}mm`,
          height: `${activeConfig.heightMM}mm`,
          minWidth: `${activeConfig.widthMM}mm`,
          minHeight: `${activeConfig.heightMM}mm`,
          maxWidth: `${activeConfig.widthMM}mm`,
          maxHeight: `${activeConfig.heightMM}mm`,
        }}
        className={`bg-gradient-to-b from-blue-950 via-blue-900 to-slate-950 text-white rounded-2xl ${activeConfig.paddingClass} shadow-2xl relative overflow-hidden text-center cursor-pointer hover:scale-[1.01] transition-transform border border-blue-800/60 flex flex-col justify-between`}
        title={`Klik untuk mencetak Kartu QR ${activeConfig.name}`}
      >
        {/* Badge Indicator */}
        <div className="text-center print:hidden mb-0.5">
          <span className="text-[7.5px] font-bold text-cyan-300 uppercase tracking-widest bg-blue-950/90 px-2 py-0.5 rounded-full border border-cyan-800/60">
            {activeConfig.badge}
          </span>
        </div>

        {/* Header: Logo Sekolah di bagian atas QR Code */}
        <div className="flex flex-col items-center mb-1 pb-1 border-b border-blue-800/80">
          <SchoolLogo className={`${activeConfig.logoSize} drop-shadow-md mb-0.5`} />
          <h3 className={`${activeConfig.headerTitleClass} font-black uppercase tracking-wider text-white leading-tight`}>
            SMA NEGERI 15 AMBON
          </h3>
          <p className={`${activeConfig.headerSubClass} font-bold text-cyan-300 uppercase tracking-widest mt-0.5`}>
            KARTU PRESENSI DIGITAL SISWA
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-1.5 rounded-xl inline-block shadow-lg my-0.5 mx-auto">
          <QRCodeSVG
            value={`69933068.${qrModalStudent.nisn}.${qrModalStudent.nama}`}
            size={activeConfig.qrSize}
            level="H"
            includeMargin={false}
            fgColor="#000000"
            bgColor="#ffffff"
            className="rounded-lg"
          />
        </div>

        {/* Footer: Identitas Pemilik QR Code */}
        <div className="mt-1 pt-1.5 border-t border-blue-800/80 space-y-0.5">
          <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest block">
            IDENTITAS PEMILIK KARTU
          </span>
          <h4 className={`font-black ${activeConfig.nameClass} text-white uppercase tracking-tight line-clamp-1`}>
            {qrModalStudent.nama}
          </h4>
          <div className="flex items-center justify-center gap-1 pt-0.5">
            <span className={`bg-blue-800/80 text-blue-200 ${activeConfig.badgeClass} font-mono font-bold px-1.5 py-0.5 rounded-full border border-blue-700/60`}>
              NISN: {qrModalStudent.nisn}
            </span>
            <span className={`bg-cyan-900/80 text-cyan-200 ${activeConfig.badgeClass} font-bold px-1.5 py-0.5 rounded-full border border-cyan-700/60`}>
              KELAS {qrModalStudent.kelas}
            </span>
          </div>
        </div>
      </div>

      {/* Action Print Buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => {
            printElement(
              'printable-card',
              `Kartu Presensi - ${qrModalStudent.nama}`,
              activeConfig.widthMM,
              activeConfig.heightMM
            );
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-cyan-400/30"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Kartu Sekarang ({activeConfig.badge})</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
        >
          <span>Cetak Standar Browser</span>
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mt-2 font-medium select-none">
        Klik kartu atau tombol "Cetak Kartu Sekarang" di atas • Klik di luar kartu untuk menutup
      </p>
    </div>
  );
}

