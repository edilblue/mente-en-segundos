// Sistema de poses de STICK.
// Ángulos en grados medidos desde "hacia abajo"; positivo = hacia +x (derecha en pantalla,
// o hacia donde mira Stick si `flip`). Cada extremidad es [segmento superior, flexión del inferior].

import {clamp, ease, lerp} from '../lib/anim';

export type Limb = [number, number];
export type HandShape = 'fist' | 'open' | 'point' | 'thumb';
export type Pose = {
  torso: number;
  head: number;
  armL: Limb; // brazo de atrás (izquierda en pantalla cuando mira a la derecha)
  armR: Limb; // brazo de delante
  legL: Limb;
  legR: Limb;
  handL?: HandShape;
  handR?: HandShape;
};


/**
 * Cinemática inversa de 2 huesos: devuelve [superior, flexión] para que la mano llegue a
 * (dx, dy) medido desde el hombro (px sin escala, y hacia abajo). sign = lado del codo (+1/-1).
 */
export const ik = (dx: number, dy: number, sign = 1, u = 80, f = 74): Limb => {
  const d = Math.min(u + f - 0.5, Math.max(12, Math.hypot(dx, dy)));
  const th = (Math.atan2(dx, dy) * 180) / Math.PI;
  const a = (Math.acos((u * u + d * d - f * f) / (2 * u * d)) * 180) / Math.PI;
  const b = (Math.acos((u * u + f * f - d * d) / (2 * u * f)) * 180) / Math.PI;
  return [th + sign * a, -sign * (180 - b)];
};

const P = <T extends Record<string, Pose>>(p: T): {[K in keyof T]: Pose} => p;

export const POSES = P({
  stand: {torso: 0, head: 0, armL: [-14, -6], armR: [14, 6], legL: [-8, 0], legR: [8, 0]},
  relaxed: {torso: -2, head: 3, armL: [-10, 10], armR: [12, 12], legL: [-9, 0], legR: [10, 0]},
  handsHips: {torso: 0, head: 0, armL: ik(-34, 72, -1), armR: ik(34, 72, 1), legL: [-12, 0], legR: [12, 0]},
  point: {torso: -3, head: 4, armL: [-14, -8], armR: [96, -2], legL: [-10, 0], legR: [10, 0], handR: 'point'},
  pointUp: {torso: -2, head: -10, armL: [-18, -12], armR: [140, 4], legL: [-10, 0], legR: [10, 0], handR: 'point'},
  pointDiag: {torso: -3, head: -4, armL: [-16, -10], armR: [128, -4], legL: [-10, 0], legR: [10, 0], handR: 'point'},
  think: {torso: 2, head: 9, armL: ik(30, 70, -1), armR: ik(18, -44, 1), legL: [-8, 0], legR: [9, 0], handR: 'fist'},
  shrug: {torso: 0, head: 10, armL: [-70, 85], armR: [70, -85], legL: [-10, 0], legR: [10, 0], handL: 'open', handR: 'open'},
  open: {torso: -3, head: -5, armL: [-120, -15], armR: [120, 15], legL: [-14, 0], legR: [14, 0], handL: 'open', handR: 'open'},
  wave: {torso: -2, head: 4, armL: [-14, -6], armR: ik(110, -90, -1), legL: [-9, 0], legR: [9, 0], handR: 'open'},
  hero: {torso: -6, head: -8, armL: ik(-34, 70, -1), armR: ik(34, 70, 1), legL: [-20, 0], legR: [20, 0]},
  heroFist: {torso: -5, head: -10, armL: ik(-34, 70, -1), armR: [138, 6], legL: [-18, 0], legR: [16, 4]},
  coverEars: {torso: 4, head: 0, armL: ik(-70, -98, 1), armR: ik(70, -98, -1), legL: [-12, 6], legR: [12, -6], handL: 'open', handR: 'open'},
  reach: {torso: 6, head: 6, armL: [-20, -8], armR: [70, 10], legL: [-12, 2], legR: [14, 0], handR: 'open'},
  reachLow: {torso: 14, head: 10, armL: [-24, -6], armR: [48, 6], legL: [-14, 6], legR: [16, -4], handR: 'open'},
  turnKnob: {torso: 4, head: 6, armL: [-16, 10], armR: [82, 30], legL: [-10, 0], legR: [10, 0], handR: 'fist'},
  holdUp: {torso: -2, head: -2, armL: [-132, -12], armR: [132, 12], legL: [-12, 0], legR: [12, 0], handL: 'fist', handR: 'fist'},
  windup: {torso: -12, head: -6, armL: [-138, -20], armR: [-128, -30], legL: [-16, 0], legR: [14, 0], handL: 'fist', handR: 'fist'},
  thumbsUp: {torso: -2, head: 4, armL: [-14, -6], armR: ik(70, 10, -1), legL: [-9, 0], legR: [9, 0], handR: 'thumb'},
  signature: {torso: -4, head: -6, armL: ik(-34, 72, -1), armR: [136, 14], legL: [-14, 0], legR: [16, 6], handR: 'point'},
  lean: {torso: 10, head: 12, armL: [-30, 60], armR: [40, -40], legL: [-6, 0], legR: [14, 0]},
  peek: {torso: 16, head: 10, armL: [-10, 40], armR: [40, 80], legL: [-6, 4], legR: [16, 0]},
  crouch: {torso: 14, head: -6, armL: [-40, -30], armR: [30, -40], legL: [40, -85], legR: [58, -110]},
  stepBack: {torso: -12, head: -10, armL: [-50, 40], armR: [60, -60], legL: [-26, 0], legR: [6, -8], handL: 'open', handR: 'open'},
  surprised: {torso: -8, head: -8, armL: [-60, -40], armR: [60, 40], legL: [-12, 0], legR: [12, 0], handL: 'open', handR: 'open'},
  facepalm: {torso: 6, head: 14, armL: [-14, -8], armR: ik(34, -100, -1), legL: [-10, 0], legR: [10, 0], handR: 'open'},
  chinScratch: {torso: 2, head: 8, armL: ik(-34, 72, -1), armR: ik(22, -40, 1), legL: [-9, 0], legR: [9, 0], handR: 'point'},
});

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (x: number, y: number) => lerp(x, y, t);
  const ml = (x: Limb, y: Limb): Limb => [m(x[0], y[0]), m(x[1], y[1])];
  return {
    torso: m(a.torso, b.torso),
    head: m(a.head, b.head),
    armL: ml(a.armL, b.armL),
    armR: ml(a.armR, b.armR),
    legL: ml(a.legL, b.legL),
    legR: ml(a.legR, b.legR),
    handL: t < 0.5 ? a.handL : b.handL,
    handR: t < 0.5 ? a.handR : b.handR,
  };
};

/**
 * Encadena poses con anticipación y asentamiento: keys = [[segundo, pose], ...].
 * La transición usa ease-out-back (sobrepasa un poco y vuelve), como una acción de animador.
 */
export const poseAt = (t: number, k: [number, Pose][], trans = 0.32, overshoot = 1.4): Pose => {
  let p = k[0][1];
  for (let i = 1; i < k.length; i++) {
    const [at, next] = k[i];
    if (t < at) break;
    const u = clamp((t - at) / trans);
    p = mixPose(p, next, ease.outBack(u, overshoot));
  }
  return p;
};

/** Ciclo de caminata. phase en ciclos (1 = un paso de cada pierna). Devuelve pose y rebote vertical. */
export const walkPose = (phase: number, energy = 1): {pose: Pose; bob: number} => {
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  const sw = 26 * energy;
  const knee = (v: number) => -Math.max(0, v) * 42 * energy; // la pierna que avanza dobla la rodilla
  return {
    pose: {
      torso: 4 * energy,
      head: -2 + c * 1.5,
      armL: [-s * 24 * energy, -12 - Math.max(0, -s) * 18],
      armR: [s * 24 * energy, 12 + Math.max(0, s) * 18],
      legL: [s * sw, knee(c)],
      legR: [-s * sw, knee(-c)],
    },
    bob: Math.abs(c) * 9 * energy,
  };
};

/** Respiración/idle que se suma a cualquier pose para que nunca quede congelado. */
export const idle = (p: Pose, t: number, amt = 1): Pose => {
  const b = Math.sin(t * 2.1) * amt;
  return {
    ...p,
    torso: p.torso + b * 0.8,
    head: p.head + Math.sin(t * 1.3 + 1) * 1.6 * amt,
    armL: [p.armL[0] - b * 2, p.armL[1]],
    armR: [p.armR[0] + b * 2, p.armR[1]],
  };
};
