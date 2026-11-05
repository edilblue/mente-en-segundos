import narracion from './data/narracion.json';
import guion from './data/guion.json';
import {FPS, norm} from './lib';

export type Word = {w: string; start: number; end: number};
export type SceneInfo = {
  id: number;
  nombre: string;
  texto: string;
  audio: string | null;
  dur: number; // segundos
  from: number; // frame inicial global
  frames: number;
  words: Word[];
  claves: string[];
};

let acc = 0;
export const SCENES: SceneInfo[] = narracion.escenas.map((e) => {
  const g = guion.escenas.find((x) => x.id === e.id)!;
  const frames = Math.round(e.duracion * FPS);
  const s: SceneInfo = {
    id: e.id,
    nombre: g.nombre,
    texto: e.texto,
    audio: e.audio,
    dur: frames / FPS,
    from: acc,
    frames,
    words: e.palabras,
    claves: g.claves.map(norm),
  };
  acc += frames;
  return s;
});

export const TOTAL_FRAMES = acc;
export const CON_VOZ = narracion.generadoCon === 'gemini';

/** Segundo (relativo a la escena) en que empieza la palabra `key`; `nth` para repeticiones. */
export const wt = (words: Word[], key: string, fallback: number, nth = 0) => {
  const k = norm(key);
  const hits = words.filter((w) => norm(w.w) === k);
  return hits[nth] ? hits[nth].start : fallback;
};

export const scene = (id: number) => SCENES.find((s) => s.id === id)!;
