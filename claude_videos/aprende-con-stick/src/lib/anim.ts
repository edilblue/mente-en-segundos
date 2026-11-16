// Utilidades de animación compartidas por todos los episodios.
// Todo se expresa en SEGUNDOS de escena (t) para que los tiempos sobrevivan
// a cambios de duración de la narración.

export const FPS = 30;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const deg = (d: number) => (d * Math.PI) / 180;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t: number, s = 1.7) => (s + 1) * t * t * t - s * t * t,
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  sine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/** Progreso 0..1 entre t0 y t1 con easing. */
export const prog = (t: number, t0: number, t1: number, e: (x: number) => number = ease.inOut) =>
  e(invLerp(t0, t1, t));

/** Interpolación por tramos: keys [[t, v], ...]. */
export const keys = (t: number, k: [number, number][], e: (x: number) => number = ease.inOut) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], e(invLerp(k[i - 1][0], k[i][0], t)));
  }
  return k[k.length - 1][1];
};

/**
 * Muelle amortiguado analítico (equivalente a spring() de Remotion pero en segundos):
 * 0 antes de t0, se acerca a 1 con rebote según `damping`.
 */
export const springAt = (t: number, t0: number, {stiffness = 170, damping = 12, mass = 1} = {}) => {
  const x = t - t0;
  if (x <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * x) * (Math.cos(wd * x) + ((zeta * w0) / wd) * Math.sin(wd * x));
  }
  return 1 - Math.exp(-w0 * x) * (1 + w0 * x);
};

/** Pop de aparición: escala 0→1 con rebote. */
export const pop = (t: number, t0: number, soft = false) =>
  springAt(t, t0, soft ? {stiffness: 120, damping: 14} : {stiffness: 220, damping: 11});

/** Ruido suave determinista (para temblores y "línea viva"). */
export const noise1 = (x: number, seed = 0) => {
  const s = (n: number) => {
    const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(s(i), s(i + 1), u) * 2 - 1;
};

export const shake = (t: number, amp: number, freq = 22, seed = 1): [number, number] => [
  noise1(t * freq, seed) * amp,
  noise1(t * freq, seed + 7.3) * amp,
];

/** Pulso 0..1 que decae tras t0 (para destellos y golpes). */
export const flash = (t: number, t0: number, dur = 0.35) => (t < t0 ? 0 : Math.max(0, 1 - (t - t0) / dur) ** 2);

/** Onda periódica 0..1 */
export const osc = (t: number, hz: number, phase = 0) => 0.5 + 0.5 * Math.sin((t * hz + phase) * Math.PI * 2);

export const rnd = (i: number, seed = 0) => {
  const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
