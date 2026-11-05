import React from 'react';
import {FONT} from '../../theme';

/** Señal de "PARE" sobre un poste (vista como persona durante la alucinación). */
export const Sign: React.FC<{width: number}> = ({width}) => {
  const oct = new Array(8)
    .fill(0)
    .map((_, i) => {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      return `${Math.cos(a) * 150},${Math.sin(a) * 150 - 40}`;
    })
    .join(' ');
  return (
    <svg viewBox="-220 -200 440 560" width={width} height={(width * 560) / 440} style={{overflow: 'visible'}}>
      <defs>
        <filter id="signGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x={-14} y={100} width={28} height={250} fill="#8a90b8" />
      <g filter="url(#signGlow)">
        <polygon points={oct} fill="#d81b3c" stroke="white" strokeWidth={12} />
      </g>
      <text x={0} y={-10} textAnchor="middle" fontFamily={FONT} fontSize={92} fill="white">
        PARE
      </text>
    </svg>
  );
};
