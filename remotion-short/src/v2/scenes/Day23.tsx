import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AMBER, PINK} from '../../theme';
import {Chip} from '../../components/Chip';
import {CaptionTrack} from '../components/CaptionTrack';
import {Eye} from '../components/Eye';
import {localLine, wordAt} from '../timeline';

export const Day23: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d3 = localLine('d3').start;
  const phase3 = frame >= d3;
  const blur = phase3 ? 0 : 3 + 6 * (0.5 + 0.5 * Math.sin(frame / 6));
  const angry = interpolate(frame, [d3, d3 + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shake = phase3 ? Math.sin(frame * 2.3) * 6 : 0;
  const humor = spring({frame: frame - wordAt('d3', 'humor'), fps, config: {damping: 8, stiffness: 220}});
  const torpe = spring({frame: frame - wordAt('d3', 'torpeza'), fps, config: {damping: 8, stiffness: 220}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 520, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translate(${shake}px, ${-shake / 2}px)`}}>
        <div style={{position: 'relative'}}>
          {!phase3 && (
            <div style={{position: 'absolute', inset: 0, opacity: 0.45, transform: `translate(${26 + Math.sin(frame / 5) * 10}px, 4px)`}}>
              <Eye width={800} tired={0.45} lid={0.25} blur={blur + 2} id="ghost" />
            </div>
          )}
          <Eye width={800} tired={phase3 ? 0.7 : 0.45} lid={phase3 ? 0.18 : 0.25} blur={blur} angry={angry} look={[Math.sin(frame / 13) * 0.4, 0]} id="d23" />
        </div>
      </div>
      <div style={{position: 'absolute', top: 430, left: 90, transform: `scale(${humor}) rotate(-7deg)`}}>
        <Chip color={PINK}>😠 MAL HUMOR</Chip>
      </div>
      <div style={{position: 'absolute', top: 960, right: 90, transform: `scale(${torpe}) rotate(6deg)`}}>
        <Chip color={AMBER}>🤕 TORPEZA</Chip>
      </div>
      <CaptionTrack sceneId="day23" />
    </AbsoluteFill>
  );
};
