import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {PINK} from '../../theme';
import {Chip} from '../../components/Chip';
import {Clock} from '../../components/Clock';
import {CaptionTrack} from '../components/CaptionTrack';
import {wordAt} from '../timeline';

export const Day1: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reach = wordAt('d1', 'despierto');
  const alcohol = wordAt('d1', 'alcohol');
  const hours = interpolate(frame, [4, reach], [0, 24], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const drunk = interpolate(frame, [alcohol - 20, alcohol + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wobble = Math.sin(frame / 7) * 7 * drunk;
  const sway = Math.sin(frame / 11) * 24 * drunk;
  const chip = spring({frame: frame - alcohol, fps, config: {damping: 9, stiffness: 180}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 430, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'relative', transform: `translateX(${sway}px) rotate(${wobble}deg)`}}>
          <div style={{position: 'absolute', inset: 0, opacity: 0.45 * drunk, transform: `translate(${20 * drunk}px, ${-6 * drunk}px)`, filter: 'hue-rotate(80deg) blur(2px)'}}>
            <Clock hours={hours} size={580} />
          </div>
          <Clock hours={hours} size={580} />
        </div>
      </div>
      <div style={{position: 'absolute', top: 400, right: 70, transform: `scale(${chip}) rotate(8deg)`}}>
        <Chip color={PINK}>🍸 REFLEJOS = ALCOHOL</Chip>
      </div>
      <CaptionTrack sceneId="day1" />
    </AbsoluteFill>
  );
};
