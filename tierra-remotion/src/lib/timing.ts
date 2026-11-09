import data from '../data/narracion.json';
import {useCurrentFrame, useVideoConfig} from 'remotion';

export const FPS = 30;
export type Palabra = {w: string; start: number; end: number};
export type Frase = {texto: string; start: number; end: number; palabras: Palabra[]};
export type Escena = {id: number; nombre: string; inicio: number; duracion: number; frases: Frase[]};

export const NARRACION = data as {total: number; escenas: Escena[]};
export const ESCENAS = NARRACION.escenas;
export const TOTAL_FRAMES = Math.ceil(NARRACION.total * FPS);
export const escena = (id: number) => ESCENAS.find((e) => e.id === id)!;
/** inicio (s, local a la escena) de la frase i (base 1) */
export const fs = (id: number, i: number) => escena(id).frases[i - 1].start;
export const fe = (id: number, i: number) => escena(id).frases[i - 1].end;
/** inicio local de la primera palabra que empieza por `w` dentro de la escena */
export const ws = (id: number, w: string, nth = 0) => {
  const all = escena(id).frases.flatMap((f) => f.palabras);
  const m = all.filter((p) => p.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').startsWith(w.toLowerCase()));
  return (m[nth] ?? m[0] ?? {start: 0}).start;
};

/** segundos locales dentro de la Sequence actual */
export const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};
