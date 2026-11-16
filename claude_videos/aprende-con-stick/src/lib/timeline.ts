import React, {createContext, useContext} from 'react';

export type Palabra = {w: string; start: number; end: number};
export type EscenaData = {
  id: number;
  nombre: string;
  inicio: number;
  duracion: number;
  voz: {audio: string | null; inicio: number; duracion: number};
  palabras: Palabra[];
};
export type Narracion = {generadoCon: string; modelo: string | null; voz: string | null; total: number; escenas: EscenaData[]};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]/g, '');

export type SceneCtx = {
  /** segundos desde el inicio de la escena */
  t: number;
  /** duración total de la escena */
  D: number;
  data: EscenaData;
  /** instante (s de escena) en que empieza la palabra `w` (n-ésima aparición). */
  at: (w: string, n?: number) => number;
  /** instante en que termina la palabra */
  end: (w: string, n?: number) => number;
  vozIni: number;
  vozFin: number;
};

export const makeCtx = (t: number, data: EscenaData): SceneCtx => {
  const find = (w: string, n = 0) => {
    const k = norm(w);
    const hits = data.palabras.filter((p) => norm(p.w).startsWith(k));
    const p = hits[Math.min(n, hits.length - 1)];
    if (!p) throw new Error(`Palabra "${w}" no está en la escena ${data.id}`);
    return p;
  };
  return {
    t,
    D: data.duracion,
    data,
    at: (w, n) => find(w, n).start,
    end: (w, n) => find(w, n).end,
    vozIni: data.voz.inicio,
    vozFin: data.voz.inicio + data.voz.duracion,
  };
};

export const SceneContext = createContext<SceneCtx | null>(null);
export const useScene = () => {
  const c = useContext(SceneContext);
  if (!c) throw new Error('useScene fuera de una escena');
  return c;
};
export const SceneProvider = SceneContext.Provider;
export {React};
