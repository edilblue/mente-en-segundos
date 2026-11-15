import React from 'react';
import {C, SUIT, bounce, clamp, iv, shake, sp, ease} from '../lib';
import {cue} from '../timeline';
import {Burst, ChalkText, Dust, chalkStroke} from '../components/Chalk';
import {Figure, POSES, blinkAt, poseAt} from '../components/Figure';
import {Stamp} from '../components/Props';
import {SceneProps, Stage} from './common';

/** Encuadre del Santa protagonista: idéntico en el primer y el último frame (loop). */
export const HERO = {x: 480, ground: 1010, scale: 1.3};

/**
 * Escena 1 — "¿Santa Claus era verde…? ¡Mentira!"
 * Frame 0: Santa verde mirando a cámara. 0,55 s: cae el sello MITO y lo aplasta.
 * En "rojo" el traje se tiñe de rojo con signos de pregunta; en "¡Mentira!" el sello vuelve a golpear
 * y la pregunta se tacha.
 */
export const S1: React.FC<SceneProps> = ({t}) => {
  const tHit = 0.78; // el sello toca a Santa
  const tRojo = cue(1, 'rojo', 3.5);
  const tMentira = cue(1, 'mentira', 4.0);

  // Sello: entra desde la cámara (escala 3 → 0.85) y rebota
  const fall = iv(t, [0.5, tHit], [0, 1], ease.in);
  const stampScale = t < tHit ? 3.2 - 2.35 * fall : 0.85 + bounce(t, tHit, 0.12, 2.6, 6) + bounce(t, tMentira, 0.18, 2.8, 6);
  const stampOp = iv(t, [0.5, 0.62], [0, 1]);

  // Santa: anticipación (mira arriba y se encoge) → aplastado → recuperación elástica
  const antic = iv(t, [0.45, tHit], [0, 1]);
  const squash = t < tHit ? -0.05 * antic : bounce(t, tHit, 0.24, 2.4, 4.5) + 0.0;
  const squash2 = bounce(t, tMentira, 0.1, 3, 6);
  const idle = Math.sin(t * Math.PI * 1.6) * 0.012;
  const pose = poseAt(t, [
    [0, POSES.stand],
    [0.5, {...POSES.stand, head: -8, armL: [-40, -20], armR: [40, 20]}],
    [tHit, POSES.hit],
    [tHit + 0.55, POSES.stand],
    [tRojo - 0.2, POSES.shrug],
    [tMentira - 0.1, POSES.wag],
  ]);
  // dedo que dice "no-no"
  if (t > tMentira) pose.armR = [150 + Math.sin((t - tMentira) * 22) * 14, -25];

  const paintP = iv(t, [tRojo - 0.25, tRojo + 0.15], [0, 1], ease.out);
  const face =
    t < 0.5
      ? {look: [0, 0] as [number, number], mouth: 'smile' as const, brow: 'flat' as const, blink: blinkAt(t + 1.4)}
      : t < tHit
        ? {look: [0, -1] as [number, number], mouth: 'o' as const, brow: 'up' as const, eyeScale: 1.25}
        : t < tHit + 0.7
          ? {look: [0, 0] as [number, number], mouth: 'open' as const, brow: 'worried' as const, eyeScale: 0.8, mouthOpen: 0.8}
          : t < tRojo - 0.2
            ? {look: [-0.6, 0.2] as [number, number], mouth: 'flat' as const, brow: 'worried' as const, blink: blinkAt(t)}
            : t < tMentira - 0.1
              ? {look: [0.5, -0.4] as [number, number], mouth: 'o' as const, brow: 'raise' as const}
              : {look: [0, 0] as [number, number], mouth: 'smirk' as const, brow: 'angry' as const};

  const [sx, sy] = shake(t, tHit, 0.45, 26);
  const [sx2, sy2] = shake(t, tMentira, 0.3, 14);
  const zoom = 1 + iv(t, [0, 4.6], [0, 0.06]) + bounce(t, tHit, 0.03, 2, 6);

  // Pregunta de tiza arriba
  const titleP = iv(t, [0.04, 0.45], [0, 1]);
  const cross = iv(t, [tMentira - 0.05, tMentira + 0.2], [0, 1], ease.out);
  const qmarks = t > tRojo - 0.15 && t < tMentira;
  const hatFlop = bounce(t, tHit, 18, 1.6, 3) + Math.sin(t * 3) * 3 * (t > 0.1 ? 1 : 0);

  return (
    <Stage zoom={zoom} cx={480} cy={720} dx={sx + sx2} dy={sy + sy2}>
      <ChalkText x={480} y={205} text="¿SANTA ERA" size={80} p={titleP * 1.6} anchor="middle" />
      <ChalkText x={480} y={292} text="VERDE?" size={100} p={clamp(titleP * 1.6 - 0.6)} color={C.green} />
      {cross > 0 && <path d={`M${200},${285} L${200 + 560 * cross},${200 - 30 * cross}`} {...chalkStroke(14, C.red)} filter="url(#chalk)" />}
      <Figure
        {...HERO}
        pose={pose}
        squash={squash + squash2 + idle * (t > 0.05 ? 1 : 0)}
        suit={SUIT.green}
        paint={paintP > 0 ? {from: SUIT.green, to: SUIT.red, p: paintP, dir: 'up'} : undefined}
        face={face}
        hatFlop={hatFlop}
      />
      {qmarks &&
        [0, 1, 2].map((i) => {
          const k = sp(t, tRojo - 0.1 + i * 0.1);
          return (
            <ChalkText key={i} x={[230, 760, 700][i]} y={[470, 420, 560][i]} text="?" size={110 * k} color={C.yellow} rot={[-15, 12, 20][i]} />
          );
        })}
      <Dust x={480} y={820} t={t} at={tHit} r={260} n={11} />
      <Burst x={480} y={760} t={t} at={tHit} r={300} n={10} />
      <Burst x={480} y={760} t={t} at={tMentira} r={300} n={10} color={C.red} />
      {t > 0.5 && <Stamp x={500} y={820} scale={stampScale} rot={-11} opacity={stampOp} />}
    </Stage>
  );
};
