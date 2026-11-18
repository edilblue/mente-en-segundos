import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ESCENAS, FPS, H, W, clamp, ease} from './lib';
import {Board, ChalkDefs} from './components/Chalk';
import {Subs} from './components/Subs';
import {S1} from './scenes/S1';
import {S2} from './scenes/S2';
import {S3} from './scenes/S3';
import {S4} from './scenes/S4';
import {S5} from './scenes/S5';

const SCENES: Record<number, React.FC<{t: number}>> = {1: S1, 2: S2, 3: S3, 4: S4, 5: S5};
const TR = 0.2; // duración de media transición (s)

type Tr = {dx: number; dy: number; zoom: number; blurX: number; blurY: number; op: number};
const NONE: Tr = {dx: 0, dy: 0, zoom: 1, blurX: 0, blurY: 0, op: 1};

/**
 * Transiciones dinámicas en cada corte (k: -1 → saliendo … 0 → en el corte … +1 → entrando):
 * 1→2 barrido lateral (smear), 2→3 zoom a través, 3→4 barrido vertical, 4→5 barrido lateral inverso.
 */
const transicion = (corte: number, k: number): Tr => {
  // k ∈ [-1, 1]; |k| = 1 lejos del corte. lado = -1 saliendo, +1 entrando
  const lado = Math.sign(k) || 1;
  const a = 1 - Math.abs(k); // 0 lejos → 1 en el corte
  const e = ease.in(a);
  switch (corte) {
    case 1:
      return {dx: -lado * 1150 * e, dy: 0, zoom: 1, blurX: 60 * e, blurY: 0, op: 1};
    case 2:
      return {dx: 0, dy: 0, zoom: lado < 0 ? 1 + 2.2 * e : 1 + 0.9 * e, blurX: 26 * e, blurY: 26 * e, op: 1 - 0.6 * e};
    case 3:
      return {dx: 0, dy: -lado * 1950 * e, zoom: 1, blurX: 0, blurY: 70 * e, op: 1};
    case 4:
      return {dx: lado * 1150 * e, dy: 0, zoom: 1, blurX: 60 * e, blurY: 0, op: 1};
    default:
      return NONE;
  }
};

const Capa: React.FC<{id: number; t: number}> = ({id, t}) => {
  const e = ESCENAS.find((x) => x.id === id)!;
  let tr = NONE;
  if (id > 1 && t < e.inicio + TR) tr = transicion(id - 1, Math.max(0.0001, clamp((t - e.inicio) / TR)));
  if (id < 5 && t > e.fin - TR) tr = transicion(id, -Math.max(0.0001, clamp((e.fin - t) / TR)));
  const Comp = SCENES[id];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, opacity: tr.op}}>
      <ChalkDefs id={`chalk${id}`} />
      <defs>
        <filter id={`mb${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={`${tr.blurX} ${tr.blurY}`} />
        </filter>
      </defs>
      <g
        transform={`translate(${tr.dx},${tr.dy}) translate(${W / 2},${H / 2}) scale(${tr.zoom}) translate(${-W / 2},${-H / 2})`}
        filter={tr.blurX + tr.blurY > 0.5 ? `url(#mb${id})` : undefined}
      >
        <g filter={`url(#chalk${id})`}>
          <Comp t={t} />
        </g>
      </g>
    </svg>
  );
};

export const Flamencos: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // Corte con barrido: la escena saliente se va en sus últimos TR s y la entrante llega en sus primeros TR s.
  const activas = ESCENAS.filter((e) => t >= e.inicio && t < e.fin).map((e) => e.id);
  return (
    <AbsoluteFill style={{backgroundColor: '#1c2723'}}>
      <Board />
      {activas.map((id) => (
        <Capa key={id} id={id} t={t} />
      ))}
      <Subs />
    </AbsoluteFill>
  );
};

