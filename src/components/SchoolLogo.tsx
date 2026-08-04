import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: number;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = 'w-10 h-10', size }) => {
  const pixelSize = size || 48;
  const style: React.CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
    maxWidth: `${pixelSize}px`,
    maxHeight: `${pixelSize}px`,
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo SMA Negeri 15 Ambon"
    >
      <defs>
        {/* Pentagon Clip Path */}
        <clipPath id="pentagonClip">
          <polygon points="100,6 194,72 160,194 40,194 6,72" />
        </clipPath>

        {/* Text Arc Path for SMA NEGERI 15 */}
        <path id="textArc" d="M 40,88 A 65,65 0 0,1 160,88" fill="none" />

        {/* Subtle Gradient for Sky Blue lower section */}
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </linearGradient>

        {/* Torch Flame Gradient */}
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
      </defs>

      {/* Main Pentagon Container Background */}
      <g clipPath="url(#pentagonClip)">
        {/* Top Half White */}
        <rect x="0" y="0" width="200" height="72" fill="#FFFFFF" />
        {/* Lower Half Sky Blue */}
        <rect x="0" y="72" width="200" height="128" fill="url(#skyGrad)" />
      </g>

      {/* Outer Pentagon Border */}
      <polygon
        points="100,6 194,72 160,194 40,194 6,72"
        fill="none"
        stroke="#0F172A"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Golden Bintang (Star at top) */}
      <polygon
        points="100,12 105,25 119,25 108,34 112,47 100,39 88,47 92,34 81,25 95,25"
        fill="#F59E0B"
        stroke="#B45309"
        strokeWidth="1"
      />

      {/* Text Arched "SMA NEGERI 15" */}
      <text fill="#334155" fontSize="13" fontWeight="900" fontFamily="sans-serif">
        <textPath href="#textArc" startOffset="50%" textAnchor="middle">
          SMA NEGERI 15
        </textPath>
      </text>

      {/* Left Wreath (Kapas/Cotton) */}
      <g stroke="#15803D" fill="#166534">
        {/* Branch */}
        <path d="M 68,130 Q 52,105 65,80" fill="none" strokeWidth="2.5" />
        {/* Leaves */}
        <circle cx="56" cy="88" r="4" fill="#15803D" />
        <circle cx="53" cy="98" r="4.5" fill="#15803D" />
        <circle cx="56" cy="110" r="4" fill="#15803D" />
        <circle cx="62" cy="120" r="3.5" fill="#15803D" />
        {/* Cotton Bolls (White) */}
        <circle cx="62" cy="82" r="3" fill="#FFFFFF" stroke="#047857" strokeWidth="1" />
        <circle cx="48" cy="94" r="3" fill="#FFFFFF" stroke="#047857" strokeWidth="1" />
        <circle cx="50" cy="106" r="3" fill="#FFFFFF" stroke="#047857" strokeWidth="1" />
        <circle cx="57" cy="116" r="3" fill="#FFFFFF" stroke="#047857" strokeWidth="1" />
      </g>

      {/* Right Wreath (Padi/Rice) */}
      <g fill="#EAB308" stroke="#CA8A04" strokeWidth="0.8">
        <path d="M 132,130 Q 148,105 135,80" fill="none" stroke="#CA8A04" strokeWidth="2.5" />
        {/* Rice Grains */}
        <ellipse cx="138" cy="82" rx="3" ry="5" transform="rotate(30 138 82)" />
        <ellipse cx="145" cy="90" rx="3" ry="5" transform="rotate(35 145 90)" />
        <ellipse cx="148" cy="100" rx="3" ry="5" transform="rotate(25 148 100)" />
        <ellipse cx="146" cy="110" rx="3" ry="5" transform="rotate(15 146 110)" />
        <ellipse cx="141" cy="120" rx="3" ry="5" transform="rotate(5 141 120)" />
      </g>

      {/* Obor (Torch) */}
      <g>
        {/* Torch Handle & Head */}
        <path d="M 94,84 H 106 L 104,124 H 96 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
        <ellipse cx="100" cy="124" rx="4" ry="2" fill="#0F172A" />
        <path d="M 90,83 H 110 L 107,89 H 93 Z" fill="#334155" />

        {/* Api Obor (Flame) */}
        <path
          d="M 100,56 C 108,66 114,72 108,82 C 104,85 96,85 92,82 C 86,72 92,66 100,56 Z"
          fill="url(#flameGrad)"
          stroke="#B91C1C"
          strokeWidth="1"
        />
        <path
          d="M 100,64 C 104,70 108,74 104,80 C 101,82 99,82 96,80 C 92,74 96,70 100,64 Z"
          fill="#FDE047"
        />
      </g>

      {/* Buku Terbuka (Open Book at center bottom) */}
      <g>
        {/* Book pages shadow */}
        <path d="M 60,126 Q 100,120 100,128 Q 100,120 140,126 L 138,154 Q 100,147 100,154 Q 100,147 62,154 Z" fill="#FEF08A" stroke="#78350F" strokeWidth="1.2" />
        {/* Book spine line */}
        <line x1="100" y1="123" x2="100" y2="154" stroke="#78350F" strokeWidth="1.5" />

        {/* Pulpen (Pen resting on book) */}
        <line x1="90" y1="148" x2="112" y2="132" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
        <polygon points="88,150 90,146 94,149" fill="#0F172A" />
        <line x1="102" y1="139" x2="105" y2="137" stroke="#FFFFFF" strokeWidth="1.2" />
      </g>

      {/* Text "AMBON" at bottom */}
      <text
        x="100"
        y="180"
        fill="#1E293B"
        fontSize="18"
        fontWeight="900"
        fontFamily="sans-serif"
        textAnchor="middle"
        letterSpacing="2"
      >
        AMBON
      </text>
    </svg>
  );
};
