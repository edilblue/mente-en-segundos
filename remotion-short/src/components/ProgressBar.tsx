import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CYAN, DURATION, PINK, SAFE_TOP, WIDTH} from '../theme';

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / (DURATION - 1));
  const margin = 70;
  const w = WIDTH - margin * 2;
  return (
    <div style={{position: 'absolute', left: margin, top: SAFE_TOP, width: w, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.12)'}}>
      <div
        style={{
          width: w * p,
          height: '100%',
          borderRadius: 4,
          background: `linear-gradient(90deg, ${CYAN}, ${PINK})`,
          boxShadow: `0 0 14px ${CYAN}, 0 0 22px rgba(255,61,200,0.6)`,
        }}
      />
    </div>
  );
};
