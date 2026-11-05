import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Brain} from '../components/Brain';
import {Captions, wordStarts} from '../components/Captions';
import {Chip} from '../components/Chip';
import {voiceWindow, wordTimes} from '../narration';
import {CYAN, PINK} from '../theme';

const TEXT = 'Mientras duermes, tu cerebro limpia desechos que se acumulan durante el día. Sin dormir, esa limpieza no ocurre';
const W = voiceWindow('step2');
const SWITCH = (wordTimes('step2') ?? wordStarts(TEXT, W.start, W.end))[TEXT.split(' ').indexOf('Sin')]; // "Sin dormir..."

export const StepBrain: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const on = frame < SWITCH;
  const pop = spring({frame: frame - (on ? 4 : SWITCH), fps, config: {damping: 9, stiffness: 200}});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 450, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Brain frame={frame} switchAt={SWITCH} width={820} />
      </div>
      <div style={{position: 'absolute', top: 455, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{transform: `scale(${pop})`}}>
          <Chip color={on ? CYAN : PINK}>{on ? 'LIMPIEZA: ACTIVA' : 'LIMPIEZA: OFF'}</Chip>
        </div>
      </div>
      <Captions
        text={TEXT}
        start={voiceWindow('step2').start}
        end={voiceWindow('step2').end}
      times={wordTimes('step2')}
        top={1110}
        fontSize={70}
        highlights={{limpia: CYAN, desechos: CYAN, duermes: CYAN, sin: PINK, dormir: PINK, no: PINK, ocurre: PINK}}
      />
    </AbsoluteFill>
  );
};
