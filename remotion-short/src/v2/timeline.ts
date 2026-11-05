import script from './script.json';
import timeline from './timeline.json';
import {wordStarts} from '../components/Captions';

export type Line = {id: string; scene: string; display: string; start: number; end: number};

const DISPLAY: Record<string, string> = Object.fromEntries(script.lines.map((l) => [l.id, l.display]));

export const FPS2 = timeline.fps;
export const DURATION2 = timeline.durationInFrames;
export const SCENES2 = timeline.scenes;
export const LINES: Line[] = timeline.lines.map((l) => ({...l, display: DISPLAY[l.id]}));

export const scene = (id: string) => {
  const s = SCENES2.find((x) => x.id === id);
  if (!s) throw new Error(`Escena desconocida: ${id}`);
  return s;
};

export const line = (id: string) => {
  const l = LINES.find((x) => x.id === id);
  if (!l) throw new Error(`Frase desconocida: ${id}`);
  return l;
};

/** Frase en frames locales de su escena. */
export const localLine = (id: string) => {
  const l = line(id);
  const s = scene(l.scene);
  return {...l, start: l.start - s.from, end: l.end - s.from};
};

/** Frame local (en la escena) en que se dice la palabra que contiene `word`. */
export const wordAt = (id: string, word: string) => {
  const l = localLine(id);
  const words = l.display.split(' ');
  const idx = Math.max(0, words.findIndex((w) => w.toLowerCase().includes(word.toLowerCase())));
  return wordStarts(l.display, l.start, l.end - 6)[idx];
};

const g = (id: string) => line(id).start;

/** Día del experimento en cada frame global (para el HUD, la luna y los FX). */
export const DAY_KEYS: [number, number][] = [
  [g('d1'), 1],
  [g('d2'), 2],
  [g('d3'), 3],
  [g('d4'), 4],
  [g('d9'), 5],
  [g('d9') + 4, 6],
  [g('d9') + 8, 7],
  [g('d9') + 12, 8],
  [g('d9') + 16, 9],
  [g('d11'), 10],
  [g('d11') + 6, 11],
];

export const dayAt = (frame: number) => {
  let d = 0;
  for (const [f, v] of DAY_KEYS) if (frame >= f) d = v;
  return d;
};

export const lastDayChange = (frame: number) => {
  let last = -1000;
  for (const [f] of DAY_KEYS) if (frame >= f) last = f;
  return last;
};
