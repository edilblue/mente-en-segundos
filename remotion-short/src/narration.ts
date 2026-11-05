import timing from './narration.json';
import {SCENES} from './theme';

type Key = keyof typeof SCENES;

// Ventana (en frames locales de la escena) en la que la voz dice la frase.
// La última palabra aparece un poco antes de que termine el audio.
export const voiceWindow = (key: Key) => {
  const t = (timing as Record<string, {start: number; end: number}>)[key];
  const from = SCENES[key].from;
  return {start: t.start - from, end: t.end - from - 8};
};
