import React from 'react';
import {interpolate, interpolateColors} from 'remotion';
import {CYAN, PINK} from '../theme';

const TAU = Math.PI * 2;

// Cama + luna en SVG. `energy` (0..1) controla el brillo de la luna:
// 1 = luna radiante, 0 = luna casi apagada (cuerpo agotado).
export const MoonBed: React.FC<{energy: number; t: number; width: number}> = ({energy, t, width}) => {
  const e = Math.max(0, Math.min(1, energy));
  const moonFill = interpolateColors(e, [0, 0.5, 1], ['#2c2c4a', '#9fb6d8', '#f4fcff']);
  const glow = interpolate(e, [0, 1], [0.05, 1]);
  // pequeño parpadeo cuando la energía es baja (como una bombilla fallando)
  const flicker = e < 0.45 ? 0.75 + 0.25 * Math.abs(Math.sin(t * TAU * 37)) : 1;
  const bedStroke = interpolateColors(e, [0, 1], ['#6b5fa8', CYAN]);
  const barColor = interpolateColors(e, [0, 0.5, 1], [PINK, '#ffd34d', CYAN]);

  const stars = [
    [80, 70, 9],
    [190, 40, 6],
    [560, 60, 8],
    [270, 140, 5],
    [590, 230, 6],
    [40, 190, 5],
  ];

  return (
    <svg viewBox="0 0 640 560" width={width} height={(width * 560) / 640} style={{overflow: 'visible'}}>
      <defs>
        <radialGradient id="moonGlow">
          <stop offset="0%" stopColor="#bff9ff" stopOpacity={0.9} />
          <stop offset="40%" stopColor={CYAN} stopOpacity={0.35} />
          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
        </radialGradient>
        <mask id="crescent">
          <rect x="0" y="0" width="640" height="560" fill="white" />
          <circle cx="470" cy="120" r="78" fill="black" />
        </mask>
        <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="blanket" x1="0" x2="1">
          <stop offset="0%" stopColor="#3a1f7a" />
          <stop offset="100%" stopColor="#7a1f6e" />
        </linearGradient>
      </defs>

      {/* halo de la luna */}
      <circle cx="430" cy="150" r={230} fill="url(#moonGlow)" opacity={glow * flicker} />
      {/* estrellas */}
      {stars.map(([x, y, s], i) => {
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * TAU * 6 + i * 1.7));
        return (
          <path
            key={i}
            d={`M ${x} ${y - s * 2} Q ${x} ${y} ${x + s * 2} ${y} Q ${x} ${y} ${x} ${y + s * 2} Q ${x} ${y} ${x - s * 2} ${y} Q ${x} ${y} ${x} ${y - s * 2} Z`}
            fill="white"
            opacity={tw * (0.15 + 0.85 * e)}
          />
        );
      })}
      {/* luna creciente */}
      <g filter="url(#neon)" opacity={0.35 + 0.65 * flicker}>
        <circle cx="430" cy="150" r="96" fill={moonFill} mask="url(#crescent)" />
      </g>
      {/* cráteres */}
      <g opacity={0.25 * (0.3 + e)} fill="#7b8fb8" mask="url(#crescent)">
        <circle cx="370" cy="140" r="12" />
        <circle cx="395" cy="200" r="9" />
        <circle cx="365" cy="95" r="7" />
      </g>

      {/* Zzz que flotan mientras hay energía */}
      {[0, 1, 2].map((i) => {
        const p = (t * 6 + i / 3) % 1;
        return (
          <text
            key={i}
            x={170 + p * 90 + i * 8}
            y={300 - p * 150}
            fontFamily="InterBlack, sans-serif"
            fontSize={30 + i * 10}
            fill={CYAN}
            opacity={Math.sin(p * Math.PI) * e}
            filter="url(#neon)"
          >
            z
          </text>
        );
      })}

      {/* cama */}
      <g filter="url(#neon)" stroke={bedStroke} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round">
        {/* cabecera */}
        <path d="M 70 470 L 70 290 Q 70 260 100 260 L 120 260 Q 150 260 150 290 L 150 470" fill="rgba(20,16,60,0.85)" />
        {/* piecera */}
        <path d="M 560 470 L 560 360 Q 560 340 580 340 Q 600 340 600 360 L 600 470" fill="rgba(20,16,60,0.85)" />
        {/* colchón */}
        <rect x="140" y="380" width="430" height="58" rx="16" fill="#19164a" />
        {/* almohada */}
        <rect x="160" y="335" width="120" height="50" rx="24" fill="#e8f6ff" stroke={bedStroke} />
        {/* manta */}
        <path d="M 260 372 Q 300 332 360 350 Q 430 368 480 345 Q 530 330 570 360 L 570 438 L 260 438 Z" fill="url(#blanket)" />
        {/* patas */}
        <line x1="90" y1="470" x2="90" y2="505" />
        <line x1="580" y1="470" x2="580" y2="505" />
        <line x1="70" y1="470" x2="600" y2="470" />
      </g>

      {/* batería de energía */}
      <g transform="translate(170 525)">
        <rect x="0" y="0" width="300" height="22" rx="11" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
        <rect x="4" y="4" width={Math.max(14, 292 * e)} height="14" rx="7" fill={barColor} filter="url(#neon)" />
      </g>
    </svg>
  );
};
