import {useCurrentFrame} from 'remotion';
import {FPS} from '../lib';
import type {Word} from '../timeline';

export type SceneProps = {dur: number; words: Word[]};
export const GROUND = 1310;

export const useT = () => useCurrentFrame() / FPS;

/** Garantiza que una serie de tiempos sea creciente con separación mínima. */
export const ordered = (xs: number[], gap = 0.25) => {
  const out = [...xs];
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  return out;
};
