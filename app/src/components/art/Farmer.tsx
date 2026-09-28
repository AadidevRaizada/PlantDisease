interface Props {
  mood?: 'happy' | 'worried' | 'cheer';
  size?: number;
  className?: string;
}

/** Shetkari Dada: the friendly farmer guide, in pheta (turban) and kurta. */
export function Farmer({ mood = 'happy', size = 120, className = '' }: Props) {
  return (
    <svg
      className={`farmer ${mood} ${className}`}
      width={size}
      height={size * 1.6}
      viewBox="0 0 120 192"
      aria-hidden="true"
    >
      <g className="farmer-body">
        {/* legs */}
        <rect x="44" y="128" width="13" height="50" rx="5" fill="#3f4a5c" />
        <rect x="63" y="128" width="13" height="50" rx="5" fill="#3f4a5c" />
        <ellipse cx="50" cy="180" rx="10" ry="5" fill="#6b3f22" />
        <ellipse cx="70" cy="180" rx="10" ry="5" fill="#6b3f22" />

        {/* kurta */}
        <path d="M34 78 Q60 68 86 78 L90 136 Q60 142 30 136 Z" fill="#fbf7ef" />
        <path d="M60 74 L60 110" stroke="#e6dccb" strokeWidth="2" />
        <circle cx="60" cy="88" r="1.6" fill="#c9b99f" />
        <circle cx="60" cy="98" r="1.6" fill="#c9b99f" />

        {/* arms */}
        <g className={mood === 'cheer' ? 'arm-wave' : ''} style={{ transformOrigin: '86px 82px' }}>
          <path d="M84 80 Q98 96 96 120" stroke="#fbf7ef" strokeWidth="12" strokeLinecap="round" fill="none" />
          <circle cx="96" cy="124" r="6" fill="#c98b5e" />
        </g>
        <path d="M36 80 Q22 96 24 120" stroke="#fbf7ef" strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="24" cy="124" r="6" fill="#c98b5e" />

        {/* neck + head */}
        <rect x="54" y="62" width="12" height="12" rx="4" fill="#b87a50" />
        <ellipse cx="60" cy="50" rx="20" ry="22" fill="#c98b5e" />
        <ellipse cx="40" cy="52" rx="4" ry="6" fill="#b87a50" />
        <ellipse cx="80" cy="52" rx="4" ry="6" fill="#b87a50" />

        {/* face */}
        <g className="eyes">
          <ellipse cx="52" cy="48" rx="2.6" ry="3.2" fill="#2b1a10" />
          <ellipse cx="68" cy="48" rx="2.6" ry="3.2" fill="#2b1a10" />
        </g>
        <path
          d={mood === 'worried' ? 'M47 41 L56 43 M73 41 L64 43' : 'M47 42 Q52 39 56 42 M64 42 Q68 39 73 42'}
          stroke="#2b1a10"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="60" cy="55" rx="3" ry="2.5" fill="#b87a50" />
        {/* moustache */}
        <path d="M60 60 Q52 56 44 62 Q52 64 60 61 Q68 64 76 62 Q68 56 60 60 Z" fill="#3a2418" />
        <path
          d={mood === 'worried' ? 'M54 68 Q60 65 66 68' : 'M53 66 Q60 71 67 66'}
          stroke="#7a3b2a"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="47" cy="58" r="3" fill="#e27d6a" opacity="0.35" />
        <circle cx="73" cy="58" r="3" fill="#e27d6a" opacity="0.35" />

        {/* pheta (turban) */}
        <path d="M37 38 Q38 16 60 14 Q82 16 83 38 Q60 30 37 38 Z" fill="#d8452e" />
        <path d="M38 36 Q60 26 82 36 L83 30 Q60 20 37 30 Z" fill="#f2a33a" />
        <path d="M40 26 Q60 16 80 26" stroke="#ffd45c" strokeWidth="3" fill="none" />
        <path d="M44 20 Q60 6 74 18 Q62 12 48 22 Z" fill="#f2a33a" />
        <path d="M80 30 Q92 34 90 50 Q86 40 80 36 Z" fill="#d8452e" />
      </g>
    </svg>
  );
}
