import React from 'react';
import {C} from '../lib/theme';
import {rnd} from '../lib/anim';

const OL = {stroke: C.ink, strokeWidth: 8, strokeLinejoin: 'round' as const};

export const Sky: React.FC<{top?: string; bottom?: string; id?: string}> = ({top = '#BFE0FF', bottom = '#F3F9FF', id = 'sky'}) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill={`url(#${id})`} />
  </>
);

export const Cloud: React.FC<{x: number; y: number; s?: number; o?: number}> = ({x, y, s = 1, o = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <path
      d="M -120 30 C -150 30 -150 -20 -110 -20 C -105 -60 -40 -70 -20 -35 C 0 -80 80 -70 85 -20 C 130 -25 140 30 100 30 Z"
      fill={C.white}
      stroke={C.blueSoft}
      strokeWidth={6}
    />
  </g>
);

export const Sun: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => (
  <g transform={`translate(${x} ${y})`}>
    <g transform={`rotate(${t * 6})`}>
      {Array.from({length: 12}).map((_, i) => (
        <line key={i} x1={0} y1={-95} x2={0} y2={-125} stroke={C.yellow} strokeWidth={10} strokeLinecap="round" transform={`rotate(${i * 30})`} />
      ))}
    </g>
    <circle r={78} fill={C.yellow} stroke={C.ink} strokeWidth={8} />
  </g>
);

/** Edificios lejanos (parallax lento). */
export const Buildings: React.FC<{off: number; base: number}> = ({off, base}) => {
  const items = Array.from({length: 14}).map((_, i) => {
    const w = 170 + rnd(i, 1) * 120;
    const h = 380 + rnd(i, 2) * 420;
    const x = i * 230 - 400;
    return {x, w, h, c: i % 3 === 0 ? '#CFE2F7' : i % 3 === 1 ? '#DCE9F8' : '#C3D8F0'};
  });
  return (
    <g transform={`translate(${-off} 0)`}>
      {items.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={base - b.h} width={b.w} height={b.h} fill={b.c} stroke="#9DB8DA" strokeWidth={5} />
          {Array.from({length: Math.floor(b.h / 90)}).map((_, r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={b.x + 22 + c * (b.w - 44) / 3}
                y={base - b.h + 30 + r * 90}
                width={(b.w - 80) / 3}
                height={44}
                rx={6}
                fill={rnd(i * 13 + r * 3 + c, 9) > 0.75 ? C.yellowSoft : '#EEF5FD'}
              />
            )),
          )}
        </g>
      ))}
    </g>
  );
};

export const Tree: React.FC<{x: number; y: number; s?: number; t?: number}> = ({x, y, s = 1, t = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={6} rx={90} ry={14} fill={C.shadow} />
    <path d="M -18 0 L -12 -230 L 12 -230 L 18 0 Z" fill="#B98552" {...OL} />
    <g transform={`rotate(${Math.sin(t * 1.4) * 1.5} 0 -260)`}>
      <circle cx={-70} cy={-290} r={90} fill="#5FCB8A" {...OL} />
      <circle cx={70} cy={-300} r={95} fill="#5FCB8A" {...OL} />
      <circle cx={0} cy={-380} r={110} fill="#6FD898" {...OL} />
      <circle cx={-30} cy={-400} r={26} fill="#8FE6B0" />
    </g>
  </g>
);

export const Lamp: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-12} y={-560} width={24} height={560} rx={8} fill="#5B6B82" {...OL} />
    <path d="M -12 -540 Q -12 -600 60 -600 L 90 -600" fill="none" stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
    <path d="M -12 -540 Q -12 -600 60 -600 L 90 -600" fill="none" stroke="#5B6B82" strokeWidth={8} strokeLinecap="round" />
    <path d="M 60 -605 L 120 -605 L 105 -570 L 75 -570 Z" fill={C.yellowSoft} {...OL} />
  </g>
);

/** Cerca de madera blanca. Se dibuja en dos capas para que el perro quede detrás. */
export const Fence: React.FC<{x0: number; x1: number; top: number; bottom: number; shake?: number; t?: number}> = ({
  x0,
  x1,
  top,
  bottom,
  shake = 0,
  t = 0,
}) => {
  const n = Math.floor((x1 - x0) / 74);
  return (
    <g>
      <rect x={x0} y={top + 70} width={x1 - x0} height={26} fill="#F5E8CF" {...OL} />
      <rect x={x0} y={bottom - 90} width={x1 - x0} height={26} fill="#F5E8CF" {...OL} />
      {Array.from({length: n}).map((_, i) => {
        const wob = Math.sin(t * 40 + i) * shake * 4;
        const px = x0 + i * 74 + 8;
        return (
          <path
            key={i}
            transform={`rotate(${wob} ${px + 29} ${bottom})`}
            d={`M ${px} ${bottom} L ${px} ${top + 26} L ${px + 29} ${top} L ${px + 58} ${top + 26} L ${px + 58} ${bottom} Z`}
            fill={i % 2 ? '#FFF6E6' : '#FBEFD8'}
            {...OL}
          />
        );
      })}
    </g>
  );
};

export const Sidewalk: React.FC<{y: number; off: number}> = ({y, off}) => (
  <g>
    <rect x={0} y={y} width={1080} height={150} fill="#E8E1D3" />
    {Array.from({length: 12}).map((_, i) => {
      const x = ((i * 180 - off) % 2160 + 2160) % 2160 - 180;
      return <line key={i} x1={x} y1={y} x2={x - 40} y2={y + 150} stroke="#D4CCBB" strokeWidth={6} />;
    })}
    <rect x={0} y={y + 150} width={1080} height={28} fill="#CFC6B4" stroke={C.ink} strokeWidth={6} />
    <rect x={0} y={y + 178} width={1080} height={400} fill="#8796AD" />
    {Array.from({length: 8}).map((_, i) => {
      const x = ((i * 300 - off) % 2400 + 2400) % 2400 - 300;
      return <rect key={i} x={x} y={y + 290} width={160} height={20} rx={10} fill={C.yellow} />;
    })}
  </g>
);
