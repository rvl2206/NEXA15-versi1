import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { store } from '../lib/store';
import { GraduationCap } from 'lucide-react';

export type CardSizeOption = 'CR80' | 'B2' | 'B1';

export const CARD_SIZES: Record<
  CardSizeOption,
  {
    name: string;
    badge: string;
    widthMM: number;
    heightMM: number;
    widthPx: number;
    heightPx: number;
  }
> = {
  CR80: {
    name: 'CR80 Standar KTP / ATM (53.98 x 85.60 mm)',
    badge: 'CR80 (54 x 85.6 MM)',
    widthMM: 53.98,
    heightMM: 85.6,
    widthPx: 250,
    heightPx: 396,
  },
  B2: {
    name: 'Plastik B2 (70 x 100 mm / 7 x 10 cm)',
    badge: 'B2 (70 x 100 MM)',
    widthMM: 70,
    heightMM: 100,
    widthPx: 285,
    heightPx: 407,
  },
  B1: {
    name: 'Plastik B1 (55 x 90 mm / 5.5 x 9 cm)',
    badge: 'B1 (55 x 90 MM)',
    widthMM: 55,
    heightMM: 90,
    widthPx: 256,
    heightPx: 418,
  },
};

export interface CardFrontProps {
  nama: string;
  nisn: string;
  kelas?: string;
  nis?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  jenisKelamin?: string;
  agama?: string;
  alamat?: string;
  foto?: string;
  tahunAjaran?: string;
  schoolName?: string;
  schoolAddress?: string;
  statusSiswa?: string;
  qrValue?: string;
  cardSize?: CardSizeOption;
  isSelected?: boolean;
  onClick?: () => void;
  showCheckbox?: boolean;
  className?: string;
}

export interface CardBackProps {
  nama?: string;
  nisn?: string;
  kelas?: string;
  qrValue?: string;
  cardSize?: CardSizeOption;
  schoolName?: string;
  headmasterName?: string;
  headmasterNIP?: string;
  dateStr?: string;
  isSelected?: boolean;
  onClick?: () => void;
  showCheckbox?: boolean;
  className?: string;
}

// Helper to extract initials from name (e.g. Maulidan Karepesina -> MK)
function getInitials(name?: string): string {
  if (!name) return 'S15';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

/**
 * ==============================================================================
 * KARTU SISI DEPAN (FRONT SIDE): KARTU PELAJAR
 * Sesuai Desain Resmi SMA Negeri 15 Ambon (Header Biru Royal, Foto, Biodata)
 * ==============================================================================
 */
export const OfficialStudentIDCardFront: React.FC<CardFrontProps> = ({
  nama,
  nisn,
  kelas = '',
  nis,
  tempatLahir = 'Ambon',
  tanggalLahir = '2008-05-12',
  jenisKelamin = 'Laki-laki',
  agama = 'Islam',
  alamat = 'Kota Ambon',
  foto,
  schoolName,
  schoolAddress,
  cardSize = 'CR80',
  isSelected = true,
  onClick,
  showCheckbox = false,
  className = '',
}) => {
  const currentSize = CARD_SIZES[cardSize] || CARD_SIZES.CR80;
  const settings = store.getSettings();
  const activeSchoolName = schoolName || settings.schoolName || 'SMA NEGERI 15 AMBON';
  const activeSchoolAddress = schoolAddress || settings.schoolAddress || 'Jl. Ir. M. Putuhena, Kec. Teluk Ambon, Kota Ambon';

  const cleanNama = (nama || 'MAULIDAN KAREPESINA').trim();
  const cleanNisn = (nisn || '0102365332').trim();
  const cleanNis = (nis || cleanNisn).trim();
  const initials = getInitials(cleanNama);

  // Formatting gender
  const formattedGender =
    jenisKelamin === 'L' || jenisKelamin === 'Laki-laki'
      ? 'Laki-laki'
      : jenisKelamin === 'P' || jenisKelamin === 'Perempuan'
      ? 'Perempuan'
      : jenisKelamin || 'Laki-laki';

  return (
    <div
      onClick={onClick}
      style={{
        width: `${currentSize.widthPx}px`,
        height: `${currentSize.heightPx}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        border: '1.5px solid #dbeafe',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 8px 20px -4px rgba(24, 99, 229, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={`official-id-card-front text-slate-900 transition-all select-none shrink-0 ${
        !isSelected ? 'opacity-40 hover:opacity-80 print:hidden' : ''
      } ${className}`}
    >
      {/* Checkbox for selection in Mass Print mode */}
      {showCheckbox && (
        <div className="absolute top-1.5 right-1.5 z-20 print:hidden">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      )}

      {/* TOP HEADER SECTION - ROYAL BLUE */}
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            backgroundColor: '#1863E5',
            color: '#ffffff',
            paddingTop: '7px',
            paddingBottom: '6px',
            paddingLeft: '8px',
            paddingRight: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '4px',
            position: 'relative',
          }}
        >
          {/* Left Emblem: Circular Maluku Provincial Shield */}
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1.5px solid rgba(255, 255, 255, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: '#fbbf24', stroke: '#f59e0b', strokeWidth: '1' }}>
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
            </svg>
          </div>

          {/* Center Titles */}
          <div style={{ textAlign: 'center', flex: 1, paddingLeft: '2px', paddingRight: '2px' }}>
            <p
              style={{
                fontSize: '6.5px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#ffffff',
                opacity: 0.95,
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              PEMERINTAH PROVINSI MALUKU
            </p>
            <h2
              style={{
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                color: '#ffffff',
                margin: '1px 0',
                lineHeight: 1.15,
              }}
            >
              {activeSchoolName}
            </h2>
            <p
              style={{
                fontSize: '5.5px',
                fontWeight: 500,
                color: '#ffffff',
                opacity: 0.85,
                margin: 0,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeSchoolAddress}
            </p>
          </div>

          {/* Right Emblem: Circular Graduation Cap */}
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <GraduationCap style={{ width: '15px', height: '15px', color: '#1863E5' }} />
          </div>
        </div>

        {/* Yellow/Gold Accent Stripe */}
        <div style={{ height: '2.5px', backgroundColor: '#F59E0B' }} />
      </div>

      {/* MIDDLE BODY CONTENT */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          flex: 1,
          paddingTop: '5px',
          paddingBottom: '3px',
        }}
      >
        {/* SUBHEADER BADGE: KARTU PELAJAR WITH HORIZONTAL ACCENT LINES */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingLeft: '14px', paddingRight: '14px', marginBottom: '2px' }}>
          <div style={{ height: '1px', backgroundColor: '#cbd5e1', flex: 1 }} />
          <span
            style={{
              padding: '1.5px 10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: '8px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: '9999px',
              whiteSpace: 'nowrap',
            }}
          >
            KARTU PELAJAR
          </span>
          <div style={{ height: '1px', backgroundColor: '#cbd5e1', flex: 1 }} />
        </div>

        {/* STUDENT PORTRAIT PHOTO - PAS FOTO 3X4 (84px x 112px, RASIO 3:4) */}
        <div
          style={{
            width: '84px',
            height: '112px',
            borderRadius: '12px',
            border: '2px solid #2563eb',
            overflow: 'hidden',
            backgroundColor: '#1d4ed8',
            position: 'relative',
            boxShadow: '0 3px 8px rgba(37, 99, 235, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            margin: '2px 0',
          }}
        >
          {foto ? (
            <img
              src={foto}
              alt={cleanNama}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 60%, #1e40af 100%)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                overflow: 'hidden',
              }}
            >
              {/* Initials badge in top-right */}
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  fontSize: '6.5px',
                  fontWeight: 900,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  padding: '1.5px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.02em',
                }}
              >
                {initials}
              </span>

              {/* Student in uniform illustration (3x4 ratio: 84x112) */}
              <svg viewBox="0 0 84 112" style={{ width: '100%', height: '100%' }}>
                {/* Head */}
                <ellipse cx="42" cy="36" rx="15" ry="17" fill="#fde68a" />
                {/* Peci / Hair */}
                <path d="M26 28 C26 14, 58 14, 58 28 Z" fill="#0f172a" />
                {/* Collar & White shirt */}
                <path d="M12 112 L18 64 L28 54 L42 68 L56 54 L66 64 L72 112 Z" fill="#ffffff" />
                {/* Navy Tie */}
                <polygon points="42,68 37,90 42,106 47,90" fill="#0f172a" />
                {/* Golden OSIS Badge on chest */}
                <circle cx="58" cy="80" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
              </svg>
            </div>
          )}
        </div>

        {/* STUDENT NAME */}
        <h3
          style={{
            fontSize: '11.5px',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: '#0f172a',
            textAlign: 'center',
            margin: '2px 0 1px 0',
            letterSpacing: '-0.01em',
            paddingLeft: '6px',
            paddingRight: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            lineHeight: 1.2,
          }}
        >
          {cleanNama}
        </h3>

        {/* NISN & NIS / KELAS PILL */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px' }}>
          <div
            style={{
              padding: '2px 8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '8px',
              fontFamily: 'monospace',
              fontWeight: 800,
              color: '#1e293b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>NISN: {cleanNisn}</span>
            <span style={{ color: '#94a3b8' }}>·</span>
            <span>NIS: {cleanNis}</span>
            {kelas && (
              <>
                <span style={{ color: '#94a3b8' }}>·</span>
                <span style={{ color: '#1863E5', fontFamily: 'sans-serif', fontWeight: 800 }}>{kelas}</span>
              </>
            )}
          </div>
        </div>

        {/* BIODATA TABLE CONTAINER - DISESUAIKAN AGAR LEBIH JELAS & PROPORSIONAL */}
        <div
          style={{
            width: 'calc(100% - 14px)',
            backgroundColor: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: '3px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <tbody style={{ fontSize: '8px', lineHeight: 1.25 }}>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ width: '74px', padding: '3px 4px 3px 6px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                  Tempat, Tgl Lahir
                </td>
                <td style={{ width: '6px', padding: '3px 0', fontWeight: 700, color: '#94a3b8' }}>:</td>
                <td style={{ padding: '3px 6px 3px 2px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tempatLahir}, {tanggalLahir}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ width: '74px', padding: '3px 4px 3px 6px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                  Jenis Kelamin
                </td>
                <td style={{ width: '6px', padding: '3px 0', fontWeight: 700, color: '#94a3b8' }}>:</td>
                <td style={{ padding: '3px 6px 3px 2px', fontWeight: 800, color: '#0f172a' }}>
                  {formattedGender}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ width: '74px', padding: '3px 4px 3px 6px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                  Agama
                </td>
                <td style={{ width: '6px', padding: '3px 0', fontWeight: 700, color: '#94a3b8' }}>:</td>
                <td style={{ padding: '3px 6px 3px 2px', fontWeight: 800, color: '#0f172a' }}>
                  {agama}
                </td>
              </tr>
              <tr>
                <td style={{ width: '74px', padding: '3px 4px 3px 6px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                  Alamat
                </td>
                <td style={{ width: '6px', padding: '3px 0', fontWeight: 700, color: '#94a3b8' }}>:</td>
                <td style={{ padding: '3px 6px 3px 2px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {alamat}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM FOOTER SECTION - ROYAL BLUE */}
      <div
        style={{
          backgroundColor: '#1863E5',
          color: '#ffffff',
          paddingTop: '4.5px',
          paddingBottom: '4.5px',
          paddingLeft: '6px',
          paddingRight: '6px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: '6.5px',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '0.02em',
            lineHeight: 1.2,
          }}
        >
          Berlaku Selama Menjadi Siswa SMA Negeri 15 Ambon
        </p>
      </div>
    </div>
  );
};

/**
 * ==============================================================================
 * KARTU SISI BELAKANG (BACK SIDE): KARTU PRESENSI SISWA
 * Sesuai Desain Resmi: QR Code Presensi, Ketentuan Penggunaan, Stempel & TTD Kepsek
 * ==============================================================================
 */
export const OfficialStudentIDCardBack: React.FC<CardBackProps> = ({
  nama,
  nisn,
  qrValue,
  cardSize = 'CR80',
  schoolName,
  headmasterName,
  headmasterNIP,
  dateStr = 'Juli 2024',
  isSelected = true,
  onClick,
  showCheckbox = false,
  className = '',
}) => {
  const currentSize = CARD_SIZES[cardSize] || CARD_SIZES.CR80;
  const settings = store.getSettings();
  const activeSchoolName = schoolName || settings.schoolName || 'SMA NEGERI 15 AMBON';
  const schoolNpsn = settings.schoolNPSN || '69933068';

  const cleanNama = (nama || 'MAULIDAN KAREPESINA').trim();
  const cleanNisn = (nisn || '0102365332').trim();
  const computedQr = qrValue || `${schoolNpsn}.${cleanNisn}.${cleanNama}`;

  const activeHeadmasterName = headmasterName || (settings as any).headmasterName || 'Drs. Johanis Latuheru, M.Pd.';
  const activeHeadmasterNIP = headmasterNIP || (settings as any).headmasterNIP || '196805121994031007';

  return (
    <div
      onClick={onClick}
      style={{
        width: `${currentSize.widthPx}px`,
        height: `${currentSize.heightPx}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        border: '1.5px solid #dbeafe',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 8px 20px -4px rgba(24, 99, 229, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={`official-id-card-back text-slate-900 transition-all select-none shrink-0 ${
        !isSelected ? 'opacity-40 hover:opacity-80 print:hidden' : ''
      } ${className}`}
    >
      {/* Checkbox for selection in Mass Print mode */}
      {showCheckbox && (
        <div className="absolute top-1.5 right-1.5 z-20 print:hidden">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      )}

      {/* TOP HEADER SECTION - ROYAL BLUE */}
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            backgroundColor: '#1863E5',
            color: '#ffffff',
            paddingTop: '8px',
            paddingBottom: '6px',
            paddingLeft: '12px',
            paddingRight: '12px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '11px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#ffffff',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            KARTU PRESENSI SISWA
          </h2>
          <p
            style={{
              fontSize: '7.5px',
              fontWeight: 600,
              color: '#bfdbfe',
              margin: '1px 0 0 0',
              lineHeight: 1.1,
            }}
          >
            {activeSchoolName}
          </p>
        </div>

        {/* Yellow/Gold Accent Stripe */}
        <div style={{ height: '2.5px', backgroundColor: '#F59E0B' }} />
      </div>

      {/* MIDDLE BODY SECTION */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          flex: 1,
          paddingLeft: '10px',
          paddingRight: '10px',
          paddingTop: '6px',
          paddingBottom: '3px',
        }}
      >
        {/* QR CODE CONTAINER CARD - DIPERBESAR AGAR SANGAT MUDAH DIBACA / DIPINDAI */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1.5px solid #bfdbfe',
            borderRadius: '14px',
            padding: '8px 6px 7px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(24, 99, 229, 0.06)',
            marginBottom: '4px',
          }}
        >
          <div style={{ lineHeight: 0 }}>
            <QRCodeSVG
              value={computedQr}
              size={112}
              level="M"
              includeMargin={false}
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
          </div>

          {/* Under QR Pill: NISN · NAMA SISWA */}
          <div
            style={{
              marginTop: '6px',
              padding: '2.5px 10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '7.5px',
              fontFamily: 'monospace',
              fontWeight: 800,
              color: '#0f172a',
              textAlign: 'center',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {cleanNisn} · {cleanNama}
          </div>
        </div>

        {/* KETENTUAN PENGGUNAAN KARTU BOX - UKURAN TEKS DISESUAIKAN */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '5px 8px',
            textAlign: 'left',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            marginBottom: '3px',
          }}
        >
          <p
            style={{
              fontSize: '7px',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#0f172a',
              letterSpacing: '0.04em',
              margin: '0 0 2px 0',
            }}
          >
            KETENTUAN PENGGUNAAN KARTU:
          </p>
          <ol
            style={{
              margin: 0,
              paddingLeft: '11px',
              fontSize: '6.8px',
              fontWeight: 500,
              color: '#334155',
              lineHeight: 1.3,
            }}
          >
            <li style={{ marginBottom: '1px' }}>
              Kartu ini wajib dibawa setiap hari sekolah untuk presensi masuk &amp; pulang.
            </li>
            <li style={{ marginBottom: '1px' }}>
              Dilarang meminjamkan kartu kepada orang lain.
            </li>
            <li>
              Jika menemukan kartu ini, mohon kembalikan ke pihak sekolah.
            </li>
          </ol>
        </div>
      </div>

      {/* FOOTER SECTION: CIRCULAR STAMP & HEADMASTER SIGNATURE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: '8px',
          paddingTop: '2px',
          flexShrink: 0,
        }}
      >
        {/* Left: Official Circular Stamp Watermark */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '1.5px dashed rgba(37, 99, 235, 0.75)',
            backgroundColor: 'rgba(239, 246, 255, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-10deg)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: '5px', fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', lineHeight: 1 }}>
            STEMPEL
          </span>
          <span style={{ fontSize: '5.5px', fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', lineHeight: 1.1 }}>
            RESMI
          </span>
          <span style={{ fontSize: '4.5px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', lineHeight: 1 }}>
            SMAN 15
          </span>
        </div>

        {/* Right: Headmaster Signature & NIP */}
        <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <p style={{ fontSize: '6px', fontWeight: 500, color: '#64748b', margin: 0 }}>
            Ambon, {dateStr}
          </p>
          <p style={{ fontSize: '6.5px', fontWeight: 700, color: '#334155', margin: '0.5px 0' }}>
            Kepala Sekolah,
          </p>
          {/* Signature Vertical Spacing */}
          <div style={{ height: '16px' }} />
          <p
            style={{
              fontSize: '7px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              textDecoration: 'underline',
              lineHeight: 1.15,
            }}
          >
            {activeHeadmasterName}
          </p>
          <p
            style={{
              fontSize: '5.5px',
              fontFamily: 'monospace',
              fontWeight: 600,
              color: '#64748b',
              margin: '0.5px 0 0 0',
            }}
          >
            NIP. {activeHeadmasterNIP}
          </p>
        </div>
      </div>
    </div>
  );
};
