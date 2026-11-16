import React from 'react';
import {C, FONT} from '../lib/theme';

const OL = {stroke: C.ink, strokeWidth: 8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

/** Campana de alarma. ring 0..1 = intensidad de vibración. */
export const Bell: React.FC<{x: number; y: number; s?: number; ring?: number; t?: number; color?: string}> = ({
  x,
  y,
  s = 1,
  ring = 0,
  t = 0,
  color = C.yellow,
}) => {
  const a = Math.sin(t * 38) * 14 * ring;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform={`rotate(${a} 0 -70)`}>
        <circle cx={Math.sin(t * 38 + 1) * 10 * ring} cy={52} r={16} fill={C.ink} />
        <path d="M -70 40 C -70 -10 -60 -60 0 -62 C 60 -60 70 -10 70 40 L 84 52 L -84 52 Z" fill={color} {...OL} />
        <path d="M -40 -20 C -36 -40 -24 -48 -10 -50" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={0.8} />
        <circle cx={0} cy={-70} r={12} fill={color} {...OL} strokeWidth={6} />
      </g>
      {ring > 0.05 &&
        [-1, 1].map((k) => (
          <g key={k} opacity={ring}>
            {[0, 1].map((i) => (
              <path
                key={i}
                d={`M ${k * (95 + i * 26)} -30 Q ${k * (110 + i * 30)} 0 ${k * (95 + i * 26)} 30`}
                fill="none"
                stroke={C.ink}
                strokeWidth={8}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}
    </g>
  );
};

/** Señal de advertencia triangular con texto opcional en placa. */
export const WarningSign: React.FC<{x: number; y: number; s?: number; text?: string; sway?: number; color?: string}> = ({
  x,
  y,
  s = 1,
  text,
  sway = 0,
  color = C.yellow,
}) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${sway})`}>
    <rect x={-10} y={-300} width={20} height={300} fill="#8C96A8" {...OL} />
    <path d="M 0 -470 L 110 -290 L -110 -290 Z" fill={color} {...OL} strokeWidth={10} />
    <rect x={-9} y={-430} width={18} height={80} rx={9} fill={C.ink} />
    <circle cx={0} cy={-325} r={11} fill={C.ink} />
    {text && (
      <g>
        <rect x={-150} y={-270} width={300} height={74} rx={14} fill={C.white} {...OL} />
        <text x={0} y={-221} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} fill={C.red}>
          {text}
        </text>
      </g>
    )}
  </g>
);

/** Auto caricaturesco (mira a la izquierda). */
export const Car: React.FC<{x: number; y: number; s?: number; t?: number; speed?: number; honk?: number}> = ({x, y, s = 1, t = 0, speed = 1, honk = 0}) => {
  const bob = Math.sin(t * 30) * 3 * speed;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={250} ry={20} fill={C.shadow} />
      {speed > 0.1 &&
        [0, 1, 2].map((i) => (
          <line key={i} x1={270 + i * 20} y1={-160 + i * 50} x2={420 + i * 40} y2={-160 + i * 50} stroke={C.ink} strokeWidth={10} strokeLinecap="round" opacity={0.5 * speed} />
        ))}
      <g transform={`translate(0 ${bob})`}>
        <path d="M -250 -40 C -250 -110 -220 -120 -150 -125 L -90 -210 C -70 -235 60 -240 90 -210 L 150 -130 C 230 -125 255 -100 255 -40 L 255 -30 L -250 -30 Z" fill={C.blue} {...OL} strokeWidth={10} />
        <path d="M -75 -195 L -120 -130 L -10 -130 L -10 -205 C -40 -207 -65 -205 -75 -195 Z" fill="#DDEEFF" {...OL} />
        <path d="M 10 -207 L 10 -130 L 125 -130 L 80 -192 C 65 -205 40 -208 10 -207 Z" fill="#DDEEFF" {...OL} />
        <circle cx={-240} cy={-75} r={20} fill={C.yellowSoft} {...OL} strokeWidth={6} />
        <rect x={-262} y={-48} width={60} height={22} rx={8} fill="#E5E9F0" {...OL} strokeWidth={6} />
        {/* conductor preocupado (círculo simple) */}
        <circle cx={-50} cy={-160} r={26} fill={C.white} {...OL} strokeWidth={6} />
        <ellipse cx={-62} cy={-164} rx={4} ry={7} fill={C.ink} />
        <ellipse cx={-46} cy={-164} rx={4} ry={7} fill={C.ink} />
        <ellipse cx={-56} cy={-146} rx={6} ry={5} fill={C.ink} />
      </g>
      {[-150, 150].map((wx) => (
        <g key={wx} transform={`translate(${wx} -30) rotate(${-t * 900 * speed})`}>
          <circle r={48} fill={C.ink} />
          <circle r={22} fill="#C9CED8" />
          <line x1={-22} y1={0} x2={22} y2={0} stroke={C.ink} strokeWidth={6} />
        </g>
      ))}
      {honk > 0.02 && (
        <g opacity={honk} transform="translate(-300 -150)">
          <text x={0} y={0} textAnchor="end" fontFamily={FONT} fontWeight={700} fontSize={70} fill={C.yellow} stroke={C.ink} strokeWidth={12} paintOrder="stroke">
            ¡PIII!
          </text>
        </g>
      )}
    </g>
  );
};

/** Colmena colgante con abejas. agitation 0..1 */
export const Hive: React.FC<{x: number; y: number; s?: number; t?: number; agitation?: number}> = ({x, y, s = 1, t = 0, agitation = 0}) => {
  const sw = Math.sin(t * 4) * (2 + agitation * 6);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform={`rotate(${sw} 0 -130)`}>
        <line x1={0} y1={-170} x2={0} y2={-120} stroke={C.ink} strokeWidth={8} />
        {[0, 1, 2, 3, 4].map((i) => {
          const w = [70, 110, 125, 110, 75][i];
          return <rect key={i} x={-w} y={-125 + i * 46} width={w * 2} height={50} rx={25} fill={i % 2 ? '#FFC83D' : '#FFD86B'} {...OL} />;
        })}
        <ellipse cx={0} cy={60} rx={22} ry={16} fill={C.ink} />
      </g>
      {Array.from({length: 7}).map((_, i) => {
        const r = 120 + agitation * 120 + (i % 3) * 30;
        const a = t * (2.5 + agitation * 5) + i * 0.9;
        const bx = Math.cos(a) * r * (0.6 + agitation * 0.6);
        const by = Math.sin(a * 1.3) * r * 0.5 + 20;
        if (i > 2 + agitation * 5) return null;
        return (
          <g key={i} transform={`translate(${bx} ${by})`}>
            <ellipse cx={-6} cy={-16} rx={10} ry={14} fill="#fff" stroke={C.ink} strokeWidth={4} opacity={0.9} transform={`rotate(${Math.sin(t * 80 + i) * 25} -6 -6)`} />
            <ellipse cx={0} cy={0} rx={18} ry={13} fill={C.yellow} stroke={C.ink} strokeWidth={5} />
            <line x1={-4} y1={-12} x2={-4} y2={12} stroke={C.ink} strokeWidth={5} />
            <line x1={6} y1={-11} x2={6} y2={11} stroke={C.ink} strokeWidth={5} />
          </g>
        );
      })}
    </g>
  );
};

/** Indicador de aguja (medidor). value 0..1. */
export const Gauge: React.FC<{
  x: number;
  y: number;
  s?: number;
  value: number;
  label: React.ReactNode;
  sub?: string;
  zones?: [string, string, string];
}> = ({x, y, s = 1, value, label, sub, zones = [C.green, C.yellow, C.red]}) => {
  const a0 = -210;
  const a1 = 30;
  const arc = (from: number, to: number, r: number) => {
    const p = (a: number) => [Math.cos((a * Math.PI) / 180) * r, Math.sin((a * Math.PI) / 180) * r];
    const [x0, y0] = p(from);
    const [x1, y1] = p(to);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const ang = a0 + (a1 - a0) * Math.max(0, Math.min(1, value));
  const seg = (a1 - a0) / 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={170} fill={C.white} {...OL} strokeWidth={10} />
      {zones.map((z, i) => (
        <path key={i} d={arc(a0 + seg * i + 2, a0 + seg * (i + 1) - 2, 128)} fill="none" stroke={z} strokeWidth={34} />
      ))}
      {Array.from({length: 13}).map((_, i) => {
        const a = ((a0 + ((a1 - a0) * i) / 12) * Math.PI) / 180;
        return <line key={i} x1={Math.cos(a) * 92} y1={Math.sin(a) * 92} x2={Math.cos(a) * 104} y2={Math.sin(a) * 104} stroke={C.ink} strokeWidth={5} />;
      })}
      <text y={70} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={50} fill={C.ink}>
        {label}
      </text>
      {sub && (
        <text y={112} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={28} fill={C.greyDark}>
          {sub}
        </text>
      )}
      <g transform={`rotate(${ang})`}>
        <path d="M -16 0 L 0 -10 L 122 0 L 0 10 Z" fill={C.red} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      </g>
      <circle r={20} fill={C.ink} />
    </g>
  );
};

/** Barra vertical tipo termómetro (nivel de miedo / pánico). */
export const Meter: React.FC<{x: number; y: number; h?: number; value: number; label: string; color?: string}> = ({
  x,
  y,
  h = 300,
  value,
  label,
  color = C.red,
}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-34} y={-h} width={68} height={h} rx={34} fill={C.white} {...OL} />
    <rect x={-22} y={-h + 12 + (h - 24) * (1 - value)} width={44} height={(h - 24) * value} rx={22} fill={color} />
    <text y={52} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={32} fill={C.ink}>
      {label}
    </text>
  </g>
);

/** Posición del centro de la perilla de la máquina de alarma (coordenadas locales, sin escala). */
export const ALARM_KNOB: [number, number] = [-95, -330];

/**
 * Alarma cerebral: pedestal con perilla de volumen y sirena con un cerebro dentro.
 * level 0..1 intensidad de la alarma; knob 0..1 posición de la perilla (1 = MÁX).
 */
export const AlarmMachine: React.FC<{x: number; y: number; s?: number; level: number; knob: number; t: number; ok?: number}> = ({
  x,
  y,
  s = 1,
  level,
  knob,
  t,
  ok = 0,
}) => {
  const vib = Math.sin(t * 50) * 5 * Math.max(0, level - 0.4);
  const beam = t * 400 * level;
  const kang = -130 + knob * 260;
  const glass = level > 0.55 ? C.red : level > 0.2 ? C.yellow : C.blue;
  return (
    <g transform={`translate(${x + vib} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={6} rx={190} ry={20} fill={C.shadow} />
      {/* haces de luz giratorios */}
      {level > 0.3 && (
        <g transform={`translate(0 -610)`} opacity={(level - 0.3) * 0.9}>
          {[0, 180].map((k) => (
            <path key={k} transform={`rotate(${beam + k})`} d="M 0 0 L 520 -90 L 520 90 Z" fill={C.red} opacity={0.18} />
          ))}
        </g>
      )}
      <rect x={-170} y={-430} width={340} height={430} rx={30} fill="#4F8FEF" {...OL} strokeWidth={10} />
      <rect x={-150} y={-410} width={300} height={36} rx={12} fill="#7FB0FF" />
      {/* dial con zonas */}
      <g transform={`translate(${ALARM_KNOB[0]} ${ALARM_KNOB[1]})`}>
        <circle r={64} fill={C.white} {...OL} />
        <path d="M -48 26 A 52 52 0 0 1 -26 -45" fill="none" stroke={C.blue} strokeWidth={10} />
        <path d="M -20 -48 A 52 52 0 0 1 20 -48" fill="none" stroke={C.green} strokeWidth={10} />
        <path d="M 26 -45 A 52 52 0 0 1 48 26" fill="none" stroke={C.red} strokeWidth={10} />
        <g transform={`rotate(${kang})`}>
          <circle r={34} fill="#DDE6F2" {...OL} strokeWidth={6} />
          <line x1={0} y1={-6} x2={0} y2={-30} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
        </g>
      </g>
      <text x={ALARM_KNOB[0]} y={ALARM_KNOB[1] + 100} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={26} fill={C.white}>
        VOLUMEN
      </text>
      {/* medidor de nivel */}
      <rect x={20} y={-370} width={120} height={200} rx={16} fill="#1E3A6B" {...OL} strokeWidth={6} />
      {Array.from({length: 6}).map((_, i) => {
        const on = level * 6 > i;
        const col = i < 2 ? C.green : i < 4 ? C.yellow : C.red;
        return <rect key={i} x={36} y={-196 - i * 28} width={88} height={20} rx={5} fill={on ? col : '#2E4E85'} />;
      })}
      <rect x={-150} y={-140} width={300} height={90} rx={18} fill={C.white} {...OL} strokeWidth={7} />
      <text x={ok > 0.5 ? -14 : 0} y={-82} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} fill={ok > 0.5 ? C.green : C.ink}>
        {ok > 0.5 ? 'AJUSTADA' : 'ALARMA'}
      </text>
      {ok > 0.5 && <path d="M 112 -100 L 124 -86 L 146 -116" fill="none" stroke={C.green} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />}
      {/* sirena con cerebro */}
      <rect x={-110} y={-470} width={220} height={44} rx={10} fill="#3A6FD0" {...OL} />
      <path d="M -100 -470 C -100 -640 100 -640 100 -470 Z" fill={glass} opacity={0.35} />
      <g transform="translate(0 -530) scale(0.32)">
        <path
          d="M -262 40 C -305 -60 -238 -192 -112 -212 C -42 -262 78 -254 140 -204 C 232 -194 292 -112 282 -20 C 300 42 262 112 190 112 C 160 152 92 162 42 142 C 2 172 -60 162 -82 122 C -142 132 -232 122 -262 40 Z"
          fill={C.pink}
          stroke={C.ink}
          strokeWidth={22}
        />
      </g>
      <path d="M -100 -470 C -100 -640 100 -640 100 -470 Z" fill="none" {...OL} />
      <path d="M -60 -560 C -50 -590 -30 -600 -10 -604" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
    </g>
  );
};

/** Mazo de goma (prop temporal). angle en grados (0 = mango hacia arriba). */
export const Mallet: React.FC<{x: number; y: number; angle: number; s?: number}> = ({x, y, angle, s = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`}>
    <line x1={0} y1={30} x2={0} y2={-190} stroke={C.ink} strokeWidth={24} strokeLinecap="round" />
    <line x1={0} y1={30} x2={0} y2={-190} stroke="#C99A62" strokeWidth={12} strokeLinecap="round" />
    <rect x={-80} y={-270} width={160} height={92} rx={30} fill="#8A93A3" {...OL} strokeWidth={9} />
    <rect x={-80} y={-270} width={44} height={92} rx={18} fill="#C9CED8" {...OL} strokeWidth={7} />
  </g>
);
