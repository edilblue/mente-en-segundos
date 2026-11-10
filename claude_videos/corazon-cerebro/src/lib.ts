// Utilidades matemáticas deterministas (cada fotograma se calcula solo a partir de t).
export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inv = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
/** rampa suave entre a y b (segundos) */
export const ramp = (t: number, a: number, b: number) => smooth(inv(a, b, t));
/** sube en [a,b] y baja en [c,d] */
export const window4 = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d));

// ---------------------------------------------------------------- aleatoriedad
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}
const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453123;
  return x - Math.floor(x);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
};
const hash2 = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
export const noise2 = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
};
export const fbm = (x: number, y: number) => noise2(x, y) * 0.6 + noise2(x * 2.1 + 5, y * 2.1 + 3) * 0.3 + noise2(x * 4.3, y * 4.3) * 0.1;

// ---------------------------------------------------------------- latido
/** pulso cardiaco "lub-dub": devuelve 0..1 (1 = contracción máxima) para una fase en latidos */
export function beat(phase: number) {
  const p = phase - Math.floor(phase);
  const lub = Math.exp(-Math.pow((p - 0.08) / 0.055, 2));
  const dub = 0.6 * Math.exp(-Math.pow((p - 0.3) / 0.05, 2));
  return Math.max(lub, dub);
}
/** fase acumulada para un ritmo (lpm) que varía con el tiempo: integra numéricamente */
export function beatPhase(t: number, bpm: (t: number) => number) {
  const steps = Math.max(4, Math.ceil(t * 10));
  const dt = t / steps;
  let ph = 0;
  for (let i = 0; i < steps; i++) ph += (bpm((i + 0.5) * dt) / 60) * dt;
  return ph;
}

// ---------------------------------------------------------------- 3D
export type V3 = [number, number, number];
export interface Cam {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll?: number;
  f: number; // distancia focal en píxeles
}
/** proyección en perspectiva real (cámara con yaw/pitch/roll). Devuelve [sx, sy, profundidad, escala] */
export function project(p: V3, c: Cam, cx = W / 2, cy = H / 2): [number, number, number, number] {
  let x = p[0] - c.x;
  let y = p[1] - c.y;
  let z = p[2] - c.z;
  const cyw = Math.cos(c.yaw);
  const syw = Math.sin(c.yaw);
  [x, z] = [x * cyw - z * syw, x * syw + z * cyw];
  const cp = Math.cos(c.pitch);
  const sp = Math.sin(c.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];
  if (c.roll) {
    const cr = Math.cos(c.roll);
    const sr = Math.sin(c.roll);
    [x, y] = [x * cr - y * sr, x * sr + y * cr];
  }
  const s = c.f / Math.max(z, 1);
  return [cx + x * s, cy + y * s, z, s];
}

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
};
export const mix = (h1: string, h2: string, t: number) => {
  const a = parseInt(h1.slice(1), 16);
  const b = parseInt(h2.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, clamp(t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/** curva Catmull-Rom cerrada/abierta → path SVG */
export function smoothPath(pts: [number, number][], closed = false, k = 1) {
  if (pts.length < 2) return '';
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + 'Z' : d;
}

/** punto a lo largo de una polilínea (u en 0..1) */
export function along(pts: [number, number][], u: number): [number, number, number] {
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const target = clamp(u) * L[L.length - 1];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] >= target) {
      const f = (target - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      const ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
      return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f), ang];
    }
  }
  const n = pts.length - 1;
  return [pts[n][0], pts[n][1], 0];
}
/** muestrea una curva Catmull-Rom abierta en n puntos */
export function sampleSpline(pts: [number, number][], n = 60): [number, number][] {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out: [number, number][] = [];
  const segs = pts.length - 1;
  for (let j = 0; j <= n; j++) {
    const u = (j / n) * segs;
    const i = Math.min(segs - 1, Math.floor(u));
    const t = u - i;
    const [p0, p1, p2, p3] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
    const t2 = t * t;
    const t3 = t2 * t;
    const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}
