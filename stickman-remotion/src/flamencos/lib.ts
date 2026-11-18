import narracion from './data/narracion.json';
import {Easing, interpolate} from 'remotion';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = narracion.duracion; // 35 s
export const TOTAL_FRAMES = Math.round(DUR * FPS); // 1050

// Zonas seguras de Shorts: 20 % inferior libre (y > 1536) y borde derecho (botones) libre.
export const SAFE = {top: 170, bottom: 1500, left: 60, right: 890};
export const CX = (SAFE.left + SAFE.right) / 2; // centro horizontal del área segura (475)

// Paleta: pizarra + tiza. El color SOLO vive en el flamenco y su dieta.
export const P = {
  board: '#1c2723',
  boardLight: '#26342f',
  chalk: '#f3f0e6',
  chalkDim: 'rgba(243,240,230,0.55)',
  dark: '#141c19',
  gray: '#9a9a96', // cría / flamenco sin pigmento
  grayDark: '#6f6f6b',
  pink: '#ff6f9c',
  coral: '#ff8a72',
  pinkDeep: '#f2507f',
  pale: '#efe6e3', // flamenco desteñido
  orange: '#ff9a1a',
  orangeGlow: '#ffc04d',
  red: '#e8463c', // leche de buche
  algae: '#7bd36a',
  algaeDark: '#3f9a4a',
  beakTip: '#20201e',
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const iv = (t: number, i: number[], o: number[], easing?: (n: number) => number) =>
  interpolate(t, i, o, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});
export const ease = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  back: Easing.out(Easing.back(2)),
  backIn: Easing.in(Easing.back(2)),
  bounce: Easing.bounce,
  elastic: Easing.out(Easing.elastic(1.3)),
};

/** Muelle amortiguado analítico (0→1 con rebote) que arranca en `at`. */
export const spr = (t: number, at: number, freq = 4.5, damp = 5.5) => {
  const x = t - at;
  if (x <= 0) return 0;
  return 1 - Math.exp(-damp * x) * Math.cos(freq * 2 * Math.PI * x);
};

/** Squash & stretch tras un impacto en `at`: devuelve [sx, sy]. */
export const squash = (t: number, at: number, amt = 0.28, freq = 3.2, damp = 6): [number, number] => {
  const x = t - at;
  if (x < 0) return [1, 1];
  const k = Math.exp(-damp * x) * Math.cos(freq * 2 * Math.PI * x) * amt;
  return [1 + k, 1 - k];
};

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
export const shake = (t: number, at: number, dur: number, amp: number): [number, number] => {
  if (t < at || t > at + dur) return [0, 0];
  const k = amp * Math.pow(1 - (t - at) / dur, 2);
  return [noise(t * 30, 1) * k, noise(t * 30, 2) * k];
};

// ------------------------------------------------------------------ color
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  const k = clamp(t);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
};
/** Color del plumaje: gris → rosa según pigmento, y hacia blanco/gris si se destiñe. */
export const plumaje = (pink: number, pale = 0, paleTo = P.pale) => mix(mix(P.gray, P.pink, pink), paleTo, pale);

// ------------------------------------------------------------------ línea de tiempo (desde la voz real)
export type Palabra = {w: string; start: number; end: number};
export type Escena = {id: number; inicio: number; fin: number; vozInicio: number; vozDur: number; palabras: Palabra[]; audio: string};
export const ESCENAS: Escena[] = narracion.escenas as Escena[];
export const FIN_VOZ = narracion.finVoz;

export const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]/g, '');

/** Segundo GLOBAL en que empieza la palabra `key` (n-ésima aparición) dentro de la escena. */
export const wt = (id: number, key: string, nth = 0) => {
  const e = ESCENAS.find((x) => x.id === id)!;
  const hits = e.palabras.filter((p) => norm(p.w) === norm(key));
  const p = hits[nth] ?? hits[0];
  if (!p) throw new Error(`Palabra "${key}" no está en la escena ${id}`);
  return e.vozInicio + p.start;
};
export const escena = (id: number) => ESCENAS.find((x) => x.id === id)!;
