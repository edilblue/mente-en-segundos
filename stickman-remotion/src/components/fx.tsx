import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FPS, H, W, boilSeed, clamp, ease, iv, noise, rnd, sp} from '../lib';

export const FONT_COMIC = 'Bangers, Impact, sans-serif';
export const FONT_SUB = '"Luckiest Guy", Bangers, Impact, sans-serif';

/** Filtro "boiling line": desplazamiento con ruido cuya semilla cambia cada 3 frames. */
export const BoilDefs: React.FC<{id?: string; scale?: number}> = ({id = 'boil', scale = 4.5}) => {
  const f = useCurrentFrame();
  return (
    <defs>
      <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={boilSeed(f) + 1} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  );
};

/** Escenario SVG de pantalla completa con temblor de cámara y líneas "hirviendo". */
export const Stage: React.FC<{children: React.ReactNode; shake?: [number, number]; zoom?: number; zx?: number; zy?: number}> = ({
  children,
  shake = [0, 0],
  zoom = 1,
  zx = W / 2,
  zy = H / 2,
}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    <BoilDefs />
    <g transform={`translate(${shake[0]},${shake[1]}) translate(${zx},${zy}) scale(${zoom}) translate(${-zx},${-zy})`}>
      <g filter="url(#boil)">{children}</g>
    </g>
  </svg>
);

/** Línea dibujada a mano que "hierve". */
export const wobble = (x1: number, y1: number, x2: number, y2: number, seed: number, amp = 2.5, seg = 8) => {
  let d = `M${x1},${y1}`;
  for (let i = 1; i <= seg; i++) {
    const u = i / seg;
    const j = i === seg ? 0 : (rnd(seed * 31 + i) - 0.5) * 2 * amp;
    d += ` L${x1 + (x2 - x1) * u + j * 0.3},${y1 + (y2 - y1) * u + j}`;
  }
  return d;
};

/** Hoja de cuaderno: fondo blanco con líneas azules tenues y margen. */
export const Paper: React.FC = () => {
  const f = useCurrentFrame();
  const s = boilSeed(f);
  const lines = [];
  for (let y = 96; y < H; y += 72) lines.push(<path key={y} d={wobble(-10, y, W + 10, y, y + s * 13, 1.6, 6)} stroke={C.line} strokeWidth={3} fill="none" opacity={0.55} />);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <rect width={W} height={H} fill={C.paper} />
      {lines}
      <path d={wobble(96, -10, 96, H + 10, 7 + s * 5, 1.6, 10)} stroke={C.margin} strokeWidth={3} fill="none" opacity={0.6} />
    </svg>
  );
};

export const Ground: React.FC<{y: number; x1?: number; x2?: number; sw?: number}> = ({y, x1 = 30, x2 = W - 30, sw = 9}) => (
  <g>
    <path d={wobble(x1, y, x2, y, 4, 2, 14)} stroke={C.ink} strokeWidth={sw} fill="none" strokeLinecap="round" />
    {[0.12, 0.33, 0.58, 0.81].map((u, i) => (
      <path key={i} d={`M${x1 + (x2 - x1) * u},${y + 22} l38,0`} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
    ))}
  </g>
);

const starPath = (r: number, n: number, seed: number, inner = 0.62) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r * (0.9 + rnd(seed + i) * 0.25) : r * inner;
    d += `${i ? 'L' : 'M'}${Math.cos(a) * rr},${Math.sin(a) * rr}`;
  }
  return d + 'Z';
};

/** Onomatopeya de cómic con rebote (¡PUM!, ¡BOING!, ¡SPLASH!, ¿EH?...). */
export const Onomatopeya: React.FC<{
  t: number;
  at: number;
  text: string;
  x: number;
  y: number;
  dur?: number;
  size?: number;
  color?: string;
  rot?: number;
  burst?: string | null;
}> = ({t, at, text, x, y, dur = 1.2, size = 150, color = C.yellow, rot = -8, burst = null}) => {
  if (t < at || t > at + dur) return null;
  const k = sp(t, at, {damping: 7, stiffness: 180});
  const out = iv(t, [at + dur - 0.2, at + dur], [1, 0], ease.in);
  const s = k * out;
  const wob = Math.sin((t - at) * 18) * 3 * (1 - clamp((t - at) / 0.6));
  return (
    <g transform={`translate(${x},${y}) rotate(${rot + wob}) scale(${s})`}>
      {burst && <path d={starPath(size * 1.25, 13, text.length)} fill={burst} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT_COMIC}
        fontSize={size}
        letterSpacing={4}
        fill={C.ink}
        stroke={C.ink}
        strokeWidth={size * 0.14}
        strokeLinejoin="round"
        x={7}
        y={8}
      >
        {text}
      </text>
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT_COMIC}
        fontSize={size}
        letterSpacing={4}
        fill={color}
        stroke={C.ink}
        strokeWidth={size * 0.11}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {text}
      </text>
    </g>
  );
};

/** Líneas de velocidad (dirección en grados, 0 = hacia arriba). */
export const SpeedLines: React.FC<{t: number; x: number; y: number; w: number; h: number; angle?: number; n?: number; seed?: number; opacity?: number; sw?: number}> = ({
  t,
  x,
  y,
  w,
  h,
  angle = 0,
  n = 9,
  seed = 1,
  opacity = 1,
  sw = 7,
}) => {
  if (opacity <= 0.01) return null;
  const items = [];
  for (let i = 0; i < n; i++) {
    const px = (rnd(seed + i * 3) - 0.5) * w;
    const len = h * (0.35 + rnd(seed + i * 7) * 0.5);
    const phase = (t * 3.2 + rnd(seed + i) * 3) % 1;
    const py = (phase - 0.2) * h;
    items.push(<path key={i} d={`M${px},${py} l0,${len}`} stroke={C.ink} strokeWidth={sw} strokeLinecap="round" opacity={(1 - phase) * opacity} />);
  }
  return <g transform={`translate(${x},${y}) rotate(${angle})`}>{items}</g>;
};

/** Nube de polvo al aterrizar. */
export const Dust: React.FC<{t: number; at: number; x: number; y: number; size?: number; dur?: number}> = ({t, at, x, y, size = 1, dur = 1}) => {
  if (t < at || t > at + dur) return null;
  const u = (t - at) / dur;
  const e = ease.out(u);
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const k = Math.floor(i / 2) + 1;
    const dx = side * (40 + k * 55) * e * size;
    const dy = -(20 + rnd(i + 3) * 50) * e * size;
    const r = (34 + rnd(i) * 26) * size * (0.4 + e * 0.8) * (1 - u * 0.6);
    puffs.push(<circle key={i} cx={x + dx} cy={y - 10 * size + dy} r={r} fill={C.paper} stroke={C.ink} strokeWidth={6} opacity={1 - u * u} />);
  }
  return <g>{puffs}</g>;
};

// ------------------------------------------------------------------ Emojis (dibujados con código)
export type EmojiKind = '😱' | '🤔' | '😂' | '😐' | '🤯' | '😎';

export const EmojiFace: React.FC<{e: EmojiKind; r?: number}> = ({e, r = 56}) => {
  const ink = {stroke: C.ink, strokeWidth: 6, strokeLinecap: 'round' as const, fill: 'none'};
  const base = <circle r={r} fill={C.yellow} stroke={C.ink} strokeWidth={7} />;
  const dotEyes = (
    <>
      <ellipse cx={-r * 0.33} cy={-r * 0.15} rx={r * 0.09} ry={r * 0.14} fill={C.ink} />
      <ellipse cx={r * 0.33} cy={-r * 0.15} rx={r * 0.09} ry={r * 0.14} fill={C.ink} />
    </>
  );
  switch (e) {
    case '😱':
      return (
        <g>
          <clipPath id="scream">
            <circle r={r} />
          </clipPath>
          {base}
          <rect x={-r} y={-r} width={r * 2} height={r * 0.9} fill={C.blue} opacity={0.75} clipPath="url(#scream)" />
          <circle r={r} fill="none" stroke={C.ink} strokeWidth={7} />
          <ellipse cx={-r * 0.32} cy={-r * 0.18} rx={r * 0.18} ry={r * 0.26} fill="#fff" stroke={C.ink} strokeWidth={4} />
          <ellipse cx={r * 0.32} cy={-r * 0.18} rx={r * 0.18} ry={r * 0.26} fill="#fff" stroke={C.ink} strokeWidth={4} />
          <circle cx={-r * 0.32} cy={-r * 0.16} r={r * 0.06} fill={C.ink} />
          <circle cx={r * 0.32} cy={-r * 0.16} r={r * 0.06} fill={C.ink} />
          <ellipse cx={0} cy={r * 0.45} rx={r * 0.18} ry={r * 0.32} fill={C.ink} />
          <ellipse cx={-r * 0.92} cy={r * 0.35} rx={r * 0.2} ry={r * 0.36} fill={C.yellow} stroke={C.ink} strokeWidth={5} />
          <ellipse cx={r * 0.92} cy={r * 0.35} rx={r * 0.2} ry={r * 0.36} fill={C.yellow} stroke={C.ink} strokeWidth={5} />
        </g>
      );
    case '🤔':
      return (
        <g>
          {base}
          {dotEyes}
          <path d={`M${-r * 0.5},${-r * 0.42} l${r * 0.3},${-r * 0.08}`} {...ink} />
          <path d={`M${r * 0.18},${-r * 0.55} q${r * 0.18},${-r * 0.14} ${r * 0.34},0`} {...ink} />
          <path d={`M${-r * 0.25},${r * 0.38} l${r * 0.45},${-r * 0.06}`} {...ink} />
          <path
            d={`M${-r * 0.1},${r * 0.95} q${r * 0.05},${-r * 0.35} ${r * 0.25},${-r * 0.42} l${r * 0.08},${-r * 0.28} q${r * 0.12},0 ${r * 0.1},${r * 0.3} l${r * 0.2},${r * 0.02} q${r * 0.12},${r * 0.25} -${r * 0.05},${r * 0.42} z`}
            fill={C.yellow}
            stroke={C.ink}
            strokeWidth={5}
            strokeLinejoin="round"
          />
        </g>
      );
    case '😂':
      return (
        <g>
          {base}
          <path d={`M${-r * 0.5},${-r * 0.1} q${r * 0.17},${-r * 0.3} ${r * 0.34},0`} {...ink} />
          <path d={`M${r * 0.16},${-r * 0.1} q${r * 0.17},${-r * 0.3} ${r * 0.34},0`} {...ink} />
          <path d={`M${-r * 0.5},${r * 0.15} Q0,${r * 0.95} ${r * 0.5},${r * 0.15} Z`} fill={C.ink} />
          <path d={`M${-r * 0.3},${r * 0.45} Q0,${r * 0.75} ${r * 0.3},${r * 0.45}`} fill="#ff7b7b" />
          <path d={`M${-r * 0.7},${-r * 0.05} q${-r * 0.35},${r * 0.2} ${-r * 0.3},${r * 0.55} q${r * 0.25},${r * 0.05} ${r * 0.3},${-r * 0.3} z`} fill={C.blueLight} stroke={C.blue} strokeWidth={4} />
          <path d={`M${r * 0.7},${-r * 0.05} q${r * 0.35},${r * 0.2} ${r * 0.3},${r * 0.55} q${-r * 0.25},${r * 0.05} ${-r * 0.3},${-r * 0.3} z`} fill={C.blueLight} stroke={C.blue} strokeWidth={4} />
        </g>
      );
    case '😐':
      return (
        <g>
          {base}
          {dotEyes}
          <path d={`M${-r * 0.35},${r * 0.4} L${r * 0.35},${r * 0.4}`} {...ink} />
        </g>
      );
    case '🤯':
      return (
        <g>
          <path d={starPath(r * 1.05, 9, 4, 0.55)} transform={`translate(0,${-r * 0.95}) scale(1,0.8)`} fill={C.red} stroke={C.ink} strokeWidth={5} />
          <path d={starPath(r * 0.6, 7, 9, 0.5)} transform={`translate(0,${-r * 0.95}) scale(1,0.8)`} fill={C.yellow} stroke={C.ink} strokeWidth={4} />
          <path d={`M${-r},0 A${r},${r} 0 0 0 ${r},0 L${r * 0.7},${-r * 0.55} L${-r * 0.7},${-r * 0.55} Z`} fill={C.yellow} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
          <circle cx={-r * 0.33} cy={-r * 0.05} r={r * 0.17} fill="#fff" stroke={C.ink} strokeWidth={4} />
          <circle cx={r * 0.33} cy={-r * 0.05} r={r * 0.17} fill="#fff" stroke={C.ink} strokeWidth={4} />
          <circle cx={-r * 0.33} cy={-r * 0.05} r={r * 0.06} fill={C.ink} />
          <circle cx={r * 0.33} cy={-r * 0.05} r={r * 0.06} fill={C.ink} />
          <ellipse cx={0} cy={r * 0.5} rx={r * 0.2} ry={r * 0.18} fill={C.ink} />
        </g>
      );
    case '😎':
      return (
        <g>
          {base}
          <path d={`M${-r * 0.8},${-r * 0.22} L${r * 0.8},${-r * 0.22}`} stroke={C.ink} strokeWidth={7} />
          <path d={`M${-r * 0.7},${-r * 0.24} h${r * 0.58} q0,${r * 0.42} ${-r * 0.3},${r * 0.42} q${-r * 0.28},0 ${-r * 0.28},${-r * 0.42} z`} fill={C.ink} />
          <path d={`M${r * 0.12},${-r * 0.24} h${r * 0.58} q0,${r * 0.42} ${-r * 0.3},${r * 0.42} q${-r * 0.28},0 ${-r * 0.28},${-r * 0.42} z`} fill={C.ink} />
          <path d={`M${-r * 0.55},${-r * 0.15} l${r * 0.15},0`} stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
          <path d={`M${-r * 0.35},${r * 0.45} Q${r * 0.1},${r * 0.7} ${r * 0.45},${r * 0.3}`} {...ink} />
        </g>
      );
  }
};

/** Emoji de reacción que aparece con rebote y sube flotando. */
export const EmojiFloat: React.FC<{t: number; at: number; e: EmojiKind; x: number; y: number; dur?: number; size?: number}> = ({t, at, e, x, y, dur = 1.8, size = 1}) => {
  if (t < at || t > at + dur) return null;
  const u = (t - at) / dur;
  const k = sp(t, at, {damping: 8, stiffness: 170});
  const out = iv(t, [at + dur - 0.35, at + dur], [1, 0]);
  const dy = -u * 130;
  const dx = Math.sin(u * 7) * 14;
  return (
    <g transform={`translate(${x + dx},${y + dy}) rotate(${Math.sin(u * 9) * 10}) scale(${k * size * (0.6 + 0.4 * out)})`} opacity={out}>
      <EmojiFace e={e} />
    </g>
  );
};

/** Bocadillo de cómic. */
export const Bubble: React.FC<{x: number; y: number; w: number; h: number; tail: [number, number]; s?: number; children?: React.ReactNode}> = ({x, y, w, h, tail, s = 1, children}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d={`M${-w * 0.12},${h * 0.4} L${tail[0]},${tail[1]} L${w * 0.12},${h * 0.42} Z`} fill="#fff" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
    <ellipse rx={w / 2} ry={h / 2} fill="#fff" stroke={C.ink} strokeWidth={8} />
    <path d={`M${-w * 0.1},${h * 0.38} L${w * 0.1},${h * 0.38}`} stroke="#fff" strokeWidth={12} />
    {children}
  </g>
);

/** Texto de cómic estático (para carteles y números). */
export const ComicText: React.FC<{x: number; y: number; size: number; fill?: string; children: React.ReactNode; rot?: number; anchor?: 'middle' | 'start' | 'end'; sw?: number}> = ({
  x,
  y,
  size,
  fill = '#fff',
  children,
  rot = 0,
  anchor = 'middle',
  sw,
}) => (
  <text
    x={x}
    y={y}
    transform={rot ? `rotate(${rot},${x},${y})` : undefined}
    textAnchor={anchor}
    dominantBaseline="central"
    fontFamily={FONT_COMIC}
    fontSize={size}
    letterSpacing={3}
    fill={fill}
    stroke={C.ink}
    strokeWidth={sw ?? size * 0.12}
    strokeLinejoin="round"
    paintOrder="stroke"
  >
    {children}
  </text>
);

/** Gotas de sudor / líneas de esfuerzo. */
export const Sweat: React.FC<{t: number; x: number; y: number; on: number}> = ({t, x, y, on}) => {
  if (on <= 0) return null;
  return (
    <g opacity={on}>
      {[0, 1, 2].map((i) => {
        const ph = (t * 1.6 + i / 3) % 1;
        const sx = x + (i - 1) * 50 + (i - 1) * ph * 40;
        const sy = y - 30 + ph * 70 + Math.abs(i - 1) * 20;
        return <path key={i} d={`M${sx},${sy - 18} q14,22 0,30 q-14,-8 0,-30 z`} fill={C.blueLight} stroke={C.ink} strokeWidth={4} opacity={1 - ph} />;
      })}
    </g>
  );
};

/** Líneas de temblor/esfuerzo alrededor de un objeto. */
export const StrainLines: React.FC<{t: number; x: number; y: number; r: number; on: number}> = ({t, x, y, r, on}) => {
  if (on <= 0) return null;
  const items = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const j = noise(t * 20, i) * 6;
    const r1 = r + 10 + j;
    items.push(
      <path key={i} d={`M${x + Math.cos(a) * r1},${y + Math.sin(a) * r1} l${Math.cos(a) * 26},${Math.sin(a) * 26}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={on} />,
    );
  }
  return <g>{items}</g>;
};

/** Signo de interrogación flotante. */
export const QMark: React.FC<{t: number; at: number; x: number; y: number; size?: number; color?: string}> = ({t, at, x, y, size = 90, color = '#fff'}) => {
  if (t < at) return null;
  const k = sp(t, at);
  return (
    <g transform={`translate(${x},${y + Math.sin((t - at) * 4) * 8}) scale(${k}) rotate(${Math.sin((t - at) * 3) * 8})`}>
      <ComicText x={0} y={0} size={size} fill={color}>
        ?
      </ComicText>
    </g>
  );
};

export const frameOf = (s: number) => Math.round(s * FPS);
