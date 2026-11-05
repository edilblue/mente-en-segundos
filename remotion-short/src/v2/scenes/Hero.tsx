import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, PINK} from '../../theme';
import {Eye} from '../components/Eye';
import {CaptionTrack} from '../components/CaptionTrack';
import {scene} from '../timeline';

/** Título "11 DÍAS SIN DORMIR" con glitch (visible desde el frame 0). */
export const Title: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 1}) => {
  const glitchOn = frame % 37 < 3 || frame % 53 < 2;
  const dx = glitchOn ? 10 : 0;
  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    fontFamily: FONT,
    textAlign: 'center',
    lineHeight: 0.95,
  };
  const content = (
    <>
      <div style={{fontSize: 200}}>11 DÍAS</div>
      <div style={{fontSize: 104, letterSpacing: 4}}>SIN DORMIR</div>
    </>
  );
  return (
    <div style={{position: 'absolute', top: 230, left: 0, right: 0, height: 320, opacity}}>
      <div style={{...base, color: '#29f3ff', transform: `translate(${-dx}px, 0)`, opacity: glitchOn ? 0.8 : 0}}>{content}</div>
      <div style={{...base, color: PINK, transform: `translate(${dx}px, 0)`, opacity: glitchOn ? 0.8 : 0}}>{content}</div>
      <div
        style={{
          ...base,
          color: 'white',
          WebkitTextStroke: '18px black',
          paintOrder: 'stroke fill',
          textShadow: `0 0 40px ${PINK}, 0 8px 0 rgba(0,0,0,0.6)`,
        }}
      >
        {content}
      </div>
    </div>
  );
};

/** Ojo grande inyectado en sangre que tiembla (gancho y cierre comparten diseño → loop). */
export const HeroEye: React.FC<{frame: number}> = ({frame}) => {
  const twitch = Math.sin(frame * 1.7) * 3 + (frame % 41 < 2 ? 8 : 0);
  const look: [number, number] = [Math.sin(frame / 23) * 0.35, Math.sin(frame / 31) * 0.3];
  return (
    <div style={{position: 'absolute', top: 575, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translateX(${twitch}px)`}}>
      <Eye width={760} tired={0.9} look={look} pupil={0.75 + 0.1 * Math.sin(frame / 9)} id="hero" />
    </div>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Title frame={frame} />
      <HeroEye frame={frame} />
      <CaptionTrack sceneId="hook" />
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const len = scene('outro').len;
  // En el último segundo vuelve el título para que el final se parezca al inicio (loop)
  const titleIn = interpolate(frame, [len - fps * 1.1, len - fps * 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Title frame={frame} opacity={titleIn} />
      <HeroEye frame={frame} />
      <CaptionTrack sceneId="outro" />
    </AbsoluteFill>
  );
};
