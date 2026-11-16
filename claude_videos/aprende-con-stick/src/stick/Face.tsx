import React, {useId} from 'react';
import {C} from '../lib/theme';
import {Expr} from './expressions';

export const HEAD_R = 66;

type Props = {
  expr: Expr;
  look?: [number, number];
  turn?: number; // -1..1 hacia dónde gira la cabeza (desplaza rasgos)
  blink?: number; // 0..1
  t?: number;
};

/** Cabeza circular blanca con contorno grueso + rasgos expresivos. Origen = centro de la cabeza. */
export const Head: React.FC<Props> = ({expr: e, look = [0, 0], turn = 0, blink = 0, t = 0}) => {
  const id = useId().replace(/:/g, '');
  const R = HEAD_R;
  const sq = 1 - Math.abs(turn) * 0.22;
  const eyeY = -6 + look[1] * 4;
  const eyes = [-1, 1].map((s) => {
    const cx = s * 21 * sq + turn * 17 + look[0] * 4;
    const closedArc = s === 1 ? Math.max(e.happyEyes, e.winkR) : e.happyEyes;
    const ry = Math.max(0.6, 13.5 * e.eyeScale * e.eyeOpen * (1 - blink) * (1 - closedArc));
    const rx = 9 * e.eyeScale * (s * turn < 0 ? 1 - Math.abs(turn) * 0.18 : 1);
    const cy = eyeY + (1 - Math.min(1, e.eyeOpen)) * 4;
    const browBase = -33 - e.browY * 11 - (s === 1 ? e.browAsym * 13 : 0) + look[1] * 2;
    const inner = cx - s * 10;
    const outer = cx + s * 13;
    const iy = browBase - e.browIn * 9;
    const oy = browBase + e.browIn * 5;
    return {s, cx, cy, rx, ry, closedArc, inner, outer, iy, oy};
  });
  const mx = e.mouthX * 13 + turn * 18;
  const my = 31;
  const w = 16 + e.mouthW * 40;
  const c = e.curve * 15;
  const h = e.open * 34;
  const top = c;
  const bot = c + h * 2;
  const mouthPath = `M ${-w / 2} 0 Q 0 ${top} ${w / 2} 0 Q 0 ${bot} ${-w / 2} 0 Z`;
  return (
    <g>
      <defs>
        <clipPath id={`hc${id}`}>
          <circle r={R} />
        </clipPath>
        <clipPath id={`mc${id}`}>
          <path d={mouthPath} />
        </clipPath>
      </defs>
      <circle r={R} fill={C.white} />
      {/* sombra sutil (luz desde arriba a la izquierda) */}
      <g clipPath={`url(#hc${id})`}>
        <circle cx={0} cy={0} r={R} fill="#E8ECF3" />
        <circle cx={-9} cy={-11} r={R - 2} fill={C.white} />
      </g>
      <circle r={R} fill="none" stroke={C.ink} strokeWidth={11} />
      {/* rubor */}
      {e.blush > 0.01 &&
        [-1, 1].map((s) => (
          <ellipse key={s} cx={s * 38 + turn * 14} cy={17} rx={12} ry={6.5} fill={C.pinkDeep} opacity={e.blush * 0.55} />
        ))}
      {/* ojos */}
      {eyes.map((o) => (
        <g key={o.s}>
          {o.ry > 0.8 && <ellipse cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry} fill={C.ink} />}
          {o.ry > 5 && <circle cx={o.cx + 2.6 + look[0] * 1.5} cy={o.cy - o.ry * 0.42} r={3.1 * e.eyeScale} fill={C.white} />}
          {o.closedArc > 0.02 && (
            <path
              d={`M ${o.cx - 10} ${o.cy + 4} Q ${o.cx} ${o.cy - 11} ${o.cx + 10} ${o.cy + 4}`}
              fill="none"
              stroke={C.ink}
              strokeWidth={6.5}
              strokeLinecap="round"
              opacity={Math.min(1, o.closedArc * 1.4)}
            />
          )}
          {blink > 0.6 && o.closedArc < 0.5 && (
            <path d={`M ${o.cx - 10} ${o.cy} L ${o.cx + 10} ${o.cy}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
          )}
          {/* párpado superior para miradas "con flojera" */}
          {e.eyeOpen < 0.86 && o.ry > 3 && (
            <path
              d={`M ${o.cx - o.rx - 3} ${o.cy - o.ry + 1} L ${o.cx + o.rx + 3} ${o.cy - o.ry + 1}`}
              stroke={C.ink}
              strokeWidth={5}
              strokeLinecap="round"
            />
          )}
          <path
            d={`M ${o.outer} ${o.oy} Q ${(o.outer + o.inner) / 2} ${Math.min(o.oy, o.iy) - 5} ${o.inner} ${o.iy}`}
            fill="none"
            stroke={C.ink}
            strokeWidth={7}
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* boca */}
      <g transform={`translate(${mx} ${my})`}>
        {h < 1.2 ? (
          <path d={`M ${-w / 2} 0 Q 0 ${c * 2} ${w / 2} 0`} fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
        ) : (
          <>
            <path d={mouthPath} fill={C.ink} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <g clipPath={`url(#mc${id})`}>
              <ellipse cx={0} cy={c / 2 + h * 0.95} rx={w * 0.28} ry={h * 0.42} fill="#F2727F" />
            </g>
          </>
        )}
      </g>
      {/* gota de sudor */}
      {e.sweat > 0.01 && (
        <path
          transform={`translate(${-50 - turn * 8} ${-30 + ((t * 18) % 16)}) scale(${e.sweat})`}
          d="M0 -14 C 7 -3 10 3 10 8 A 10 10 0 0 1 -10 8 C -10 3 -7 -3 0 -14 Z"
          fill="#7CC4FF"
          stroke={C.ink}
          strokeWidth={4}
        />
      )}
    </g>
  );
};
