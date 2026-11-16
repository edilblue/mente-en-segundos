import React from 'react';
import {C} from '../lib/theme';
import {HandShape} from './poses';

const dir = (a: number) => [Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];

/** Mano blanca simplificada. `angle` = dirección del antebrazo (convención de poses). */
export const Hand: React.FC<{x: number; y: number; angle: number; shape?: HandShape; s?: number}> = ({
  x,
  y,
  angle,
  shape = 'fist',
  s = 1,
}) => {
  const r = (shape === 'open' ? 17 : 15) * s;
  let finger: [number, number] | null = null;
  let len = 0;
  if (shape === 'point') {
    finger = dir(angle) as [number, number];
    len = 27 * s;
  } else if (shape === 'thumb') {
    finger = [0, -1];
    len = 22 * s;
  } else if (shape === 'open') {
    finger = dir(angle - 70) as [number, number];
    len = 13 * s;
  }
  const fx = finger ? x + finger[0] * len : 0;
  const fy = finger ? y + finger[1] * len : 0;
  return (
    <g>
      {finger && <line x1={x} y1={y} x2={fx} y2={fy} stroke={C.ink} strokeWidth={19 * s} strokeLinecap="round" />}
      <circle cx={x} cy={y} r={r} fill={C.white} stroke={C.ink} strokeWidth={7 * s} />
      {finger && (
        <line
          x1={x + finger[0] * 7 * s}
          y1={y + finger[1] * 7 * s}
          x2={fx}
          y2={fy}
          stroke={C.white}
          strokeWidth={6 * s}
          strokeLinecap="round"
        />
      )}
    </g>
  );
};
