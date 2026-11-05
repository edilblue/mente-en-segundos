import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Captions} from '../components/Captions';
import {voiceWindow, wordTimes} from '../narration';
import {CYAN, PINK} from '../theme';

// Escena 1 y 5 comparten este diseño para que el loop se sienta natural.
export const HERO_CAPTION_TOP = 1150;

export const Hook: React.FC = () => (
  <AbsoluteFill>
    <Captions
      text="¿Qué pasaría si dejaras de dormir?"
      start={0}
      end={voiceWindow('hook').end}
      times={wordTimes('hook')}
      top={HERO_CAPTION_TOP}
      fontSize={104}
      highlights={{dormir: CYAN, dejaras: PINK}}
    />
  </AbsoluteFill>
);

export const Outro: React.FC = () => (
  <AbsoluteFill>
    <Captions
      text="¿Cuántas horas duermes tú? 👇"
      start={voiceWindow('outro').start}
      end={voiceWindow('outro').end}
      times={wordTimes('outro')}
      top={HERO_CAPTION_TOP}
      fontSize={104}
      highlights={{horas: CYAN, tú: PINK}}
    />
  </AbsoluteFill>
);
