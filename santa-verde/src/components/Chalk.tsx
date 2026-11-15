import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, H, W, clamp, rnd} from '../lib';

/**
 * Filtros SVG globales (se definen una sola vez y todas las escenas los usan con url(#…)).
 *  - chalk:     borde irregular + grano de tiza en trazos blancos ("boiling line": la semilla cambia cada 3 frames)
 *  - chalkFill: grano más suave para rellenos de color (el traje)
 *  - dust:      nube de polvo de tiza
 *  - hblur:     desenfoque horizontal para transiciones "smear"
 */
export const ChalkDefs: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 3) % 7;
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <defs>
        <filter id="chalk" x="-8%" y="-8%" width="116%" height="116%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed={seed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="7" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed={seed + 11} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1.5 0 0 0 1.55" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        <filter id="chalkFill" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed + 3} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.22" numOctaves="2" seed={seed + 21} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1.3 0 0 0 1.62" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        <filter id="dust" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed={seed + 5} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="40" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="6" />
        </filter>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hblur" x="-20%" y="0%" width="140%" height="100%">
          <feGaussianBlur stdDeviation="38 0" />
        </filter>
      </defs>
    </svg>
  );
};

/** Pizarra oscura con textura, manchas de borrador y restos de tiza. */
export const Board: React.FC = () => {
  const smudges = Array.from({length: 9}, (_, i) => ({
    x: rnd(i * 3.1) * W,
    y: rnd(i * 7.7) * H,
    rx: 160 + rnd(i * 1.3) * 260,
    ry: 70 + rnd(i * 2.9) * 120,
    a: rnd(i * 5.3) * 180,
    o: 0.035 + rnd(i * 9.1) * 0.05,
  }));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="vig" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#262b30" />
          <stop offset="70%" stopColor={C.board} />
          <stop offset="100%" stopColor="#0e1012" />
        </radialGradient>
        <filter id="boardGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={4} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0 0 0 -0.38" />
        </filter>
        <filter id="smudge">
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#vig)" />
      <g filter="url(#smudge)">
        {smudges.map((s, i) => (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} transform={`rotate(${s.a} ${s.x} ${s.y})`} fill="#fff" opacity={s.o} />
        ))}
      </g>
      {/* trazos de borrador antiguos */}
      <g opacity={0.05} stroke="#fff" strokeWidth={60} strokeLinecap="round" fill="none" filter="url(#smudge)">
        <path d="M80,300 C300,260 520,340 760,280" />
        <path d="M200,1650 C420,1600 700,1700 980,1620" />
      </g>
      <rect width={W} height={H} filter="url(#boardGrain)" opacity={0.5} />
    </svg>
  );
};

/** Copos de nieve dibujados en tiza que caen despacio (decoración de fondo, en loop perfecto de 35 s). */
export const Snow: React.FC = () => {
  const f = useCurrentFrame();
  const T = 35 * 30;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <g filter="url(#chalk)" opacity={0.22}>
        {Array.from({length: 16}, (_, i) => {
          const loops = 1 + (i % 2); // 1 o 2 vueltas completas en 35 s → loop sin salto
          const y = ((rnd(i * 4.1) + (f / T) * loops) % 1) * (H + 200) - 100;
          const x = rnd(i * 8.3) * W + Math.sin((f / T) * Math.PI * 2 * loops + i) * 30;
          const s = 10 + rnd(i * 2.7) * 16;
          const a = (f / T) * 360 * (i % 2 ? 1 : -1);
          return (
            <g key={i} transform={`translate(${x},${y}) rotate(${a})`}>
              {[0, 60, 120].map((r) => (
                <path key={r} d={`M0,${-s} L0,${s}`} transform={`rotate(${r})`} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** Estilo de trazo de tiza estándar. */
export const chalkStroke = (w = 9, color: string = C.chalk) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/**
 * Texto de tiza que "se escribe": revelado de izquierda a derecha con una tiza
 * que avanza delante. `p` = progreso 0..1.
 */
export const ChalkText: React.FC<{
  x: number;
  y: number;
  text: string;
  size: number;
  p?: number;
  color?: string;
  font?: string;
  anchor?: 'start' | 'middle' | 'end';
  rot?: number;
  width?: number; // ancho estimado para el revelado
  letterSpacing?: number;
}> = ({x, y, text, size, p = 1, color = C.chalk, font = 'Cabin Sketch', anchor = 'middle', rot = 0, width, letterSpacing = 0}) => {
  const id = React.useId().replace(/:/g, '');
  const wEst = width ?? text.length * size * 0.56;
  const x0 = anchor === 'middle' ? x - wEst / 2 : anchor === 'end' ? x - wEst : x;
  const reveal = clamp(p);
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <clipPath id={`ct${id}`}>
        <rect x={x0 - 20} y={y - size * 1.2} width={(wEst + 40) * reveal} height={size * 1.7} />
      </clipPath>
      <g clipPath={reveal < 1 ? `url(#ct${id})` : undefined} filter="url(#chalk)">
        <text
          x={x}
          y={y}
          fontFamily={font}
          fontWeight={700}
          fontSize={size}
          fill={color}
          textAnchor={anchor}
          letterSpacing={letterSpacing}
        >
          {text}
        </text>
      </g>
    </g>
  );
};

/** Nube de polvo de tiza (impactos). */
export const Dust: React.FC<{x: number; y: number; t: number; at: number; r?: number; n?: number; color?: string}> = ({x, y, t, at, r = 160, n = 9, color = C.chalk}) => {
  const k = t - at;
  if (k < 0 || k > 0.9) return null;
  const e = 1 - Math.pow(1 - k / 0.9, 3);
  return (
    <g opacity={(1 - k / 0.9) * 0.45} filter="url(#dust)">
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rnd(i) * 0.6;
        const d = r * e * (0.6 + rnd(i * 4.4) * 0.6);
        return <circle key={i} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d * 0.55} r={26 + rnd(i * 2.2) * 30} fill={color} />;
      })}
    </g>
  );
};

/** Chispas/líneas de énfasis alrededor de un punto. */
export const Burst: React.FC<{x: number; y: number; t: number; at: number; r?: number; n?: number; color?: string; w?: number}> = ({
  x,
  y,
  t,
  at,
  r = 120,
  n = 8,
  color = C.chalk,
  w = 8,
}) => {
  const k = (t - at) / 0.45;
  if (k < 0 || k > 1) return null;
  return (
    <g filter="url(#chalk)">
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.3;
        const r0 = r * (0.55 + 0.5 * k);
        const r1 = r0 + 60 * (1 - k);
        return (
          <line
            key={i}
            x1={x + Math.cos(a) * r0}
            y1={y + Math.sin(a) * r0}
            x2={x + Math.cos(a) * r1}
            y2={y + Math.sin(a) * r1}
            {...chalkStroke(w * (1 - k * 0.6), color)}
          />
        );
      })}
    </g>
  );
};

/** Línea dibujada progresivamente (stroke-dashoffset). */
export const DrawPath: React.FC<{d: string; p: number; len?: number; w?: number; color?: string; fill?: string}> = ({d, p, len = 2000, w = 8, color = C.chalk, fill}) => (
  <path d={d} {...chalkStroke(w, color)} fill={fill ?? 'none'} strokeDasharray={len} strokeDashoffset={len * (1 - clamp(p))} />
);
