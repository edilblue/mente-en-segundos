import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Progress} from './overlays/Overlays';
import {TOTAL_FRAMES} from './lib/timing';
import {FontGate} from './overlays/fonts';
import {ESCENAS, FPS} from './lib/timing';
import {S1} from './scenes/S1';
import {S2} from './scenes/S2';
import {S3} from './scenes/S3';
import {S4} from './scenes/S4';
import {S5} from './scenes/S5';
import {S6} from './scenes/S6';

const SCENES: Record<number, React.FC> = {1: S1, 2: S2, 3: S3, 4: S4, 5: S5, 6: S6};

export const Video: React.FC = () => (
  <AbsoluteFill style={{background: '#050b1f'}}>
    <FontGate>
      {ESCENAS.map((e) => {
        const C = SCENES[e.id];
        if (!C) return null;
        return (
          <Sequence key={e.id} from={Math.round(e.inicio * FPS)} durationInFrames={Math.round(e.duracion * FPS)} name={`Escena ${e.id}`}>
            <C />
          </Sequence>
        );
      })}
      <ProgressBar />
    </FontGate>
    <Audio src={staticFile('audio/mix.wav')} />
  </AbsoluteFill>
);

const ProgressBar: React.FC = () => {
  const f = useCurrentFrame();
  return <Progress p={f / TOTAL_FRAMES} />;
};
