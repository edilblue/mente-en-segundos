// Mezcla: la narración manda. La música baja ("ducking") mientras alguien habla.
import {FPS, clamp} from './lib';
import {SCENES} from './timeline';

/** Intervalos [inicio, fin] (s, globales) en los que suena la narración. */
export const narracionActiva: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (const s of SCENES) {
    if (!s.audio) continue;
    const base = s.from / FPS;
    for (const w of s.words) {
      const a = base + w.start - 0.08;
      const b = base + w.end + 0.12;
      const last = out[out.length - 1];
      if (last && a - last[1] < 0.45) last[1] = Math.max(last[1], b);
      else out.push([a, b]);
    }
  }
  return out;
})();

const MUSICA_LIBRE = 0.34; // sin voz
const MUSICA_VOZ = 0.1; // bajo la voz (≈ -10 dB)
const RAMPA = 0.25; // s

/** Volumen de la música en el segundo t (sube y baja suave alrededor de la voz). */
export const volumenMusica = (t: number) => {
  let d = Infinity; // distancia al intervalo de voz más cercano (0 si está dentro)
  for (const [a, b] of narracionActiva) {
    if (t >= a && t <= b) {
      d = 0;
      break;
    }
    d = Math.min(d, t < a ? a - t : t - b);
  }
  const k = clamp(d / RAMPA);
  return MUSICA_VOZ + (MUSICA_LIBRE - MUSICA_VOZ) * k;
};

/** ¿Está hablando el narrador en el segundo t? (los efectos bajan un poco si coinciden con la voz) */
export const hablando = (t: number) => narracionActiva.some(([a, b]) => t >= a && t <= b);
export const FACTOR_SFX_BAJO_VOZ = 0.6;
