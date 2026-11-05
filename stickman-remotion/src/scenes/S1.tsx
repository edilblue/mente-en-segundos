// Escena 1 — Gancho: Stickman Pro aparece con "¡PUM!", se agacha para saltar y una hormiga lo imita.
import React from 'react';
import {Ant} from '../animals';
import {Bubble, Dust, EmojiFloat, Ground, Onomatopeya, QMark, Stage} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, ease, iv, shake, sp} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats1 = (dur: number, w: Word[]) => {
  const [crowd, crouch, look] = ordered([wt(w, 'parte', 0.6), wt(w, 'animales', 3.5) - 0.45, wt(w, 'nosotros', 4.85) - 0.2], 0.9);
  return {pum: 0.12, crowd, antIn: crouch - 0.95, crouch, antCrouch: crouch + 0.35, look: Math.min(look, dur - 1.2)};
};

const MiniJumper: React.FC<{t: number; x: number; ph: number}> = ({t, x, ph}) => {
  const h = Math.abs(Math.sin(t * 5 + ph));
  return <Stickman x={x} ground={110} pose={h > 0.3 ? POSES.jump : POSES.crouch} lift={h * 70} squash={h < 0.2 ? 0.2 : -0.1} scale={0.24} sw={16} />;
};

export const S1: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats1(dur, words);
  const pop = sp(t, b.pum - 0.05, {damping: 8, stiffness: 200});
  const fall = iv(t, [0, b.pum], [600, 0], ease.in);
  const landSquash = t > b.pum ? 0.28 * Math.exp(-(t - b.pum) * 7) * Math.cos((t - b.pum) * 22) : -0.25;
  const pose = poseAt(t, [
    [0, POSES.jump],
    [b.pum, POSES.stand],
    [b.crowd, POSES.open],
    [b.crowd + 1.0, POSES.point],
    [b.crouch, POSES.crouch],
    [b.look, POSES.think],
  ]);
  const crouchSquash = t > b.crouch && t < b.look ? 0.1 + Math.sin((t - b.crouch) * 10) * 0.02 : 0;
  // Hormiga: entra caminando desde la derecha, se agacha imitándolo y lo mira.
  const antX = iv(t, [b.antIn, b.antIn + 0.85], [1180, 700], ease.out);
  const antWalk = t > b.antIn && t < b.antIn + 0.85 ? 1 : 0;
  const antSquash = t > b.antCrouch ? 0.22 + Math.sin((t - b.antCrouch) * 10) * 0.03 : 0;
  const bubble = t > b.crowd + 0.25 && t < b.crouch - 0.15 ? sp(t, b.crowd + 0.25) * iv(t, [b.crouch - 0.4, b.crouch - 0.15], [1, 0]) : 0;
  const zoom = iv(t, [0, dur], [1, 1.09]);
  const lookingDown = t > b.look;
  return (
    <Stage shake={shake(t, b.pum, 0.45, 18)} zoom={zoom} zx={560} zy={1150}>
      <Ground y={GROUND} />
      {/* SFX: pum — aterrizaje de Stickman Pro */}
      <Dust t={t} at={b.pum} x={430} y={GROUND} size={1.3} />
      {/* Recuerdo de la Parte 1: todos los humanos saltando */}
      {bubble > 0.01 && (
        <Bubble x={740} y={600} w={430} h={300} tail={[-150, 230]} s={bubble}>
          <g transform="translate(-160,-30)">
            {[0, 1, 2, 3, 4].map((i) => (
              <MiniJumper key={i} t={t} x={i * 80} ph={i * 0.9} />
            ))}
          </g>
          <text x={0} y={-95} textAnchor="middle" fontFamily="Bangers" fontSize={52} fill={C.red} stroke={C.ink} strokeWidth={6} paintOrder="stroke">
            PARTE 1
          </text>
        </Bubble>
      )}
      <g transform={`translate(0,${-fall})`}>
        <Stickman
          x={430}
          ground={GROUND}
          scale={1.05 * (0.6 + 0.4 * pop)}
          pose={pose}
          squash={landSquash + crouchSquash}
          cap
          face={{
            look: lookingDown ? [0.7, 0.9] : t > b.crouch ? [0.6, 0] : [0.2, 0],
            blink: blinkAt(t),
            mouth: lookingDown ? 'flat' : t > b.crowd ? 'grin' : 'open',
            brow: lookingDown ? 'raise' : t > b.crouch ? 'angry' : 'up',
            facing: 0.4,
          }}
        />
      </g>
      <Ant
        x={antX}
        y={GROUND}
        s={1.5}
        flip
        t={t}
        walk={antWalk}
        squash={antSquash}
        look={lookingDown ? [-0.5, -0.9] : [-0.6, -0.4]}
        blink={blinkAt(t, 2)}
        mouth={t > b.look + 0.4 ? 'grin' : 'smile'}
      />
      <Onomatopeya t={t} at={b.pum} text="¡PUM!" x={640} y={760} burst={C.yellow} color="#fff" size={170} rot={-10} dur={0.9} />
      <QMark t={t} at={b.look + 0.3} x={760} y={1080} size={80} />
      <EmojiFloat t={t} at={b.look} e="🤔" x={300} y={760} dur={dur - b.look} size={1.2} />
    </Stage>
  );
};
