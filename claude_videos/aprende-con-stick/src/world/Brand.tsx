import React from 'react';
import {C, FONT} from '../lib/theme';
import {Head} from '../stick/Face';
import {EXPR, Expr} from '../stick/expressions';

/** Identidad visual de la serie "Aprende con Stick". */
export const Logo: React.FC<{x: number; y: number; s?: number; t?: number; expr?: Expr; sub?: string}> = ({x, y, s = 1, t = 0, expr = EXPR.happy, sub}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-400 + 12} y={-120 + 16} width={800} height={240} rx={60} fill={C.shadow} />
    <rect x={-400} y={-120} width={800} height={240} rx={60} fill={C.blue} stroke={C.ink} strokeWidth={12} />
    <rect x={-380} y={-100} width={760} height={60} rx={30} fill="#5A98F2" opacity={0.6} />
    <g transform={`translate(-270 0) rotate(${Math.sin(t * 2) * 6}) scale(1.25)`}>
      <Head expr={expr} t={t} />
    </g>
    <text x={80} y={-22} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={52} fill={C.white} letterSpacing={4}>
      APRENDE CON
    </text>
    <g fontFamily={FONT} fontWeight={700} fontSize={116}>
      <text x={80} y={92} textAnchor="middle" fill="none" stroke={C.ink} strokeWidth={22} strokeLinejoin="round">
        STICK
      </text>
      <text x={80} y={92} textAnchor="middle" fill={C.yellow}>
        STICK
      </text>
    </g>
    {sub && (
      <g>
        <rect x={-210} y={140} width={420} height={64} rx={32} fill={C.white} stroke={C.ink} strokeWidth={7} />
        <text x={0} y={183} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={34} fill={C.ink}>
          {sub}
        </text>
      </g>
    )}
  </g>
);
