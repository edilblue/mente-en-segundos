import React from 'react';
import {CYAN} from '../../theme';

/** Monitor de ondas cerebrales. `activity` 1 = normal, 0 = casi plano y lento. */
export const Eeg: React.FC<{frame: number; activity: number; width: number; color?: string}> = ({frame, activity, width, color = CYAN}) => {
  const W = 800;
  const H = 260;
  const pts: string[] = [];
  const speed = 0.25 + 0.75 * activity;
  for (let x = 0; x <= W; x += 4) {
    const t = x / 40 + frame * 0.35 * speed;
    const y =
      H / 2 +
      activity * (Math.sin(t * 1.7) * 38 + Math.sin(t * 4.3 + 1) * 18 + Math.sin(t * 9.1) * 8) +
      (1 - activity) * Math.sin(t * 0.6) * 22;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width * H) / W} style={{overflow: 'visible'}}>
      <defs>
        <filter id="eegGlow" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x={0} y={0} width={W} height={H} rx={24} fill="rgba(8,6,30,0.8)" stroke="rgba(255,255,255,0.18)" strokeWidth={4} />
      {[1, 2, 3].map((i) => (
        <line key={i} x1={0} x2={W} y1={(H / 4) * i} y2={(H / 4) * i} stroke="rgba(120,200,255,0.1)" strokeWidth={2} />
      ))}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={6} strokeLinejoin="round" filter="url(#eegGlow)" />
    </svg>
  );
};
