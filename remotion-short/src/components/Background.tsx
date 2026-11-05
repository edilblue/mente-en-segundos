import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {CYAN, HEIGHT, PINK, WIDTH} from '../theme';

const TAU = Math.PI * 2;
const GRID = 90;

// Todo es periódico con la duración del video para que el loop sea perfecto.
const PARTICLES = new Array(55).fill(0).map((_, i) => ({
  x: random(`px${i}`) * WIDTH,
  y: random(`py${i}`) * (HEIGHT + 60),
  r: 1.5 + random(`pr${i}`) * 4.5,
  loops: 1 + Math.floor(random(`ps${i}`) * 2),
  sway: 10 + random(`pw${i}`) * 30,
  swayFreq: 1 + Math.floor(random(`pf${i}`) * 3),
  phase: random(`ph${i}`) * TAU,
  color: random(`pc${i}`) > 0.55 ? PINK : CYAN,
}));

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = frame / durationInFrames; // 0..1 (periódico con la duración del video)
  const shift = (t * GRID * 2) % GRID;

  return (
    <AbsoluteFill style={{background: 'linear-gradient(170deg, #060920 0%, #110a33 48%, #1d0a3c 100%)'}}>
      {/* manchas de luz neón */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${30 + Math.sin(t * TAU) * 12}% ${28 + Math.cos(t * TAU) * 6}%, rgba(41,243,255,0.16), transparent 45%),
             radial-gradient(circle at ${72 + Math.cos(t * TAU) * 12}% ${74 + Math.sin(t * TAU) * 6}%, rgba(255,61,200,0.16), transparent 48%)`,
        }}
      />
      {/* cuadrícula tenue */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(120,200,255,0.08) 2px, transparent 2px),
             linear-gradient(90deg, rgba(120,200,255,0.08) 2px, transparent 2px)`,
          backgroundSize: `${GRID}px ${GRID}px`,
          backgroundPosition: `0px ${shift}px`,
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 85%)',
        }}
      />
      {/* partículas flotando */}
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute'}}>
        {PARTICLES.map((p, i) => {
          const span = HEIGHT + 60;
          const y = (((p.y - t * span * p.loops) % span) + span) % span - 30;
          const x = p.x + Math.sin(t * TAU * p.swayFreq + p.phase) * p.sway;
          const op = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * TAU * 4 + p.phase));
          return (
            <g key={i} opacity={op}>
              <circle cx={x} cy={y} r={p.r * 3} fill={p.color} opacity={0.15} />
              <circle cx={x} cy={y} r={p.r} fill={p.color} />
            </g>
          );
        })}
      </svg>
      {/* viñeta */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};
