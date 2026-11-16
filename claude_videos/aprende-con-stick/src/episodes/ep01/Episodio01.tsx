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

/** Mezcla (ganancias lineales). La voz siempre manda. */
const MIX = {voz: 1, musica: 0.2, musicaBajoVoz: 0.08, sfx: 0.55, sfxBajoVoz: 0.45};

/** 1 mientras hay voz (con rampas suaves), 0 en silencio. */
const vozActiva = (t: number) => {
  let a = 0;
  for (const e of N.escenas) {
    const ini = e.inicio + e.voz.inicio - 0.15;
    const fin = e.inicio + e.voz.inicio + e.voz.duracion + 0.2;
    const inn = Math.min(1, Math.max(0, (t - (ini - 0.25)) / 0.25));
    const out = Math.min(1, Math.max(0, (fin + 0.4 - t) / 0.4));
    a = Math.max(a, Math.min(inn, out));
  }
  return a;
};

/** Volumen de la música: baja (ducking) mientras hay voz. */
const musicVolume = (frame: number) => {
  const t = frame / FPS;
  const fadeIn = Math.min(1, t / 0.6);
  const fadeOut = Math.min(1, (N.total - t) / 1.2);
  const v = vozActiva(t);
  return Math.max(0, (MIX.musica * (1 - v) + MIX.musicaBajoVoz * v) * fadeIn * fadeOut);
};

/** Volumen de un efecto que empieza en `at` (s absolutos): se atenúa si coincide con la voz. */
const sfxVolume = (at: number, vol: number) => (frame: number) => {
  const v = vozActiva(at + frame / FPS);
  return Math.min(1, vol * MIX.sfx * (1 - v * (1 - MIX.sfxBajoVoz)));
};

/** stem: renderiza solo una pista (para medir la mezcla): 'voz' | 'sfx' | 'musica'. */
export const Episodio01: React.FC<{stem?: 'voz' | 'sfx' | 'musica'}> = ({stem}) => {
  const cues = allCues();
  const on = (k: 'voz' | 'sfx' | 'musica') => !stem || stem === k;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      {N.escenas.map((e, i) => (
        <Sequence key={e.id} from={f(e.inicio)} durationInFrames={f(e.inicio + e.duracion) - f(e.inicio)} name={`Escena ${e.id} · ${e.nombre}`}>
          <SceneHost data={e} Scene={SCENES[i].Scene} />
        </Sequence>
      ))}
      {/* Narración (Gemini TTS) */}
      {N.escenas.map((e) =>
        e.voz.audio && on('voz') ? (
          <Sequence key={`v${e.id}`} from={f(e.inicio + e.voz.inicio)} name={`Voz ${e.id}`}>
            <Html5Audio src={staticFile(e.voz.audio)} volume={MIX.voz} />
          </Sequence>
        ) : null,
      )}
      {/* Música original (generada por scripts/generar-audio.py) */}
      {on('musica') && <Html5Audio src={staticFile('audio/musica/ep01_musica.wav')} volume={musicVolume} />}
      {/* Efectos de sonido */}
      {on('sfx') && cues.map((q, i) => (
        <Sequence key={`s${i}`} from={Math.max(0, f(q.at))} name={`SFX ${q.sfx}`}>
          <Html5Audio src={staticFile(`audio/sfx/${q.sfx}.wav`)} volume={sfxVolume(q.at, q.vol ?? 0.5)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
