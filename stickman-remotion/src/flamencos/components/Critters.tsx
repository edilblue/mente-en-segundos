import React from 'react';
import {P, clamp, mix, rnd} from '../lib';
import {FONT_CHALK} from './Chalk';

/** Puntito de carotenoide: naranja brillante que late. */
export const Pigment: React.FC<{x: number; y: number; r?: number; t: number; color?: string; ring?: number; seed?: number}> = ({
  x,
  y,
  r = 11,
  t,
  color = P.orange,
  ring = 0,
  seed = 0,
}) => {
  const pulse = 1 + 0.18 * Math.sin(t * 9 + seed);
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r * 2.4 * pulse} fill={color} opacity={0.18} />
      <circle r={r * pulse} fill={color} filter="url(#glow)" />
      <circle r={r * 0.4} cx={-r * 0.25} cy={-r * 0.25} fill="#fff4d6" />
      {ring > 0 && ring < 1 && <circle r={r * (1.5 + ring * 4)} fill="none" stroke={color} strokeWidth={4 * (1 - ring)} opacity={1 - ring} />}
    </g>
  );
};

/** Etiqueta de tiza con línea guía. */
export const Tag: React.FC<{x: number; y: number; dx: number; dy: number; text: string; p: number; color?: string; size?: number}> = ({
  x,
  y,
  dx,
  dy,
  text,
  p,
  color = P.orange,
  size = 34,
}) => {
  if (p <= 0) return null;
  const k = clamp(p);
  return (
    <g>
      <path d={`M${x},${y} L${x + dx * k},${y + dy * k}`} stroke={P.chalk} strokeWidth={3.5} strokeDasharray="7 7" />
      <g transform={`translate(${x + dx},${y + dy}) scale(${k})`}>
        <text textAnchor={dx < 0 ? 'end' : 'start'} dominantBaseline="middle" x={dx < 0 ? -8 : 8} fontFamily={FONT_CHALK} fontWeight={700} fontSize={size} fill={color}>
          {text}
        </text>
      </g>
    </g>
  );
};

/** Camarón stickman asustado. Origen = centro del cuerpo; mira a la izquierda. */
export const Shrimp: React.FC<{x: number; y: number; s?: number; t: number; seed?: number; rot?: number; fear?: number; flip?: boolean; wave?: number}> = ({
  x,
  y,
  s = 1,
  t,
  seed = 0,
  rot = 0,
  fear = 1,
  flip = false,
  wave = 0,
}) => {
  const kick = Math.sin(t * 22 + seed * 3);
  const segs = [0, 1, 2, 3, 4];
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${(flip ? -1 : 1) * s},${s})`}>
      {/* cola en abanico */}
      <g transform={`translate(70,6) rotate(${kick * 12})`}>
        <path d="M0,0 L28,-16 L22,0 L28,16Z" fill="rgba(255,154,26,0.25)" stroke={P.chalk} strokeWidth={5} strokeLinejoin="round" />
      </g>
      {/* cuerpo segmentado en arco */}
      <path d="M-46,-4 C-30,-30 40,-30 72,4 C40,-6 -20,-6 -46,-4Z" fill="rgba(255,154,26,0.22)" stroke={P.chalk} strokeWidth={6} strokeLinejoin="round" />
      {segs.map((i) => (
        <path key={i} d={`M${-18 + i * 18},${-20 + Math.abs(i - 2) * 2} l4,14`} stroke={P.chalk} strokeWidth={3.5} strokeLinecap="round" />
      ))}
      {/* patitas que reman */}
      {segs.map((i) => (
        <path key={i} d={`M${-20 + i * 16},-4 l${-6 + Math.sin(t * 26 + i + seed) * 8},18`} stroke={P.chalk} strokeWidth={4} strokeLinecap="round" />
      ))}
      {/* antenas */}
      <path d={`M-44,-12 q-30,-40 -60,${-30 + kick * 6} M-42,-8 q-40,-10 -66,${6 + kick * 6}`} stroke={P.chalk} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      {/* ojos saltones de miedo */}
      {[-34, -18].map((ex, i) => (
        <g key={i}>
          <line x1={ex} y1={-18} x2={ex - 2} y2={-34} stroke={P.chalk} strokeWidth={4} />
          <circle cx={ex - 2} cy={-40} r={10} fill={P.chalk} />
          <circle cx={ex - 4 - fear * 2} cy={-40} r={3 + (1 - fear) * 2} fill={P.dark} />
        </g>
      ))}
      {/* boca de pánico */}
      {fear > 0.3 && <ellipse cx={-44} cy={2} rx={5} ry={7} fill={P.dark} stroke={P.chalk} strokeWidth={3} />}
      {/* gotita de sudor */}
      {fear > 0.5 && <path d={`M-8,-58 q-8,12 0,16 q8,-4 0,-16Z`} fill="#9fd3ff" opacity={0.9} transform={`translate(0,${(t * 40 + seed * 10) % 14})`} />}
      {/* brazo diciendo adiós */}
      {wave > 0 && <path d={`M-10,-26 l${-8},-30 l${Math.sin(t * 14) * 14},-14`} stroke={P.chalk} strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
};

/** Alga espiral (tipo espirulina) verde con motas naranjas. */
export const Algae: React.FC<{x: number; y: number; s?: number; t: number; seed?: number; rot?: number; dots?: number}> = ({x, y, s = 1, t, seed = 0, rot = 0, dots = 1}) => {
  const n = 7;
  let d = '';
  for (let i = 0; i <= n * 8; i++) {
    const u = i / 8;
    const px = u * 22 - (n * 22) / 2;
    const py = Math.sin(u * Math.PI * 2 + t * 4 + seed) * 16;
    d += `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  return (
    <g transform={`translate(${x},${y}) rotate(${rot + Math.sin(t * 2 + seed) * 8}) scale(${s})`}>
      <path d={d} stroke={P.algaeDark} strokeWidth={14} fill="none" strokeLinecap="round" />
      <path d={d} stroke={P.algae} strokeWidth={7} fill="none" strokeLinecap="round" />
      {dots > 0 &&
        [-40, 6, 52].map((px, i) => <circle key={i} cx={px} cy={Math.sin(((px + 77) / 22) * Math.PI * 2 + t * 4 + seed) * 16} r={5 * dots} fill={P.orange} />)}
    </g>
  );
};

/** Hígado chef: dos lóbulos, bigote y gorro de chef. Origen = centro. */
export const LiverChef: React.FC<{t: number; stir?: number; mood?: number; s?: number; whisk?: number}> = ({t, stir = 0, mood = 0, s = 1, whisk = 0}) => {
  const bounce = Math.abs(Math.sin(t * 6)) * 6 * stir;
  return (
    <g transform={`translate(0,${-bounce}) scale(${s})`}>
      <path
        d="M-78,10 C-92,-30 -50,-52 -10,-40 C20,-58 76,-50 82,-14 C88,20 54,46 10,40 C-20,52 -70,44 -78,10Z"
        fill="#5b2f36"
        stroke={P.chalk}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path d="M-6,-38 C-12,-10 -8,20 6,38" stroke={P.chalk} strokeWidth={4} fill="none" opacity={0.6} />
      {/* gorro de chef */}
      <g transform={`translate(-6,-46) rotate(${Math.sin(t * 6) * 6 * stir})`}>
        <rect x={-30} y={-24} width={60} height={22} rx={4} fill={P.chalk} />
        <circle cx={-24} cy={-36} r={18} fill={P.chalk} />
        <circle cx={0} cy={-46} r={22} fill={P.chalk} />
        <circle cx={24} cy={-36} r={18} fill={P.chalk} />
      </g>
      {/* cara */}
      {[-22, 14].map((ex, i) => (
        <g key={i}>
          <ellipse cx={ex} cy={-6} rx={9} ry={11} fill={P.chalk} />
          <circle cx={ex + 2} cy={-4} r={4.5} fill={P.dark} />
        </g>
      ))}
      <path d="M-24,14 q10,-8 18,0 q8,-8 18,0" stroke={P.chalk} strokeWidth={5} fill="none" strokeLinecap="round" />
      {mood > 0 && <path d="M-16,24 q10,10 20,0" stroke={P.chalk} strokeWidth={4} fill="none" strokeLinecap="round" />}
      {/* batidor */}
      {whisk > 0 && (
        <g transform={`translate(60,10) rotate(${-30 + Math.sin(t * 14) * 30 * stir})`} opacity={whisk}>
          <line x1={0} y1={0} x2={0} y2={-56} stroke={P.chalk} strokeWidth={6} strokeLinecap="round" />
          <path d="M0,0 q-16,30 0,44 q16,-14 0,-44 M0,0 q-6,30 0,44 q6,-14 0,-44" stroke={P.chalk} strokeWidth={3.5} fill="none" />
        </g>
      )}
    </g>
  );
};

/** Cartel gigante "¿ROSADO? NI DE CHISTE". Origen = base del poste. */
export const BigSign: React.FC<{rot?: number; sx?: number; sy?: number; post?: number}> = ({rot = 0, sx = 1, sy = 1, post = 250}) => (
  <g transform={`rotate(${rot}) scale(${sx},${sy})`}>
    <rect x={-16} y={-post} width={32} height={post} fill={P.dark} stroke={P.chalk} strokeWidth={6} />
    <g transform={`translate(0,${-post - 170})`}>
      <rect x={-340} y={-170} width={680} height={330} rx={18} fill="#22302b" stroke={P.chalk} strokeWidth={10} />
      <rect x={-318} y={-148} width={636} height={286} rx={10} fill="none" stroke={P.chalk} strokeWidth={3} strokeDasharray="14 10" opacity={0.6} />
      <text x={0} y={-62} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT_CHALK} fontWeight={700} fontSize={118} fill={P.pink}>
        ¿ROSADO?
      </text>
      <text x={0} y={76} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT_CHALK} fontWeight={700} fontSize={104} fill={P.chalk}>
        NI DE CHISTE
      </text>
      <path d="M-250,8 L250,0" stroke={P.chalk} strokeWidth={5} opacity={0.7} strokeLinecap="round" />
    </g>
  </g>
);

/** Calendario de hojas que pasan: "AÑO n". Origen = centro. */
export const Calendar: React.FC<{year: number; flip: number}> = ({year, flip}) => (
  <g>
    <rect x={-110} y={-120} width={220} height={230} rx={14} fill="#22302b" stroke={P.chalk} strokeWidth={7} />
    <rect x={-110} y={-120} width={220} height={58} rx={14} fill={P.chalk} opacity={0.9} />
    {[-60, 0, 60].map((cx) => (
      <circle key={cx} cx={cx} cy={-122} r={9} fill={P.board} stroke={P.chalk} strokeWidth={4} />
    ))}
    <text x={0} y={-90} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT_CHALK} fontWeight={700} fontSize={38} fill={P.board}>
      AÑO
    </text>
    <text x={0} y={22} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT_CHALK} fontWeight={700} fontSize={120} fill={P.chalk}>
      {year}
    </text>
    {flip > 0 && flip < 1 && (
      <g transform={`translate(0,-62) scale(1,${Math.cos(flip * Math.PI)})`}>
        <rect x={-110} y={0} width={220} height={172} fill="#2c3d37" stroke={P.chalk} strokeWidth={5} opacity={0.95} />
      </g>
    )}
  </g>
);

/** Batería de color (gag de los padres cansados). level 0..1. Origen = centro. */
export const ColorBattery: React.FC<{level: number; label?: string}> = ({level, label = 'COLOR'}) => {
  const c = level < 0.3 ? P.red : mix(P.pale, P.pink, clamp(level * 1.3));
  return (
    <g>
      <rect x={-90} y={-44} width={180} height={88} rx={14} fill="none" stroke={P.chalk} strokeWidth={7} />
      <rect x={90} y={-18} width={16} height={36} rx={4} fill={P.chalk} />
      <rect x={-78} y={-32} width={156 * clamp(level)} height={64} rx={6} fill={c} />
      <text x={0} y={80} textAnchor="middle" fontFamily={FONT_CHALK} fontWeight={700} fontSize={34} fill={P.chalk}>
        {label} {Math.round(level * 100)}%
      </text>
    </g>
  );
};

/** Burbujas ascendentes en el agua. */
export const Bubbles: React.FC<{t: number; x: number; y: number; w: number; h: number; n?: number}> = ({t, x, y, w, h, n = 14}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const sp = 60 + rnd(i * 3) * 90;
      const yy = y + h - ((t * sp + rnd(i) * h) % h);
      const xx = x + rnd(i * 5) * w + Math.sin(t * 3 + i) * 8;
      return <circle key={i} cx={xx} cy={yy} r={4 + rnd(i * 9) * 8} fill="none" stroke={P.chalk} strokeWidth={3} opacity={0.5} />;
    })}
  </g>
);
