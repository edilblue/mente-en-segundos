import React from 'react';
import {useCurrentFrame} from 'remotion';
import {H, P, W, clamp, rnd} from '../lib';

export const FONT_SUB = '"Luckiest Guy", Impact, sans-serif';
export const FONT_CHALK = '"Cabin Sketch", "Luckiest Guy", sans-serif';

/** Semilla de "boiling": cambia cada 3 frames → trazo de tiza vivo. */
export const useBoil = () => Math.floor(useCurrentFrame() / 3) % 5;

/** Filtros de tiza: grano (huecos del trazo) + borde irregular que hierve. */
export const ChalkDefs: React.FC<{id?: string; rough?: number; grain?: boolean}> = ({id = 'chalk', rough = 5, grain = true}) => {
  const s = useBoil();
  return (
    <defs>
      <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={s + 3} result="g" />
        <feColorMatrix in="g" type="matrix" values={grain ? '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -0.55' : '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1'} result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" result="gr" />
        <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves={2} seed={s + 11} result="w" />
        <feDisplacementMap in="gr" in2="w" scale={rough} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="9" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
};

/** Pizarra: verde oscuro con manchas de borrador y polvo de tiza. */
export const Board: React.FC = () => {
  const smudges = Array.from({length: 9}, (_, i) => ({
    x: rnd(i * 3.1) * W,
    y: rnd(i * 7.7 + 2) * H,
    r: 260 + rnd(i * 5.3) * 380,
    o: 0.05 + rnd(i * 1.9) * 0.07,
  }));
  const swirls = Array.from({length: 7}, (_, i) => {
    const x = rnd(i * 11.3 + 1) * W;
    const y = rnd(i * 4.9 + 5) * H;
    const r = 120 + rnd(i * 2.2) * 200;
    return `M${x - r},${y} a${r},${r * 0.45} ${rnd(i) * 40 - 20} 0 1 ${2 * r},0`;
  });
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="smudge">
          <stop offset="0" stopColor="#b9c9c1" stopOpacity="1" />
          <stop offset="1" stopColor="#b9c9c1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vig" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <filter id="dust">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={4} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.9  0 0 0 0 0.88  2.2 0 0 0 -1.55" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={P.board} />
      {smudges.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="url(#smudge)" opacity={s.o} />
      ))}
      {swirls.map((d, i) => (
        <path key={i} d={d} stroke="#dfe8e3" strokeWidth={60 + i * 8} fill="none" opacity={0.025} strokeLinecap="round" />
      ))}
      <rect width={W} height={H} filter="url(#dust)" opacity={0.18} />
      <rect width={W} height={H} fill="url(#vig)" />
    </svg>
  );
};

/** Línea "a mano": puntos intermedios con un leve temblor determinista. */
export const handLine = (pts: [number, number][], seed: number, amp = 2) =>
  pts
    .map(([x, y], i) => {
      const j = i === 0 || i === pts.length - 1 ? 0 : (rnd(seed * 13 + i) - 0.5) * 2 * amp;
      return `${i ? 'L' : 'M'}${(x + j).toFixed(1)},${(y - j).toFixed(1)}`;
    })
    .join(' ');

/** Trazo que se "dibuja" con tiza (dasharray) según progreso 0..1. */
export const Drawn: React.FC<{d: string; p: number; len?: number; stroke?: string; sw?: number; opacity?: number}> = ({
  d,
  p,
  len = 2000,
  stroke = P.chalk,
  sw = 7,
  opacity = 1,
}) =>
  p <= 0 ? null : (
    <path d={d} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - clamp(p))} opacity={opacity} />
  );

/** Texto de tiza (Cabin Sketch) con "pop" de escala. */
export const ChalkText: React.FC<{
  x: number;
  y: number;
  text: string;
  size: number;
  pop?: number; // 0..1 (spring)
  fill?: string;
  rot?: number;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  spacing?: number;
}> = ({x, y, text, size, pop = 1, fill = P.chalk, rot = 0, anchor = 'middle', weight = 700, spacing = 1}) =>
  pop <= 0.001 ? null : (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${pop})`}>
      <text
        textAnchor={anchor}
        dominantBaseline="middle"
        fontFamily={FONT_CHALK}
        fontWeight={weight}
        fontSize={size}
        fill={fill}
        letterSpacing={spacing}
        style={{paintOrder: 'stroke'}}
      >
        {text}
      </text>
    </g>
  );

/** Destellos de tiza (estrellitas de 4 puntas). */
export const Sparkle: React.FC<{x: number; y: number; s: number; color?: string; rot?: number}> = ({x, y, s, color = P.chalk, rot = 0}) =>
  s <= 0.01 ? null : (
    <path
      transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}
      d="M0,-26 Q4,-4 26,0 Q4,4 0,26 Q-4,4 -26,0 Q-4,-4 0,-26Z"
      fill={color}
    />
  );

/** Nube de polvo de tiza (impactos). */
export const Dust: React.FC<{x: number; y: number; t: number; at: number; n?: number; spread?: number; color?: string}> = ({
  x,
  y,
  t,
  at,
  n = 9,
  spread = 160,
  color = P.chalk,
}) => {
  const k = (t - at) / 0.7;
  if (k < 0 || k > 1) return null;
  return (
    <g opacity={1 - k}>
      {Array.from({length: n}, (_, i) => {
        const a = Math.PI + (i / (n - 1)) * Math.PI + (rnd(i * 3) - 0.5) * 0.3;
        const d = spread * (0.4 + rnd(i * 7) * 0.6) * (1 - Math.pow(1 - k, 3));
        const r = 14 + rnd(i) * 22 * (1 - k * 0.5);
        return <circle key={i} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d * 0.45 - k * 20} r={r} fill={color} opacity={0.5} />;
      })}
    </g>
  );
};
