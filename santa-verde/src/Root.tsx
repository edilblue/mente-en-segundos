import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {Video} from './Video';
import {FPS, H, W} from './lib';
import {TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition id="SantaVerde" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
);
