import React from 'react';
import {FONT, PINK} from '../theme';

const TAU = Math.PI * 2;

// Signo de interrogación neón animado (t = 0..1 a lo largo del video, periódico)
export const QuestionMark: React.FC<{t: number; size: number; pop?: number}> = ({t, size, pop = 1}) => {
  const bob = Math.sin(t * TAU * 10) * 14;
  const rot = Math.sin(t * TAU * 10 + 1) * 10;
  const pulse = 0.75 + 0.25 * Math.sin(t * TAU * 20);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        lineHeight: 1,
        color: PINK,
        WebkitTextStroke: `${size * 0.06}px black`,
        paintOrder: 'stroke fill',
        textShadow: `0 0 ${30 * pulse}px ${PINK}, 0 0 ${70 * pulse}px rgba(255,61,200,0.7)`,
        transform: `translateY(${bob}px) rotate(${rot}deg) scale(${pop})`,
      }}
    >
      ?
    </div>
  );
};
