import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CYAN, FONT} from '../../theme';
import {Chip} from '../../components/Chip';
import {MoonBed} from '../../components/MoonBed';
import {CaptionTrack} from '../components/CaptionTrack';
import {localLine, wordAt} from '../timeline';

export const Payoff: React.FC<{t: number}> = ({t}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p1 = localLine('p1');
  const p2 = localLine('p2');
  const sleepStart = wordAt('p1', 'durmió');
  const mins = interpolate(frame, [sleepStart, p1.end + 6], [0, 14 * 60 + 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const energy = interpolate(frame, [sleepStart, p2.start + 10], [0.08, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const counter = spring({frame: frame - sleepStart, fps, config: {damping: 10}});
  const ok = spring({frame: frame - wordAt('p2', 'recuperado'), fps, config: {damping: 8, stiffness: 200}});
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 380, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <MoonBed energy={energy} t={t} width={700} />
      </div>
      <div style={{position: 'absolute', top: 990, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${counter})`}}>
        <div style={{fontFamily: FONT, fontSize: 64, color: CYAN, WebkitTextStroke: '10px black', paintOrder: 'stroke fill', textShadow: `0 0 24px ${CYAN}`}}>
          💤 {h}h {String(m).padStart(2, '0')}min
        </div>
      </div>
      <div style={{position: 'absolute', top: 420, right: 70, transform: `scale(${ok}) rotate(7deg)`}}>
        <Chip color={CYAN}>✅ RECUPERADO</Chip>
      </div>
      <CaptionTrack sceneId="payoff" top={1110} />
    </AbsoluteFill>
  );
};
