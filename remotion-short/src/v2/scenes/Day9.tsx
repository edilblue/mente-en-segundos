import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {CYAN, FONT, PINK} from '../../theme';
import {CaptionTrack} from '../components/CaptionTrack';
import {Eeg} from '../components/Eeg';
import {localLine} from '../timeline';

const SENTENCE = 'No puedo terminar mis fra';

export const Day9: React.FC = () => {
  const frame = useCurrentFrame();
  const d9 = localLine('d9');
  const d11 = localLine('d11');
  const phase11 = frame >= d11.start;
  const typed = Math.floor(interpolate(frame, [d9.start + 4, d9.end - 10], [0, SENTENCE.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const cursor = Math.floor(frame / 8) % 2 === 0;
  const activity = interpolate(frame, [0, d11.start, d11.end], [0.85, 0.55, 0.08], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      {/* Texto que se queda a medias */}
      <div
        style={{
          position: 'absolute',
          top: 470,
          left: 90,
          right: 90,
          height: 230,
          borderRadius: 26,
          border: `4px solid ${phase11 ? PINK : CYAN}`,
          background: 'rgba(8,6,30,0.8)',
          boxShadow: `0 0 26px ${phase11 ? PINK : CYAN}66`,
          padding: '30px 40px',
          fontFamily: FONT,
          fontSize: 64,
          lineHeight: 1.15,
          color: 'white',
          opacity: phase11 ? interpolate(frame, [d11.start, d11.start + 30], [1, 0.25], {extrapolateRight: 'clamp'}) : 1,
        }}
      >
        {SENTENCE.slice(0, typed)}
        <span style={{color: CYAN, opacity: cursor ? 1 : 0}}>|</span>
      </div>
      <div style={{position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Eeg frame={frame} activity={activity} width={900} color={phase11 ? PINK : CYAN} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1065,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 34,
          letterSpacing: 6,
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        ACTIVIDAD CEREBRAL
      </div>
      <CaptionTrack sceneId="day9" top={1150} />
    </AbsoluteFill>
  );
};
