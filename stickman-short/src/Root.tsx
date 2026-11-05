import React from 'react';
import {Composition, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Short, TOTAL_FRAMES} from './Short';
import {FONT_COMIC, FONT_MAIN, FPS, H, W} from './lib/anim';

// Tipografía Inter (SIL OFL) servida localmente desde /public/fonts.
loadFont({family: FONT_MAIN, url: staticFile('fonts/Inter-Black.otf'), weight: '900'});
loadFont({family: FONT_COMIC, url: staticFile('fonts/InterDisplay-BlackItalic.otf'), weight: '900', style: 'italic'});

export const RemotionRoot: React.FC = () => (
  <Composition id="Short" component={Short} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
);
