import React from 'react';
import {Composition} from 'remotion';
import './lib/fonts';
import {ModelSheet} from './stick/ModelSheet';
import {Episodio01, duracionEp01} from './episodes/ep01/Episodio01';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="AprendeConStick-Ep01"
      component={Episodio01}
      durationInFrames={duracionEp01()}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition id="Stick-HojaDeModelo" component={ModelSheet} durationInFrames={90} fps={30} width={1080} height={1920} />
  </>
);
