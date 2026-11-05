import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Short';
import {ShortV2} from './v2/ShortV2';
import {DURATION2} from './v2/timeline';
import {DURATION, FPS, HEIGHT, WIDTH} from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SinDormir" component={Short} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="SinDormirV2" component={ShortV2} durationInFrames={DURATION2} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
