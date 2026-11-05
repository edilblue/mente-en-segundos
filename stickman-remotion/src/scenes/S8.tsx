// Escena 8 — El resultado: lupa gigante, la Tierra bosteza y los animales miran decepcionados.
import React from 'react';
import {Ant, Bird, Cow, Earth, Elephant, Kangaroo} from '../animals';
import {ComicText, EmojiFloat, Ground, Onomatopeya, Stage} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, ease, iv, sp} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats8 = (dur: number, w: Word[]) => {
  const [nada, lineup, sad, compare] = ordered([wt(w, 'nada', 3.25), wt(w, 'sumando', 4.0) - 0.1, wt(w, 'animales', 5.1), wt(w, 'muchisimo', 6.5)], 0.6);
  return {lens: 0.15, label: 1.0, nada, yawnEnd: nada + 1.6, lineup, sad, compare: Math.min(compare, dur - 1.8)};
};

export const S8: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats8(dur, words);
  const shrink = iv(t, [b.lineup - 0.3, b.lineup + 0.3], [0, 1], ease.inOut);
  const er = 260 - 70 * shrink;
  const ey = 650 - 70 * shrink;
  const yawn = iv(t, [b.nada + 0.05, b.nada + 0.5, b.yawnEnd - 0.4, b.yawnEnd], [0, 1, 1, 0]);
  const pulse = t > b.compare ? 1 + 0.08 * Math.sin(Math.min(1, (t - b.compare) / 0.4) * Math.PI) : 1;
  const lensOn = t < b.lineup ? sp(t, b.lens) : iv(t, [b.lineup, b.lineup + 0.3], [1, 0]);
  const pose = poseAt(t, [
    [0, POSES.stand],
    [b.lens, {...POSES.hold, armR: [150, -10]}],
    [b.lineup, POSES.shrug],
    [b.compare, POSES.point],
  ]);
  const pop = (at: number) => sp(t, at, {damping: 9});
  const sadFace = t > b.sad;
  const animalLook: [number, number] = sadFace ? [0, 0.25] : [0.2, -0.6];
  const animalBlink = sadFace ? 0.45 : 0;
  return (
    <Stage>
      <g transform={`translate(${560},${ey}) scale(${pulse}) translate(${-560},${-ey})`}>
        <Earth x={560} y={ey} r={er} yawn={yawn} sleepy={sadFace ? 0.3 : 0} look={t < b.nada ? [-0.6, 0.6] : [0, 0]} blink={blinkAt(t, 6)} mouth={t > b.compare ? 'smirk' : 'smile'} rot={t * 4} />
      </g>
      {/* "Zzz" del bostezo — SFX: bostezo */}
      {yawn > 0.1 &&
        [0, 1, 2].map((i) => {
          const ph = (t * 0.9 + i / 3) % 1;
          return (
            <ComicText key={i} x={760 + ph * 120} y={ey - er - 10 - ph * 120} size={40 + i * 14} fill="#fff" sw={6}>
              Z
            </ComicText>
          );
        })}
      {/* dato: el desplazamiento es microscópico */}
      {t > b.label && t < b.lineup && (
        <g transform={`translate(560,300) scale(${sp(t, b.label)}) rotate(-3)`}>
          <rect x={-330} y={-50} width={660} height={100} rx={20} fill={C.red} stroke={C.ink} strokeWidth={8} />
          <ComicText x={0} y={4} size={54} fill="#fff">
            {'MOVIMIENTO ≈ 0,0000000001 MM'}
          </ComicText>
        </g>
      )}
      {t > b.compare && (
        <g transform={`translate(540,${ey + er + 75}) scale(${sp(t, b.compare)})`}>
          <rect x={-420} y={-48} width={840} height={96} rx={20} fill={C.yellow} stroke={C.ink} strokeWidth={8} />
          <ComicText x={0} y={4} size={52} fill="#fff">
            TIERRA: 6 CUATRILLONES DE KG
          </ComicText>
        </g>
      )}
      <Ground y={GROUND} />
      {/* fila de animales decepcionados */}
      {t > b.lineup && (
        <g>
          <Ant x={350} y={GROUND} s={1.45 * pop(b.lineup)} flip look={animalLook} blink={animalBlink} mouth={sadFace ? 'flat' : 'smile'} />
          <Cow x={480} y={GROUND} s={0.56 * pop(b.lineup + 0.12)} look={animalLook} blink={animalBlink} mouth={sadFace ? 'flat' : 'smile'} />
          <Kangaroo x={705} y={GROUND} s={0.6 * pop(b.lineup + 0.24)} look={animalLook} blink={animalBlink} mouth={sadFace ? 'flat' : 'smile'} />
          <Elephant x={885} y={GROUND} s={0.45 * pop(b.lineup + 0.36)} look={animalLook} blink={animalBlink} mouth={sadFace ? 'flat' : 'smile'} trunk={t} />
          <Bird x={940} y={GROUND - 142} s={0.8 * pop(b.lineup + 0.48)} flap={0.3} look={animalLook} blink={animalBlink} mouth={sadFace ? 'flat' : 'smile'} />
        </g>
      )}
      <Stickman
        x={195}
        ground={GROUND}
        scale={0.95}
        pose={pose}
        cap
        face={{
          look: t < b.lineup ? [0.9, -0.6] : t > b.compare ? [0.6, -0.4] : [0, 0.2],
          blink: t > b.lens && t < b.lineup ? 0.5 : blinkAt(t),
          mouth: t < b.lineup ? 'o' : 'flat',
          brow: t < b.lineup ? 'raise' : 'flat',
          eyeScale: 1,
        }}
      >
        {/* lupa gigante (se dibuja en la mano) */}
        {lensOn > 0.01 && (
          <g transform={`scale(${lensOn})`}>
            <path d="M0,-8 L0,120" stroke={C.ink} strokeWidth={26} strokeLinecap="round" />
            <path d="M0,-8 L0,120" stroke={C.red} strokeWidth={12} strokeLinecap="round" />
            <circle cx={0} cy={235} r={115} fill="#eaf4ff" fillOpacity={0.65} stroke={C.ink} strokeWidth={16} />
            <g transform="translate(0,235)">
              {/* la flechita casi invisible */}
              <path d="M-3,8 L-3,-4 L-7,-4 L0,-12 L7,-4 L3,-4 L3,8 Z" fill={C.red} opacity={Math.floor(t * 4) % 2 ? 1 : 0.3} />
              <ComicText x={50} y={-55} size={60} fill="#fff" sw={6}>
                ?
              </ComicText>
            </g>
            <path d="M-60,170 q30,-30 70,-25" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" />
          </g>
        )}
      </Stickman>
      <Onomatopeya t={t} at={b.nada + 0.2} text="¡BOSTEZO!" x={830} y={960} burst={null} color="#fff" size={90} rot={8} dur={1.4} />
      <EmojiFloat t={t} at={b.sad} e="😐" x={470} y={1000} dur={2.4} size={0.9} />
      <EmojiFloat t={t} at={b.sad + 0.25} e="😐" x={720} y={980} dur={2.4} size={0.9} />
      <EmojiFloat t={t} at={b.sad + 0.5} e="😐" x={930} y={950} dur={2.4} size={0.9} />
    </Stage>
  );
};
