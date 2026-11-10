import TL from '../data/timeline.json';

export interface SceneInfo {
  id: number;
  start: number;
  dur: number;
  voiceStart: number;
  voiceDur: number;
  audio: string;
  words: {w: string; t: number}[];
}
export const TIMELINE = TL as unknown as {total: number; frames: number; scenes: SceneInfo[]; beats: {t: number; g: number}[]};
export const SCENES = TIMELINE.scenes;

const norm = (w: string) => w.toLowerCase().replace(/[¿?¡!.,;:…]/g, '');

/** instante (en segundos LOCALES de la escena) en que empieza la palabra indicada */
export function cue(id: number, word: string, nth = 0): number {
  const s = SCENES[id - 1];
  let k = 0;
  for (const w of s.words) {
    if (norm(w.w).startsWith(norm(word))) {
      if (k === nth) return w.t - s.start;
      k++;
    }
  }
  throw new Error(`cue no encontrado: ${id} ${word}`);
}

/** fase del latido (en latidos) sincronizada EXACTAMENTE con los latidos del audio */
export function heartPhase(tg: number): number {
  const b = TIMELINE.beats;
  if (tg < b[0].t) return -0.5 + (tg / b[0].t) * 0.5;
  let i = 0;
  while (i < b.length - 1 && b[i + 1].t <= tg) i++;
  const next = i < b.length - 1 ? b[i + 1].t : b[i].t + 0.9;
  // la contracción visual (pico en fase 0.16) cae justo sobre el "lub" sonoro
  return i + (tg - b[i].t) / (next - b[i].t) + 0.1;
}
