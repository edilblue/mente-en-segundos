import {Easing, interpolate, spring} from 'remotion';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

/**
 * Zonas del Short (1080×1920):
 *  - escenario (acción):      y ≈ 190–990
 *  - subtítulos (centro):     y ≈ 1010–1230
 *  - datos / etiquetas:       y ≈ 1250–1510
 *  - 20 % inferior (y > 1536) y borde derecho (x > 930 en la mitad baja): libres para la interfaz de YouTube.
 */
export const SAFE = {top: 170, bottom: 1536, right: 930, subY: 1110, cx: 480};

export const C = {
  board: '#1b1f23',
  boardDark: '#121518',
  chalk: '#f4f1e8',
  chalkDim: 'rgba(244,241,232,0.55)',
  green: '#3fbf6a',
  greenDark: '#26874a',
  red: '#e8352e',
  redDark: '#a81f1b',
  blue: '#3f86e0',
  blueDark: '#285aa1',
  brown: '#9a6436',
  brownDark: '#6b4220',
  yellow: '#ffd23f',
  ink: '#0d0f11',
};

export type SuitColor = {main: string; dark: string};
export const SUIT = {
  green: {main: C.green, dark: C.greenDark},
  red: {main: C.red, dark: C.redDark},
  blue: {main: C.blue, dark: C.blueDark},
  brown: {main: C.brown, dark: C.brownDark},
} satisfies Record<string, SuitColor>;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const iv = (t: number, input: number[], output: number[], easing?: (n: number) => number) =>
  interpolate(t, input, output, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const ease = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  back: Easing.out(Easing.back(1.7)),
  expo: Easing.out(Easing.exp),
};

/** Spring que arranca en el segundo `at`. */
export const sp = (t: number, at: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  t < at ? 0 : spring({frame: (t - at) * FPS, fps: FPS, config: {damping: 10, stiffness: 160, mass: 0.7, ...cfg}});

export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const noise = (t: number, seed = 0) => {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(i + seed * 97.3) * 2 - 1, rnd(i + 1 + seed * 97.3) * 2 - 1, u);
};
/** Temblor con decaimiento [dx, dy]. */
export const shake = (t: number, at: number, dur: number, amp: number): [number, number] => {
  if (t < at || t > at + dur) return [0, 0];
  const k = amp * Math.pow(1 - (t - at) / dur, 2);
  return [noise(t * 30, 1) * k, noise(t * 30, 2) * k];
};
/** Rebote rápido (squash) tras un impacto: 0 → pico → oscilación amortiguada. */
export const bounce = (t: number, at: number, amp = 1, freq = 3.2, decay = 5) =>
  t < at ? 0 : amp * Math.sin((t - at) * freq * Math.PI * 2) * Math.exp(-(t - at) * decay);

export const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]/g, '');

export const deg = (a: number) => (a * Math.PI) / 180;
/** Vector unitario para un ángulo medido desde "hacia abajo" (positivo → derecha). */
export const dir = (a: number): [number, number] => [Math.sin(deg(a)), Math.cos(deg(a))];
