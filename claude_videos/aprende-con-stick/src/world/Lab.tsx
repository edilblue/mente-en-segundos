import React from 'react';
import {C, FONT} from '../lib/theme';
import {rnd} from '../lib/anim';

const OL = {stroke: C.ink, strokeWidth: 8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

/** Matraz con líquido y burbujas que suben. */
export const Flask: React.FC<{x: number; y: number; s?: number; color?: string; t: number; seed?: number}> = ({x, y, s = 1, color = C.blueSoft, t, seed = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -18 -110 L -18 -60 L -60 0 L 60 0 L 18 -60 L 18 -110 Z" fill="#F4FAFF" {...OL} />
    <path d="M -46 -18 L -32 -40 L 32 -40 L 46 -18 L 52 -6 L -52 -6 Z" fill={color} />
    <rect x={-24} y={-122} width={48} height={16} rx={6} fill={C.white} {...OL} strokeWidth={6} />
    {[0, 1, 2].map((i) => {
      const u = (t * (0.7 + rnd(i, seed) * 0.5) + i / 3) % 1;
      return <circle key={i} cx={Math.sin(u * 9 + i) * 8} cy={-20 - u * 110} r={5 + i * 2} fill={color} stroke={C.ink} strokeWidth={3} opacity={1 - u} />;
    })}
  </g>
);

export const LabRoom: React.FC<{t: number; floor?: number; screen?: boolean}> = ({t, floor = 1700, screen = true}) => (
  <g>
    <rect width={1080} height={1920} fill="#EEF5FF" />
    {Array.from({length: 10}).map((_, i) => (
      <line key={i} x1={0} y1={floor - 120 - i * 130} x2={1080} y2={floor - 120 - i * 130} stroke="#E0EBFA" strokeWidth={4} />
    ))}
    <rect x={0} y={floor - 130} width={1080} height={130} fill="#DDE9F8" />
    <line x1={0} y1={floor - 130} x2={1080} y2={floor - 130} stroke="#B8CCE6" strokeWidth={6} />
    {/* estantes con matraces */}
    {[
      [40, 1300],
      [760, 1300],
    ].map(([sx, sy], k) => (
      <g key={k}>
        <rect x={sx} y={sy} width={280} height={22} rx={6} fill="#B9C9DF" {...OL} strokeWidth={6} />
        <Flask x={sx + 60} y={sy} s={0.8} color={k ? C.yellowSoft : C.blueSoft} t={t} seed={k} />
        <Flask x={sx + 150} y={sy} s={0.62} color={k ? C.redSoft : '#BDF0D0'} t={t + 0.4} seed={k + 3} />
        <rect x={sx + 205} y={sy - 90} width={50} height={90} rx={8} fill="#F4FAFF" {...OL} strokeWidth={6} />
        <rect x={sx + 211} y={sy - 50} width={38} height={44} rx={4} fill={k ? C.blueSoft : C.yellowSoft} />
      </g>
    ))}
    <rect x={0} y={floor} width={1080} height={1920 - floor} fill="#C9D9EE" />
    <line x1={0} y1={floor} x2={1080} y2={floor} stroke={C.ink} strokeWidth={8} />
    {Array.from({length: 7}).map((_, i) => (
      <line key={i} x1={i * 180 - 40} y1={floor} x2={i * 180 - 140} y2={1920} stroke="#B6C8E0" strokeWidth={5} />
    ))}
    {screen && <rect x={70} y={210} width={940} height={820} rx={36} fill="#1E3A6B" {...OL} strokeWidth={12} />}
  </g>
);

/** Pantalla grande del laboratorio (marco + cuadrícula). Los hijos se dibujan dentro (clip). */
export const LabScreen: React.FC<{x?: number; y?: number; w?: number; h?: number; title?: string; children?: React.ReactNode; id: string; tint?: string}> = ({
  x = 70,
  y = 210,
  w = 940,
  h = 820,
  title,
  children,
  id,
  tint = '#1E3A6B',
}) => (
  <g>
    <rect x={x + 10} y={y + 16} width={w} height={h} rx={36} fill={C.shadow} />
    <rect x={x} y={y} width={w} height={h} rx={36} fill={tint} stroke={C.ink} strokeWidth={12} />
    <defs>
      <clipPath id={id}>
        <rect x={x + 14} y={y + 14} width={w - 28} height={h - 28} rx={26} />
      </clipPath>
    </defs>
    <g clipPath={`url(#${id})`}>
      {Array.from({length: Math.ceil(w / 60)}).map((_, i) => (
        <line key={`v${i}`} x1={x + i * 60} y1={y} x2={x + i * 60} y2={y + h} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={3} />
      ))}
      {Array.from({length: Math.ceil(h / 60)}).map((_, i) => (
        <line key={`h${i}`} x1={x} y1={y + i * 60} x2={x + w} y2={y + i * 60} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={3} />
      ))}
      {children}
    </g>
    {title && (
      <g>
        <rect x={x + w / 2 - title.length * 15 - 30} y={y - 34} width={title.length * 30 + 60} height={64} rx={32} fill={C.yellow} stroke={C.ink} strokeWidth={7} />
        <text x={x + w / 2} y={y + 10} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={36} fill={C.ink}>
          {title}
        </text>
      </g>
    )}
  </g>
);

/** Interruptor de palanca sobre pedestal. on 0..1 (1 = arriba/ENCENDIDO). */
export const LEVER = {pivot: [-60, -330] as [number, number], len: 100};
/** Posición del pomo de la palanca (coordenadas del pedestal, sin escala). */
export const leverKnob = (on: number): [number, number] => {
  const a = ((-120 + on * 60) * Math.PI) / 180;
  return [LEVER.pivot[0] + 108 * Math.sin(a), LEVER.pivot[1] - 108 * Math.cos(a)];
};

/** Interruptor de palanca sobre pedestal. on 0..1 (1 = arriba/ENCENDIDO, 0 = abajo/APAGADO). */
export const LeverSwitch: React.FC<{x: number; y: number; on: number; label: string; s?: number; spark?: number; t?: number}> = ({
  x,
  y,
  on,
  label,
  s = 1,
  spark = 0,
  t = 0,
}) => {
  const ang = -120 + on * 60;
  const [px, py] = LEVER.pivot;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={130} ry={16} fill={C.shadow} />
      <rect x={-50} y={-250} width={100} height={250} fill="#B9C9DF" {...OL} />
      <rect x={-110} y={-430} width={220} height={190} rx={24} fill={C.white} {...OL} strokeWidth={10} />
      <rect x={-105} y={-520} width={210} height={70} rx={16} fill={C.yellow} {...OL} />
      <text x={0} y={-471} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={42} fill={C.ink}>
        {label}
      </text>
      <circle cx={55} cy={-375} r={16} fill={on > 0.5 ? C.green : '#9AA2B1'} {...OL} strokeWidth={5} />
      <circle cx={55} cy={-290} r={16} fill={on > 0.5 ? '#9AA2B1' : C.red} {...OL} strokeWidth={5} />
      <text x={55} y={-398} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill={C.greyDark}>
        ON
      </text>
      <text x={55} y={-252} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill={C.greyDark}>
        OFF
      </text>
      <rect x={px - 26} y={py - 70} width={52} height={140} rx={14} fill="#DDE6F2" {...OL} strokeWidth={6} />
      <g transform={`translate(${px} ${py}) rotate(${ang})`}>
        <line x1={0} y1={0} x2={0} y2={-100} stroke={C.ink} strokeWidth={22} strokeLinecap="round" />
        <line x1={0} y1={0} x2={0} y2={-100} stroke="#9AA6B8" strokeWidth={10} strokeLinecap="round" />
        <circle cx={0} cy={-108} r={26} fill={C.red} {...OL} strokeWidth={7} />
      </g>
      <circle cx={px} cy={py} r={12} fill={C.ink} />
      {spark > 0.01 &&
        Array.from({length: 7}).map((_, i) => {
          const a = (i / 7) * Math.PI * 2 + t * 3;
          const r0 = 70 + (1 - spark) * 50;
          return (
            <line
              key={i}
              x1={Math.cos(a) * r0}
              y1={-335 + Math.sin(a) * r0}
              x2={Math.cos(a) * (r0 + 40 * spark)}
              y2={-335 + Math.sin(a) * (r0 + 40 * spark)}
              stroke={C.yellow}
              strokeWidth={10}
              strokeLinecap="round"
              opacity={spark}
            />
          );
        })}
    </g>
  );
};

/** Puertas corredizas del laboratorio (transición de entrada). open 0..1 */
export const LabDoors: React.FC<{open: number}> = ({open}) => {
  if (open >= 1) return null;
  const off = open * 560;
  return (
    <g>
      {[-1, 1].map((k) => (
        <g key={k} transform={`translate(${k * off} 0)`}>
          <rect x={k < 0 ? -20 : 540} y={-20} width={560} height={1960} fill="#4F8FEF" stroke={C.ink} strokeWidth={12} />
          <rect x={k < 0 ? 380 : 580} y={700} width={100} height={500} rx={20} fill="#9CC6FF" stroke={C.ink} strokeWidth={8} />
        </g>
      ))}
      <g transform={`translate(${-off} 0)`}>
        <rect x={150} y={420} width={300} height={130} rx={20} fill={C.yellow} stroke={C.ink} strokeWidth={9} />
        <text x={300} y={510} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={80} fill={C.ink}>
          LAB
        </text>
      </g>
      <g transform={`translate(${off} 0)`}>
        <circle cx={800} cy={485} r={70} fill={C.white} stroke={C.ink} strokeWidth={9} />
        <path d="M 770 470 C 770 440 830 440 830 470 C 830 500 770 500 770 520" fill="none" stroke={C.pinkDeep} strokeWidth={10} strokeLinecap="round" />
      </g>
    </g>
  );
};
