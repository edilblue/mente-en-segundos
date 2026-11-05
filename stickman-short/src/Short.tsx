import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {NARRATION} from './narration.generated';
import {InkWipe} from './components/Effects';
import {PencilProgress, Subtitles} from './components/Overlay';
import {Scene1} from './scenes/Scene1';
import {Scene2} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {S4, Scene4} from './scenes/Scene4';
import {Scene5} from './scenes/Scene5';
import {Scene6} from './scenes/Scene6';
import {Scene7} from './scenes/Scene7';
import {Scene8} from './scenes/Scene8';
import {Scene9} from './scenes/Scene9';

export const TOTAL_FRAMES = 2400; // 80 s exactos a 30 fps

/**
 * Línea de tiempo (frames a 30 fps). Las marcas "SFX:" de cada escena indican
 * el segundo exacto de cada efecto de sonido (ver public/audio/README.md).
 *
 * MÚSICA DE FONDO: de 0.0 s a 80.0 s (bajar a -18 dB bajo la voz; subir en 31.2-36.2 s;
 * silencio total de 44.5 s a 47.5 s para el grillo; cambio a pad espacial de 68.0 s a 75.0 s).
 */
export const SCENES = [
  {from: 0, dur: 150, C: Scene1}, //   0.0 s →  5.0 s  Gancho
  {from: 150, dur: 300, C: Scene2}, //   5.0 s → 15.0 s  Cuántos somos
  {from: 450, dur: 360, C: Scene3}, //  15.0 s → 27.0 s  Dónde nos juntamos
  {from: 810, dur: 390, C: Scene4}, //  27.0 s → 40.0 s  El salto
  {from: 1200, dur: 240, C: Scene5}, // 40.0 s → 48.0 s  El ruido
  {from: 1440, dur: 210, C: Scene6}, // 48.0 s → 55.0 s  ¿Y la Tierra?
  {from: 1650, dur: 390, C: Scene7}, // 55.0 s → 68.0 s  El verdadero problema
  {from: 2040, dur: 210, C: Scene8}, // 68.0 s → 75.0 s  Bonus: la Luna
  {from: 2250, dur: 150, C: Scene9}, // 75.0 s → 80.0 s  Cierre / loop
];

/** Transiciones con barrido de tinta (SFX: swoosh de tinta en cada una). */
const WIPES = [
  {at: 150, flip: false}, //  5.0 s
  {at: 450, flip: true}, //  15.0 s
  {at: 810, flip: false}, // 27.0 s
  {at: 1440, flip: true}, // 48.0 s
  {at: 1650, flip: false}, // 55.0 s
  {at: 2040, flip: true}, // 68.0 s
  {at: 2250, flip: false}, // 75.0 s
];
// 40.0 s (frame 1200) es un corte seco con el "¡BOOOM!", sin barrido.

/** Impact frame: 2 frames con colores invertidos en el punto más alto del salto. */
const IMPACT_FRAMES = [810 + S4.PEAK, 810 + S4.PEAK + 1]; // 978 y 979 (32.6 s)

export const Short: React.FC = () => {
  const f = useCurrentFrame();
  const impact = IMPACT_FRAMES.includes(f);
  return (
    <AbsoluteFill style={{backgroundColor: '#fff', filter: impact ? 'invert(1)' : undefined}}>
      {SCENES.map(({from, dur, C}, i) => (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <C />
        </Sequence>
      ))}
      {WIPES.map((w, i) => (
        <InkWipe key={i} frame={f} at={w.at} flip={w.flip} seed={`ink${i}`} />
      ))}
      {/* MÚSICA + EFECTOS: pista generada por scripts/sound.py (sintetizada por código, con ducking bajo la voz) */}
      <Audio src={staticFile('audio/fondo.wav')} />
      {/* VOZ EN OFF: clips de Gemini TTS colocados en el segundo exacto de cada línea (src/narration.ts) */}
      {NARRATION.map((n) => (
        <Sequence key={n.id} from={Math.round(n.start * 30)} durationInFrames={Math.ceil(n.duration * 30) + 2} layout="none">
          <Audio src={staticFile(n.file)} />
        </Sequence>
      ))}
      <Subtitles frame={f} />
      <PencilProgress frame={f} total={TOTAL_FRAMES} />
    </AbsoluteFill>
  );
};
