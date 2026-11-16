import React from 'react';
import {C} from '../lib/theme';
import {Expr, EXPR, blinkAt} from './expressions';
import {Head, HEAD_R} from './Face';
import {Hand} from './Hand';
import {Pose, POSES} from './poses';

/**
 * STICK — protagonista oficial de "Aprende con Stick".
 * Cabeza circular blanca con contorno grueso, ojos ovalados negros, cejas expresivas,
 * cuerpo de líneas negras y manos blancas. SIN ropa ni accesorios.
 *
 * Origen (x, y) = punto del suelo bajo Stick. Altura total ≈ 500 px con scale = 1.
 */
export const L = {thigh: 92, shin: 90, torso: 165, neck: 20, upper: 80, fore: 74, stroke: 12};

const rad = (a: number) => (a * Math.PI) / 180;
const dir = (a: number): [number, number] => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: [number, number], d: [number, number], k: number): [number, number] => [p[0] + d[0] * k, p[1] + d[1] * k];

export type StickProps = {
  x: number;
  y: number;
  scale?: number;
  pose?: Pose;
  expr?: Expr;
  look?: [number, number];
  turn?: number;
  flip?: boolean;
  t?: number; // segundos (para parpadeo y sudor)
  blinkSeed?: number;
  lift?: number; // altura de salto (px)
  squash?: number; // -0.2..0.2 (estirar / aplastar)
  rotate?: number; // inclinación de todo el cuerpo (grados) alrededor de los pies
  shadow?: boolean;
  opacity?: number;
  noBlink?: boolean;
};

export const stickGeometry = (pose: Pose) => {
  const hip: [number, number] = [0, 0];
  const legs = [pose.legL, pose.legR].map(([a, b]) => {
    const knee = add(hip, dir(a), L.thigh);
    const ankle = add(knee, dir(a + b), L.shin);
    return {knee, ankle, a: a + b};
  });
  const up = dir(180 - pose.torso);
  const neck = add(hip, up, L.torso);
  const shoulder = add(neck, up, -16);
  const arms = [pose.armL, pose.armR].map(([a, b]) => {
    const elbow = add(shoulder, dir(a), L.upper);
    const hand = add(elbow, dir(a + b), L.fore);
    return {elbow, hand, a: a + b};
  });
  const head = add(neck, dir(180 - pose.torso - pose.head), L.neck + HEAD_R);
  const ground = Math.max(legs[0].ankle[1], legs[1].ankle[1]) + 6;
  return {hip, legs, neck, shoulder, arms, head, ground};
};

/** Posición en coordenadas del Stick (sin escala) de la mano derecha/izquierda. Útil para que objetos sigan la mano. */
export const handPos = (pose: Pose, which: 'L' | 'R'): [number, number] => {
  const g = stickGeometry(pose);
  const h = g.arms[which === 'L' ? 0 : 1].hand;
  return [h[0], h[1] - g.ground];
};
export const headPos = (pose: Pose): [number, number] => {
  const g = stickGeometry(pose);
  return [g.head[0], g.head[1] - g.ground];
};

export const Stick: React.FC<StickProps> = ({
  x,
  y,
  scale = 1,
  pose = POSES.stand,
  expr = EXPR.neutral,
  look = [0, 0],
  turn = 0,
  flip = false,
  t = 0,
  blinkSeed = 0,
  lift = 0,
  squash = 0,
  rotate = 0,
  shadow = true,
  opacity = 1,
  noBlink = false,
}) => {
  const g = stickGeometry(pose);
  const oy = -g.ground; // desplaza para que el pie más bajo toque el suelo
  const P = (p: [number, number]) => `${p[0]},${p[1] + oy}`;
  const limb = (a: [number, number], b: [number, number], c: [number, number]) => (
    <polyline
      points={`${P(a)} ${P(b)} ${P(c)}`}
      fill="none"
      stroke={C.ink}
      strokeWidth={L.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
  const foot = (leg: (typeof g.legs)[number]) => {
    const f = dir(leg.a + 90);
    const e: [number, number] = [leg.ankle[0] + f[0] * 18, leg.ankle[1] + f[1] * 18 * 0.3];
    return <line x1={leg.ankle[0]} y1={leg.ankle[1] + oy} x2={e[0]} y2={e[1] + oy} stroke={C.ink} strokeWidth={L.stroke} strokeLinecap="round" />;
  };
  const blink = noBlink ? 0 : blinkAt(t, blinkSeed);
  const sx = (flip ? -1 : 1) * (1 + squash * 0.6);
  const sy = 1 - squash;
  const headRot = pose.torso + pose.head;
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      {shadow && (
        <ellipse cx={0} cy={4} rx={78 * scale * (1 - Math.min(0.6, lift / 600))} ry={13 * scale} fill={C.shadow} />
      )}
      <g transform={`translate(0 ${-lift}) rotate(${rotate}) scale(${sx * scale} ${sy * scale})`}>
        {limb(g.hip, g.legs[0].knee, g.legs[0].ankle)}
        {foot(g.legs[0])}
        {limb(g.shoulder, g.arms[0].elbow, g.arms[0].hand)}
        <Hand x={g.arms[0].hand[0]} y={g.arms[0].hand[1] + oy} angle={g.arms[0].a} shape={pose.handL} />
        <line x1={g.hip[0]} y1={g.hip[1] + oy} x2={g.neck[0]} y2={g.neck[1] + oy} stroke={C.ink} strokeWidth={L.stroke + 1} strokeLinecap="round" />
        {limb(g.hip, g.legs[1].knee, g.legs[1].ankle)}
        {foot(g.legs[1])}
        <g transform={`translate(${g.head[0]} ${g.head[1] + oy}) rotate(${headRot})`}>
          <Head expr={expr} look={look} turn={turn} blink={blink} t={t} />
        </g>
        {limb(g.shoulder, g.arms[1].elbow, g.arms[1].hand)}
        <Hand x={g.arms[1].hand[0]} y={g.arms[1].hand[1] + oy} angle={g.arms[1].a} shape={pose.handR} />
      </g>
    </g>
  );
};
