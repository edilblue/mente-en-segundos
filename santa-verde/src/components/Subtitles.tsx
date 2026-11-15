import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FPS, SAFE, clamp, iv} from '../lib';
import {WORDS, Word} from '../timeline';

const COLORS: Record<string, string> = {green: C.green, red: '#ff4a3d', blue: '#5aa2ff', brown: '#d08a4f', yellow: C.yellow};
const SIZE = 92;
const MAX_CHARS = 16;

/** Agrupa las palabras en "páginas" de 1 línea (cortes en puntuación o por longitud). */
const paginas = (() => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  let chars = 0;
  for (const w of WORDS) {
    const prev = cur[cur.length - 1];
    const corte = prev && (/[.!?…,]$/.test(prev.w) || chars + w.w.length > MAX_CHARS || w.seg !== prev.seg);
    if (corte) {
      out.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(w);
    chars += w.w.length + 1;
  }
  if (cur.length) out.push(cur);
  return out;
})();

/**
 * Subtítulos grandes en el CENTRO de la pantalla, palabra por palabra:
 * la frase completa aparece tenue y cada palabra se enciende con "pop" justo cuando se pronuncia;
 * las palabras clave se encienden en color.
 */
export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  // página activa: la última cuya primera palabra ya empezó (y que no terminó hace > 0,35 s)
  let idx = -1;
  for (let i = 0; i < paginas.length; i++) if (t >= paginas[i][0].start - 0.03) idx = i;
  if (idx < 0) return null;
  const pag = paginas[idx];
  const last = pag[pag.length - 1];
  const next = paginas[idx + 1];
  const finPag = next ? Math.min(next[0].start - 0.03, last.end + 0.6) : last.end + 0.35;
  if (t > finPag) return null;
  const salida = clamp((t - (finPag - 0.08)) / 0.08);

  // tamaño que cabe en el ancho seguro (estimación de Luckiest Guy en mayúsculas ≈ 0,62 em por letra)
  const est = pag.reduce((a, w) => a + w.w.length, 0) * 0.62 * SIZE + 22 * (pag.length - 1);
  const fs = SIZE * Math.min(1, (SAFE.right - 110) / est);
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
        left: 40,
        width: SAFE.right - 40,
        top: SAFE.subY - 80,
        height: 160,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 22,
        opacity: 1 - salida,
      }}
    >
      {pag.map((w, i) => {
        const k = t - w.start + 0.03;
        const pop = k < 0 ? 1 : iv(k, [0, 0.07, 0.16], [0.6, 1.18, 1]);
        const dicha = k >= 0;
        const activo = t >= w.start && t <= w.end + 0.05;
        const color = dicha && w.color ? COLORS[w.color] : C.chalk;
        return (
          <span
            key={i}
            style={{
              fontFamily: 'Luckiest Guy',
              fontSize: fs,
              lineHeight: 1,
              color,
              textTransform: 'uppercase',
              WebkitTextStroke: `18px ${C.ink}`,
              paintOrder: 'stroke fill',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              opacity: dicha ? 1 : 0.28,
              transform: `translateY(${activo ? -6 : 0}px) scale(${pop}) rotate(${dicha && w.color ? (i % 2 ? 2 : -2) : 0}deg)`,
              textShadow: '0 8px 0 rgba(0,0,0,0.45)',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};
