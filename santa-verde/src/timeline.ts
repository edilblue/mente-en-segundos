import narracion from './data/narracion.json';
import guion from './data/guion.json';
import {FPS, norm} from './lib';

export type Word = {w: string; start: number; end: number; color?: string; seg: number};
export type SceneInfo = {id: number; from: number; frames: number; start: number; dur: number; words: Word[]};

const claves = (id: number) => {
  const g = guion.segmentos.find((s) => s.id === id)!;
  return Object.fromEntries(Object.entries(g.claves as unknown as Record<string, string>).map(([k, v]) => [norm(k), v]));
};

export const TOTAL_FRAMES = Math.round(narracion.total * FPS);

export const SCENES: SceneInfo[] = narracion.escenas.map((e) => {
  const from = Math.round(e.inicio * FPS);
  const to = Math.round(e.fin * FPS);
  const k = claves(e.id);
  return {
    id: e.id,
    from,
    frames: to - from,
    start: from / FPS,
    dur: (to - from) / FPS,
    words: e.palabras.map((p) => ({...p, seg: e.id, color: k[norm(p.w)]})),
  };
});

export const WORDS: Word[] = SCENES.flatMap((s) => s.words);
export const scene = (id: number) => SCENES.find((s) => s.id === id)!;

/** Segundo (relativo al inicio de la escena) en que se dice la palabra `key`. */
export const cue = (id: number, key: string, fallback: number, nth = 0) => {
  const s = scene(id);
  const hits = s.words.filter((w) => norm(w.w) === norm(key));
  return hits[nth] ? hits[nth].start - s.start : fallback;
};
/** Fin de la voz de una escena (relativo a la escena). */
export const vozFin = (id: number) => {
  const e = narracion.escenas.find((x) => x.id === id)!;
  return e.vozFin - scene(id).start;
};
