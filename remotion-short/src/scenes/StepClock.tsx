import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Captions} from '../components/Captions';
import {Chip} from '../components/Chip';
import {Clock} from '../components/Clock';
import {voiceWindow} from '../narration';
import {CYAN, PINK} from '../theme';

const REACH = 120; // frame en que el reloj llega a 24h

export const StepClock: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hours = interpolate(frame, [8, REACH], [0, 24], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const drunk = interpolate(frame, [REACH, REACH + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wobble = Math.sin(frame / 7) * 7 * drunk;
  const sway = Math.sin(frame / 11) * 22 * drunk;
  const chipPop = spring({frame: frame - REACH, fps, config: {damping: 9, stiffness: 180}});

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 460, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'relative', transform: `translateX(${sway}px) rotate(${wobble}deg)`}}>
          {/* visión doble: reflejos "borrachos" */}
          <div style={{position: 'absolute', inset: 0, opacity: 0.45 * drunk, transform: `translate(${18 * drunk + Math.sin(frame / 5) * 8}px, ${-6 * drunk}px)`, filter: 'hue-rotate(80deg) blur(2px)'}}>
            <Clock hours={hours} size={560} />
          </div>
          <Clock hours={hours} size={560} />
        </div>
      </div>
      <div style={{position: 'absolute', top: 410, right: 90, transform: `scale(${chipPop}) rotate(8deg)`}}>
        <Chip color={PINK}>🍸 REFLEJOS ↓</Chip>
      </div>
      <Captions
        text="Después de 24 horas despierto, tus reflejos se parecen a los de alguien que bebió alcohol"
        start={voiceWindow('step1').start}
        end={voiceWindow('step1').end}
        top={1110}
        fontSize={72}
        highlights={{'24': CYAN, horas: CYAN, reflejos: PINK, alcohol: PINK}}
      />
    </AbsoluteFill>
  );
};
