import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SCRIPT} from '../script';
import {C, FONT_MAIN, FPS, SAFE_BOTTOM, W, boil, clamp, jit, pop, ramp, wobblyLine} from '../lib/anim';
import {Emoji} from './Effects';

/* ------------------------------------------------------------------ */
/* Subtítulos palabra por palabra con "pop"                             */
/* ------------------------------------------------------------------ */
const FONT_SIZE = 84;

export const Subtitles: React.FC<{frame: number}> = ({frame}) => {
  const chunk = SCRIPT.find((c) => frame >= c.start * FPS && frame < c.end * FPS);
  if (!chunk) return null;
  const words = chunk.text.split(' ');
  const s0 = chunk.start * FPS;
  const e0 = chunk.end * FPS;
  const n = words.length;
  const stepF = Math.min(7, ((e0 - s0) * 0.55) / n);
  const exit = ramp(frame, e0 - 4, e0);
  let lastShown = -1;
  const startOf = (i: number) => (chunk.times ? chunk.times[i] * FPS : s0 + i * stepF);
  for (let i = 0; i < n; i++) if (frame >= startOf(i)) lastShown = i;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          bottom: 1920 - SAFE_BOTTOM + 36,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-end',
          alignContent: 'flex-end',
          columnGap: 30,
          rowGap: 0,
          transform: `scale(${1 - exit * 0.25})`,
          opacity: 1 - exit,
          transformOrigin: '50% 100%',
        }}
      >
        {words.map((raw, i) => {
          const st = startOf(i);
          const p = pop(frame, st, {damping: 9, stiffness: 240, mass: 0.6});
          const key = raw.includes('*');
          const word = raw.replace(/\*/g, '');
          const active = i === lastShown;
          const rot = jit(`sw${chunk.start}${i}`, 3);
          const sc = p * (active ? 1.04 : 1);
          if (word === ':down:') {
            return (
              <div key={i} style={{width: 110, height: 110, transform: `scale(${sc}) translateY(${Math.sin(frame * 0.35) * 10}px)`}}>
                <svg width={110} height={110} viewBox="-55 -55 110 110">
                  <Emoji kind="down" frame={frame} />
                </svg>
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                fontFamily: FONT_MAIN,
                fontSize: FONT_SIZE,
                lineHeight: 1.18,
                transform: `scale(${sc}) rotate(${rot}deg) translateY(${(1 - Math.min(1, p)) * 30}px)`,
                opacity: frame >= st ? 1 : 0,
                letterSpacing: -1,
              }}
            >
              <span style={{color: C.ink, WebkitTextStroke: `20px ${C.ink}`, position: 'absolute', left: 4, top: 7}}>{word}</span>
              <span style={{color: C.ink, WebkitTextStroke: `20px ${C.ink}`, position: 'absolute', left: 0, top: 0}}>{word}</span>
              <span style={{color: key ? C.yellow : '#fff', position: 'relative'}}>{word}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Barra de progreso con forma de lápiz                                 */
/* ------------------------------------------------------------------ */
export const PencilProgress: React.FC<{frame: number; total: number}> = ({frame, total}) => {
  const x0 = 190;
  const x1 = 1010;
  const y = 178; // por debajo de los 150px libres de arriba
  const k = clamp(frame / (total - 1));
  const px = x0 + (x1 - x0) * k;
  const bob = Math.sin(frame * 0.9) * 2.5;
  const b = boil(frame, 3);
  return (
    <AbsoluteFill>
      <svg width={W} height={1920} viewBox={`0 0 ${W} 1920`}>
        <path d={`M${x0},${y} L${x1},${y}`} stroke={C.ink} strokeOpacity={0.18} strokeWidth={6} strokeDasharray="4 14" strokeLinecap="round" />
        {px > x0 + 4 && <path d={wobblyLine(x0, y, px, y, frame, 'graph', 1.2, 60)} stroke="#3B3B3B" strokeWidth={8} fill="none" strokeLinecap="round" />}
        <g transform={`translate(${px + jit(`pp${b}`, 0.6)} ${y + bob}) rotate(-14)`}>
          {/* punta de grafito */}
          <path d="M0,0 L-14,-7 L-14,7Z" fill="#3B3B3B" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
          {/* madera */}
          <path d="M-14,-7 L-38,-16 L-38,16 L-14,7Z" fill="#F4D3A1" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
          {/* cuerpo amarillo */}
          <rect x={-150} y={-16} width={112} height={32} fill={C.yellow} stroke={C.ink} strokeWidth={4} />
          <path d="M-150,-5 L-38,-5 M-150,6 L-38,6" stroke={C.yellowDark} strokeWidth={3} />
          {/* férula y borrador */}
          <rect x={-172} y={-17} width={22} height={34} fill="#C9C9C9" stroke={C.ink} strokeWidth={4} />
          <path d="M-172,-17 L-190,-17 Q-198,-17 -198,-8 L-198,8 Q-198,17 -190,17 L-172,17Z" fill="#F59BB0" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
