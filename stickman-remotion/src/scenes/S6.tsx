// Escena 6 — Los que hacen trampa: un pájaro con lentes de sol pasa volando, despreocupado.
import React from 'react';
import {Ant, Bird} from '../animals';
import {EmojiFloat, Ground, Onomatopeya, Stage} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, ease, iv, rnd} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats6 = (dur: number, w: Word[]) => {
  const [center, cool, arriba] = ordered([wt(w, 'dirian', 1.2) + 0.1, wt(w, 'nosotros', 1.9), wt(w, 'arriba', 3.1)], 0.5);
  return {enter: 0.1, center, cool, arriba, leave: Math.max(arriba + 0.8, dur - 1.2)};
};

const Cloud: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M-120,30 q-40,0 -30,-40 q10,-40 60,-30 q20,-50 80,-40 q50,-40 100,10 q50,-10 50,40 q20,40 -30,60 z" fill="#fff" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
  </g>
);

export const S6: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats6(dur, words);
  const bx = t < b.center ? iv(t, [b.enter, b.center], [-200, 560], ease.out) : t < b.leave ? 560 + (t - b.center) * 25 : iv(t, [b.leave, b.leave + 0.9], [560 + (b.leave - b.center) * 25, 1300], ease.in);
  const by = 640 + Math.sin(t * 2.4) * 30;
  const gliding = t > b.center + 0.2 && t < b.leave;
  const flap = gliding ? Math.sin(t * 3) * 0.6 : t * 18;
  const hop = (ph: number) => Math.abs(Math.sin(t * 4.5 + ph));
  const annoyed = t > b.arriba;
  const pose = annoyed
    ? poseAt(t, [
        [0, POSES.jump],
        [b.arriba, POSES.pointUp],
      ])
    : hop(0) > 0.25
      ? POSES.jump
      : POSES.crouch;
  return (
    <Stage>
      <Cloud x={220 + t * 18} y={420} s={0.9} />
      <Cloud x={860 - t * 14} y={860} s={0.7} />
      <Cloud x={-80 + t * 30} y={1010} s={0.5} />
      {/* SFX: aleteo */}
      <Bird x={bx} y={by} s={2.2} flap={flap} shades rot={gliding ? -4 : 6} />
      {gliding && t > b.cool && (
        <g>
          {[0, 1, 2].map((i) => {
            const ph = (t * 1.3 + i / 3) % 1;
            return (
              <path
                key={i}
                d="M0,-18 L5,-5 L18,0 L5,5 L0,18 L-5,5 L-18,0 L-5,-5 Z"
                transform={`translate(${bx + 90 + rnd(i) * 60},${by - 170 - ph * 60}) scale(${Math.sin(ph * Math.PI)})`}
                fill={C.yellow}
                stroke={C.ink}
                strokeWidth={4}
              />
            );
          })}
        </g>
      )}
      <EmojiFloat t={t} at={b.cool} e="😎" x={bx - 170} y={by - 210} dur={2.2} size={1.15} />
      <Ground y={GROUND} />
      <Stickman
        x={380}
        ground={GROUND}
        pose={pose}
        lift={annoyed ? 0 : hop(0) * 120}
        squash={!annoyed && hop(0) < 0.2 ? 0.18 : 0}
        cap
        face={{look: [0.3, -1], blink: blinkAt(t), mouth: annoyed ? 'frown' : 'open', brow: 'angry'}}
      />
      <Ant x={720} y={GROUND} s={1.4} flip lift={annoyed ? 0 : hop(1.2) * 90} squash={hop(1.2) < 0.2 ? 0.2 : 0} legsUp={annoyed ? 0 : 0.5} look={[-0.2, -1]} blink={blinkAt(t, 1)} mouth={annoyed ? 'frown' : 'open'} />
      <Onomatopeya t={t} at={b.arriba + 0.1} text="¡OYE!" x={520} y={940} burst={null} color="#fff" size={110} rot={-8} dur={1.2} />
    </Stage>
  );
};
