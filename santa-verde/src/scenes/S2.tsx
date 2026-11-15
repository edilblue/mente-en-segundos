import React from 'react';
import {C, SUIT, SuitColor, bounce, iv, lerp, sp, ease} from '../lib';
import {cue} from '../timeline';
import {Burst, ChalkText, chalkStroke} from '../components/Chalk';
import {Figure, POSES, Pose, blinkAt, poseAt, walk} from '../components/Figure';
import {Flag} from '../components/Props';
import {Ground, SceneProps, Stage} from './common';

type Marcher = {suit: SuitColor; flag: 'uk' | 'ru' | 'de'; label: string; x: number; key: string; finalPose: Pose; seed: number};

/**
 * Escena 2 — "Antes de 1900, Santa aparecía con túnicas verdes, azules o marrones. Cada país lo vestía distinto."
 * Desfile: cada Santa entra caminando (con rebote) justo cuando se nombra su color, con la bandera de su país.
 * En "Cada país…" la cámara empuja, saltan a la vez y cada uno adopta una pose distinta.
 */
export const S2: React.FC<SceneProps> = ({t}) => {
  const GROUND = 960;
  const marchers: Marcher[] = [
    {suit: SUIT.green, flag: 'uk', label: 'INGLATERRA', x: 180, key: 'aparecía', finalPose: POSES.cheer, seed: 1},
    {suit: SUIT.blue, flag: 'ru', label: 'RUSIA', x: 470, key: 'azules', finalPose: POSES.hips, seed: 2},
    {suit: SUIT.brown, flag: 'de', label: 'ALEMANIA', x: 770, key: 'marrones', finalPose: POSES.shrug, seed: 3},
  ];
  const tCada = cue(2, 'cada', 5.1);
  const tDistinto = cue(2, 'distinto', 6.2);
  const headerP = iv(t, [0.05, 0.6], [0, 1]);
  const yearPop = sp(t, cue(2, '1900', 0.5) - 0.05);

  // Cámara: ligero paneo siguiendo el desfile y empuje en "cada país"
  const zoom = 1 + iv(t, [tCada - 0.1, tCada + 0.5], [0, 0.06], ease.out) + bounce(t, tDistinto, 0.02, 2, 5);
  const dx = iv(t, [0, 4], [40, 0], ease.inOut);

  return (
    <Stage zoom={zoom} cx={470} cy={700} dx={dx}>
      <ChalkText x={330} y={250} text="ANTES DE" size={78} p={headerP * 1.5} />
      <g transform={`translate(700,262) scale(${yearPop}) rotate(-6)`}>
        <ChalkText x={0} y={0} text="1900" size={120} color={C.yellow} />
      </g>
      <Ground y={GROUND} />
      {marchers.map((m, i) => {
        const tIn = cue(2, m.key, 1.8 + i * 0.6) - 0.45;
        const arrive = tIn + 0.65;
        if (t < tIn) return null;
        const k = iv(t, [tIn, arrive], [0, 1], ease.out);
        const x = lerp(1180, m.x, k);
        const w = walk(t, 2.6);
        const walking = t < arrive;
        // llegada: freno con squash; "cada país": salto con anticipación
        const land = bounce(t, arrive, 0.14, 2.6, 6) + (i === 0 ? bounce(t, cue(2, 'verdes', 3.1), 0.12, 2.6, 6) : 0);
        const jumpT = t - (tCada + i * 0.08);
        const jump = jumpT > 0.12 && jumpT < 0.62 ? Math.sin(((jumpT - 0.12) / 0.5) * Math.PI) * 120 : 0;
        const antic = jumpT > 0 && jumpT < 0.12 ? 0.12 : 0;
        const landing = bounce(t, tCada + i * 0.08 + 0.62, 0.16, 2.6, 6);
        const pose: Pose = walking
          ? w.pose
          : poseAt(t, [
              [arrive, POSES.wave],
              [arrive + 0.5, POSES.hold],
              [tCada, POSES.crouch],
              [tCada + 0.14, POSES.jump],
              [tCada + 0.64, POSES.stand],
              [tDistinto - 0.15, m.finalPose],
            ]);
        const flagHand = (
          <g transform="translate(0,70)">
            <Flag kind={m.flag} wave={Math.sin(t * 7 + i)} s={0.85} />
          </g>
        );
        return (
          <g key={m.flag}>
            <Figure
              x={x}
              ground={GROUND}
              pose={pose}
              lift={(walking ? w.lift : 0) + jump}
              squash={(walking ? w.squash : 0) + land + antic + landing + (jump > 0 ? -0.08 : 0)}
              scale={0.95}
              robe={1}
              suit={m.suit}
              face={{
                look: walking ? [-0.8, 0] : [0, 0],
                mouth: t > tDistinto - 0.15 ? (['grin', 'smirk', 'open'] as const)[i] : jump > 0 ? 'open' : 'smile',
                brow: t > tDistinto - 0.15 ? (['up', 'raise', 'worried'] as const)[i] : 'flat',
                blink: blinkAt(t, m.seed),
                facing: walking ? -0.6 : 0,
              }}
              hatFlop={walking ? Math.sin(t * 16) * 10 : bounce(t, arrive, 16, 1.8, 3) + (jump > 0 ? -14 : 0)}
              propR={flagHand}
              uprightR
            />
            {/* etiqueta del país en la zona de datos */}
            <g opacity={iv(t, [arrive - 0.1, arrive + 0.15], [0, 1])}>
              <ChalkText x={i === 0 ? m.x + 22 : m.x} y={1325} text={m.label} size={i === 0 ? 42 : 48} p={iv(t, [arrive - 0.1, arrive + 0.35], [0, 1])} />
              <path d={`M${m.x - 60},${1345} Q${m.x},${1360} ${m.x + 60},${1345}`} {...chalkStroke(6, m.suit.main)} filter="url(#chalk)" />
            </g>
            <Burst x={m.x} y={650} t={t} at={tDistinto - 0.1} r={150} n={7} color={m.suit.main} />
            {i === 0 && <Burst x={m.x} y={700} t={t} at={cue(2, 'verdes', 3.1)} r={170} n={8} color={m.suit.main} />}
          </g>
        );
      })}
      {/* "≠" entre los Santas en "distinto" */}
      {[322, 618].map((x, i) => {
        const k = sp(t, tDistinto + i * 0.08);
        return k > 0 ? <ChalkText key={x} x={x} y={1440} text="≠" size={90 * k} color={C.yellow} /> : null;
      })}
    </Stage>
  );
};
