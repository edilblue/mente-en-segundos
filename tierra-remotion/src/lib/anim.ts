import {Easing, interpolate} from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);
export const backOut = Easing.out(Easing.back(1.8));

/** interpolación con clamp y easing opcional (tiempos en segundos) */
export const tw = (t: number, ts: number[], vs: number[], easing: (x: number) => number = easeInOut) =>
  interpolate(t, ts, vs, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

/** 0→1 entre a y b */
export const prog = (t: number, a: number, b: number, easing: (x: number) => number = easeInOut) =>
  tw(t, [a, b], [0, 1], easing);

/** pop con rebote (escala 0→1 con overshoot) */
export const pop = (t: number, t0: number, dur = 0.35) => {
  const x = clamp((t - t0) / dur);
  if (x <= 0) return 0;
  const c1 = 2.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** oscilación amortiguada (para sacudidas/impactos) */
export const damped = (t: number, t0: number, freq = 9, decay = 5) =>
  t < t0 ? 0 : Math.sin((t - t0) * freq * Math.PI * 2) * Math.exp(-(t - t0) * decay);

// --------------------------------------------------------------- aleatorio determinista
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash3 = (x: number, y: number, z: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** value noise 3D suave en [0,1] */
export const noise3 = (x: number, y: number, z: number, seed = 1) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++)
    for (let dy = 0; dy < 2; dy++)
      for (let dz = 0; dz < 2; dz++) {
        const wgt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
        r += wgt * hash3(xi + dx, yi + dy, zi + dz, seed);
      }
  return r;
};

export const fbm3 = (x: number, y: number, z: number, seed = 1, oct = 4) => {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x * f, y * f, z * f, seed + i * 17);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
};

/** temblor de cámara suave y determinista */
export const shake = (t: number, amp: number, seed = 3) => [
  (noise3(t * 7, 0.3, 0.1, seed) - 0.5) * 2 * amp,
  (noise3(0.2, t * 7, 0.7, seed + 1) - 0.5) * 2 * amp,
  (noise3(0.5, 0.9, t * 7, seed + 2) - 0.5) * 2 * amp,
];
