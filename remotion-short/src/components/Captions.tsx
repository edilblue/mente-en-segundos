import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';

type Props = {
  text: string;
  start: number; // frame (local) en que aparece la primera palabra
  end: number; // frame (local) en que aparece la última palabra
  highlights?: Record<string, string>; // palabra (sin signos) -> color
  fontSize?: number;
  top: number;
};

const clean = (w: string) => w.toLowerCase().replace(/[¿?¡!.,:]/g, '');
const isEmoji = (w: string) => /\p{Extended_Pictographic}/u.test(w);

export const Captions: React.FC<Props> = ({text, start, end, highlights = {}, fontSize = 78, top}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  // Tiempo de cada palabra proporcional a su longitud (como un ritmo de habla)
  const weights = words.map((w) => w.length + 3);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const starts = weights.map((w) => {
    const s = start + ((end - start) * acc) / total;
    acc += w;
    return Math.round(s);
  });

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 60,
        right: 60,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'flex-start',
        columnGap: fontSize * 0.28,
        rowGap: fontSize * 0.12,
        fontFamily: FONT,
        fontSize,
        lineHeight: 1.12,
        textAlign: 'center',
        color: 'white',
      }}
    >
      {words.map((w, i) => {
        const f = frame - starts[i];
        const s = spring({frame: f, fps, config: {damping: 9, stiffness: 220, mass: 0.6}});
        const visible = f >= 0;
        const scale = visible ? 0.35 + 0.65 * s : 0;
        const color = highlights[clean(w)] ?? 'white';
        const emoji = isEmoji(w);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: visible ? Math.min(1, f / 3 + 0.3) : 0,
              transform: `scale(${scale}) translateY(${emoji ? Math.sin(frame / 4) * 10 : 0}px)`,
              color,
              WebkitTextStroke: emoji ? undefined : `${fontSize * 0.16}px black`,
              paintOrder: 'stroke fill',
              textShadow:
                color === 'white'
                  ? '0 6px 0 rgba(0,0,0,0.6)'
                  : `0 0 26px ${color}, 0 6px 0 rgba(0,0,0,0.6)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
