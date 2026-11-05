import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AMBER, FONT, PINK} from '../../theme';
import {CaptionTrack} from '../components/CaptionTrack';
import {wordAt} from '../timeline';

export const Guinness: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tri = spring({frame, fps, config: {damping: 10, stiffness: 150}});
  const stampAt = wordAt('g1', 'acepta');
  const stamp = spring({frame: frame - stampAt, fps, config: {damping: 7, stiffness: 260, mass: 0.6}});
  const stampScale = interpolate(stamp, [0, 1], [2.4, 1]);
  const pulse = 0.7 + 0.3 * Math.sin(frame / 6);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 430, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${tri})`}}>
        <svg viewBox="-300 -280 600 540" width={560} style={{overflow: 'visible'}}>
          <defs>
            <filter id="triGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="12" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M 0 -240 L 260 210 L -260 210 Z" fill="rgba(40,24,6,0.85)" stroke={AMBER} strokeWidth={22} strokeLinejoin="round" filter="url(#triGlow)" opacity={pulse + 0.2} />
          <rect x={-18} y={-110} width={36} height={190} rx={18} fill={AMBER} />
          <circle cx={0} cy={140} r={24} fill={AMBER} />
        </svg>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 760,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: frame >= stampAt ? 1 : 0,
          transform: `scale(${stampScale}) rotate(-9deg)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 76,
            color: PINK,
            border: `10px solid ${PINK}`,
            borderRadius: 18,
            padding: '10px 34px',
            background: 'rgba(8,6,30,0.85)',
            boxShadow: `0 0 30px ${PINK}`,
            textShadow: `0 0 20px ${PINK}`,
            letterSpacing: 3,
          }}
        >
          YA NO SE ACEPTA
        </div>
      </div>
      <CaptionTrack sceneId="guinness" />
    </AbsoluteFill>
  );
};
