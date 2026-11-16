// Sistema de expresiones de STICK: cada expresión es un conjunto de parámetros numéricos,
// así se pueden mezclar suavemente (no hay "saltos" de una cara a otra).

import {clamp, ease, lerp, noise1} from '../lib/anim';

export type Expr = {
  eyeOpen: number; // 1 normal, <1 párpados caídos, >1 ojos muy abiertos
  eyeScale: number; // tamaño global del ojo
  happyEyes: number; // 0..1 ojos cerrados en arco "^^"
  browY: number; // -1..1 altura general de las cejas
  browIn: number; // -1 (enojo) .. 1 (preocupación): altura del extremo interior
  browAsym: number; // levanta solo la ceja derecha (curiosidad)
  mouthW: number; // 0..1
  curve: number; // -1 (triste) .. 1 (sonrisa)
  open: number; // 0..1 apertura de la boca
  mouthX: number; // desplazamiento lateral de la boca (-1..1)
  blush: number; // 0..1
  sweat: number; // 0..1 gota de sudor
  winkR: number; // 0..1 guiño ojo derecho
};

const base: Expr = {
  eyeOpen: 1,
  eyeScale: 1,
  happyEyes: 0,
  browY: 0,
  browIn: 0,
  browAsym: 0,
  mouthW: 0.42,
  curve: 0.35,
  open: 0,
  mouthX: 0,
  blush: 0,
  sweat: 0,
  winkR: 0,
};
const E = (p: Partial<Expr>): Expr => ({...base, ...p});

export const EXPR = {
  neutral: E({}),
  happy: E({browY: 0.2, curve: 0.85, mouthW: 0.56, blush: 0.35}),
  grin: E({browY: 0.35, curve: 1, open: 0.42, mouthW: 0.72, blush: 0.5}),
  laugh: E({happyEyes: 1, browY: 0.4, curve: 1, open: 0.62, mouthW: 0.7, blush: 0.6}),
  blank: E({eyeOpen: 0.72, browY: -0.1, curve: 0, mouthW: 0.36}),
  calm: E({eyeOpen: 0.82, browY: 0.05, curve: 0.45, mouthW: 0.4}),
  surprised: E({eyeOpen: 1.22, eyeScale: 1.08, browY: 1, curve: 0, open: 0.5, mouthW: 0.28}),
  amazed: E({eyeOpen: 1.2, eyeScale: 1.1, browY: 0.9, curve: 0.6, open: 0.55, mouthW: 0.5, blush: 0.3}),
  curious: E({browAsym: 0.8, browIn: -0.15, curve: 0.15, mouthW: 0.3, mouthX: 0.35}),
  thinking: E({browAsym: 0.55, browIn: 0.15, curve: -0.15, mouthW: 0.26, mouthX: 0.5, eyeOpen: 0.9}),
  worried: E({browIn: 0.85, browY: 0.15, curve: -0.45, mouthW: 0.4, open: 0.1, sweat: 1}),
  scared: E({browIn: 1, browY: 0.6, eyeOpen: 1.28, eyeScale: 1.1, curve: -0.65, open: 0.5, mouthW: 0.55, sweat: 1}),
  wince: E({eyeOpen: 0.22, browIn: 0.7, curve: -0.6, open: 0.3, mouthW: 0.66}),
  determined: E({browIn: -0.65, curve: 0.25, mouthW: 0.46, eyeOpen: 0.92}),
  smug: E({eyeOpen: 0.7, browY: 0.1, browAsym: 0.3, curve: 0.65, mouthW: 0.48, mouthX: 0.25}),
  proud: E({happyEyes: 0.85, browY: 0.3, curve: 0.9, mouthW: 0.6, blush: 0.45}),
  wink: E({winkR: 1, browY: 0.25, curve: 0.95, open: 0.25, mouthW: 0.62, blush: 0.4}),
  oops: E({browIn: 0.6, browY: 0.3, curve: -0.2, open: 0.25, mouthW: 0.34, sweat: 0.8, eyeOpen: 1.08}),
} satisfies Record<string, Expr>;

export const mixExpr = (a: Expr, b: Expr, t: number): Expr => {
  const r = {} as Expr;
  (Object.keys(a) as (keyof Expr)[]).forEach((k) => (r[k] = lerp(a[k], b[k], t)));
  return r;
};

/** Expresiones encadenadas en el tiempo: [[segundo, expr], ...]. */
export const exprAt = (t: number, k: [number, Expr][], trans = 0.2): Expr => {
  let e = k[0][1];
  for (let i = 1; i < k.length; i++) {
    const [at, next] = k[i];
    if (t < at) break;
    e = mixExpr(e, next, ease.out(clamp((t - at) / trans)));
  }
  return e;
};

/** Parpadeo natural: 0 abierto .. 1 cerrado. Intervalos irregulares de 2,4–4,2 s. */
export const blinkAt = (t: number, seed = 0) => {
  let acc = 0.9 + seed * 0.37;
  for (let i = 0; i < 80; i++) {
    const gap = 2.4 + (noise1(i * 1.7, 3 + seed) * 0.5 + 0.5) * 1.8;
    if (t < acc) break;
    const d = t - acc;
    if (d < 0.16) return Math.sin((d / 0.16) * Math.PI);
    acc += gap;
  }
  return 0;
};

/** Boca "hablando": oscila la apertura mientras Stick habla (para planos frontales). */
export const talk = (e: Expr, t: number, active: number): Expr => {
  if (active <= 0) return e;
  const v = Math.max(0, noise1(t * 9, 11) * 0.5 + 0.5) * 0.45 * active;
  return {...e, open: Math.max(e.open, v)};
};
