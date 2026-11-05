import React from 'react';
import {interpolateColors, random} from 'remotion';
import {CYAN, PINK} from '../../theme';

const VEINS = new Array(14).fill(0).map((_, i) => {
  const side = i % 2 === 0 ? -1 : 1;
  const y0 = (random(`vy${i}`) - 0.5) * 120;
  const pts: string[] = [`M ${side * 300} ${y0}`];
  let x = side * 300;
  let y = y0;
  for (let k = 0; k < 4; k++) {
    x -= side * (30 + random(`vx${i}${k}`) * 30);
    y += (random(`vd${i}${k}`) - 0.5) * 40;
    pts.push(`L ${x} ${y}`);
  }
  return pts.join(' ');
});

type Props = {
  width: number;
  /** 0 = ojo sano, 1 = muy cansado (venas rojas, párpado caído) */
  tired: number;
  /** 0..1 cierre del párpado */
  lid?: number;
  /** desenfoque (px) para "no podía enfocar" */
  blur?: number;
  /** ceño fruncido 0..1 (mal humor) */
  angry?: number;
  /** desplazamiento de la pupila (-1..1) */
  look?: [number, number];
  pupil?: number;
  id?: string;
};

export const Eye: React.FC<Props> = ({width, tired, lid = 0, blur = 0, angry = 0, look = [0, 0], pupil = 1, id = 'eye'}) => {
  const iris = interpolateColors(tired, [0, 1], [CYAN, '#7fd8ff']);
  const sclera = interpolateColors(tired, [0, 1], ['#f4f8ff', '#ffe1e1']);
  const almond = 'M -320 0 C -200 -190 200 -190 320 0 C 200 190 -200 190 -320 0 Z';
  // párpado superior: baja con `lid`, y se inclina con `angry`
  const topY = -200 + lid * 230;
  const tilt = angry * 70;
  const lidPath = `M -360 -260 L 360 -260 L 360 ${topY + tilt} C 200 ${topY + 60 + tilt * 0.5} -200 ${topY + 60 - tilt * 0.5} -360 ${topY - tilt} Z`;
  return (
    <svg viewBox="-380 -260 760 520" width={width} height={(width * 520) / 760} style={{overflow: 'visible', filter: blur ? `blur(${blur}px)` : undefined}}>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={almond} />
        </clipPath>
        <radialGradient id={`${id}-iris`}>
          <stop offset="0%" stopColor="#0b1030" />
          <stop offset="35%" stopColor={iris} />
          <stop offset="80%" stopColor="#2b4bd8" />
          <stop offset="100%" stopColor="#0b1030" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="-380" y="-260" width="760" height="520" fill={sclera} />
        <g stroke="#e0203c" strokeWidth={4} fill="none" opacity={tired * 0.85} strokeLinecap="round">
          {VEINS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g transform={`translate(${look[0] * 80} ${look[1] * 40})`}>
          <circle r={118} fill={`url(#${id}-iris)`} />
          <circle r={48 * pupil} fill="#05060f" />
          <circle cx={-34} cy={-38} r={20} fill="white" opacity={0.9} />
        </g>
        {/* párpado */}
        <path d={lidPath} fill="#130d33" />
        <path d={`M -360 ${260 - lid * 40} L 360 ${260 - lid * 40} L 360 260 L -360 260 Z`} fill="#130d33" />
      </g>
      <path d={almond} fill="none" stroke={interpolateColors(tired, [0, 1], [CYAN, PINK])} strokeWidth={10} filter={`url(#${id}-glow)`} />
    </svg>
  );
};
