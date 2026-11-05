import React from 'react';
import {interpolateColors} from 'remotion';
import {CYAN, FONT, PINK} from '../theme';

// Reloj neón. `hours` va de 0 a 24.
export const Clock: React.FC<{hours: number; size: number}> = ({hours, size}) => {
  const r = 200;
  const c = 2 * Math.PI * r;
  const p = hours / 24;
  const ring = interpolateColors(p, [0, 0.6, 1], [CYAN, '#b47bff', PINK]);
  return (
    <svg viewBox="-260 -260 520 520" width={size} height={size} style={{overflow: 'visible'}}>
      <defs>
        <filter id="clockNeon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="face">
          <stop offset="0%" stopColor="#1d1550" />
          <stop offset="100%" stopColor="#0b0a26" />
        </radialGradient>
      </defs>
      <circle r={r + 30} fill="url(#face)" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
      <circle r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={22} />
      <circle
        r={r}
        fill="none"
        stroke={ring}
        strokeWidth={22}
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
        transform="rotate(-90)"
        filter="url(#clockNeon)"
      />
      {new Array(12).fill(0).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const big = i % 3 === 0;
        const r1 = big ? 140 : 155;
        return (
          <line
            key={i}
            x1={Math.sin(a) * r1}
            y1={-Math.cos(a) * r1}
            x2={Math.sin(a) * 172}
            y2={-Math.cos(a) * 172}
            stroke="white"
            strokeOpacity={big ? 0.9 : 0.5}
            strokeWidth={big ? 9 : 5}
            strokeLinecap="round"
          />
        );
      })}
      <g filter="url(#clockNeon)" strokeLinecap="round">
        <line x1={0} y1={18} x2={0} y2={-95} stroke={PINK} strokeWidth={14} transform={`rotate(${hours * 30})`} />
        <line x1={0} y1={22} x2={0} y2={-140} stroke={CYAN} strokeWidth={9} transform={`rotate(${hours * 360})`} />
      </g>
      <circle r={14} fill="white" />
      <text y={92} textAnchor="middle" fontFamily={FONT} fontSize={68} fill="white" stroke="black" strokeWidth={10} paintOrder="stroke">
        {`${Math.floor(hours)}h`}
      </text>
    </svg>
  );
};
