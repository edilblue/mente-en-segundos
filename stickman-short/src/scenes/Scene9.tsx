import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Arrow, Emoji, Ono, SpeedLines} from '../components/Effects';
import {Ground, SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, handWorld} from '../components/Stickman';
import {C, pop, shakeAt, step, tw, tween} from '../lib/anim';

/**
 * Escena 9 (75-80 s) — Cierre: señala a los comentarios y se agacha para
 * saltar… y sale por arriba del encuadre. El video arranca con él cayendo
 * desde arriba, así el loop se siente natural.
 */
export const Scene9: React.FC = () => {
  const f = useCurrentFrame();
  const GY = 1250;
  const POP = 8; // SFX: "¡POP!" (se quita el casco) @ 75.27 s
  const POINT = 24; // señala hacia abajo @ 75.8 s
  const CROUCH = 104; // SFX: tensión antes del salto @ 78.47 s
  const LAUNCH = 136; // SFX: "boing" corto / swoosh hacia arriba @ 79.53 s (enlaza con el inicio)

  const pose = tween<Pose>(
    f,
    [
      {at: 0, v: P.stand},
      {at: POINT, v: P.pointDown, e: 'snap'},
      {at: CROUCH, v: P.crouch, e: 'snap'},
      {at: LAUNCH, v: P.jump, e: 'snap'},
    ],
    P.stand,
  );
  const pointing = f >= POINT && f < CROUCH;
  const pw = pointing ? {...pose, re: pose.re + Math.sin(f * 0.5) * 8} : pose;
  const lift = tw(f, [
    [0, 0],
    [LAUNCH, 1700, 'in', 14],
  ]);
  const squash = tw(f, [
    [0, 1],
    [CROUCH, 0.78, 'snap'],
    [LAUNCH, 1.4, 'linear', 3],
  ]);
  const pro = {x: 540, y: GY, scale: 1.75, pose: pw, lift};
  const hand = handWorld(pro);
  const helmetUp = f < POP ? 0 : (f - POP) * 26;
  const zoom = tw(f, [
    [0, 1.12],
    [POINT, 1.0, 'snap'],
    [70, 1.08, 'linear', 34],
    [CROUCH, 1.18, 'snap'],
    [LAUNCH, 1.0, 'snap'],
  ]);
  const camY = tw(f, [
    [0, 900],
    [POINT, 980, 'snap'],
    [CROUCH, 900, 'snap'],
  ]);
  const bounce = Math.abs(Math.sin(f * 0.3)) * 26;
  return (
    <SceneFrame
      frame={f}
      cam={{x: 540, y: camY, zoom}}
      shake={shakeAt(f, [
        {at: CROUCH, amp: 6, dur: LAUNCH - CROUCH},
        {at: LAUNCH, amp: 16, dur: 10},
      ])}
      screen={<>{f >= LAUNCH && <SpeedLines frame={f} dir="down" count={22} x0={300} x1={780} />}</>}
    >
      <Ground frame={f} y={GY} x0={60} x1={1020} />
      {/* El casco espacial sale volando */}
      {f >= POP && f < POP + 30 && (
        <g transform={`translate(${640 + (f - POP) * 14} ${640 - helmetUp + (f - POP) * (f - POP) * 0.9}) rotate(${(f - POP) * 18})`}>
          <circle r={105} fill={C.blueLight} fillOpacity={0.55} stroke={C.ink} strokeWidth={9} />
          <path d="M-60,-50 Q-40,-80 -10,-88" stroke="#fff" strokeWidth={12} fill="none" strokeLinecap="round" />
        </g>
      )}
      <Ono frame={f} text="¡POP!" x={830} y={560} start={POP} size={100} rot={12} dur={24} />
      <Stickman
        frame={f}
        {...pro}
        squash={squash}
        cap
        eyes={step(f, [[0, 'happy'], [POINT, 'dot'], [CROUCH, 'determined']] as const)}
        mouth={step(f, [[0, 'grin'], [POINT, 'smile'], [CROUCH, 'grin']] as const)}
        brows={step(f, [[0, 'none'], [POINT, 'up'], [CROUCH, 'angry']] as const)}
        look={pointing ? [0.5, 0.8] : [0, 0]}
        seed={7}
      />
      {/* Flechas hacia los comentarios */}
      {pointing && (
        <g opacity={Math.min(1, pop(f, POINT + 4))}>
          <Arrow x={hand[0] + 40} y={hand[1] + 30 + bounce} len={120} angle={90} frame={f} width={11} seed="dn1" />
          <Arrow x={hand[0] + 150} y={hand[1] - 20 + bounce} len={100} angle={90} frame={f} width={9} seed="dn2" color={C.red} />
          <g transform={`translate(${hand[0] + 260} ${hand[1] - 60 + bounce}) scale(${1.5 * pop(f, POINT + 8)})`}>
            <Emoji kind="down" frame={f} />
          </g>
        </g>
      )}
    </SceneFrame>
  );
};
