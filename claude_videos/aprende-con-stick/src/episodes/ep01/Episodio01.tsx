import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {FPS} from '../../lib/anim';
import {SceneHost, SceneModule} from '../../lib/scene';
import {makeCtx, Narracion} from '../../lib/timeline';
import {C} from '../../lib/theme';
import narracion from './narracion.json';
import * as S1 from './scenes/S1';
import * as S2 from './scenes/S2';
import * as S3 from './scenes/S3';
import * as S4 from './scenes/S4';
import * as S5 from './scenes/S5';
import * as S6 from './scenes/S6';
import * as S7 from './scenes/S7';

const N = narracion as Narracion;
const SCENES: SceneModule[] = [S1, S2, S3, S4, S5, S6, S7];

const f = (s: number) => Math.round(s * FPS);
export const duracionEp01 = () => f(N.total);

/** Todos los efectos con su segundo absoluto (lo usan el render y scripts/cues). */
export const allCues = () =>
  N.escenas.flatMap((e, i) => SCENES[i].cues(makeCtx(0, e)).map((q) => ({...q, at: e.inicio + q.at, escena: e.id})));

/** Volumen de la música: baja (ducking) mientras hay voz. */
const musicVolume = (frame: number) => {
  const t = frame / FPS;
  let duck = 0;
  for (const e of N.escenas) {
    const a = e.inicio + e.voz.inicio - 0.25;
    const b = e.inicio + e.voz.inicio + e.voz.duracion + 0.3;
    if (t > a - 0.3 && t < b + 0.5) {
      const inn = Math.min(1, (t - (a - 0.3)) / 0.3);
      const out = Math.min(1, (b + 0.5 - t) / 0.5);
      duck = Math.max(duck, Math.min(inn, out));
    }
  }
  const fadeIn = Math.min(1, t / 0.6);
  const fadeOut = Math.min(1, (N.total - t) / 1.2);
  return Math.max(0, (0.32 - duck * 0.2) * fadeIn * fadeOut);
};

export const Episodio01: React.FC = () => {
  const cues = allCues();
  return (
    <AbsoluteFill style={{background: C.paper}}>
      {N.escenas.map((e, i) => (
        <Sequence key={e.id} from={f(e.inicio)} durationInFrames={f(e.inicio + e.duracion) - f(e.inicio)} name={`Escena ${e.id} · ${e.nombre}`}>
          <SceneHost data={e} Scene={SCENES[i].Scene} />
        </Sequence>
      ))}
      {/* Narración (Gemini TTS) */}
      {N.escenas.map((e) =>
        e.voz.audio ? (
          <Sequence key={`v${e.id}`} from={f(e.inicio + e.voz.inicio)} name={`Voz ${e.id}`}>
            <Html5Audio src={staticFile(e.voz.audio)} volume={1} />
          </Sequence>
        ) : null,
      )}
      {/* Música original (generada por scripts/generar-audio.py) */}
      <Html5Audio src={staticFile('audio/musica/ep01_musica.wav')} volume={musicVolume} />
      {/* Efectos de sonido */}
      {cues.map((q, i) => (
        <Sequence key={`s${i}`} from={Math.max(0, f(q.at))} name={`SFX ${q.sfx}`}>
          <Html5Audio src={staticFile(`audio/sfx/${q.sfx}.wav`)} volume={q.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
