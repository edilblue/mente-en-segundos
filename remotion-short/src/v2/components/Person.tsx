import React from 'react';
import {CYAN} from '../../theme';

/** Silueta neón de una persona (busto). */
export const Person: React.FC<{width: number; color?: string; glitch?: number; opacity?: number}> = ({width, color = CYAN, glitch = 0, opacity = 1}) => {
  const body = 'M -170 330 C -170 200 -110 150 0 150 C 110 150 170 200 170 330 Z';
  return (
    <svg viewBox="-220 -200 440 560" width={width} height={(width * 560) / 440} style={{overflow: 'visible', opacity}}>
      <defs>
        <filter id="personGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {glitch > 0 && (
        <g opacity={0.6 * glitch} transform={`translate(${-14 * glitch} 0)`} fill="none" stroke="#ff2a6d" strokeWidth={9}>
          <circle cx={0} cy={20} r={105} />
          <path d={body} />
        </g>
      )}
      <g filter="url(#personGlow)" fill="rgba(20,14,60,0.85)" stroke={color} strokeWidth={10}>
        <circle cx={0} cy={20} r={105} />
        <path d={body} />
      </g>
    </svg>
  );
};
