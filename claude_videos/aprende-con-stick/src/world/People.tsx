import React from 'react';
import {C, FONT} from '../lib/theme';
import {Heart, Lungs} from './Brain';

const OL = {stroke: C.ink, strokeWidth: 8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

/**
 * Persona genérica de los estudios (NO es Stick): figura gris de cuerpo relleno.
 * panic 0..1 cambia la cara y la postura. xray muestra pulmones y corazón.
 */
export const Person: React.FC<{x: number; y: number; s?: number; panic?: number; t?: number; xray?: number; calmLook?: number}> = ({
  x,
  y,
  s = 1,
  panic = 0,
  t = 0,
  xray = 0,
  calmLook = 0,
}) => {
  const sh = Math.sin(t * 45) * 4 * panic;
  const eyeR = 7 + panic * 5;
  const armUp = panic; // manos al pecho
  return (
    <g transform={`translate(${x + sh} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={90} ry={14} fill={C.shadow} />
      {/* piernas */}
      <path d="M -30 -150 L -40 0 M 30 -150 L 40 0" fill="none" stroke="#7D8597" strokeWidth={30} strokeLinecap="round" />
      {/* brazos */}
      <path
        d={`M -62 -300 Q ${-95 + armUp * 50} ${-220 - armUp * 40} ${-70 + armUp * 70} ${-150 - armUp * 120}`}
        fill="none"
        stroke="#7D8597"
        strokeWidth={26}
        strokeLinecap="round"
      />
      <path
        d={`M 62 -300 Q ${95 - armUp * 50} ${-220 - armUp * 40} ${70 - armUp * 70} ${-150 - armUp * 120}`}
        fill="none"
        stroke="#7D8597"
        strokeWidth={26}
        strokeLinecap="round"
      />
      {/* torso */}
      <rect x={-75} y={-330} width={150} height={200} rx={60} fill="#A9B1C0" {...OL} />
      {xray > 0 && (
        <g opacity={xray}>
          <rect x={-60} y={-318} width={120} height={176} rx={50} fill="#E4F0FF" />
          <Lungs x={0} y={-238} s={0.62} breath={0.5 + 0.5 * Math.sin(t * (3 + panic * 9))} />
          <Heart x={18} y={-196} s={0.24} beat={Math.max(0, Math.sin(t * (6 + panic * 14)))} />
        </g>
      )}
      {/* cabeza */}
      <circle cx={0} cy={-405} r={68} fill="#C9CED8" {...OL} />
      <ellipse cx={-22 + calmLook * 10} cy={-415} rx={eyeR * 0.8} ry={eyeR} fill={C.ink} />
      <ellipse cx={22 + calmLook * 10} cy={-415} rx={eyeR * 0.8} ry={eyeR} fill={C.ink} />
      {panic > 0.3 ? (
        <ellipse cx={0} cy={-370} rx={16} ry={10 + panic * 10} fill={C.ink} />
      ) : (
        <path d="M -16 -372 Q 0 -364 16 -372" fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      )}
      <path d={`M -40 ${-450 - panic * 8} L -12 ${-446 + panic * 4}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      <path d={`M 40 ${-450 - panic * 8} L 12 ${-446 + panic * 4}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      {panic > 0.4 &&
        [-1, 1].map((k) => (
          <path
            key={k}
            transform={`translate(${k * 80} ${-430 + ((t * 40 + k * 7) % 20)})`}
            d="M0 -14 C 7 -3 10 3 10 8 A 10 10 0 0 1 -10 8 C -10 3 -7 -3 0 -14 Z"
            fill="#7CC4FF"
            stroke={C.ink}
            strokeWidth={4}
          />
        ))}
    </g>
  );
};

/** Serpiente que se alza (ilustración de amenaza externa). rise 0..1 */
export const Snake: React.FC<{x: number; y: number; s?: number; rise?: number; t?: number}> = ({x, y, s = 1, rise = 1, t = 0}) => {
  const h = 60 + rise * 170;
  const sw = Math.sin(t * 3) * 18;
  const tongue = Math.sin(t * 14) > 0.3;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={20} cy={0} rx={120} ry={14} fill={C.shadow} />
      <path
        d={`M -100 -10 C -40 10 60 10 80 -20 C 100 -60 ${20 + sw} ${-h * 0.5} ${sw} ${-h}`}
        fill="none"
        stroke={C.ink}
        strokeWidth={46}
        strokeLinecap="round"
      />
      <path
        d={`M -100 -10 C -40 10 60 10 80 -20 C 100 -60 ${20 + sw} ${-h * 0.5} ${sw} ${-h}`}
        fill="none"
        stroke="#7BD389"
        strokeWidth={32}
        strokeLinecap="round"
      />
      <path
        d={`M -100 -10 C -40 10 60 10 80 -20 C 100 -60 ${20 + sw} ${-h * 0.5} ${sw} ${-h}`}
        fill="none"
        stroke="#4FAE62"
        strokeWidth={8}
        strokeDasharray="4 26"
        strokeLinecap="round"
      />
      <g transform={`translate(${sw} ${-h})`}>
        <ellipse cx={-30} cy={0} rx={50} ry={34} fill="#7BD389" {...OL} />
        <ellipse cx={-42} cy={-14} rx={8} ry={10} fill={C.ink} />
        <circle cx={-44} cy={-17} r={3} fill={C.white} />
        {tongue && <path d="M -78 6 L -104 6 L -114 -2 M -104 6 L -114 14" fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" />}
      </g>
    </g>
  );
};

/** Molécula de CO₂ (O=C=O). */
export const CO2: React.FC<{x: number; y: number; s?: number; o?: number}> = ({x, y, s = 1, o = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <line x1={-34} y1={0} x2={34} y2={0} stroke={C.ink} strokeWidth={8} />
    <circle cx={-34} cy={0} r={17} fill={C.red} stroke={C.ink} strokeWidth={5} />
    <circle cx={34} cy={0} r={17} fill={C.red} stroke={C.ink} strokeWidth={5} />
    <circle cx={0} cy={0} r={21} fill="#3B3F4A" stroke={C.ink} strokeWidth={5} />
    <text x={0} y={7} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} fill={C.white}>
      C
    </text>
  </g>
);
