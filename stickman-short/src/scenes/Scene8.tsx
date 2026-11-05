import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Dust, EarthBall, Ono, Sparkle, SpeedLines} from '../components/Effects';
import {SceneFrame} from '../components/Paper';
import {P, Pose, Stickman} from '../components/Stickman';
import {C, FONT_MAIN, boil, jit, pop, rnd, shakeAt, step, tw, tween} from '../lib/anim';

/** Escena 8 (68-75 s) — Bonus: en la Luna saltas ~6 veces más alto. */
export const Scene8: React.FC = () => {
  const f = useCurrentFrame();
  const CROUCH = 20;
  const LAUNCH = 38; // SFX: "¡BOING!" espacial + sonido ambiente espacial @ 69.3 s
  const FLIP0 = 96;
  const FLIP1 = 140;
  const LAND = 205;
  const GY = 1230;
  const UNIT = 105; // altura de un salto en la Tierra (px)

  const liftK = tw(f, [
    [0, 0],
    [LAUNCH, 1, 'out', 80],
    [LAUNCH + 80, 1.02, 'linear', 40],
    [LAUNCH + 120, 0, 'in', LAND - LAUNCH - 120],
  ]);
  const lift = liftK * UNIT * 6;
  const squash = tw(f, [
    [0, 1],
    [CROUCH, 0.82, 'snap'],
    [LAUNCH, 1.25, 'linear', 3],
    [LAUNCH + 6, 1, 'soft'],
  ]);
  const pose = tween<Pose>(
    f,
    [
      {at: 0, v: P.wave},
      {at: CROUCH, v: P.crouch, e: 'snap'},
      {at: LAUNCH, v: P.jump, e: 'snap'},
      {at: 70, v: P.float, e: 'soft'},
      {at: FLIP0, v: P.halfCrouch, e: 'soft'},
      {at: FLIP1, v: P.float, e: 'soft'},
    ],
    P.stand,
  );
  const rot = tw(f, [
    [0, 0],
    [FLIP0, 360, 'ease', FLIP1 - FLIP0],
  ]) % 360;
  const zoom = tw(f, [
    [0, 1.15],
    [LAUNCH, 0.95, 'soft'],
    [FLIP0, 1.05, 'soft'],
    [FLIP1 + 10, 0.92, 'soft'],
  ]);
  const camY = tw(f, [
    [0, 1000],
    [LAUNCH, 880, 'soft'],
    [FLIP0, 720, 'soft'],
    [FLIP1 + 10, 900, 'soft'],
  ]);
  const b = boil(f, 4);
  const marks = [1, 2, 3, 4, 5, 6];

  return (
    <SceneFrame
      frame={f}
      cam={{x: 540, y: camY, zoom, rot: tw(f, [[0, 0], [FLIP0, -3, 'soft'], [FLIP1, 2, 'soft']])}}
      shake={shakeAt(f, [{at: LAUNCH, amp: 8, dur: 8}])}
      screen={<>{f >= LAUNCH && f < LAUNCH + 30 && <SpeedLines frame={f} dir="down" count={14} opacity={0.6} seed="moon" />}</>}
    >
      {/* Estrellas de garabato */}
      {[...Array(22)].map((_, i) => {
        const x = rnd(`stx${i}`) * 1080;
        const y = 120 + rnd(`sty${i}`) * 950;
        const tw2 = 0.6 + 0.4 * Math.sin(f * 0.2 + i * 1.7);
        const r = (10 + rnd(`str${i}`) * 12) * tw2;
        return (
          <path
            key={i}
            transform={`translate(${x + jit(`sj${i}${b}`, 1)} ${y})`}
            d={`M0,${-r} Q${r * 0.18},${-r * 0.18} ${r},0 Q${r * 0.18},${r * 0.18} 0,${r} Q${-r * 0.18},${r * 0.18} ${-r},0 Q${-r * 0.18},${-r * 0.18} 0,${-r}Z`}
            fill={i % 3 === 0 ? C.yellow : '#fff'}
            stroke={C.ink}
            strokeWidth={3}
          />
        );
      })}
      <EarthBall frame={f} x={860} y={330} r={85} face="happy" />
      {/* Superficie lunar */}
      <path d={`M-400,${GY} Q540,${GY - 70} 1480,${GY} L1480,2600 L-400,2600Z`} fill="#CFCFCF" stroke={C.ink} strokeWidth={9} />
      {[
        [200, GY + 90, 70],
        [700, GY + 160, 100],
        [950, GY + 60, 40],
        [420, GY + 260, 50],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.35} fill="#AFAFAF" stroke={C.ink} strokeWidth={5} />
          <path d={`M${x - r * 0.8},${y - r * 0.05} Q${x},${y + r * 0.3} ${x + r * 0.8},${y - r * 0.05}`} stroke="#8E8E8E" strokeWidth={5} fill="none" />
        </g>
      ))}
      {/* Regla de altura: Tierra 1x vs Luna 6x */}
      <g>
        <path d={`M120,${GY - 30} L120,${GY - 30 - UNIT * 6 - 10}`} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
        {marks.map((m) => {
          const y = GY - 30 - UNIT * m;
          const hit = lift >= UNIT * m;
          return (
            <g key={m}>
              <path d={`M100,${y} L140,${y}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
              <text x={160} y={y} dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={m === 6 ? 60 : 44} fill={hit ? (m === 6 ? C.red : C.ink) : C.gray} stroke={m === 6 && hit ? '#fff' : undefined} strokeWidth={6} paintOrder="stroke">
                {m}x
              </text>
            </g>
          );
        })}
        <text x={160} y={GY - 30 - UNIT + 42} fontFamily={FONT_MAIN} fontSize={30} fill={C.blueDark}>
          Tierra
        </text>
      </g>
      {/* Fantasma del salto en la Tierra */}
      <Stickman frame={f} x={300} y={GY - 25} scale={0.9} pose={P.jump} lift={UNIT * 0.9 * (0.5 + 0.5 * Math.sin(f * 0.25))} dashed stroke={C.blueDark} opacity={0.6} seed={21} />
      <Dust frame={f} x={600} y={GY - 25} start={LAUNCH} scale={1.1} spread={200} seed="moondust" dur={40} />
      <Dust frame={f} x={600} y={GY - 25} start={LAND} scale={0.9} spread={180} seed="moondust2" />
      <Stickman
        frame={f}
        x={600}
        y={GY - 25}
        scale={1.15}
        pose={pose}
        lift={lift}
        squash={squash}
        rot={rot}
        cap
        helmet
        eyes={step(f, [[0, 'dot'], [CROUCH, 'determined'], [LAUNCH, 'happy'], [FLIP1, 'wide'], [FLIP1 + 20, 'happy']] as const)}
        mouth={step(f, [[0, 'smile'], [CROUCH, 'flat'], [LAUNCH, 'laugh'], [FLIP1, 'o'], [FLIP1 + 20, 'grin']] as const)}
        brows={step(f, [[0, 'none'], [CROUCH, 'angry'], [LAUNCH, 'none']] as const)}
        seed={7}
      />
      <Ono frame={f} text="¡BOING!" x={760} y={1000} start={LAUNCH + 1} size={120} rot={8} dur={34} />
      {[0, 1, 2].map((k) => (
        <Sparkle key={k} x={400 + k * 220} y={GY - 30 - UNIT * 6 + jit(`ms${k}`, 50)} r={36} frame={f} start={112 + k * 4} />
      ))}
      {f >= 112 && (
        <g transform={`translate(330 ${GY - 30 - UNIT * 6 - 80}) rotate(-8) scale(${pop(f, 112) * 1.4})`}>
          <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={64} fill={C.yellow} stroke={C.ink} strokeWidth={12} paintOrder="stroke" strokeLinejoin="round">
            ¡x6!
          </text>
        </g>
      )}
    </SceneFrame>
  );
};
