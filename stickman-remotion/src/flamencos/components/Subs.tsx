import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ESCENAS, FPS, P, SAFE, clamp, norm, spr, wt} from '../lib';
import {FONT_SUB} from './Chalk';

// Palabras clave → color (con "pop" extra).
const CLAVES: Record<string, string> = {
  rosados: P.pink,
  rosado: P.pink,
  grises: P.gray,
  gris: P.gray,
  carotenoides: P.orange,
  pigmentos: P.orange,
  naranjas: P.orange,
  algas: P.algae,
  camarones: P.coral,
  higado: '#e58a8a',
  rojiza: P.red,
  leche: P.red,
  palidos: P.pale,
  blanco: '#ffffff',
  comes: P.pink,
  literalmente: P.orangeGlow,
};

type Bloque = {words: {w: string; t: number; color?: string}[]; start: number; end: number};

const BLOQUES: Bloque[] = (() => {
  const out: Bloque[] = [];
  for (const e of ESCENAS) {
    const loc: Bloque[] = [];
    let cur: Bloque['words'] = [];
    e.palabras.forEach((p, i) => {
      cur.push({w: p.w, t: e.vozInicio + p.start, color: CLAVES[norm(p.w)]});
      const chars = cur.reduce((a, b) => a + b.w.length + 1, 0);
      const corte = /[….,!?:;]$/.test(p.w);
      const sig = e.palabras[i + 1];
      if (corte || cur.length >= 3 || chars >= 15 || !sig || (sig && chars + sig.w.length > 18)) {
        loc.push({words: cur, start: cur[0].t, end: 0});
        cur = [];
      }
    });
    const ultima = e.palabras[e.palabras.length - 1];
    loc.forEach((b, i) => {
      b.end = i < loc.length - 1 ? loc[i + 1].start : Math.min(e.fin - 0.12, e.vozInicio + ultima.end + 0.45);
    });
    out.push(...loc);
  }
  // "Eres lo que comes… literalmente" se escribe en tiza dentro de la escena 5 (hace de subtítulo).
  const hasta = wt(5, 'eres') - 0.05;
  return out.filter((b) => b.start < hasta).map((b) => ({...b, end: Math.min(b.end, hasta)}));
})();

export const Subs: React.FC<{y?: number}> = ({y = 1235}) => {
  const t = useCurrentFrame() / FPS;
  const b = BLOQUES.find((k) => t >= k.start - 0.03 && t < k.end);
  if (!b) return null;
  const idx = BLOQUES.indexOf(b);
  const tilt = [-2.5, 1.8, -1.2, 2.4, -1.8][idx % 5];
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left + 10,
        width: SAFE.right - SAFE.left - 20,
        top: y,
        transform: `translateY(-50%) rotate(${tilt}deg)`,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        columnGap: 24,
        rowGap: 4,
        lineHeight: 1.05,
      }}
    >
      {b.words.map((w, i) => {
        if (t < w.t - 0.03) return null;
        const k = spr(t, w.t - 0.03, w.color ? 3.6 : 4.5, w.color ? 4.5 : 7);
        const activa = i === b.words.length - 1 ? t < w.t + 0.5 : t < b.words[i + 1].t;
        const sc = Math.min(1.1, Math.max(0, k)) * (activa ? 1.05 : 1);
        const clean = w.w.replace(/\.\.\.$/, '…');
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT_SUB,
              fontSize: w.color ? 106 : 94,
              margin: w.color ? '0 18px' : '0 6px',
              color: w.color ?? P.chalk,
              WebkitTextStroke: '16px #0d1311',
              paintOrder: 'stroke fill',
              textShadow: w.color ? `0 0 26px ${w.color}66, 0 8px 0 #0d1311` : '0 8px 0 #0d1311',
              display: 'inline-block',
              transform: `scale(${sc}) rotate(${w.color ? (1 - clamp(k)) * -12 : 0}deg) translateY(${activa ? -4 : 0}px)`,
              transformOrigin: '50% 70%',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {clean}
          </span>
        );
      })}
    </div>
  );
};
