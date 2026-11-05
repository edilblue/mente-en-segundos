// Escena 9 — Cierre: Stickman Pro y el elefante señalan los comentarios; el elefante falla otra vez.
import React from 'react';
import {Ant, Bird, Cow, Elephant, Flea, Kangaroo, Whale} from '../animals';
import {Bubble, ComicText, Dust, EmojiFloat, Ground, Onomatopeya, QMark, Stage} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, iv, shake, sp} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats9 = (dur: number, w: Word[]) => {
  const [ask, attempt, point] = ordered([wt(w, 'animal', 0.6), wt(w, 'saltar', 1.9), wt(w, 'dejalo', 3.7)], 1.3);
  return {ask, attempt, hop: attempt + 0.35, fall: attempt + 0.85, point: Math.min(point, dur - 1.6)};
};

const EX = 815;

export const S9: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats9(dur, words);
  const hopU = iv(t, [b.hop, b.fall], [0, 1]);
  const eLift = t > b.hop && t < b.fall ? Math.sin(hopU * Math.PI) * 22 : 0;
  const fallen = t > b.fall;
  const eSquash = t > b.attempt && t < b.hop ? 0.14 : fallen ? 0.25 * Math.exp(-(t - b.fall) * 5) + 0.05 : 0;
  const eRot = fallen ? 10 * Math.exp(-(t - b.fall) * 2) * Math.cos((t - b.fall) * 8) : 0;
  const pointing = t > b.point;
  const pose = poseAt(t, [
    [0, POSES.stand],
    [b.ask, POSES.open],
    [b.fall + 0.15, POSES.laugh],
    [b.point, POSES.pointDown],
  ]);
  // ruleta de animales en el bocadillo
  const roster = [
    <Ant key="a" x={0} y={40} s={1.3} />,
    <Cow key="c" x={-30} y={70} s={0.45} />,
    <Kangaroo key="k" x={-10} y={95} s={0.42} />,
    <Whale key="w" x={0} y={60} s={0.38} />,
    <Bird key="b" x={0} y={55} s={1} />,
    <Flea key="f" x={0} y={40} s={1.5} />,
  ];
  const pick = Math.floor(t * 5) % roster.length;
  const bubble = t > b.ask && t < b.point ? sp(t, b.ask) : 0;
  return (
    <Stage shake={shake(t, b.fall, 0.4, 14)}>
      <Ground y={GROUND} />
      {bubble > 0.01 && (
        <Bubble x={540} y={600} w={360} h={280} tail={[-120, 200]} s={bubble}>
          {roster[pick]}
          <ComicText x={0} y={-150} size={50} fill={C.yellow}>
            ¿PARTE 3?
          </ComicText>
        </Bubble>
      )}
      <Elephant
        x={EX}
        y={GROUND}
        s={0.78}
        flip
        lift={eLift}
        squash={eSquash}
        rot={eRot}
        ears={t > b.attempt && t < b.fall ? 0.8 + Math.sin(t * 22) * 0.2 : 0}
        trunk={pointing ? 0 : t * 2}
        look={fallen && !pointing ? [0, 0.1] : pointing ? [0.2, 0.8] : [0.5, 0]}
        blink={t > b.attempt && t < b.hop ? 0.6 : blinkAt(t, 4)}
        mouth={fallen && !pointing ? 'wavy' : pointing ? 'grin' : 'smile'}
      />
      {/* estrellitas de mareo */}
      {fallen && !pointing &&
        [0, 1, 2].map((i) => {
          const a = t * 5 + (i * Math.PI * 2) / 3;
          return (
            <path
              key={i}
              d="M0,-18 L5,-5 L18,0 L5,5 L0,18 L-5,5 L-18,0 L-5,-5 Z"
              transform={`translate(${EX - 110 + Math.cos(a) * 90},${GROUND - 300 + Math.sin(a) * 22})`}
              fill={C.yellow}
              stroke={C.ink}
              strokeWidth={4}
            />
          );
        })}
      {/* SFX: pum — el elefante se cae */}
      <Dust t={t} at={b.fall} x={EX} y={GROUND} size={1.3} />
      <Stickman
        x={290}
        ground={GROUND}
        scale={0.95}
        pose={pose}
        cap
        face={{
          look: pointing ? [0.2, 0.9] : t > b.attempt ? [0.9, 0] : [0, 0.1],
          blink: t > b.fall && t < b.point ? 0.85 : blinkAt(t),
          mouth: t > b.fall ? 'grin' : 'smile',
          brow: t > b.ask && t < b.attempt ? 'raise' : 'up',
        }}
      />
      <QMark t={t} at={b.ask + 0.1} x={150} y={760} size={90} />
      <QMark t={t} at={b.ask + 0.3} x={420} y={720} size={70} color={C.yellow} />
      {/* SFX: risa */}
      <EmojiFloat t={t} at={b.fall + 0.2} e="😂" x={200} y={820} dur={1.8} size={1.2} />
      <Onomatopeya t={t} at={b.fall} text="¡PUM!" x={880} y={860} burst={C.yellow} color="#fff" size={120} rot={10} dur={1} />
      {/* flechas rojas hacia los comentarios */}
      {pointing && (
        <g>
          <g transform={`translate(520,1010) scale(${sp(t, b.point)})`}>
            <path d="M-80,-55 h160 a30,30 0 0 1 30,30 v60 a30,30 0 0 1 -30,30 h-90 l-40,35 v-35 h-30 a30,30 0 0 1 -30,-30 v-60 a30,30 0 0 1 30,-30 z" fill="#fff" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
            {[-45, 0, 45].map((x) => (
              <circle key={x} cx={x} cy={8} r={12} fill={C.ink} />
            ))}
          </g>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d="M-45,0 L0,40 L45,0"
              transform={`translate(520,${1120 + i * 52 + Math.sin(t * 9 - i) * 12})`}
              fill="none"
              stroke={C.red}
              strokeWidth={16}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={sp(t, b.point + i * 0.1)}
            />
          ))}
        </g>
      )}
    </Stage>
  );
};
