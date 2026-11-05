import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {TRANSITION} from '../theme';

// Fundido + deslizamiento de entrada y salida.
export const SceneWrapper: React.FC<{
  duration: number;
  enter?: boolean;
  exit?: boolean;
  children: React.ReactNode;
}> = ({duration, enter = true, exit = true, children}) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.33, 0, 0.2, 1);
  const inP = enter ? interpolate(frame, [0, TRANSITION], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}) : 1;
  const outP = exit
    ? interpolate(frame, [duration - TRANSITION, duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease})
    : 0;
  return (
    <AbsoluteFill
      style={{
        opacity: inP * (1 - outP),
        transform: `translateY(${(1 - inP) * 110 - outP * 110}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
