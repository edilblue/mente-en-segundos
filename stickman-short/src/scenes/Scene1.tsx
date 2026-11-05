import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Dust, EmojiFloat, FocusLines, Ono, PopText, SpeedLines} from '../components/Effects';
import {Ground, SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, headWorld} from '../components/Stickman';
import {C, FONT_COMIC, shakeAt, step, tw, tween} from '../lib/anim';

/** Escena 1 (0-5 s) — Gancho: Stickman Pro cae, se rasca la cabeza, zoom a la cara. */
export const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  const GY = 1250;
  const LAND = 13; // SFX: golpe "¡PUM!" @ 0.43 s

  const lift = tw(f, [
    [0, 1500],
    [0, 0, 'in', LAND],
  ]);
  const squash = tw(f, [
    [0, 1.3],
    [LAND, 0.6, 'linear', 1],
    [LAND + 2, 1, 'snap'],
  ]);
  let pose = tween<Pose>(
    f,
    [
      {at: 0, v: P.fall},
      {at: LAND, v: P.crouch, e: 'snap'},
      {at: 26, v: P.stand},
      {at: 44, v: P.scratch},
      {at: 96, v: P.shrug},
      {at: 112, v: P.stand, e: 'soft'},
    ],
    P.stand,
  );
  if (f >= 50 && f < 96) pose = {...pose, re: pose.re + Math.sin(f * 1.4) * 16};
  if (f < LAND) pose = {...pose, ls: pose.ls + Math.sin(f * 2.2) * 20, rs: pose.rs - Math.sin(f * 2.2) * 20};
  const eyes = step(f, [
    [0, 'wide'],
    [LAND, 'squint'],
    [22, 'dot'],
    [44, 'dot'],
    [100, 'wide'],
    [128, 'dot'],
  ] as const);
  const mouth = step(f, [
    [0, 'scream'],
    [LAND, 'wavy'],
    [24, 'flat'],
    [44, 'smirk'],
    [100, 'o'],
    [128, 'grin'],
  ] as const);
  const brows = step(f, [
    [0, 'up'],
    [LAND, 'angry'],
    [24, 'none'],
    [44, 'raised'],
    [100, 'up'],
  ] as const);
  const look: [number, number] = f >= 44 && f < 96 ? [-0.7, -0.8] : [0, 0];

  const pro = {x: 540, y: GY, scale: 1.9, pose, lift};
  const head = headWorld(pro);

  // Cámara: leve acercamiento al rascarse y zoom rápido a la cara.
  const zoom = tw(f, [
    [0, 1],
    [40, 1],
    [44, 1.12, 'soft'],
    [100, 2.3, 'snap'],
    [128, 2.55, 'linear', 22],
  ]);
  const cy = tw(f, [
    [0, 960],
    [44, 930, 'soft'],
    [100, head[1] + 60, 'snap'],
  ]);
  const shake = shakeAt(f, [
    {at: LAND, amp: 30, dur: 14},
    {at: 100, amp: 10, dur: 8},
  ]);

  return (
    <SceneFrame
      frame={f}
      cam={{x: 540, y: cy, zoom, rot: tw(f, [[0, 0], [100, -3, 'snap']])}}
      shake={shake}
      screen={
        <>
          {f >= 100 && <FocusLines frame={f} inner={470} opacity={Math.min(1, (f - 100) / 4)} />}
          {/* SFX: swoosh del zoom @ 3.33 s */}
        </>
      }
    >
      <Ground frame={f} y={GY} x0={60} x1={1020} />
      {f < LAND + 1 && <SpeedLines frame={f} x0={300} x1={780} y0={-200} y1={GY} dir="up" count={18} />}
      <Stickman frame={f} {...pro} squash={squash} cap eyes={eyes} mouth={mouth} brows={brows} look={look} seed={7} />
      <Dust frame={f} x={540} y={GY} start={LAND} scale={1.5} count={9} spread={260} />
      <Ono frame={f} text="¡PUM!" x={835} y={1120} start={LAND} size={120} rot={-12} dur={30} />
      {/* Signos de interrogación mientras se rasca la cabeza */}
      <PopText frame={f} text="?" x={700} y={560} start={52} end={98} size={110} font={FONT_COMIC} fill={C.ink} rot={12} />
      <PopText frame={f} text="?" x={770} y={480} start={62} end={98} size={80} font={FONT_COMIC} fill={C.ink} rot={-10} />
      <PopText frame={f} text="?" x={640} y={450} start={72} end={98} size={60} font={FONT_COMIC} fill={C.ink} rot={20} />
      <EmojiFloat frame={f} kind="think" x={300} y={640} start={48} dur={52} size={170} />
    </SceneFrame>
  );
};
