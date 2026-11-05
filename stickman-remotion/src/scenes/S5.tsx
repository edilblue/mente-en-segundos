// Escena 5 — El que no puede: el elefante lo intenta, solo se le levantan las orejas.
import React from 'react';
import {Elephant} from '../animals';
import {ComicText, EmojiFloat, Ground, Onomatopeya, Stage, StrainLines, Sweat} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, ease, iv, noise, shake, sp} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats5 = (dur: number, w: Word[]) => {
  const [strain, stamp, giveUp, eh] = ordered([wt(w, 'problema', 1.7) - 0.1, wt(w, 'pocos', 3.5), wt(w, 'no', 4.8) - 0.2, wt(w, 'saltar', 5.4)], 0.5);
  return {enter: 0.05, strain, earsUp: strain + 0.5, stamp, giveUp, eh: Math.min(eh, dur - 1.3)};
};

const EX = 470;

export const S5: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats5(dur, words);
  const enter = iv(t, [0, 0.6], [-500, 0], ease.out);
  const straining = t > b.strain && t < b.giveUp;
  const strainOn = straining ? iv(t, [b.strain, b.strain + 0.3], [0, 1]) : 0;
  const squash = t > b.strain - 0.3 && t < b.strain ? 0.14 : straining ? 0.06 + noise(t * 25, 2) * 0.04 : 0;
  const ears = straining ? iv(t, [b.earsUp, b.earsUp + 0.3], [0, 1], ease.back) * (0.75 + Math.sin(t * 22) * 0.25) : iv(t, [b.giveUp, b.giveUp + 0.3], [0.8, 0]);
  const jitter = straining ? noise(t * 30, 4) * 5 : 0;
  const atCam = t > b.giveUp;
  const pose = poseAt(t, [
    [0, POSES.stand],
    [b.strain, POSES.point],
    [b.eh, POSES.shrug],
  ]);
  const stampK = t > b.stamp ? sp(t, b.stamp, {damping: 12, stiffness: 260}) : 0;
  return (
    <Stage shake={shake(t, b.stamp, 0.35, 12)}>
      <Ground y={GROUND} />
      <StrainLines t={t} x={EX + 60} y={GROUND - 230} r={240} on={strainOn} />
      <Elephant
        x={EX + enter + jitter}
        y={GROUND}
        s={1.05}
        squash={squash}
        lift={straining ? Math.abs(noise(t * 18, 7)) * 3 : 0}
        ears={ears}
        trunk={t * 2}
        look={atCam ? [-0.2, 0.15] : straining ? [0.2, -0.7] : [0.5, 0]}
        blink={straining ? 0.55 : blinkAt(t, 4)}
        mouth={atCam ? 'flat' : straining ? 'wavy' : 'smile'}
      />
      <Sweat t={t} x={EX + 150} y={GROUND - 360} on={strainOn} />
      {/* altura alcanzada: 0 cm */}
      {straining && (
        <g transform={`translate(${EX - 260},${GROUND - 40}) scale(${sp(t, b.strain + 0.6)})`}>
          <ComicText x={0} y={0} size={48} fill="#fff" sw={6}>
            0 cm
          </ComicText>
        </g>
      )}
      <Stickman
        x={900}
        ground={GROUND}
        scale={0.78}
        pose={pose}
        flip
        cap
        face={{look: t > b.eh ? [0, 0.1] : [0.6, 0], blink: blinkAt(t), mouth: t > b.eh ? 'flat' : straining ? 'o' : 'smile', brow: t > b.eh ? 'raise' : 'none', facing: 0.3}}
      />
      {/* Sello rojo "NO PUEDE SALTAR" */}
      {stampK > 0 && (
        <g transform={`translate(540,520) rotate(-9) scale(${2.2 - 1.2 * stampK})`} opacity={Math.min(1, stampK * 1.5)}>
          <rect x={-330} y={-80} width={660} height={160} rx={18} fill="#fff" fillOpacity={0.85} stroke={C.red} strokeWidth={14} />
          <rect x={-310} y={-62} width={620} height={124} rx={12} fill="none" stroke={C.red} strokeWidth={5} />
          <ComicText x={0} y={6} size={88} fill={C.red} sw={0}>
            ✕ NO PUEDE SALTAR
          </ComicText>
        </g>
      )}
      <EmojiFloat t={t} at={b.giveUp + 0.1} e="😐" x={300} y={840} dur={dur - b.giveUp} size={1.15} />
      {/* SFX: "¿eh?" / grillo */}
      <Onomatopeya t={t} at={b.eh} text="¿EH?" x={700} y={800} burst={null} color="#fff" size={150} rot={6} dur={dur - b.eh} />
    </Stage>
  );
};
