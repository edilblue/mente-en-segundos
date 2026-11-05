import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AMBER, FONT, PINK} from '../../theme';
import {Chip} from '../../components/Chip';
import {CaptionTrack} from '../components/CaptionTrack';
import {Person} from '../components/Person';
import {Sign} from '../components/Sign';
import {localLine, wordAt} from '../timeline';

export const Day4: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const morphAt = wordAt('d4', 'persona');
  const d4b = localLine('d4b').start;
  const morph = interpolate(frame, [morphAt - 8, morphAt + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // glitch de alucinación (más fuerte durante la transformación)
  const g = (frame % 19 < 2 ? 1 : 0) + Math.max(0, 1 - Math.abs(frame - morphAt) / 10);
  const dx = g * 14;
  const hueShift = Math.sin(frame / 9) * 25;
  const ball = spring({frame: frame - d4b, fps, config: {damping: 8, stiffness: 160}});
  const star = spring({frame: frame - wordAt('d4b', 'famoso'), fps, config: {damping: 8, stiffness: 220}});
  const showBall = frame >= d4b - 2;
  return (
    <AbsoluteFill style={{filter: `hue-rotate(${hueShift}deg)`}}>
      {!showBall && (
        <div style={{position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <div style={{position: 'relative', width: 480, height: 611}}>
            <div style={{position: 'absolute', inset: 0, opacity: 1 - morph, transform: `translateX(${dx}px)`}}>
              <Sign width={480} />
            </div>
            <div style={{position: 'absolute', inset: 0, opacity: morph, transform: `translateX(${-dx}px)`}}>
              <Person width={480} color={PINK} glitch={Math.min(1, g)} />
            </div>
            {/* copias RGB desplazadas = alucinación */}
            <div style={{position: 'absolute', inset: 0, opacity: 0.35 * Math.min(1, g), transform: `translateX(${dx * 2}px)`, mixBlendMode: 'screen', filter: 'hue-rotate(160deg)'}}>
              {morph < 0.5 ? <Sign width={480} /> : <Person width={480} />}
            </div>
          </div>
        </div>
      )}
      {showBall && (
        <div style={{position: 'absolute', top: 470, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{fontFamily: FONT, fontSize: 330, transform: `scale(${ball}) rotate(${Math.sin(frame / 8) * 12}deg)`, filter: `drop-shadow(0 0 40px ${AMBER})`}}>🏈</div>
          <div style={{marginTop: 30, transform: `scale(${star})`}}>
            <Chip color={AMBER} style={{fontSize: 48}}>⭐ ¿JUGADOR FAMOSO?</Chip>
          </div>
        </div>
      )}
      <div style={{position: 'absolute', top: 400, left: 70, transform: 'rotate(-8deg)', opacity: frame < d4b ? 1 : 0}}>
        <Chip color={PINK}>👁️ ALUCINACIONES</Chip>
      </div>
      <CaptionTrack sceneId="day4" />
    </AbsoluteFill>
  );
};
