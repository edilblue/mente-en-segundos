import React from 'react';
import {H, W} from '../lib';

export type SceneProps = {t: number; dur: number};

/** Lienzo SVG de la escena con cámara (zoom alrededor de un punto + desplazamiento + giro). */
export const Stage: React.FC<{zoom?: number; cx?: number; cy?: number; dx?: number; dy?: number; rot?: number; children: React.ReactNode}> = ({
  zoom = 1,
  cx = 480,
  cy = 700,
  dx = 0,
  dy = 0,
  rot = 0,
  children,
}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    <g transform={`translate(${cx + dx},${cy + dy}) rotate(${rot}) scale(${zoom}) translate(${-cx},${-cy})`}>{children}</g>
  </svg>
);

/** Línea de suelo de tiza. */
export const Ground: React.FC<{y: number; x0?: number; x1?: number; o?: number}> = ({y, x0 = 60, x1 = 900, o = 0.55}) => (
  <path d={`M${x0},${y} Q${(x0 + x1) / 2},${y + 6} ${x1},${y - 2}`} fill="none" stroke="#f4f1e8" strokeWidth={6} strokeLinecap="round" opacity={o} filter="url(#chalk)" />
);
