import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import './flamencos/fonts';
import {Parte2} from './Parte2';
import {FPS, H, W} from './lib';
import {TOTAL_FRAMES} from './timeline';
import {Flamencos} from './flamencos/Flamencos';
import {TOTAL_FRAMES as FLAMENCOS_FRAMES} from './flamencos/lib';

export const RemotionRoot: React.FC = () => (
  <>
    {/* La duración sale de la narración real (src/data/narracion.json). */}
    <Composition id="Parte2" component={Parte2} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    {/* Short "Los flamencos no nacen rosados": 35 s exactos (1050 frames). */}
    <Composition id="Flamencos" component={Flamencos} durationInFrames={FLAMENCOS_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
