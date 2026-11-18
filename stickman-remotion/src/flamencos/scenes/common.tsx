import React from 'react';
import {P, W, rnd} from '../lib';
import {handLine} from '../components/Chalk';

/** Cámara: centra el punto (px,py) del mundo en (sx,sy) de pantalla con zoom z. */
export const Cam: React.FC<{z?: number; px?: number; py?: number; sx?: number; sy?: number; rot?: number; children: React.ReactNode}> = ({
  z = 1,
  px = W / 2,
  py = 960,
  sx,
  sy,
  rot = 0,
  children,
}) => (
  <g transform={`translate(${sx ?? px},${sy ?? py}) rotate(${rot}) scale(${z}) translate(${-px},${-py})`}>{children}</g>
);

/** Suelo de tiza con pasto/rayitas. */
export const Ground: React.FC<{y: number; x1?: number; x2?: number}> = ({y, x1 = -200, x2 = 1280}) => {
  const pts: [number, number][] = [];
  for (let x = x1; x <= x2; x += 80) pts.push([x, y]);
  return (
    <g>
      <path d={handLine(pts, 3, 3)} stroke={P.chalk} strokeWidth={8} fill="none" strokeLinecap="round" />
      {Array.from({length: 14}, (_, i) => {
        const x = x1 + ((x2 - x1) * (i + 0.5)) / 14 + rnd(i) * 30;
        return <path key={i} d={`M${x},${y + 26 + rnd(i * 3) * 40} l${34 + rnd(i * 5) * 30},0`} stroke={P.chalk} strokeWidth={4} opacity={0.35} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** Superficie de agua ondulada (laguna salobre). */
export const Water: React.FC<{y: number; t: number; x1?: number; x2?: number; fill?: boolean}> = ({y, t, x1 = -300, x2 = 1380, fill = true}) => {
  const wave = (yy: number, amp: number, ph: number) => {
    let d = '';
    for (let x = x1; x <= x2; x += 20) d += `${x === x1 ? 'M' : 'L'}${x},${(yy + Math.sin(x * 0.02 + t * 3 + ph) * amp).toFixed(1)}`;
    return d;
  };
  return (
    <g>
      {fill && <path d={`${wave(y, 9, 0)} L${x2},${y + 1400} L${x1},${y + 1400}Z`} fill="#2a3a40" opacity={0.55} />}
      <path d={wave(y, 9, 0)} stroke={P.chalk} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d={wave(y + 60, 6, 2)} stroke={P.chalk} strokeWidth={4} fill="none" opacity={0.3} strokeDasharray="40 30" />
      <path d={wave(y + 140, 5, 4)} stroke={P.chalk} strokeWidth={4} fill="none" opacity={0.18} strokeDasharray="60 50" />
    </g>
  );
};

/** Punto en una curva cúbica. */
export const bez = (p0: number[], p1: number[], p2: number[], p3: number[], u: number) => {
  const a = (1 - u) ** 3;
  const b = 3 * (1 - u) ** 2 * u;
  const c = 3 * (1 - u) * u * u;
  const d = u ** 3;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
};
