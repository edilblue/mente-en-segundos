import {Easing, interpolate, random, spring} from 'remotion';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
/** Zona segura: 150px libres arriba y 250px libres abajo. */
export const SAFE_TOP = 150;
export const SAFE_BOTTOM = H - 250; // 1670

export const C = {
  ink: '#141414',
  paper: '#FFFEF8',
  rule: '#9CC3EC',
  margin: '#F3B3B3',
  yellow: '#FFD21F',
  yellowDark: '#E0A800',
  red: '#E8352E',
  blue: '#3D8BEA',
  blueDark: '#1F5FB8',
  blueLight: '#CFE6FF',
  gray: '#B4B4B4',
  grayDark: '#6F6F6F',
  grayLight: '#E3E3E3',
  white: '#FFFFFF',
};

export const FONT_MAIN = 'InterBlackLocal';
export const FONT_COMIC = 'InterDisplayBlackItalicLocal';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rad = (d: number) => (d * Math.PI) / 180;

/** 0→1 entre los frames a y b con easing. */
export const ramp = (
  f: number,
  a: number,
  b: number,
  ease: (t: number) => number = Easing.inOut(Easing.cubic),
) =>
  interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

/** Spring elástico que arranca en `start` (0 antes). */
export const pop = (
  f: number,
  start: number,
  config: {damping?: number; stiffness?: number; mass?: number} = {damping: 10, stiffness: 180, mass: 0.7},
) => (f < start ? 0 : spring({frame: f - start, fps: FPS, config}));

/** Ruido determinista en [-amp, amp]. */
export const jit = (seed: string | number, amp: number) => (random(String(seed)) - 0.5) * 2 * amp;
export const rnd = (seed: string | number) => random(String(seed));

/** Paso del efecto "boiling line": cambia cada `every` frames. */
export const boil = (f: number, every = 3) => Math.floor(f / every);

export type Ease = 'spring' | 'soft' | 'snap' | 'ease' | 'linear' | 'in' | 'out' | 'hold';

export const prog = (t: number, e: Ease = 'spring', d = 12): number => {
  if (t <= 0) return 0;
  switch (e) {
    case 'spring':
      return spring({frame: t, fps: FPS, config: {damping: 12, stiffness: 140, mass: 0.8}});
    case 'soft':
      return spring({frame: t, fps: FPS, config: {damping: 20, stiffness: 70, mass: 1}});
    case 'snap':
      return spring({frame: t, fps: FPS, config: {damping: 9, stiffness: 260, mass: 0.5}});
    case 'ease':
      return Easing.inOut(Easing.cubic)(clamp(t / d));
    case 'linear':
      return clamp(t / d);
    case 'in':
      return Easing.in(Easing.quad)(clamp(t / d));
    case 'out':
      return Easing.out(Easing.cubic)(clamp(t / d));
    case 'hold':
      return t >= d ? 1 : 0;
  }
};

type NumRec = Record<string, number>;
export type Key<T> = {at: number; v: Partial<T>; e?: Ease; d?: number};

const mix = <T extends NumRec>(a: T, b: T, t: number): T => {
  const o: NumRec = {};
  for (const k of Object.keys(a)) o[k] = a[k] + ((b[k] ?? a[k]) - a[k]) * t;
  return o as T;
};

/**
 * Interpola un objeto numérico entre keyframes. Cada segmento parte del
 * valor real en el momento de empezar (sin saltos aunque el spring no haya
 * terminado), así las poses se encadenan de forma elástica.
 */
export function tween<T extends NumRec>(f: number, keys: Key<T>[], base: T): T {
  const full: T[] = [];
  let acc = {...base};
  for (const k of keys) {
    acc = {...acc, ...k.v} as T;
    full.push(acc);
  }
  let from = full[0];
  let to = full[0];
  let start = -1e6;
  let e: Ease = 'spring';
  let d = 12;
  for (let i = 1; i < keys.length; i++) {
    if (keys[i].at > f) break;
    from = mix(from, to, prog(keys[i].at - start, e, d));
    to = full[i];
    start = keys[i].at;
    e = keys[i].e ?? 'spring';
    d = keys[i].d ?? 12;
  }
  return mix(from, to, prog(f - start, e, d));
}

/** Atajo para un solo número: tw(f, [[frame, valor, ease?, dur?], ...]) */
export function tw(f: number, keys: [number, number, Ease?, number?][]): number {
  return tween<{v: number}>(
    f,
    keys.map(([at, v, e, d]) => ({at, v: {v}, e, d})),
    {v: keys[0][1]},
  ).v;
}

/** Valor discreto (ojos, boca...) según el último keyframe alcanzado. */
export function step<T>(f: number, keys: [number, T][]): T {
  let v = keys[0][1];
  for (const [at, val] of keys) if (f >= at) v = val;
  return v;
}

/** Temblor de cámara a partir de una lista de impactos. */
export function shakeAt(f: number, events: {at: number; amp: number; dur: number}[]) {
  let a = 0;
  for (const e of events) {
    if (f >= e.at && f < e.at + e.dur) {
      const t = (f - e.at) / e.dur;
      a += e.amp * (1 - t) * (1 - t);
    }
  }
  return {x: jit(`shx${f}`, a), y: jit(`shy${f}`, a), r: jit(`shr${f}`, a * 0.05)};
}

/** Catmull-Rom → Bézier para formas orgánicas dibujadas a mano. */
export function smoothPath(pts: [number, number][], closed = true): string {
  const n = pts.length;
  if (n < 2) return '';
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + 'Z' : d;
}

/** Línea "temblorosa" a mano alzada que hierve cada pocos frames. */
export function wobblyLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  f: number,
  seed: string,
  amp = 1.6,
  seg = 70,
): string {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.round(len / seg));
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const b = boil(f, 3);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const o = jit(`${seed}-${i}-${b}`, amp);
    pts.push([lerp(x0, x1, t) + nx * o, lerp(y0, y1, t) + ny * o]);
  }
  return smoothPath(pts, false);
}

/** Contorno circular a mano que hierve. */
export function wobblyCircle(cx: number, cy: number, r: number, f: number, seed: string, amp = 1.5, n = 14) {
  const b = boil(f, 3);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + jit(`${seed}-${i}-${b}`, amp);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return smoothPath(pts, true);
}
