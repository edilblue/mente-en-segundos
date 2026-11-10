import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FPS, ramp} from './lib';
import {Grade, Brand} from './fx';
import {SCENES} from './timeline';
import {S1, S2, S3, S4, S5, S6, S7, S8, SP} from './Scenes';
import './fonts';

const COMP: React.FC<SP>[] = [S1, S2, S3, S4, S5, S6, S7, S8];
const X = 0.35; // solape de las transiciones (s)

export const Enamorado: React.FC = () => {
  const tg = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{background: '#03020a', overflow: 'hidden'}}>
      {SCENES.map((s, i) => {
        const t = tg - s.start;
        const first = i === 0;
        const last = i === SCENES.length - 1;
        if (t < (first ? 0 : -X) || t > s.dur + (last ? 1 : X)) return null;
        const o = (first ? 1 : ramp(t, -X, X)) * (last ? 1 : 1 - ramp(t, s.dur - X * 0.3, s.dur + X));
        const C = COMP[i];
        return (
          <AbsoluteFill key={s.id} style={{opacity: o}}>
            <C t={t} d={s.dur} tg={tg} />
          </AbsoluteFill>
        );
      })}
      <Grade t={tg} vignette={0.7} />
      <Brand o={ramp(tg, 2.4, 3.4)} />
    </AbsoluteFill>
  );
};
