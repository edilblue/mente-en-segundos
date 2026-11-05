import {Easing, interpolate, spring} from 'remotion';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
// Zona segura del Short: 150 px libres arriba y 250 px abajo.
export const SAFE_TOP = 150;
export const SAFE_BOTTOM = H - 250;

export const C = {
  ink: '#141414',
  paper: '#fdfdf8',
  line: '#a9c4ef',
  margin: '#f2a3a3',
  yellow: '#FFD02E',
  red: '#E8322C',
  blue: '#2F7DE1',
  blueLight: '#BBD8FF',
  water: '#3A8EEA',
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** interpolate con extremos fijos (sin extrapolar). */
export const iv = (t: number, input: number[], output: number[], easing?: (n: number) => number) =>
  interpolate(t, input, output, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const ease = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  back: Easing.out(Easing.back(1.8)),
  elastic: Easing.out(Easing.elastic(1.2)),
};

/** Spring elástico que arranca en el segundo `at` (t y at en segundos). */
export const sp = (t: number, at: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: Math.round((t - at) * FPS), fps: FPS, config: {damping: 9, stiffness: 140, mass: 0.7, ...cfg}});

/** Número pseudoaleatorio determinista en [0,1). */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Ruido suave 1D en [-1,1]. */
export const noise = (t: number, seed = 0) => {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(i + seed * 97.3) * 2 - 1, rnd(i + 1 + seed * 97.3) * 2 - 1, u);
};

/** Temblor de cámara con decaimiento. Devuelve [dx, dy]. */
export const shake = (t: number, at: number, dur: number, amp: number): [number, number] => {
  if (t < at || t > at + dur) return [0, 0];
  const k = amp * Math.pow(1 - (t - at) / dur, 2);
  return [noise(t * 28, 1) * k, noise(t * 28, 2) * k];
};

/** Semilla del efecto "boiling line": cambia cada 3 frames. */
export const boilSeed = (frame: number) => Math.floor(frame / 3) % 6;

export const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]/g, '');

export const deg = (a: number) => (a * Math.PI) / 180;
/** Vector unitario para un ángulo medido desde "hacia abajo" (positivo → derecha). */
export const dir = (a: number): [number, number] => [Math.sin(deg(a)), Math.cos(deg(a))];
