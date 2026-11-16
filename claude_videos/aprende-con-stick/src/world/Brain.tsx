import React, {useId} from 'react';
import {C, FONT} from '../lib/theme';

const OL = {stroke: C.ink, strokeWidth: 9, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

/** Posiciones de regiones (coordenadas del cerebro, vista lateral mirando a la derecha, escala 1). */
export const REGION = {
  amygdala: [74, 86] as [number, number],
  insula: [30, 10] as [number, number],
  prefrontal: [200, -70] as [number, number],
  hypothalamus: [22, 70] as [number, number],
  brainstem: [-48, 200] as [number, number],
  hippocampus: [-20, 92] as [number, number],
};
export type RegionName = keyof typeof REGION;

export const BRAIN_PATH =
  'M -262 40 C -305 -60 -238 -192 -112 -212 C -42 -262 78 -254 140 -204 C 232 -194 292 -112 282 -20 C 300 42 262 112 190 112 C 160 152 92 162 42 142 C 2 172 -60 162 -82 122 C -142 132 -232 122 -262 40 Z';

const GYRI = [
  'M -205 -80 C -150 -125 -100 -60 -40 -112',
  'M -70 -175 C -20 -122 40 -184 92 -134',
  'M 118 -155 C 160 -100 222 -134 242 -62',
  'M -225 22 C -160 -12 -120 52 -62 10',
  'M -10 -46 C 52 -86 102 -22 162 -54',
  'M -150 -150 C -120 -110 -150 -70 -110 -40',
  'M 200 -10 C 240 0 250 40 230 70',
  'M -12 58 C 58 26 122 28 205 70',
  'M -160 70 C -120 50 -80 90 -40 60',
];

/**
 * Cerebro caricaturesco (vista lateral). glow: intensidad 0..1 por región.
 * deep = muestra las estructuras profundas (amígdala, ínsula…) como "rayos X".
 */
export const Brain: React.FC<{
  x: number;
  y: number;
  s?: number;
  t?: number;
  glow?: Partial<Record<RegionName, number>>;
  deep?: number;
  dim?: number; // 0..1 apaga el color (cerebro "en pausa")
  stem?: boolean;
}> = ({x, y, s = 1, t = 0, glow = {}, deep = 0, dim = 0, stem = true}) => {
  const id = useId().replace(/:/g, '');
  const breathe = 1 + Math.sin(t * 2.2) * 0.012;
  const regionColor: Record<RegionName, string> = {
    amygdala: C.red,
    insula: C.yellow,
    prefrontal: C.blue,
    hypothalamus: '#A66BFF',
    brainstem: C.green,
    hippocampus: '#FF8A3D',
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s * breathe})`}>
      <defs>
        <clipPath id={`bc${id}`}>
          <path d={BRAIN_PATH} />
        </clipPath>
        <radialGradient id={`gl${id}`}>
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      {stem && (
        <>
          <path d="M -70 110 C -60 170 -78 230 -90 280 L -20 280 C -14 220 -6 170 -10 120 Z" fill="#F7A9BC" {...OL} />
          <g>
            <ellipse cx={-178} cy={138} rx={92} ry={58} fill="#F6A0B6" {...OL} />
            {[-30, -10, 10, 30].map((k) => (
              <path key={k} d={`M -250 ${138 + k} C -200 ${128 + k} -150 ${148 + k} -100 ${134 + k}`} fill="none" stroke="#D86E8D" strokeWidth={5} />
            ))}
          </g>
        </>
      )}
      <path d={BRAIN_PATH} fill={C.pink} {...OL} />
      <g clipPath={`url(#bc${id})`}>
        <ellipse cx={-30} cy={-120} rx={210} ry={70} fill="#FFD3DE" />
        {GYRI.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#DE7E9B" strokeWidth={9} strokeLinecap="round" />
        ))}
        {deep > 0 && (
          <g opacity={deep}>
            <rect x={-320} y={-280} width={640} height={460} fill={C.white} opacity={0.45} />
            {/* estructuras profundas */}
            <path d="M -10 30 C 20 -10 70 -10 80 30 C 70 50 20 50 -10 30 Z" fill="#FFE7A3" stroke={C.ink} strokeWidth={5} />
            <path d="M -70 100 C -40 70 10 70 40 96" fill="none" stroke="#FFB27A" strokeWidth={16} strokeLinecap="round" />
          </g>
        )}
      </g>
      {dim > 0 && <path d={BRAIN_PATH} fill="#B8BECB" opacity={dim * 0.75} />}
      {/* amígdala: siempre visible como almendra */}
      <g transform={`translate(${REGION.amygdala[0]} ${REGION.amygdala[1]}) rotate(-24)`}>
        <ellipse rx={30} ry={20} fill={dim > 0.5 ? '#9AA2B1' : '#F25C7A'} stroke={C.ink} strokeWidth={6} />
      </g>
      {(Object.keys(glow) as RegionName[]).map((k) => {
        const g = glow[k] ?? 0;
        if (g <= 0.01) return null;
        const [rx, ry] = REGION[k];
        const pulse = 1 + Math.sin(t * 9) * 0.08;
        return (
          <g key={k} transform={`translate(${rx} ${ry})`}>
            <circle r={95 * g * pulse} fill={`url(#gl${id})`} opacity={0.9} />
            <circle r={55 * g * pulse} fill={regionColor[k]} opacity={0.35 * g} />
            <circle r={26} fill={regionColor[k]} stroke={C.ink} strokeWidth={6} opacity={Math.min(1, g * 1.5)} />
          </g>
        );
      })}
    </g>
  );
};

/** Corazón caricaturesco. beat 0..1 = contracción. */
export const Heart: React.FC<{x: number; y: number; s?: number; beat?: number; color?: string}> = ({x, y, s = 1, beat = 0, color = C.red}) => (
  <g transform={`translate(${x} ${y}) scale(${s * (1 + beat * 0.16)} ${s * (1 + beat * 0.12)})`}>
    <path
      d="M 0 70 C -60 30 -95 0 -95 -35 C -95 -70 -55 -88 -28 -72 C -14 -64 -4 -52 0 -42 C 4 -52 14 -64 28 -72 C 55 -88 95 -70 95 -35 C 95 0 60 30 0 70 Z"
      fill={color}
      {...OL}
    />
    <path d="M -62 -42 C -60 -58 -44 -66 -32 -60" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.75} />
  </g>
);

/** Latido: devuelve 0..1 (doble pulso lub-dub) a `bpm` latidos por minuto, con fase acumulada. */
export const heartbeat = (phase: number) => {
  const p = phase % 1;
  const a = Math.exp(-Math.pow((p - 0.05) / 0.035, 2));
  const b = Math.exp(-Math.pow((p - 0.2) / 0.04, 2)) * 0.6;
  return Math.max(a, b);
};

export const Lungs: React.FC<{x: number; y: number; s?: number; breath?: number}> = ({x, y, s = 1, breath = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M 0 -70 L 0 -10 M 0 -10 C -10 0 -20 4 -30 10 M 0 -10 C 10 0 20 4 30 10" fill="none" {...OL} strokeWidth={8} />
    {[-1, 1].map((k) => (
      <path
        key={k}
        transform={`scale(${k * (1 + breath * 0.08)} ${1 + breath * 0.08})`}
        d="M 22 -40 C 70 -60 92 10 86 60 C 82 90 40 92 22 70 Z"
        fill="#9CC6FF"
        {...OL}
      />
    ))}
  </g>
);

export const Gut: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -30 -60 C 40 -70 70 -20 50 20 C 30 60 -40 70 -60 30 C -70 10 -50 -10 -30 0" fill="#FFD27A" {...OL} />
    <path d="M -20 -20 C 10 -30 30 -10 20 10" fill="none" stroke="#D9A43C" strokeWidth={7} strokeLinecap="round" />
  </g>
);

export const RegionTag: React.FC<{x: number; y: number; text: string; color: string; s?: number; align?: 'start' | 'end' | 'middle'}> = ({
  x,
  y,
  text,
  color,
  s = 1,
  align = 'middle',
}) => {
  if (s <= 0.01) return null;
  const w = text.length * 22 + 40;
  const ox = align === 'start' ? w / 2 : align === 'end' ? -w / 2 : 0;
  return (
    <g transform={`translate(${x + ox} ${y}) scale(${s})`}>
      <rect x={-w / 2} y={-26} width={w} height={52} rx={26} fill={C.white} stroke={color} strokeWidth={6} />
      <text y={12} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={32} fill={C.ink}>
        {text}
      </text>
    </g>
  );
};
