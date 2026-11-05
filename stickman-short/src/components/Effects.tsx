import React from 'react';
import {Easing} from 'remotion';
import {C, FONT_COMIC, FONT_MAIN, H, W, boil, clamp, jit, pop, ramp, rnd, smoothPath, wobblyCircle} from '../lib/anim';

/* ------------------------------------------------------------------ */
/* Líneas de velocidad estilo anime                                     */
/* ------------------------------------------------------------------ */

/** Rayas verticales (dir 'down' = las rayas bajan, sensación de subir). */
export const SpeedLines: React.FC<{
  frame: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  count?: number;
  dir?: 'up' | 'down' | 'left' | 'right';
  opacity?: number;
  seed?: string;
  width?: number;
}> = ({frame, x0 = 0, x1 = W, y0 = 0, y1 = H, count = 22, dir = 'down', opacity = 1, seed = 'sl', width = 7}) => {
  const els: React.ReactNode[] = [];
  const vertical = dir === 'up' || dir === 'down';
  const span = vertical ? y1 - y0 : x1 - x0;
  for (let i = 0; i < count; i++) {
    const speed = 60 + rnd(`${seed}sp${i}`) * 60;
    const len = 120 + rnd(`${seed}l${i}`) * 260;
    const across = vertical ? x0 + rnd(`${seed}x${i}`) * (x1 - x0) : y0 + rnd(`${seed}y${i}`) * (y1 - y0);
    let along = (rnd(`${seed}o${i}`) * (span + len) + frame * speed) % (span + len);
    if (dir === 'up' || dir === 'left') along = span + len - along;
    const a = (vertical ? y0 : x0) + along - len;
    const w = width * (0.4 + rnd(`${seed}w${i}`));
    const d = vertical ? `M${across},${a} L${across},${a + len}` : `M${a},${across} L${a + len},${across}`;
    els.push(<path key={i} d={d} stroke={C.ink} strokeWidth={w} strokeLinecap="round" opacity={opacity * (0.35 + 0.5 * rnd(`${seed}a${i}`))} />);
  }
  return <g>{els}</g>;
};

/** Líneas de enfoque radiales (concentration lines) en pantalla. */
export const FocusLines: React.FC<{frame: number; cx?: number; cy?: number; inner?: number; count?: number; opacity?: number; color?: string}> = ({
  frame,
  cx = W / 2,
  cy = H / 2,
  inner = 430,
  count = 70,
  opacity = 1,
  color = C.ink,
}) => {
  const b = boil(frame, 2);
  const els: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + jit(`fa${i}${b}`, 0.04);
    const r0 = inner + rnd(`fr${i}${b}`) * 260;
    const r1 = 1500;
    const wd = 0.006 + rnd(`fw${i}${b}`) * 0.018;
    const p0 = [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0];
    const p1 = [cx + Math.cos(a - wd) * r1, cy + Math.sin(a - wd) * r1];
    const p2 = [cx + Math.cos(a + wd) * r1, cy + Math.sin(a + wd) * r1];
    els.push(<path key={i} d={`M${p0[0]},${p0[1]} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]}Z`} fill={color} />);
  }
  return <g opacity={opacity}>{els}</g>;
};

/* ------------------------------------------------------------------ */
/* Nubes de polvo                                                        */
/* ------------------------------------------------------------------ */
export const Dust: React.FC<{frame: number; x: number; y: number; start: number; scale?: number; count?: number; spread?: number; seed?: string; dur?: number}> = ({
  frame,
  x,
  y,
  start,
  scale = 1,
  count = 7,
  spread = 220,
  seed = 'dust',
  dur = 30,
}) => {
  const t = frame - start;
  if (t < 0 || t > dur) return null;
  const k = t / dur;
  const out = Easing.out(Easing.cubic)(k);
  const els: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const dist = (0.3 + rnd(`${seed}d${i}`) * 0.7) * spread * scale;
    const px = x + side * dist * out;
    const py = y - (10 + rnd(`${seed}h${i}`) * 50) * scale * out;
    const r = (26 + rnd(`${seed}r${i}`) * 26) * scale * (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75 * 0.85);
    if (r <= 1) continue;
    els.push(<path key={i} d={wobblyCircle(px, py, r, frame, `${seed}c${i}`, r * 0.08, 10)} fill="#fff" stroke={C.ink} strokeWidth={Math.max(2, 6 * scale)} />);
  }
  return <g opacity={1 - Math.max(0, k - 0.75) * 4}>{els}</g>;
};

/* ------------------------------------------------------------------ */
/* Onomatopeyas de cómic con rebote                                     */
/* ------------------------------------------------------------------ */
const burstPath = (rx: number, ry: number, spikes: number, seed: string, frame: number) => {
  const b = boil(frame, 3);
  let d = '';
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 + jit(`${seed}${i}`, 0.12) : 0.72 + jit(`${seed}${i}`, 0.05);
    const px = Math.cos(a) * rx * k + jit(`${seed}${i}x${b}`, 2);
    const py = Math.sin(a) * ry * k + jit(`${seed}${i}y${b}`, 2);
    d += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  return d + 'Z';
};

export const Ono: React.FC<{
  frame: number;
  text: string;
  x: number;
  y: number;
  start: number;
  dur?: number;
  size?: number;
  fill?: string;
  rot?: number;
  burst?: boolean;
  burstFill?: string;
}> = ({frame, text, x, y, start, dur = 36, size = 150, fill = C.yellow, rot = -8, burst = true, burstFill = '#fff'}) => {
  const t = frame - start;
  if (t < 0 || t > dur) return null;
  const s = pop(frame, start, {damping: 7, stiffness: 230, mass: 0.6}) * (1 - ramp(frame, start + dur - 6, start + dur, Easing.in(Easing.back(2))));
  const wobble = Math.sin(t * 0.9) * 6 * Math.exp(-t / 14);
  const rx = size * 0.36 * text.length + size * 0.5;
  const ry = size * 0.95;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + wobble}) scale(${Math.max(0, s)})`}>
      {burst && (
        <>
          <path d={burstPath(rx, ry, 13, text, frame)} fill={burstFill} stroke={C.ink} strokeWidth={size * 0.06} strokeLinejoin="round" />
        </>
      )}
      <text
        x={size * 0.05}
        y={size * 0.07}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT_COMIC}
        fontSize={size}
        fill={C.ink}
        stroke={C.ink}
        strokeWidth={size * 0.16}
        strokeLinejoin="round"
      >
        {text}
      </text>
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT_COMIC}
        fontSize={size}
        fill={fill}
        stroke={C.ink}
        strokeWidth={size * 0.12}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {text}
      </text>
    </g>
  );
};

/** Texto a mano (etiquetas, signos ?) con pop. */
export const PopText: React.FC<{
  frame: number;
  text: string;
  x: number;
  y: number;
  start: number;
  end?: number;
  size?: number;
  fill?: string;
  stroke?: string;
  rot?: number;
  font?: string;
  sw?: number;
  anchor?: 'start' | 'middle' | 'end';
}> = ({frame, text, x, y, start, end = 1e9, size = 60, fill = C.ink, stroke, rot = 0, font = FONT_MAIN, sw, anchor = 'middle'}) => {
  if (frame < start || frame > end) return null;
  const s = pop(frame, start) * (1 - ramp(frame, end - 5, end));
  const b = boil(frame, 3);
  return (
    <g transform={`translate(${x + jit(`pt${text}${b}`, 1)} ${y + jit(`pty${text}${b}`, 1)}) rotate(${rot}) scale(${s})`}>
      <text
        textAnchor={anchor}
        dominantBaseline="central"
        fontFamily={font}
        fontSize={size}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw ?? (stroke ? size * 0.14 : 0)}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {text}
      </text>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Emojis dibujados en SVG (sin fuentes ni imágenes externas)           */
/* ------------------------------------------------------------------ */
export type EmojiKind = 'scream' | 'think' | 'laugh' | 'neutral' | 'mind' | 'down';

const FACE = '#FFCD3C';
export const Emoji: React.FC<{kind: EmojiKind; frame: number}> = ({kind, frame}) => {
  const st = {stroke: C.ink, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
  const face = <circle cx={0} cy={0} r={46} fill={FACE} {...st} />;
  switch (kind) {
    case 'think':
      return (
        <g>
          {face}
          <path d="M-28,-24 Q-18,-34 -6,-26" fill="none" {...st} />
          <path d="M8,-20 L28,-18" fill="none" {...st} />
          <ellipse cx={-16} cy={-8} rx={5} ry={8} fill={C.ink} />
          <ellipse cx={17} cy={-6} rx={5} ry={7} fill={C.ink} />
          <path d="M-8,22 L18,16" fill="none" {...st} />
          <path d="M-36,34 Q-34,18 -20,22 L4,28 Q12,32 4,38 L-10,38 Q-6,48 -18,52 Q-36,50 -36,34Z" fill={FACE} {...st} />
          <path d="M-20,22 L-12,4 Q-6,-2 -4,6 L-8,26" fill={FACE} {...st} />
        </g>
      );
    case 'scream':
      return (
        <g>
          <ellipse cx={0} cy={0} rx={42} ry={50} fill={FACE} {...st} />
          <path d="M-40,-14 Q-38,-50 0,-50 Q38,-50 40,-14 Q0,-4 -40,-14Z" fill={C.blue} opacity={0.85} />
          <ellipse cx={0} cy={0} rx={42} ry={50} fill="none" {...st} />
          <ellipse cx={-15} cy={-8} rx={9} ry={12} fill="#fff" {...st} strokeWidth={3.5} />
          <ellipse cx={15} cy={-8} rx={9} ry={12} fill="#fff" {...st} strokeWidth={3.5} />
          <circle cx={-15} cy={-6} r={3} fill={C.ink} />
          <circle cx={15} cy={-6} r={3} fill={C.ink} />
          <ellipse cx={0} cy={26} rx={10} ry={17} fill={C.ink} />
          <ellipse cx={-44} cy={22} rx={12} ry={22} fill={FACE} {...st} transform="rotate(-15 -44 22)" />
          <ellipse cx={44} cy={22} rx={12} ry={22} fill={FACE} {...st} transform="rotate(15 44 22)" />
        </g>
      );
    case 'laugh': {
      const shake = Math.sin(frame * 1.6) * 3;
      return (
        <g transform={`rotate(${shake * 2})`}>
          {face}
          <path d="M-28,-10 Q-17,-22 -6,-10" fill="none" {...st} />
          <path d="M6,-10 Q17,-22 28,-10" fill="none" {...st} />
          <path d="M-26,6 L26,6 Q22,36 0,36 Q-22,36 -26,6Z" fill={C.ink} {...st} />
          <path d="M-20,8 L20,8 L18,14 L-18,14Z" fill="#fff" />
          <path d="M-12,30 Q0,22 12,30 Q0,36 -12,30Z" fill={C.red} />
          <path d={`M-38,-4 Q-56,${10 + shake} -48,${26 + shake} Q-36,${24 + shake} -38,-4Z`} fill={C.blue} stroke={C.ink} strokeWidth={3} />
          <path d={`M38,-4 Q56,${10 - shake} 48,${26 - shake} Q36,${24 - shake} 38,-4Z`} fill={C.blue} stroke={C.ink} strokeWidth={3} />
        </g>
      );
    }
    case 'neutral':
      return (
        <g>
          {face}
          <ellipse cx={-16} cy={-6} rx={5.5} ry={9} fill={C.ink} />
          <ellipse cx={16} cy={-6} rx={5.5} ry={9} fill={C.ink} />
          <path d="M-18,22 L18,22" fill="none" {...st} />
        </g>
      );
    case 'mind': {
      const k = (frame % 20) / 20;
      return (
        <g>
          <path d="M-46,-6 A46,46 0 0,0 46,-6 L40,-14 L28,-6 L16,-16 L4,-6 L-8,-16 L-20,-6 L-32,-16Z" fill={FACE} {...st} />
          <ellipse cx={-16} cy={10} rx={9} ry={9} fill="#fff" {...st} strokeWidth={3.5} />
          <ellipse cx={16} cy={10} rx={9} ry={9} fill="#fff" {...st} strokeWidth={3.5} />
          <circle cx={-16} cy={10} r={3} fill={C.ink} />
          <circle cx={16} cy={10} r={3} fill={C.ink} />
          <ellipse cx={0} cy={30} rx={7} ry={8} fill={C.ink} />
          <g transform={`translate(0 ${-30 - k * 6}) scale(${1 + k * 0.1})`}>
            <path d={smoothPath([[-44, 0], [-50, -24], [-30, -44], [-10, -38], [0, -60], [22, -44], [44, -48], [52, -22], [40, 0]])} fill="#FF8A1F" {...st} />
            <path d={smoothPath([[-24, -6], [-28, -26], [-10, -28], [2, -42], [18, -28], [30, -24], [24, -6]])} fill={C.yellow} stroke="none" />
            <path d={smoothPath([[-10, -10], [-8, -22], [4, -24], [12, -14], [8, -6]])} fill={C.red} stroke="none" />
          </g>
        </g>
      );
    }
    case 'down':
      return (
        <g>
          <rect x={-30} y={-46} width={60} height={50} rx={16} fill={FACE} {...st} />
          <path d="M-30,-30 Q-44,-30 -42,-16 Q-40,-6 -28,-8" fill={FACE} {...st} />
          <rect x={-10} y={-6} width={22} height={58} rx={11} fill={FACE} {...st} />
          <path d="M-18,-46 L-18,-30 M-4,-46 L-4,-30 M10,-46 L10,-30" fill="none" {...st} strokeWidth={3.5} />
        </g>
      );
  }
};

/** Emoji que aparece con pop y flota hacia arriba. */
export const EmojiFloat: React.FC<{
  frame: number;
  kind: EmojiKind;
  x: number;
  y: number;
  start: number;
  dur?: number;
  size?: number;
  drift?: number;
}> = ({frame, kind, x, y, start, dur = 60, size = 150, drift = -160}) => {
  const t = frame - start;
  if (t < 0 || t > dur) return null;
  const s = pop(frame, start, {damping: 8, stiffness: 200, mass: 0.6});
  const out = ramp(frame, start + dur - 10, start + dur);
  const dy = drift * Easing.out(Easing.quad)(t / dur);
  const dx = Math.sin(t * 0.18) * 18;
  const r = Math.sin(t * 0.22) * 10;
  return (
    <g transform={`translate(${x + dx} ${y + dy}) rotate(${r}) scale(${(s * size) / 100 * (1 - out * 0.5)})`} opacity={1 - out}>
      <Emoji kind={kind} frame={frame} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Barrido de tinta negra                                                */
/* ------------------------------------------------------------------ */
export const InkWipe: React.FC<{frame: number; at: number; half?: number; flip?: boolean; seed?: string}> = ({frame, at, half = 8, flip = false, seed = 'ink'}) => {
  const t = frame - (at - half);
  if (t < 0 || t > half * 2) return null;
  const tilt = 260;
  const edge = (base: number, k: string, f: number) => {
    const pts: [number, number][] = [];
    for (let y = -60; y <= H + 60; y += 60) {
      const wave = 34 * Math.sin(y / 95 + f * 0.35 + (k === 'L' ? 0 : 2)) + 18 * Math.sin(y / 33 + (k === 'L' ? 1 : 4));
      pts.push([base + tilt * ((y - H / 2) / H) + wave, y]);
    }
    return pts;
  };
  const ease = Easing.inOut(Easing.cubic);
  const lead = t <= half ? -600 + ease(t / half) * 2300 : 3000;
  const trail = t <= half ? -3000 : -600 + ease((t - half) / half) * 2300;
  const Lp = edge(lead, 'L', t);
  const Tp = edge(trail, 'T', t).reverse();
  const d = smoothPath(Lp, false) + ' L' + Tp.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + 'Z';
  const drops: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const y = rnd(`${seed}y${i}`) * H;
    const ahead = 40 + rnd(`${seed}a${i}`) * 160;
    const baseX = (t <= half ? lead : trail) + tilt * ((y - H / 2) / H);
    const x = t <= half ? baseX + ahead : baseX - ahead;
    const r = 8 + rnd(`${seed}r${i}`) * 26;
    drops.push(<circle key={i} cx={x} cy={y} r={r} fill={C.ink} />);
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <g transform={flip ? `translate(${W} 0) scale(-1 1)` : undefined}>
        <path d={d} fill={C.ink} />
        {drops}
      </g>
    </svg>
  );
};

/** Destello blanco rápido para cortes. */
export const Flash: React.FC<{frame: number; at: number; dur?: number; color?: string}> = ({frame, at, dur = 7, color = '#fff'}) => {
  const t = frame - at;
  if (t < 0 || t > dur) return null;
  return <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={color} opacity={1 - t / dur} />;
};

/* ------------------------------------------------------------------ */
/* La Tierra (azul) con carita                                          */
/* ------------------------------------------------------------------ */
export type EarthFace = 'smug' | 'bored' | 'worried' | 'none' | 'happy';
export const EarthBall: React.FC<{frame: number; x: number; y: number; r: number; face?: EarthFace; rot?: number; look?: [number, number]; seed?: string}> = ({
  frame,
  x,
  y,
  r,
  face = 'smug',
  rot = 0,
  look = [0, 0],
  seed = 'earth',
}) => {
  const s = r / 100;
  const st = {stroke: C.ink, strokeWidth: 7, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
  const lands = [
    [[-70, -40], [-40, -70], [-5, -60], [0, -30], [-25, -10], [-45, 10], [-72, -10]],
    [[-20, 20], [10, 10], [25, 35], [5, 75], [-15, 60]],
    [[30, -70], [70, -50], [80, -10], [55, 0], [35, -25]],
    [[55, 30], [80, 30], [75, 55], [52, 52]],
  ] as [number, number][][];
  const bp = (frame + 13) % 88;
  const blink = bp < 3 ? 0.15 : 1;
  let faceEl: React.ReactNode = null;
  const ex = look[0] * 5;
  const ey = look[1] * 4;
  if (face !== 'none') {
    const eyes =
      face === 'happy' ? (
        <path d="M-38,-8 Q-28,-20 -18,-8 M18,-8 Q28,-20 38,-8" fill="none" {...st} strokeWidth={6} />
      ) : face === 'bored' ? (
        <g>
          <path d={`M${-36 + ex},-6 A9,9 0 0,0 ${-18 + ex},-6Z M${18 + ex},-6 A9,9 0 0,0 ${36 + ex},-6Z`} fill={C.ink} />
          <path d="M-40,-7 L-14,-7 M14,-7 L40,-7" {...st} strokeWidth={5} />
        </g>
      ) : (
        <g>
          <ellipse cx={-27 + ex} cy={-8 + ey} rx={8} ry={12 * blink} fill={C.ink} />
          <ellipse cx={27 + ex} cy={-8 + ey} rx={8} ry={12 * blink} fill={C.ink} />
        </g>
      );
    const mouth =
      face === 'smug' ? (
        <path d="M-22,28 Q4,34 26,16" fill="none" {...st} strokeWidth={6} />
      ) : face === 'bored' ? (
        <path d="M-18,30 L18,30" fill="none" {...st} strokeWidth={6} />
      ) : face === 'worried' ? (
        <path d="M-20,34 L-10,26 L0,34 L10,26 L20,34" fill="none" {...st} strokeWidth={5} />
      ) : (
        <path d="M-24,20 Q0,46 24,20Z" fill={C.ink} {...st} strokeWidth={5} />
      );
    const brow = face === 'smug' ? <path d="M12,-30 L40,-26 M-40,-26 L-14,-32" fill="none" {...st} strokeWidth={5} /> : face === 'worried' ? <path d="M-40,-24 L-16,-32 M16,-32 L40,-24" fill="none" {...st} strokeWidth={5} /> : null;
    faceEl = (
      <g>
        {eyes}
        {mouth}
        {brow}
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={wobblyCircle(0, 0, 100, frame, seed, 1.2, 18)} fill={C.blue} />
      {lands.map((l, i) => (
        <path key={i} d={smoothPath(l)} fill="#7FB8F5" stroke={C.blueDark} strokeWidth={4} />
      ))}
      <path d="M-62,-62 Q-80,-30 -74,0" stroke="#fff" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.55} />
      {faceEl}
      <path d={wobblyCircle(0, 0, 100, frame, seed, 1.2, 18)} fill="none" stroke={C.ink} strokeWidth={8 / Math.max(0.5, s)} />
    </g>
  );
};

/** Etiqueta tipo papelito con borde a mano. */
export const Tag: React.FC<{frame: number; x: number; y: number; text: string; start: number; size?: number; fill?: string; rot?: number; color?: string; end?: number}> = ({
  frame,
  x,
  y,
  text,
  start,
  size = 40,
  fill = '#fff',
  rot = -3,
  color = C.ink,
  end = 1e9,
}) => {
  if (frame < start || frame > end) return null;
  const s = pop(frame, start) * (1 - ramp(frame, end - 5, end));
  const w = text.length * size * 0.6 + size;
  const h = size * 1.6;
  const b = boil(frame, 3);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + jit(`tag${text}${b}`, 0.4)}) scale(${s})`}>
      <rect x={-w / 2 + 6} y={-h / 2 + 6} width={w} height={h} rx={12} fill={C.ink} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={12} fill={fill} stroke={C.ink} strokeWidth={5} />
      <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={size} fill={color}>
        {text}
      </text>
    </g>
  );
};

/** Flecha dibujada a mano. */
export const Arrow: React.FC<{x: number; y: number; len: number; angle: number; color?: string; width?: number; frame: number; seed?: string}> = ({
  x,
  y,
  len,
  angle,
  color = C.ink,
  width = 10,
  frame,
  seed = 'arw',
}) => {
  const b = boil(frame, 3);
  const bend = jit(`${seed}bend`, len * 0.12) + jit(`${seed}${b}`, 2);
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={`M0,0 Q${len / 2},${bend} ${len},0`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" />
      <path d={`M${len - width * 2.6},${-width * 2} L${len + 2},0 L${len - width * 2.6},${width * 2}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

export const Sparkle: React.FC<{x: number; y: number; r: number; frame: number; start: number; color?: string}> = ({x, y, r, frame, start, color = C.yellow}) => {
  const t = frame - start;
  if (t < 0 || t > 24) return null;
  const s = Math.sin((t / 24) * Math.PI);
  const rr = r * s;
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${t * 4})`}
      d={`M0,${-rr} Q${rr * 0.15},${-rr * 0.15} ${rr},0 Q${rr * 0.15},${rr * 0.15} 0,${rr} Q${-rr * 0.15},${rr * 0.15} ${-rr},0 Q${-rr * 0.15},${-rr * 0.15} 0,${-rr}Z`}
      fill={color}
      stroke={C.ink}
      strokeWidth={4}
      strokeLinejoin="round"
    />
  );
};

export {clamp};
