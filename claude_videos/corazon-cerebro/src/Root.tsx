import React from 'react';
import {Composition} from 'remotion';
import {Enamorado} from './Enamorado';
import {TIMELINE} from './timeline';
import {W, H, FPS} from './lib';

export const RemotionRoot: React.FC = () => (
  <Composition id="Enamorado" component={Enamorado} durationInFrames={TIMELINE.frames} fps={FPS} width={W} height={H} />
);
