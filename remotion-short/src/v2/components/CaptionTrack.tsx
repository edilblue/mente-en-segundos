import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {Captions} from '../../components/Captions';
import {CYAN, PINK, AMBER} from '../../theme';
import {LINES, scene} from '../timeline';

// Palabras resaltadas por frase
const HL: Record<string, Record<string, string>> = {
  h1: {'11': PINK, días: PINK, dormir: CYAN},
  h2: {cerebro: CYAN, día: PINK, día2: PINK},
  c1: {randy: CYAN, gardner: CYAN, '17': PINK, feria: AMBER, ciencias: AMBER},
  d1: {'1': PINK, '24': CYAN, horas: CYAN, reflejos: PINK, alcohol: PINK},
  d2: {'2': PINK, enfocar: CYAN, vista: CYAN},
  d3: {'3': PINK, mal: PINK, humor: PINK, torpeza: AMBER},
  b1: {limpia: CYAN, desechos: CYAN, duermes: CYAN},
  b2: {sin: PINK, dormir: PINK, basura: AMBER},
  d4: {'4': PINK, alucinar: PINK, señal: AMBER, persona: CYAN},
  d4b: {famoso: AMBER, jugador: CYAN, fútbol: CYAN, americano: CYAN},
  d9: {'9': PINK, terminar: CYAN, frases: CYAN},
  d11: {'11': PINK, lento: CYAN, expresión: CYAN, olvidaba: PINK},
  p1: {sorprendente: AMBER, '15': CYAN, horas: CYAN},
  p2: {recuperado: CYAN},
  g1: {guinness: AMBER, peligroso: PINK},
  o1: {horas: CYAN, tú: PINK, comentarios: AMBER},
};

/** Subtítulos de una escena: muestra sólo la frase activa, palabra por palabra. */
export const CaptionTrack: React.FC<{sceneId: string; top?: number; fontSize?: number}> = ({sceneId, top = 1130, fontSize = 76}) => {
  const frame = useCurrentFrame();
  const s = scene(sceneId);
  const lines = LINES.filter((l) => l.scene === sceneId).map((l) => ({...l, start: l.start - s.from, end: l.end - s.from}));
  return (
    <>
      {lines.map((l, i) => {
        const next = lines[i + 1];
        const until = next ? next.start - 1 : Infinity;
        if (frame < l.start - 2 || frame > until) return null;
        const out = next ? interpolate(frame, [until - 4, until], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
        return (
          <div key={l.id} style={{opacity: out}}>
            <Captions text={l.display} start={l.start} end={l.end - 6} top={top} fontSize={fontSize} highlights={HL[l.id]} />
          </div>
        );
      })}
    </>
  );
};
