import type { ReactNode } from 'react';

interface Props {
  /** 0..3 rain intensity */
  rain?: number;
  /** 0..1 how hot it feels, warms the sky */
  heat?: number;
  /** 0..1 haze from humidity */
  haze?: number;
  className?: string;
  children?: ReactNode;
}

const RAYS = Array.from({ length: 14 }, (_, i) => i);
const DROPS = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 53) % 400,
  delay: ((i * 37) % 100) / 100,
  len: 8 + ((i * 7) % 8),
}));

/** Flat-illustration sunset farm: sunburst sky, hills, striped fields. */
export function Scene({ rain = 0, heat = 0.5, haze = 0, className = '', children }: Props) {
  const cloudy = Math.min(1, rain / 2);
  return (
    <div className={`scene ${className}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix('#c98fb8', '#e7a36f', heat)} />
            <stop offset="0.55" stopColor={mix('#f3b29a', '#f7c47a', heat)} />
            <stop offset="1" stopColor="#fde2b0" />
          </linearGradient>
          <radialGradient id="sunGlow">
            <stop offset="0" stopColor="#fff7d6" />
            <stop offset="0.5" stopColor="#fff1c1" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff1c1" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="400" height="300" fill="url(#sky)" />
        <g className="rays" style={{ transformOrigin: '200px 120px' }} opacity={0.35 * (1 - cloudy)}>
          {RAYS.map((i) => (
            <path
              key={i}
              d="M200 120 L 190 -200 L 210 -200 Z"
              fill="#fff3d0"
              transform={`rotate(${i * (360 / RAYS.length)} 200 120)`}
            />
          ))}
        </g>
        <circle cx="300" cy="118" r="60" fill="url(#sunGlow)" opacity={1 - cloudy * 0.7} />
        <circle cx="300" cy="118" r="18" fill="#fff6dc" opacity={1 - cloudy * 0.7} />

        {cloudy > 0 && (
          <g className="clouds" opacity={cloudy}>
            <Cloud x={60} y={50} s={1.2} />
            <Cloud x={230} y={35} s={1} />
            <Cloud x={330} y={70} s={0.8} />
          </g>
        )}

        {/* distant mountains */}
        <path d="M0 175 L40 150 L75 165 L120 135 L165 160 L210 140 L260 165 L300 145 L350 160 L400 140 L400 200 L0 200 Z" fill="#7fb3a4" />
        <path d="M0 185 L50 168 L100 180 L150 162 L200 178 L260 160 L320 178 L400 165 L400 210 L0 210 Z" fill="#6ea37a" />

        {/* rolling hills with field stripes */}
        <path d="M0 200 C80 180 160 190 220 200 S340 185 400 195 L400 300 L0 300 Z" fill="#8fc45a" />
        <path d="M0 225 C100 205 200 230 400 210 L400 300 L0 300 Z" fill="#6fae44" />
        <g stroke="#9fd06a" strokeWidth="3" fill="none" opacity="0.7">
          <path d="M-10 240 C120 222 260 244 410 226" />
          <path d="M-10 256 C120 240 260 262 410 244" />
          <path d="M-10 274 C120 258 260 280 410 262" />
        </g>
        <path d="M0 290 C100 275 300 285 400 278 L400 300 L0 300 Z" fill="#5a9a3a" />

        {/* little trees */}
        <Tree x={40} y={196} s={0.7} />
        <Tree x={362} y={190} s={0.9} />
        <Tree x={335} y={196} s={0.6} />

        {haze > 0 && <rect width="400" height="300" fill="#f5f0ff" opacity={haze * 0.35} />}

        {rain > 0 && (
          <g className="rain" stroke="#dfe9ff" strokeWidth="1.5" strokeLinecap="round" opacity={0.35 + rain * 0.2}>
            {DROPS.slice(0, Math.round(20 * rain)).map((d, i) => (
              <line key={i} x1={d.x} y1={-20} x2={d.x - 3} y2={-20 + d.len} style={{ animationDelay: `${d.delay}s` }} />
            ))}
          </g>
        )}
      </svg>
      <div className="scene-content">{children}</div>
    </div>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#f4eef6">
      <ellipse cx="0" cy="10" rx="34" ry="12" />
      <circle cx="-12" cy="4" r="13" />
      <circle cx="8" cy="-2" r="16" />
      <circle cx="24" cy="6" r="10" />
    </g>
  );
}

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="0" width="4" height="12" fill="#7a5230" />
      <circle cx="0" cy="-4" r="11" fill="#4f8f3a" />
      <circle cx="-6" cy="0" r="7" fill="#5f9f44" />
    </g>
  );
}

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
