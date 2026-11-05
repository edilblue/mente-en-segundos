import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Captions} from '../components/Captions';
import {Chip} from '../components/Chip';
import {voiceWindow} from '../narration';
import {CYAN, FONT, PINK} from '../theme';

const COUNT_END = 150;

export const StepRecord: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const v = interpolate(frame, [10, COUNT_END], [1, 11], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const n = Math.floor(v + 1e-6);
  // frame en que apareció el número actual (para el "pop" de cada incremento)
  let changed = 10;
  for (let f = 10; f <= frame; f++) {
    const vf = interpolate(f, [10, COUNT_END], [1, 11], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
    if (Math.floor(vf + 1e-6) === n) {
      changed = f;
      break;
    }
  }
  const pop = spring({frame: frame - changed, fps, config: {damping: 7, stiffness: 260, mass: 0.5}});
  const final = n === 11;
  const scale = (final ? 1.08 : 0.92) * (0.65 + 0.35 * pop);
  const color = interpolateColors(n, [1, 11], [CYAN, PINK]);
  const label = spring({frame: frame - COUNT_END, fps, config: {damping: 10}});

  const R = 300;
  return (
    <AbsoluteFill>
      {/* anillo de 11 segmentos */}
      <svg width={1080} height={760} style={{position: 'absolute', top: 400}} viewBox="-540 -380 1080 760">
        <defs>
          <filter id="segNeon" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {new Array(11).fill(0).map((_, i) => {
          const a0 = (i / 11) * Math.PI * 2 - Math.PI / 2 + 0.06;
          const a1 = ((i + 1) / 11) * Math.PI * 2 - Math.PI / 2 - 0.06;
          const lit = i < n;
          return (
            <path
              key={i}
              d={`M ${Math.cos(a0) * R} ${Math.sin(a0) * R} A ${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R}`}
              fill="none"
              stroke={lit ? interpolateColors(i, [0, 10], [CYAN, PINK]) : 'rgba(255,255,255,0.1)'}
              strokeWidth={26}
              strokeLinecap="round"
              filter={lit ? 'url(#segNeon)' : undefined}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 400,
          height: 760,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 360,
            lineHeight: 0.9,
            color: 'white',
            WebkitTextStroke: '26px black',
            paintOrder: 'stroke fill',
            textShadow: `0 0 40px ${color}, 0 0 90px ${color}`,
            transform: `scale(${scale})`,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {n}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            letterSpacing: 6,
            color,
            WebkitTextStroke: '10px black',
            paintOrder: 'stroke fill',
            textShadow: `0 0 20px ${color}`,
            marginTop: 6,
          }}
        >
          {n === 1 ? 'DÍA' : 'DÍAS'}
        </div>
      </div>
      <div style={{position: 'absolute', top: 1050, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${label})`}}>
        <Chip color={CYAN}>RÉCORD · 1964</Chip>
      </div>
      <Captions
        text="El récord registrado es de Randy Gardner: 11 días sin dormir en 1964"
        start={voiceWindow('step3').start}
        end={voiceWindow('step3').end}
        top={1170}
        fontSize={74}
        highlights={{randy: CYAN, gardner: CYAN, '11': PINK, días: PINK, '1964': CYAN}}
      />
    </AbsoluteFill>
  );
};
