// Escena 2 — Las hormigas: el suelo se llena de hormigas y un contador tipo tragamonedas.
import React from 'react';
import {Ant} from '../animals';
import {ComicText, EmojiFloat, Ground, Onomatopeya, Stage, wobble} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, ease, iv, noise, rnd, shake, sp} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats2 = (dur: number, w: Word[]) => {
  const [counterIn, landing, scared, perPerson] = ordered(
    [wt(w, '20', 2.4) - 0.5, wt(w, 'hormigas', 3.7) + 0.2, wt(w, 'millones', 5.4) - 0.15, wt(w, 'persona', 6.4)],
    0.6,
  );
  return {counterIn, reelsFrom: counterIn + 0.35, landing, label: wt(w, 'hormigas', 3.7) - 0.1, scared, perPerson: Math.min(perPerson, dur - 1.6)};
};

const NUM = '20.000.000.000.000.000';
const ANTS = Array.from({length: 46}, (_, i) => {
  const hole = [150, 560, 940][i % 3];
  return {
    spawn: 0.15 + Math.pow(i / 46, 0.8) * 6.5,
    x0: i % 7 === 0 ? -80 : i % 7 === 1 ? 1160 : hole,
    dir: rnd(i) > 0.5 ? 1 : -1,
    speed: 90 + rnd(i * 3) * 160,
    row: rnd(i * 5),
    seed: i,
  };
});

export const S2: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats2(dur, words);
  const isScared = t > b.scared;
  const pose = poseAt(t, [
    [0, POSES.stand],
    [b.counterIn, POSES.pointUp],
    [b.landing, POSES.stand],
    [b.scared, POSES.scared],
  ]);
  const hover = isScared ? 70 + Math.abs(Math.sin((t - b.scared) * 9)) * 30 : 0;
  const tremble = isScared ? noise(t * 30, 3) * 6 : 0;

  // Contador tragamonedas: cada dígito deja de girar uno tras otro.
  const digits = NUM.split('');
  const nDig = digits.filter((c) => c !== '.').length;
  const boxIn = sp(t, b.counterIn, {damping: 10});
  let di = 0;
  const cells = digits.map((ch, i) => {
    const cx = 92 + i * 43;
    if (ch === '.') return <ComicText key={i} x={cx} y={520} size={64} fill="#fff">.</ComicText>;
    const k = di++;
    const stop = b.reelsFrom + ((b.landing - b.reelsFrom) * (k + 1)) / nDig;
    const spinning = t < stop;
    const shown = spinning ? String(Math.floor((t * 22 + k * 3.7) % 10)) : ch;
    const bump = spinning ? 0 : sp(t, stop, {damping: 7, stiffness: 260});
    const blur = spinning ? (t * 22 + k) % 1 : 0;
    return (
      <g key={i} transform={`translate(0,${spinning ? (blur - 0.5) * 30 : (1 - bump) * -24})`}>
        <ComicText x={cx} y={490} size={78} fill={spinning ? '#ddd' : C.yellow}>
          {shown}
        </ComicText>
      </g>
    );
  });
  const lever = iv(t, [b.counterIn + 0.1, b.counterIn + 0.35, b.counterIn + 0.7], [0, 1, 0]);
  const bulbs = Array.from({length: 9}, (_, i) => (
    <circle key={i} cx={100 + i * 110} cy={372} r={13} fill={Math.floor(t * 6 + i) % 2 ? C.yellow : C.red} stroke={C.ink} strokeWidth={5} />
  ));

  const ants = ANTS.filter((a) => t > a.spawn).map((a) => {
    const age = t - a.spawn;
    const x = a.x0 + a.dir * a.speed * age + noise(age * 0.8, a.seed) * 40;
    const wrapped = ((x % 1240) + 1240) % 1240 - 80;
    const y = GROUND - 10 + a.row * 70 - 35;
    const emerge = iv(age, [0, 0.3], [0, 1], ease.back);
    return {y, el: <Ant key={a.seed} x={wrapped} y={y} s={(0.55 + a.row * 0.35) * emerge} flip={a.dir < 0} t={t + a.seed} walk={1} look={[a.dir * 0.6, 0]} blink={blinkAt(t, a.seed)} mouth={a.seed % 3 ? 'smile' : 'grin'} />};
  });
  ants.sort((p, q) => p.y - q.y);

  return (
    <Stage shake={shake(t, b.landing, 0.5, 14)}>
      <Ground y={GROUND} />
      {/* hormigueros */}
      {[150, 560, 940].map((x) => (
        <path key={x} d={`M${x - 70},${GROUND} Q${x},${GROUND - 70} ${x + 70},${GROUND}`} fill="#fff" stroke={C.ink} strokeWidth={8} />
      ))}
      {/* Contador gigante — SFX: tragamonedas girando; SFX: ding al detenerse */}
      <g transform={`translate(540,500) scale(${boxIn}) translate(-540,-500)`}>
        <rect x={50} y={350} width={980} height={290} rx={40} fill={C.red} stroke={C.ink} strokeWidth={10} />
        <rect x={70} y={420} width={940} height={140} rx={20} fill={C.ink} />
        {bulbs}
        {cells}
        <ComicText x={540} y={600} size={54} fill={t > b.label ? C.yellow : '#fff'}>
          {t > b.label ? 'HORMIGAS EN LA TIERRA' : 'CONTANDO...'}
        </ComicText>
        <g transform={`translate(1030,470) rotate(${lever * 70})`}>
          <path d="M0,0 L0,-120" stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
          <circle cx={0} cy={-130} r={22} fill={C.yellow} stroke={C.ink} strokeWidth={7} />
        </g>
      </g>
      {/* ≈ 2,5 millones por persona */}
      {t > b.perPerson && (
        <g transform={`translate(540,760) rotate(${-4 + noise(t * 8, 9) * 2}) scale(${sp(t, b.perPerson)})`}>
          <rect x={-380} y={-62} width={760} height={124} rx={22} fill={C.red} stroke={C.ink} strokeWidth={9} />
          <ComicText x={0} y={4} size={68} fill="#fff">
            ≈ 2.500.000 POR PERSONA
          </ComicText>
        </g>
      )}
      {ants.filter((a) => a.y < GROUND - 10).map((a) => a.el)}
      <Stickman
        x={330 + tremble}
        ground={GROUND}
        pose={pose}
        lift={hover}
        cap
        face={{
          look: isScared ? [0.2, 1] : t > b.counterIn ? [0.3, -0.9] : [0.6, 0.6],
          blink: isScared ? 0 : blinkAt(t),
          mouth: isScared ? 'open' : t > b.landing ? 'o' : 'smile',
          mouthOpen: isScared ? 0.8 + Math.sin(t * 20) * 0.2 : 1,
          brow: isScared ? 'worried' : 'up',
          eyeScale: isScared ? 1.3 : t > b.landing ? 1.15 : 1,
        }}
      />
      {ants.filter((a) => a.y >= GROUND - 10).map((a) => a.el)}
      <path d={wobble(40, GROUND + 60, 1040, GROUND + 60, 3, 2, 10)} stroke={C.ink} strokeWidth={5} opacity={0.35} fill="none" />
      <EmojiFloat t={t} at={b.landing + 0.05} e="🤯" x={880} y={880} dur={1.8} size={1.1} />
      <EmojiFloat t={t} at={b.scared + 0.15} e="😱" x={160} y={930} dur={dur - b.scared - 0.2} size={1.3} />
      <Onomatopeya t={t} at={b.scared} text="¡AAAH!" x={700} y={930} size={110} color="#fff" rot={8} dur={1.1} />
    </Stage>
  );
};
