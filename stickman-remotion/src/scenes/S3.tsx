// Escena 3 — Animales de granja: la balanza de la Parte 1 regresa y se inclina hacia las vacas y cerdos.
import React from 'react';
import {Cow, Pig} from '../animals';
import {ComicText, Dust, EmojiFloat, Ground, Onomatopeya, Stage} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, ease, iv, shake, sp} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats3 = (dur: number, w: Word[]) => {
  const d0 = Math.max(1.2, wt(w, 'vacas', 2.2) - 0.1);
  const d1 = Math.max(d0 + 1.2, wt(w, 'granja', 4.4) + 0.2);
  const drops = Array.from({length: 6}, (_, i) => d0 + ((d1 - d0) * i) / 5);
  const [tilt, muu] = ordered([Math.max(d1 + 0.4, wt(w, 'doble', 5.6)), wt(w, 'juntos', 7.2)], 0.9);
  return {enter: 0.05, humans: 0.5, drops, tilt, muu: Math.min(muu, dur - 1.6)};
};

const PX = 540;
const PY = 700;
const ARM = 375;
const HANG = 210;

export const S3: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats3(dur, words);
  const enter = sp(t, b.enter, {damping: 11});
  const dropped = b.drops.filter((d) => t > d + 0.35).length;
  // ángulo de la viga: humanos abajo al inicio; cada animal la empuja; al final se desploma a la derecha
  const pre = -7 + dropped * 1.6;
  const kTilt = t > b.tilt ? sp(t, b.tilt, {damping: 6, stiffness: 120}) : 0;
  const ang = pre + (16 - pre) * kTilt + (t > b.drops[0] ? Math.sin(t * 9) * 0.6 * (t < b.tilt ? 1 : 0) : 0);
  const a = (ang * Math.PI) / 180;
  const L: [number, number] = [PX - ARM * Math.cos(a), PY - ARM * Math.sin(a)];
  const R: [number, number] = [PX + ARM * Math.cos(a), PY + ARM * Math.sin(a)];
  const panL = L[1] + HANG;
  const panR = R[1] + HANG;
  const surprised = t > b.tilt;
  const pose = poseAt(t, [
    [0, POSES.stand],
    [b.humans, POSES.point],
    [b.tilt, POSES.scared],
    [b.tilt + 0.7, POSES.point],
    [b.muu, POSES.laugh],
  ]);
  const animals = b.drops.map((d, i) => {
    if (t < d) return null;
    const fallY = iv(t, [d, d + 0.35], [-900, 0], ease.in);
    const land = t > d + 0.35 ? 0.3 * Math.exp(-(t - d - 0.35) * 8) : -0.15;
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = R[0] - 95 + col * 95;
    const y = panR - 12 - row * 70 + fallY;
    const cow = i % 2 === 0;
    const isTop = i === 4;
    const muuing = isTop && t > b.muu && t < b.muu + 1.4;
    return cow ? (
      <Cow key={i} x={x - 20} y={y} s={0.36} squash={land} flip={col === 0} look={surprised ? [0, 0] : [0.5, 0.5]} blink={blinkAt(t, i)} mouth={muuing ? 'open' : surprised ? 'grin' : 'smile'} mouthOpen={muuing ? 1.4 : 1} />
    ) : (
      <Pig key={i} x={x} y={y} s={0.42} squash={land} flip={col === 2} look={[-0.3, 0]} blink={blinkAt(t, i + 4)} mouth={surprised ? 'grin' : 'smile'} />
    );
  });
  const humans = [0, 1, 2, 3].map((i) => (
    <Stickman
      key={i}
      x={L[0] - 110 + i * 72}
      ground={panL - 12}
      scale={0.28 * sp(t, b.humans + i * 0.12)}
      sw={18}
      pose={surprised ? POSES.scared : i % 2 ? POSES.open : POSES.stand}
      lift={surprised ? 20 + Math.abs(Math.sin(t * 8 + i)) * 20 : 0}
      face={{mouth: surprised ? 'open' : 'smile', eyeScale: surprised ? 1.3 : 1, look: [0.6, 0], blink: blinkAt(t, i + 9)}}
    />
  ));
  return (
    <Stage shake={shake(t, b.tilt, 0.6, 22)}>
      <Ground y={GROUND} />
      <g transform={`translate(0,${(1 - enter) * -900})`}>
        {/* poste y base */}
        <path d={`M${PX},${PY} L${PX},${GROUND - 40}`} stroke={C.ink} strokeWidth={22} strokeLinecap="round" />
        <path d={`M${PX - 140},${GROUND} Q${PX},${GROUND - 90} ${PX + 140},${GROUND} Z`} fill="#fff" stroke={C.ink} strokeWidth={10} />
        {/* viga */}
        <path d={`M${L[0]},${L[1]} L${R[0]},${R[1]}`} stroke={C.ink} strokeWidth={20} strokeLinecap="round" />
        <path d={`M${PX - 40},${PY - 60} L${PX},${PY} L${PX + 40},${PY - 60} Z`} fill={C.yellow} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
        <circle cx={PX} cy={PY} r={20} fill={C.red} stroke={C.ink} strokeWidth={8} />
        {[L, R].map((p, i) => (
          <g key={i}>
            <path d={`M${p[0]},${p[1]} L${p[0] - 140},${p[1] + HANG} M${p[0]},${p[1]} L${p[0] + 140},${p[1] + HANG}`} stroke={C.ink} strokeWidth={6} />
            <path d={`M${p[0] - 165},${p[1] + HANG} Q${p[0]},${p[1] + HANG + 70} ${p[0] + 165},${p[1] + HANG} Z`} fill="#fff" stroke={C.ink} strokeWidth={10} strokeLinejoin="round" />
          </g>
        ))}
        {humans}
        {animals}
        <ComicText x={L[0]} y={panL + 75} size={50} fill="#fff">
          HUMANOS
        </ComicText>
        <ComicText x={R[0]} y={panR + 75} size={50} fill="#fff">
          GRANJA
        </ComicText>
      </g>
      {/* SFX: pum — cada animal que cae en la balanza */}
      {b.drops.map((d, i) => (
        <Dust key={i} t={t} at={d + 0.35} x={R[0] - 95 + (i % 3) * 95} y={panR - 10} size={0.45} dur={0.6} />
      ))}
      {t > b.tilt + 0.15 && (
        <g transform={`translate(830,350) rotate(8) scale(${sp(t, b.tilt + 0.15)})`}>
          <rect x={-190} y={-60} width={380} height={120} rx={24} fill={C.yellow} stroke={C.ink} strokeWidth={9} />
          <ComicText x={0} y={4} size={64} fill="#fff">
            ¡CASI ×2!
          </ComicText>
        </g>
      )}
      <Stickman
        x={PX - 20}
        ground={GROUND}
        scale={0.6}
        pose={pose}
        lift={surprised && t < b.tilt + 0.7 ? 60 * Math.sin(((t - b.tilt) / 0.7) * Math.PI) : 0}
        cap
        face={{
          look: [0.7, -0.5],
          blink: blinkAt(t),
          mouth: t > b.muu ? 'grin' : surprised ? 'open' : 'smile',
          eyeScale: surprised && t < b.muu ? 1.3 : 1,
          brow: surprised ? 'up' : 'none',
        }}
      />
      <Onomatopeya t={t} at={b.tilt} text="¡PUM!" x={250} y={1080} burst={C.yellow} color="#fff" size={140} rot={-10} dur={1.1} />
      {/* SFX: muu */}
      <Onomatopeya t={t} at={b.muu} text="¡MUU!" x={760} y={440} burst={null} color="#fff" size={150} rot={8} dur={1.6} />
      <EmojiFloat t={t} at={b.muu + 0.15} e="😂" x={960} y={620} dur={1.8} size={1.2} />
    </Stage>
  );
};
