import React from 'react';
import {interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CYAN, FONT, PINK} from '../../theme';
import {dayAt, lastDayChange} from '../timeline';

/** HUD: "DÍA N / 11" + 11 segmentos. */
export const DayTracker: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const day = dayAt(frame);
  const pop = spring({frame: frame - lastDayChange(frame), fps, config: {damping: 8, stiffness: 220, mass: 0.5}});
  const color = interpolateColors(day, [0, 11], [CYAN, PINK]);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12}}>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 58,
          color,
          WebkitTextStroke: '9px black',
          paintOrder: 'stroke fill',
          textShadow: `0 0 22px ${color}`,
          transform: `scale(${0.75 + 0.25 * pop})`,
          transformOrigin: 'right center',
          letterSpacing: 2,
        }}
      >
        DÍA {day}
        <span style={{fontSize: 34, color: 'rgba(255,255,255,0.7)'}}> / 11</span>
      </div>
      <div style={{display: 'flex', gap: 7}}>
        {new Array(11).fill(0).map((_, i) => {
          const lit = i < day;
          const c = interpolateColors(i, [0, 10], [CYAN, PINK]);
          return (
            <div
              key={i}
              style={{
                width: 36,
                height: 12,
                borderRadius: 6,
                background: lit ? c : 'rgba(255,255,255,0.13)',
                boxShadow: lit ? `0 0 12px ${c}` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
