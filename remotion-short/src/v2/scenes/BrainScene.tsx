import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CYAN, PINK} from '../../theme';
import {Brain} from '../../components/Brain';
import {Chip} from '../../components/Chip';
import {CaptionTrack} from '../components/CaptionTrack';
import {localLine} from '../timeline';

export const BrainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const b2 = localLine('b2');
  const on = frame < b2.start;
  const pop = spring({frame: frame - (on ? 4 : b2.start), fps, config: {damping: 9, stiffness: 200}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Brain frame={frame} switchAt={b2.start} fillFrames={Math.max(50, b2.end - b2.start)} width={820} />
      </div>
      <div style={{position: 'absolute', top: 430, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{transform: `scale(${pop})`}}>
          <Chip color={on ? CYAN : PINK}>{on ? 'LIMPIEZA: ACTIVA' : 'LIMPIEZA: OFF'}</Chip>
        </div>
      </div>
      <CaptionTrack sceneId="brain" />
    </AbsoluteFill>
  );
};
