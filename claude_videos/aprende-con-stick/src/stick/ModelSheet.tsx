import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../lib/theme';
import {EXPR} from './expressions';
import {POSES} from './poses';
import {Stick} from './Stick';
import {Head} from './Face';

/** Hoja de modelo de STICK: referencia de poses y expresiones para futuros episodios. */
export const ModelSheet: React.FC = () => {
  const t = useCurrentFrame() / 30;
  const poses = Object.entries(POSES);
  const exprs = Object.entries(EXPR);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%">
        <text x={540} y={80} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={54} fill={C.ink}>
          STICK · hoja de modelo
        </text>
        {exprs.map(([name, e], i) => {
          const x = 90 + (i % 6) * 180;
          const y = 200 + Math.floor(i / 6) * 200;
          return (
            <g key={name}>
              <g transform={`translate(${x} ${y}) scale(1)`}>
                <Head expr={e} t={t} />
              </g>
              <text x={x} y={y + 98} textAnchor="middle" fontFamily={FONT} fontSize={24} fill={C.greyDark}>
                {name}
              </text>
            </g>
          );
        })}
        {poses.map(([name, p], i) => {
          const x = 110 + (i % 5) * 215;
          const y = 1010 + Math.floor(i / 5) * 300;
          return (
            <g key={name}>
              <Stick x={x} y={y} scale={0.5} pose={p} expr={EXPR.happy} t={t} />
              <text x={x} y={y + 40} textAnchor="middle" fontFamily={FONT} fontSize={24} fill={C.greyDark}>
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
