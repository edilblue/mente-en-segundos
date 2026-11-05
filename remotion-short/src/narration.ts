import timing from './narration.json';
import {SCENES} from './theme';

type Key = keyof typeof SCENES;
type Line = {start: number; end: number; words?: number[]};

const line = (key: Key) => (timing as unknown as Record<string, Line>)[key];

// Ventana (en frames locales de la escena) en la que la voz dice la frase.
export const voiceWindow = (key: Key) => {
  const t = line(key);
  const from = SCENES[key].from;
  return {start: t.start - from, end: t.end - from - 8};
};

// Frame local exacto en que se pronuncia cada palabra (si está disponible).
export const wordTimes = (key: Key): number[] | undefined => {
  const t = line(key);
  return t.words?.map((f) => f - SCENES[key].from);
};
