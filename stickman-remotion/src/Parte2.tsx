import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, getStaticFiles, staticFile, useCurrentFrame} from 'remotion';
import {Paper} from './components/fx';
import {InkWipe, ParteBadge, PencilProgress, Subtitles} from './components/overlays';
import {SCENES} from './timeline';
import {SCENE_COMPONENTS} from './scenes';
import {impactFrames} from './scenes/S7';
import {CUES} from './cues';
import {FACTOR_SFX_BAJO_VOZ, hablando, volumenMusica} from './mezcla';
import {FPS} from './lib';

const existe = (p: string) => getStaticFiles().some((f) => f.name === p);
const MUSICA = ['audio/musica/fondo.mp3', 'audio/musica/fondo.wav'].find(existe);
// Efectos: public/audio/sfx/<nombre>.wav|mp3 (generados por scripts/generar-audio-fx.py)

export const Parte2: React.FC = () => {
  const f = useCurrentFrame();
  // "Impact frame": 2 frames con colores invertidos en el punto más alto del salto masivo.
  const invert = impactFrames().includes(f);
  return (
    <AbsoluteFill style={{backgroundColor: '#fdfdf8', filter: invert ? 'invert(1)' : undefined}}>
      <Paper />
      {SCENES.map((s) => {
        const Comp = SCENE_COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={`Escena ${s.id} — ${s.nombre}`}>
            <Comp dur={s.dur} words={s.words} />
            {/* Narración: siempre a volumen completo, por encima de todo */}
            {s.audio && <Html5Audio src={staticFile(s.audio)} volume={1} />}
          </Sequence>
        );
      })}
      {/* Música de fondo (public/audio/musica/fondo.wav): baja automáticamente cuando habla el narrador */}
      {MUSICA && <Html5Audio src={staticFile(MUSICA)} volume={(f) => volumenMusica(f / FPS)} />}
      {/* Efectos de sonido en los segundos de src/cues.ts (ver public/audio/README) */}
      {CUES.map((c, i) => {
        const file = [`audio/sfx/${c.sfx}.mp3`, `audio/sfx/${c.sfx}.wav`].find(existe);
        return file ? (
          <Sequence key={i} from={c.frame} name={`SFX ${c.sfx}`}>
            <Html5Audio src={staticFile(file)} volume={(c.vol ?? 0.45) * (hablando(c.t) ? FACTOR_SFX_BAJO_VOZ : 1)} />
          </Sequence>
        ) : null;
      })}
      <InkWipe />
      <Subtitles />
      <PencilProgress />
      <ParteBadge />
    </AbsoluteFill>
  );
};
