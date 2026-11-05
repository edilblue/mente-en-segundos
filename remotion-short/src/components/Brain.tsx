import React from 'react';
import {interpolate, interpolateColors, random} from 'remotion';
import {AMBER, CYAN, PINK} from '../theme';

const TAU = Math.PI * 2;
const CX = 315;
const CY = 230;

const OUTLINE =
  'M 110 270 C 78 200 118 118 200 98 C 242 58 330 48 382 74 C 452 66 522 118 527 190 C 562 242 536 312 482 322 C 470 352 430 366 396 352 C 370 360 340 362 318 356 L 322 425 C 322 440 292 440 290 425 L 284 354 C 228 356 140 340 110 270 Z';

const GYRI = [
  'M 120 150 q 25 -35 50 -5 t 50 -5 t 50 0 t 50 -5 t 50 5 t 50 0 t 50 5 t 50 0',
  'M 100 200 q 25 35 50 5 t 50 5 t 50 0 t 50 5 t 50 -5 t 50 0 t 50 5 t 50 0 t 50 0',
  'M 100 250 q 25 -35 50 -5 t 50 -5 t 50 0 t 50 -5 t 50 5 t 50 0 t 50 5 t 50 0 t 50 0',
  'M 120 300 q 25 35 50 5 t 50 5 t 50 0 t 50 5 t 50 -5 t 50 0 t 50 5',
  'M 150 110 q 30 -20 50 -5 t 60 -10 t 60 5 t 60 -5 t 60 10',
];

type P = {a: number; rx: number; ry: number; born: number; size: number; spin: number; color: string; sides: number};

const make = (prefix: string, n: number, from: number, to: number): P[] =>
  new Array(n).fill(0).map((_, i) => ({
    a: random(`${prefix}a${i}`) * TAU,
    rx: 300 + random(`${prefix}x${i}`) * 90,
    ry: 250 + random(`${prefix}y${i}`) * 80,
    born: from + random(`${prefix}b${i}`) * (to - from),
    size: 7 + random(`${prefix}s${i}`) * 12,
    spin: (random(`${prefix}r${i}`) - 0.5) * 8,
    color: random(`${prefix}c${i}`) > 0.5 ? AMBER : PINK,
    sides: 3 + Math.floor(random(`${prefix}n${i}`) * 3),
  }));

const poly = (x: number, y: number, s: number, sides: number, rot: number) =>
  new Array(sides)
    .fill(0)
    .map((_, k) => {
      const a = rot + (k / sides) * TAU;
      const rr = s * (0.7 + 0.3 * Math.sin(k * 2.3));
      return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
    })
    .join(' ');

// Fase "limpieza" (desechos que salen) y fase "sin dormir" (desechos que se acumulan).
// Las ventanas se calculan a partir de `switchAt` (frame de "Sin dormir").
const CLEAN_BASE = make('c', 26, 0, 1);
const DIRT_BASE = make('d', 95, 0, 1);

export const Brain: React.FC<{frame: number; switchAt: number; width: number; fillFrames?: number}> = ({
  frame,
  switchAt,
  width,
  fillFrames = 100,
}) => {
  const cleanEnd = Math.max(20, switchAt - 18);
  const CLEAN = CLEAN_BASE.map((p) => ({...p, born: p.born * cleanEnd}));
  const DIRT = DIRT_BASE.map((p) => ({...p, born: switchAt - 3 + p.born * fillFrames}));
  const health = interpolate(frame, [switchAt, switchAt + fillFrames + 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fillA = interpolateColors(health, [0, 1], ['#3a1636', '#4a2a9a']);
  const fillB = interpolateColors(health, [0, 1], ['#5a1d3a', '#a03bb8']);
  const stroke = interpolateColors(health, [0, 1], [PINK, CYAN]);
  const pulse = 0.8 + 0.2 * Math.sin(frame / 5);
  const cleaning = frame < switchAt;

  return (
    <svg viewBox="-120 -110 870 680" width={width} height={(width * 680) / 870} style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="brainFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={fillA} />
          <stop offset="100%" stopColor={fillB} />
        </linearGradient>
        <clipPath id="brainClip">
          <path d={OUTLINE} />
        </clipPath>
        <filter id="brainNeon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ondas de limpieza (líquido cefalorraquídeo) */}
      {cleaning &&
        [0, 1, 2].map((i) => {
          const p = ((frame / 40 + i / 3) % 1);
          return (
            <ellipse
              key={i}
              cx={CX}
              cy={CY}
              rx={230 + p * 220}
              ry={190 + p * 180}
              fill="none"
              stroke={CYAN}
              strokeWidth={6}
              opacity={(1 - p) * 0.5}
            />
          );
        })}

      {/* cerebro */}
      <g filter="url(#brainNeon)" opacity={pulse * (0.6 + 0.4 * health) + 0.2 * (1 - health)}>
        <path d={OUTLINE} fill="url(#brainFill)" stroke={stroke} strokeWidth={8} strokeLinejoin="round" />
      </g>
      <g clipPath="url(#brainClip)" fill="none" stroke={stroke} strokeWidth={6} strokeLinecap="round" opacity={0.65}>
        {GYRI.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <path d="M 330 80 C 300 150 350 200 320 260" />
      </g>
      {/* cerebelo */}
      <path d="M 400 350 C 420 390 480 388 490 325" fill="none" stroke={stroke} strokeWidth={6} opacity={0.7} />

      {/* desechos que se van (con sueño) */}
      {CLEAN.map((p, i) => {
        const f = frame - p.born;
        if (f < 0) return null;
        const prog = Math.min(1, f / 45);
        const k = 0.55 + prog * 1.1;
        const x = CX + Math.cos(p.a) * p.rx * k;
        const y = CY + Math.sin(p.a) * p.ry * k;
        return <polygon key={`c${i}`} points={poly(x, y, p.size, p.sides, f * 0.1)} fill={p.color} opacity={(1 - prog) * 0.9} />;
      })}

      {/* desechos que se acumulan (sin sueño) */}
      {DIRT.map((p, i) => {
        const f = frame - p.born;
        if (f < 0) return null;
        const prog = Math.min(1, f / 22);
        const settle = interpolate(frame, [switchAt, switchAt + fillFrames + 15], [1.0, 0.82], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const k = (1.9 - 0.9 * (1 - Math.pow(1 - prog, 3))) * settle;
        const a = p.a + frame * 0.002 * p.spin;
        const x = CX + Math.cos(a) * p.rx * k + Math.sin(frame / 6 + i) * 4;
        const y = CY + Math.sin(a) * p.ry * k + Math.cos(frame / 7 + i) * 4;
        return (
          <g key={`d${i}`} opacity={Math.min(1, f / 8)}>
            <circle cx={x} cy={y} r={p.size * 1.8} fill={p.color} opacity={0.15} />
            <polygon points={poly(x, y, p.size, p.sides, frame * 0.02 * p.spin)} fill={p.color} />
          </g>
        );
      })}
    </svg>
  );
};
