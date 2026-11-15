import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {Board, ChalkDefs, Snow} from './components/Chalk';
import {Subtitles} from './components/Subtitles';
import {C, FPS, clamp, ease, lerp} from './lib';
import {SCENES} from './timeline';
import {SCENE_COMPONENTS, TRANSITIONS, Trans} from './scenes';

/** Mitad de la duración de una transición, en frames (la transición completa dura 2·HALF). */
export const HALF = 6;

/**
 * Estilo de una escena durante su entrada (p: 0→1) o salida (q: 0→1).
 * smear: barrido horizontal con estiramiento y desenfoque · wipe: cortina diagonal con borrador
 * zoom: la escena saliente se acerca y se desvanece; la entrante llega desde lejos.
 */
const styleFor = (type: Trans, mode: 'in' | 'out', k: number): React.CSSProperties => {
  if (k <= 0) return {};
  const e = ease.inOut(clamp(k));
  if (type === 'smear') {
    const dx = mode === 'out' ? -e * 1150 : (1 - e) * 1150;
    const stretch = 1 + Math.sin(e * Math.PI) * 0.7;
    return {transform: `translateX(${dx}px) scaleX(${stretch})`, filter: Math.sin(e * Math.PI) > 0.05 ? 'url(#hblur)' : undefined};
  }
  if (type === 'zoom') {
    if (mode === 'out') return {transform: `scale(${1 + e * 1.6})`, opacity: 1 - e, filter: `blur(${e * 14}px)`};
    return {transform: `scale(${lerp(0.55, 1, e)})`, opacity: e, filter: `blur(${(1 - e) * 10}px)`};
  }
  // wipe: la escena entrante se revela con una diagonal que avanza de izquierda a derecha
  // y la saliente queda recortada a la parte complementaria (las escenas tienen fondo transparente)
  const x = lerp(-35, 135, e);
  if (mode === 'in') return {clipPath: `polygon(0% 0%, ${x}% 0%, ${x - 30}% 100%, 0% 100%)`};
  return {clipPath: `polygon(${x}% 0%, 100% 0%, 100% 100%, ${x - 30}% 100%)`};
};

/** Banda de "borrador" que acompaña la transición wipe. */
const EraserBand: React.FC<{k: number}> = ({k}) => {
  if (k <= 0 || k >= 1) return null;
  const e = ease.inOut(k);
  const x = lerp(-35, 135, e);
  // la diagonal va de (x%, 0) a (x-30%, 100%)
  const x0 = (x / 100) * 1080;
  const x1 = ((x - 30) / 100) * 1080;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <path d={`M${x0},-50 L${x1},1970`} stroke={C.chalk} strokeWidth={90} opacity={0.35} filter="url(#dust)" />
      <path d={`M${x0},-50 L${x1},1970`} stroke={C.chalk} strokeWidth={14} opacity={0.6} filter="url(#chalk)" />
    </svg>
  );
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: C.board, overflow: 'hidden'}}>
      <ChalkDefs />
      <Board />
      <Snow />
      {SCENES.map((s, i) => {
        const Comp = SCENE_COMPONENTS[s.id];
        const inType = TRANSITIONS[s.id];
        const outType = SCENES[i + 1] ? TRANSITIONS[SCENES[i + 1].id] : undefined;
        const pre = inType ? HALF : 0;
        const post = outType ? HALF : 0;
        const from = s.from - pre;
        const dur = s.frames + pre + post;
        const local = frame - s.from; // frames desde el corte
        const kIn = inType ? clamp((local + HALF) / (2 * HALF)) : 1;
        const kOut = outType ? clamp((local - s.frames + HALF) / (2 * HALF)) : 0;
        const style = kIn < 1 && inType ? styleFor(inType, 'in', kIn) : kOut > 0 && outType ? styleFor(outType, 'out', kOut) : {};
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} name={`Escena ${s.id}`} layout="none">
            <AbsoluteFill style={{...style, zIndex: kIn < 1 ? 2 : 1}}>
              <Comp t={local / FPS} dur={s.dur} />
            </AbsoluteFill>
            {inType === 'wipe' && <EraserBand k={kIn} />}
          </Sequence>
        );
      })}
      <Subtitles />
    </AbsoluteFill>
  );
};
