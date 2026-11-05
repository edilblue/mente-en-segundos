import React from 'react';
import {C, dir, lerp} from '../lib';

/**
 * Rig de "Stickman Pro". Ángulos en grados medidos desde "hacia abajo";
 * positivo = hacia la derecha de la pantalla. Cada extremidad es [superior, flexión].
 */
export type Limb = [number, number];
export type Pose = {
  torso: number;
  head: number;
  armL: Limb;
  armR: Limb;
  legL: Limb;
  legR: Limb;
};

export const POSES = {
  stand: {torso: 0, head: 0, armL: [-16, -8], armR: [16, 8], legL: [-9, 0], legR: [9, 0]},
  crouch: {torso: 16, head: -8, armL: [-55, -25], armR: [-35, -30], legL: [38, -82], legR: [58, -110]},
  jump: {torso: -2, head: -6, armL: [-165, 5], armR: [165, -5], legL: [-6, 4], legR: [8, 6]},
  tuck: {torso: 4, head: -4, armL: [-140, -20], armR: [140, 20], legL: [70, -125], legR: [-60, 120]},
  scared: {torso: 0, head: -6, armL: [-150, 45], armR: [150, -45], legL: [-70, 115], legR: [70, -115]},
  point: {torso: -4, head: 6, armL: [-18, -10], armR: [98, -4], legL: [-10, 0], legR: [11, 0]},
  pointUp: {torso: -3, head: -14, armL: [-20, -15], armR: [150, 0], legL: [-10, 0], legR: [11, 0]},
  pointDown: {torso: 8, head: 10, armL: [-30, 0], armR: [34, 0], legL: [-12, 0], legR: [12, 0]},
  think: {torso: 2, head: 10, armL: [-12, 85], armR: [24, 160], legL: [-8, 0], legR: [10, 0]},
  shrug: {torso: 0, head: 12, armL: [-72, 80], armR: [72, -80], legL: [-10, 0], legR: [10, 0]},
  open: {torso: -4, head: -6, armL: [-118, -15], armR: [118, 15], legL: [-14, 0], legR: [14, 0]},
  duck: {torso: 38, head: 25, armL: [150, 70], armR: [170, 60], legL: [40, -90], legR: [62, -118]},
  laugh: {torso: -12, head: -18, armL: [-30, 75], armR: [30, -75], legL: [-12, 0], legR: [12, 0]},
  facepalm: {torso: 6, head: 14, armL: [-16, -8], armR: [12, 172], legL: [-10, 0], legR: [10, 0]},
  hold: {torso: -2, head: 4, armL: [-20, -10], armR: [120, -40], legL: [-10, 0], legR: [11, 0]},
} satisfies Record<string, Pose>;

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
  };
};

/** Encadena poses: keys = [[segundo, pose], ...]; t es el segundo actual, `k` transición con spring. */
export const poseAt = (t: number, keys: [number, Pose][], trans = 0.28): Pose => {
  let p = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [at, next] = keys[i];
    if (t < at) break;
    const u = Math.min(1, (t - at) / trans);
    // ease-out con un poco de rebote (sensación elástica)
    const e = 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.12;
    p = mixPose(p, next, e);
  }
  return p;
};

export type Mouth = 'smile' | 'grin' | 'open' | 'o' | 'flat' | 'frown' | 'wavy' | 'yawn' | 'smirk';
export type Brow = 'none' | 'up' | 'worried' | 'angry' | 'flat' | 'raise';
export type FaceProps = {
  look?: [number, number];
  blink?: number;
  mouth?: Mouth;
  mouthOpen?: number;
  brow?: Brow;
  eyeScale?: number;
  facing?: number;
};

/** Ojo expresivo reutilizable (personas y animales). */
export const Eye: React.FC<{x: number; y: number; r: number; look?: [number, number]; blink?: number; sw?: number; pupil?: number}> = ({
  x,
  y,
  r,
  look = [0, 0],
  blink = 0,
  sw = 5,
  pupil = 0.45,
}) => {
  const ry = r * 1.22 * Math.max(0.08, 1 - blink);
  const pr = r * pupil;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={ry} fill="#fff" stroke={C.ink} strokeWidth={sw} />
      {blink < 0.85 && (
        <>
          <ellipse cx={x + look[0] * r * 0.42} cy={y + look[1] * ry * 0.4} rx={pr} ry={Math.min(pr, ry * 0.8)} fill={C.ink} />
          <circle cx={x + look[0] * r * 0.42 + pr * 0.35} cy={y + look[1] * ry * 0.4 - pr * 0.35} r={pr * 0.3} fill="#fff" />
        </>
      )}
    </g>
  );
};

export const MouthShape: React.FC<{x: number; y: number; w: number; type: Mouth; open?: number; sw?: number}> = ({x, y, w, type, open = 1, sw = 6}) => {
  const h = w * 0.5;
  const s = {fill: 'none', stroke: C.ink, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  switch (type) {
    case 'smile':
      return <path d={`M${x - w / 2},${y} Q${x},${y + h} ${x + w / 2},${y}`} {...s} />;
    case 'smirk':
      return <path d={`M${x - w / 2},${y + 4} Q${x + w * 0.1},${y + h * 0.5} ${x + w / 2},${y - h * 0.3}`} {...s} />;
    case 'grin':
      return (
        <path
          d={`M${x - w / 2},${y - 2} Q${x},${y + h * 1.6 * open} ${x + w / 2},${y - 2} Z`}
          fill={C.ink}
          stroke={C.ink}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    case 'open':
      return <ellipse cx={x} cy={y + h * 0.4} rx={w * 0.32} ry={h * 0.75 * open + 2} fill={C.ink} />;
    case 'yawn':
      return <ellipse cx={x} cy={y + h * 0.6} rx={w * 0.38 * (0.6 + 0.4 * open)} ry={h * 1.5 * open + 3} fill={C.ink} />;
    case 'o':
      return <circle cx={x} cy={y + h * 0.3} r={w * 0.17 * (0.6 + 0.4 * open)} fill={C.ink} />;
    case 'flat':
      return <path d={`M${x - w * 0.38},${y + 6} L${x + w * 0.38},${y + 6}`} {...s} />;
    case 'frown':
      return <path d={`M${x - w / 2},${y + h * 0.6} Q${x},${y - h * 0.2} ${x + w / 2},${y + h * 0.6}`} {...s} />;
    case 'wavy':
      return (
        <path
          d={`M${x - w / 2},${y + 6} q${w / 8},-10 ${w / 4},0 q${w / 8},10 ${w / 4},0 q${w / 8},-10 ${w / 4},0 q${w / 8},10 ${w / 4},0`}
          {...s}
        />
      );
  }
};

const BrowShape: React.FC<{x: number; y: number; w: number; type: Brow; side: -1 | 1}> = ({x, y, w, type, side}) => {
  if (type === 'none') return null;
  const tilt = {up: -6, worried: 12, angry: -14, flat: 0, raise: side === 1 ? -14 : 4}[type];
  const lift = {up: -12, worried: -4, angry: 4, flat: 0, raise: side === 1 ? -14 : 0}[type];
  const x1 = x - w / 2;
  const x2 = x + w / 2;
  const yi = y + lift + (side === -1 ? -tilt : tilt) * 0.5;
  const yo = y + lift - (side === -1 ? -tilt : tilt) * 0.5;
  // inner = hacia el centro de la cara
  const [ya, yb] = side === -1 ? [yo, yi] : [yi, yo];
  return <path d={`M${x1},${ya} L${x2},${yb}`} stroke={C.ink} strokeWidth={7} strokeLinecap="round" />;
};

export const Face: React.FC<FaceProps & {r: number}> = ({r, look = [0, 0], blink = 0, mouth = 'smile', mouthOpen = 1, brow = 'none', eyeScale = 1, facing = 0}) => {
  const fx = facing * r * 0.28;
  const er = r * 0.29 * eyeScale;
  const ex = r * 0.34;
  const ey = -r * 0.12;
  return (
    <g>
      <Eye x={fx - ex} y={ey} r={er} look={look} blink={blink} sw={5} />
      <Eye x={fx + ex} y={ey} r={er} look={look} blink={blink} sw={5} />
      <BrowShape x={fx - ex} y={ey - er * 1.55} w={er * 1.7} type={brow} side={-1} />
      <BrowShape x={fx + ex} y={ey + 0 - er * 1.55} w={er * 1.7} type={brow} side={1} />
      <MouthShape x={fx} y={r * 0.42} w={r * 0.62} type={mouth} open={mouthOpen} />
    </g>
  );
};

const L = {torso: 150, upper: 78, lower: 74, thigh: 92, shin: 90, headR: 62};

export type StickmanProps = {
  x: number;
  ground: number;
  pose: Pose;
  lift?: number; // altura del salto en px
  squash?: number; // >0 aplasta, <0 estira
  scale?: number;
  cap?: boolean;
  face?: FaceProps;
  flip?: boolean;
  rot?: number;
  sw?: number;
  children?: React.ReactNode; // objetos sujetos a la mano derecha (coordenadas locales de la mano)
};

export const Stickman: React.FC<StickmanProps> = ({x, ground, pose, lift = 0, squash = 0, scale = 1, cap = false, face = {}, flip = false, rot = 0, sw = 13, children}) => {
  const add = (p: [number, number], v: [number, number], k: number): [number, number] => [p[0] + v[0] * k, p[1] + v[1] * k];
  const hip0: [number, number] = [0, 0];
  const kneeL = add(hip0, dir(pose.legL[0]), L.thigh);
  const footL = add(kneeL, dir(pose.legL[0] + pose.legL[1]), L.shin);
  const kneeR = add(hip0, dir(pose.legR[0]), L.thigh);
  const footR = add(kneeR, dir(pose.legR[0] + pose.legR[1]), L.shin);
  const legDrop = Math.max(footL[1], footR[1], 40);
  const up: [number, number] = [Math.sin((pose.torso * Math.PI) / 180), -Math.cos((pose.torso * Math.PI) / 180)];
  const neck = add(hip0, up, L.torso);
  const sh = add(neck, up, -14);
  const elbowL = add(sh, dir(pose.armL[0]), L.upper);
  const handL = add(elbowL, dir(pose.armL[0] + pose.armL[1]), L.lower);
  const elbowR = add(sh, dir(pose.armR[0]), L.upper);
  const handR = add(elbowR, dir(pose.armR[0] + pose.armR[1]), L.lower);
  const headA = pose.torso + pose.head;
  const hu: [number, number] = [Math.sin((headA * Math.PI) / 180), -Math.cos((headA * Math.PI) / 180)];
  const head = add(neck, hu, L.headR - 4);
  const line = (a: [number, number], b: [number, number], c: [number, number]) => `M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}`;
  const sx = 1 + squash * 0.55;
  const sy = 1 - squash;
  const st = {fill: 'none', stroke: C.ink, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const handAngle = pose.armR[0] + pose.armR[1];
  return (
    <g transform={`translate(${x},${ground - lift}) scale(${scale}) scale(${flip ? -1 : 1},1) rotate(${rot}) scale(${sx},${sy}) translate(0,${-legDrop})`}>
      <path d={line(footL, kneeL, hip0)} {...st} />
      <path d={line(footR, kneeR, hip0)} {...st} />
      <path d={`M0,0 L${neck[0]},${neck[1]}`} {...st} />
      <path d={line(sh, elbowL, handL)} {...st} />
      <path d={line(sh, elbowR, handR)} {...st} />
      {children && <g transform={`translate(${handR[0]},${handR[1]}) rotate(${-handAngle})`}>{children}</g>}
      <g transform={`translate(${head[0]},${head[1]}) rotate(${headA})`}>
        <circle r={L.headR} fill="#fff" stroke={C.ink} strokeWidth={sw} />
        <Face r={L.headR} {...face} />
        {cap && <Cap r={L.headR} />}
      </g>
    </g>
  );
};

/** Gorra roja de Stickman Pro (visera hacia la derecha). */
export const Cap: React.FC<{r: number}> = ({r}) => (
  <g>
    <path
      d={`M${-r * 0.98},${-r * 0.32} C${-r * 0.95},${-r * 1.25} ${r * 0.95},${-r * 1.25} ${r * 0.98},${-r * 0.32} Z`}
      fill={C.red}
      stroke={C.ink}
      strokeWidth={10}
      strokeLinejoin="round"
    />
    <path d={`M${r * 0.55},${-r * 0.38} Q${r * 1.35},${-r * 0.5} ${r * 1.55},${-r * 0.22} L${r * 0.85},${-r * 0.2} Z`} fill={C.red} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
    <circle cx={0} cy={-r * 1.02} r={7} fill={C.ink} />
    <path d={`M${-r * 0.35},${-r * 0.85} Q${-r * 0.1},${-r * 0.98} ${r * 0.2},${-r * 0.92}`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />
  </g>
);

/** Parpadeo periódico natural. */
export const blinkAt = (t: number, seed = 0) => {
  const period = 2.6 + (seed % 3) * 0.7;
  const ph = (t + seed * 0.37) % period;
  return ph < 0.12 ? Math.sin((ph / 0.12) * Math.PI) : 0;
};
