import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {Parte2} from './Parte2';
import {FPS, H, W} from './lib';
import {TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    {/* La duración sale de la narración real (src/data/narracion.json). */}
    <Composition id="Parte2" component={Parte2} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
