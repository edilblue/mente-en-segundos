import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {MoonBed} from '../components/MoonBed';
import {ProgressBar} from '../components/ProgressBar';
import {SceneWrapper} from '../components/SceneWrapper';
import {TRANSITION} from '../theme';
import {DayTracker} from './components/DayTracker';
import {BrainScene} from './scenes/BrainScene';
import {Context} from './scenes/Context';
import {Day1} from './scenes/Day1';
import {Day23} from './scenes/Day23';
import {Day4} from './scenes/Day4';
import {Day9} from './scenes/Day9';
import {Guinness} from './scenes/Guinness';
import {Hook, Outro} from './scenes/Hero';
import {Payoff} from './scenes/Payoff';
import {DURATION2, LINES, SCENES2, dayAt, lastDayChange, scene} from './timeline';

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
      .catch(() => continueRender(handle));
  }, [handle]);
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const ShortV2: React.FC = () => {
  useFont();
  const frame = useCurrentFrame();
  const t = frame / DURATION2;

  const COMPONENTS: Record<string, React.ReactNode> = {
    hook: <Hook />,
    context: <Context />,
    day1: <Day1 />,
    day23: <Day23 />,
    brain: <BrainScene />,
    day4: <Day4 />,
    day9: <Day9 />,
    payoff: <Payoff t={t} />,
    guinness: <Guinness />,
    outro: <Outro />,
  };

  // "Golpe" de zoom al empezar cada frase (mantiene la atención)
  let lastLine = -1000;
  for (const l of LINES) if (frame >= l.start) lastLine = l.start;
  const punch = 1 + 0.03 * Math.exp(-(frame - lastLine) / 4);
  // Zoom de entrada del gancho (el frame 0 ya muestra contenido)
  const intro = interpolate(frame, [0, 10], [1.1, 1], clamp);

  // Destello + sacudida al cambiar de día
  const sinceDay = frame - lastDayChange(frame);
  const flash = sinceDay >= 0 && sinceDay < 10 ? 0.16 * (1 - sinceDay / 10) : 0;
  const shake = sinceDay >= 0 && sinceDay < 8 ? Math.sin(sinceDay * 3) * 7 * (1 - sinceDay / 8) : 0;

  // Energía de la mini-luna del HUD: se agota con los días
  const day = dayAt(frame);
  const energy = interpolate(day, [0, 11], [1, 0.07]);
  const hudOn =
    frame >= scene('day1').from && frame < scene('outro').from
      ? Math.min(
          interpolate(frame, [scene('day1').from, scene('day1').from + 12], [0, 1], clamp),
          interpolate(frame, [scene('outro').from - 10, scene('outro').from], [1, 0], clamp),
        )
      : 0;
  const payoff = scene('payoff');
  const miniMoon = frame >= payoff.from - 6 && frame < payoff.from + payoff.len ? 0 : 1;

  return (
    <AbsoluteFill style={{backgroundColor: '#060920', overflow: 'hidden'}}>
      <Background />

      {/* AUDIO: voz (tools/voz_v2.py) + música y FX (tools/sonido_v2.py) */}
      <Audio src={staticFile('audio/v2/voz.wav')} volume={1} />
      <Audio src={staticFile('audio/v2/musica.wav')} volume={0.16} />
      <Audio src={staticFile('audio/v2/fx.wav')} volume={0.38} />

      <AbsoluteFill style={{transform: `scale(${punch * intro}) translate(${shake}px, 0px)`}}>
        {SCENES2.map((s, i) => {
          const last = i === SCENES2.length - 1;
          const dur = s.len + (last ? 0 : TRANSITION);
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={dur} name={s.id}>
              <SceneWrapper duration={dur} enter={i > 0} exit={!last}>
                {COMPONENTS[s.id]}
              </SceneWrapper>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {/* HUD: mini cama/luna + contador de días */}
      <div style={{position: 'absolute', top: 182, left: 60, opacity: hudOn * miniMoon}}>
        <MoonBed energy={energy} t={t} width={190} />
      </div>
      <div style={{position: 'absolute', top: 182, right: 60, opacity: hudOn}}>
        <DayTracker />
      </div>

      <AbsoluteFill style={{background: 'white', opacity: flash, pointerEvents: 'none'}} />
      <ProgressBar />
    </AbsoluteFill>
  );
};

