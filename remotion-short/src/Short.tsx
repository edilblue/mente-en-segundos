import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, interpolate, Easing, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from './components/Background';
import {MoonBed} from './components/MoonBed';
import {ProgressBar} from './components/ProgressBar';
import {QuestionMark} from './components/QuestionMark';
import {SceneWrapper} from './components/SceneWrapper';
import {Hook, Outro} from './scenes/Hook';
import {StepBrain} from './scenes/StepBrain';
import {StepClock} from './scenes/StepClock';
import {StepRecord} from './scenes/StepRecord';
import {DURATION, SCENES, TRANSITION, WIDTH} from './theme';

const useFont = () => {
  const [handle] = useState(() => delayRender('Cargando fuente'));
  useEffect(() => {
    const font = new FontFace('InterBlack', `url(${staticFile('fonts/Inter-Black.otf')})`, {weight: '900'});
    font
      .load()
      .then((f) => {
        (document.fonts as unknown as Set<FontFace>).add(f);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Short: React.FC = () => {
  useFont();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / DURATION;
  const {hook, step1, step2, step3, outro} = SCENES;

  // Energía de la luna: se agota a lo largo del video y se recarga en el cierre
  // para que el último frame coincida con el primero (loop).
  const energy = interpolate(
    frame,
    [0, hook.len, outro.from - 5, outro.from + 15, DURATION - 20],
    [1, 0.92, 0.06, 0.06, 1],
    clamp,
  );

  // Modo héroe (icono grande) en escenas 1 y 5; mini-icono arriba en 2-4
  const ease = Easing.bezier(0.45, 0, 0.2, 1);
  const hero =
    frame < outro.from
      ? interpolate(frame, [hook.len - 6, hook.len + 12], [1, 0], {...clamp, easing: ease})
      : interpolate(frame, [outro.from, outro.from + 18], [0, 1], {...clamp, easing: ease});
  const iconW = interpolate(hero, [0, 1], [250, 760]);
  const iconTop = interpolate(hero, [0, 1], [185, 400]);
  const qOpacity = hero;

  // Zoom rápido de entrada del gancho
  const zoomIn = spring({frame, fps, config: {damping: 14, stiffness: 120, mass: 0.7}});
  const zoom = interpolate(zoomIn, [0, 1], [1.3, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: '#060920', overflow: 'hidden'}}>
      <Background />

      {/* AUDIO — voz en off + música y FX sintetizados (tools/sonido.py) */}
      <Audio src={staticFile('audio/voz.wav')} volume={1} />
      <Audio src={staticFile('audio/musica.wav')} volume={0.16} />
      <Audio src={staticFile('audio/fx.wav')} volume={0.45} />

      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        {/* Icono principal: cama + luna */}
        <div style={{position: 'absolute', top: iconTop, left: (WIDTH - iconW) / 2, width: iconW}}>
          <MoonBed energy={energy} t={t} width={iconW} />
        </div>
        {/* Signo de interrogación (escenas 1 y 5) */}
        <div style={{position: 'absolute', top: 330, left: 110, opacity: qOpacity}}>
          <QuestionMark t={t} size={280} pop={0.6 + 0.4 * hero} />
        </div>

        <Sequence from={hook.from} durationInFrames={hook.len + TRANSITION} name="1 Gancho">
          <SceneWrapper duration={hook.len + TRANSITION} enter={false}>
            <Hook />
          </SceneWrapper>
        </Sequence>
      </AbsoluteFill>

      <Sequence from={step1.from} durationInFrames={step1.len + TRANSITION} name="2 Reloj 24h">
        <SceneWrapper duration={step1.len + TRANSITION}>
          <StepClock />
        </SceneWrapper>
      </Sequence>
      <Sequence from={step2.from} durationInFrames={step2.len + TRANSITION} name="3 Cerebro">
        <SceneWrapper duration={step2.len + TRANSITION}>
          <StepBrain />
        </SceneWrapper>
      </Sequence>
      <Sequence from={step3.from} durationInFrames={step3.len + TRANSITION} name="4 Récord 11 días">
        <SceneWrapper duration={step3.len + TRANSITION}>
          <StepRecord />
        </SceneWrapper>
      </Sequence>
      <Sequence from={outro.from} durationInFrames={outro.len} name="5 Cierre">
        <SceneWrapper duration={outro.len} exit={false}>
          <Outro />
        </SceneWrapper>
      </Sequence>

      <ProgressBar />
    </AbsoluteFill>
  );
};
