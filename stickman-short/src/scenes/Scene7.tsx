import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Arrow, EmojiFloat, Ono, SpeedLines} from '../components/Effects';
import {Ground, SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, headWorld, tinyMan, walkPose} from '../components/Stickman';
import {C, FONT_COMIC, FONT_MAIN, boil, jit, pop, ramp, rnd, shakeAt, step, tw, tween} from '../lib/anim';

/** Escena 7 (55-68 s) — El verdadero problema: volver a casa. Embotellamiento infinito. */
const ROWS = [
  {y: 990, s: 0.55},
  {y: 1070, s: 0.66},
  {y: 1160, s: 0.8},
  {y: 1262, s: 0.95},
];
const WORLD_X1 = 3900;
const PRO = {x: 1700, y: 1262};

const Car: React.FC<{f: number; x: number; y: number; k: number}> = ({f, x, y, k}) => {
  const bounce = Math.abs(Math.sin(f * 0.5 + k)) * 5;
  const st = {stroke: C.ink, strokeWidth: 6, strokeLinejoin: 'round' as const};
  const honk = (f + k * 23) % 50 < 18;
  return (
    <g transform={`translate(${x} ${y - bounce})`}>
      <path d="M-90,-20 L-70,-60 L40,-60 L70,-20 L95,-18 L95,10 L-95,10 Z" fill="#fff" {...st} />
      <path d="M-58,-52 L-44,-24 L-4,-24 L-4,-52Z M6,-52 L6,-24 L52,-24 L36,-52Z" fill={C.blueLight} {...st} strokeWidth={4} />
      <circle cx={-26} cy={-36} r={11} fill="#fff" stroke={C.ink} strokeWidth={4} />
      <circle cx={-55} cy={14} r={18} fill={C.ink} />
      <circle cx={60} cy={14} r={18} fill={C.ink} />
      <circle cx={-55} cy={14} r={7} fill="#fff" />
      <circle cx={60} cy={14} r={7} fill="#fff" />
      <rect x={82} y={-14} width={14} height={10} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
      {honk && (
        <g transform={`translate(110 -80) rotate(${-10 + jit(`hk${k}${boil(f, 2)}`, 4)})`}>
          <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT_COMIC} fontSize={48} fill={C.red} stroke={C.ink} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">
            ¡PIII!
          </text>
        </g>
      )}
    </g>
  );
};

const Sign: React.FC<{f: number; x: number; y: number; lines: string[]; rot?: number}> = ({f, x, y, lines, rot = 0}) => {
  const b = boil(f, 3);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + jit(`sg${x}${b}`, 0.5)})`}>
      <path d="M0,0 L0,-260" stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
      <rect x={-150} y={-380} width={300} height={40 + lines.length * 50} rx={12} fill={C.yellow} stroke={C.ink} strokeWidth={7} />
      {lines.map((l, i) => (
        <text key={i} x={0} y={-340 + i * 52 + 14} textAnchor="middle" dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={42} fill={C.ink}>
          {l}
        </text>
      ))}
    </g>
  );
};

export const Scene7: React.FC = () => {
  const f = useCurrentFrame();
  const PAN0 = 36; // SFX: swoosh del paneo + bocinas @ 56.2 s
  const PAN_BACK = 128; // SFX: swoosh de regreso @ 59.3 s
  const B = 228; // Stickman Pro en medio del caos @ 62.6 s
  const HOP = 282; // SFX: swoosh del salto @ 64.4 s; pisotón + "¡AY!" @ 65.07 s
  const HOP_D = 40;

  const camX = tw(f, [
    [0, 560],
    [PAN0, 3300, 'ease', 64],
    [PAN_BACK, PRO.x, 'ease', 26],
    [160, PRO.x, 'linear', 1],
    [B, PRO.x, 'snap'],
  ]);
  const zoom = tw(f, [
    [0, 1.2],
    [PAN0, 1.08, 'soft'],
    [PAN_BACK, 1.12, 'soft'],
    [160, 0.95, 'soft'],
    [B, 1.6, 'snap'],
    [HOP - 10, 1.2, 'soft'],
    [HOP + HOP_D + 6, 1.75, 'snap'],
    [360, 1.9, 'linear', 30],
  ]);
  const proHead = headWorld({x: PRO.x, y: PRO.y, scale: 1.3, pose: P.scared});
  const camY = tw(f, [
    [0, 1040],
    [160, 1000, 'soft'],
    [B, proHead[1] + 90, 'snap'],
    [HOP - 10, 980, 'soft'],
    [HOP + HOP_D + 6, proHead[1] + 80, 'snap'],
  ]);
  const panning = (f >= PAN0 && f < PAN0 + 60) || (f >= PAN_BACK && f < PAN_BACK + 24);
  const halfVis = 540 / zoom + 160;
  const visible = (x: number) => Math.abs(x - camX) < halfVis;

  // Multitud empujándose
  const crowd: React.ReactNode[] = [];
  ROWS.forEach((row, ri) => {
    const spacing = 62 + ri * 8;
    for (let i = 0; i * spacing < WORLD_X1 + 200; i++) {
      const id = `${ri}-${i}`;
      const goLeft = rnd(`gl${id}`) < 0.35;
      const drift = (goLeft ? -1 : 1) * (0.3 + rnd(`dr${id}`) * 0.5) * f;
      const x = -150 + i * spacing + jit(`cx${id}`, 18) + drift;
      if (!visible(x)) continue;
      if (ri === 3 && Math.abs(x - PRO.x) < 150) continue;
      const trip = rnd(`tp${id}`) < 0.06;
      const panic = rnd(`pn${id}`) < 0.25;
      const ph = f * 0.45 + i;
      const tripRot = trip ? Math.min(85, ((f + i * 13) % 90) * 3) * (goLeft ? -1 : 1) : 0;
      crowd.push(
        tinyMan(id, x, row.y, row.s, {
          phase: ph,
          arms: panic ? 0.7 + Math.sin(f * 0.6 + i) * 0.3 : 0.1,
          lift: Math.abs(Math.sin(ph)) * 6,
          rot: trip ? tripRot : (goLeft ? -8 : 8) + Math.sin(ph) * 4,
          eyes: ri >= 2,
        }),
      );
    }
    // Coches entre las filas
    if (ri === 1) {
      for (let k = 0; k < 7; k++) {
        const cx = 260 + k * 560 + Math.sin(f * 0.05 + k) * 10;
        if (visible(cx)) crowd.push(<Car key={`car${k}`} f={f} x={cx} y={1115} k={k} />);
      }
    }
  });

  // Flechas por todos lados
  const arrows: React.ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const x = 60 + i * 150 + jit(`ax${i}`, 40);
    if (!visible(x)) continue;
    const ang = rnd(`aa${i}`) * 360 + Math.sin(f * 0.1 + i) * 15;
    arrows.push(<Arrow key={i} x={x} y={720 + rnd(`ay${i}`) * 170} len={90 + rnd(`al${i}`) * 50} angle={ang} color={i % 3 === 0 ? C.red : C.ink} width={8} frame={f} seed={`ar${i}`} />);
  }

  // Stickman Pro y el que le pasa por encima
  const hopK = ramp(f, HOP, HOP + HOP_D, (t) => t);
  const stomp = f >= HOP + HOP_D / 2 - 3 && f < HOP + HOP_D / 2 + 8;
  const proPose = tween<Pose>(
    f,
    [
      {at: 0, v: P.scared},
      {at: HOP + HOP_D / 2 - 2, v: P.crouch, e: 'snap'},
      {at: HOP + HOP_D / 2 + 10, v: P.scared, e: 'spring'},
    ],
    P.stand,
  );
  const jumperX = PRO.x - 260 + 520 * hopK;
  const jumperLift = Math.sin(hopK * Math.PI) * 430;

  return (
    <SceneFrame
      frame={f}
      cam={{x: camX, y: camY, zoom, rot: tw(f, [[0, 0], [B, -3, 'snap'], [HOP + HOP_D + 6, 3, 'snap']])}}
      shake={shakeAt(f, [
        {at: PAN0, amp: 8, dur: 10},
        {at: B, amp: 14, dur: 10},
        {at: HOP + HOP_D / 2, amp: 26, dur: 14},
      ])}
      screen={
        <>
          {panning && <SpeedLines frame={f} dir={f < PAN_BACK ? 'left' : 'right'} count={26} y0={300} y1={1500} seed="pan" />}
          {f >= B && (
            <g>
              <rect x={14} y={14} width={1052} height={1892} fill="none" stroke={C.red} strokeWidth={22} opacity={Math.floor(f / 6) % 2 ? 0.85 : 0.2} rx={30} />
              <g transform={`translate(780 330) rotate(${12 + Math.sin(f * 0.3) * 2}) scale(${pop(f, B + 6, {damping: 7, stiffness: 220, mass: 0.6})})`}>
                <rect x={-190} y={-70} width={380} height={140} rx={18} fill="#fff" stroke={C.red} strokeWidth={12} />
                <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT_COMIC} fontSize={96} fill={C.red}>
                  ¡CAOS!
                </text>
              </g>
            </g>
          )}
        </>
      }
    >
      {arrows}
      <Sign f={f} x={1100} y={960} lines={['SALIDA', '← →']} rot={-6} />
      <Sign f={f} x={3300} y={960} lines={['CASA →', '8.000 km']} rot={5} />
      <Ground frame={f} y={1270} x0={-400} x1={WORLD_X1 + 400} seed="g7" />
      {crowd}
      <Stickman
        frame={f}
        x={PRO.x}
        y={PRO.y}
        scale={1.3}
        pose={proPose}
        squash={stomp ? 0.78 : 1}
        cap
        eyes={step(f, [[0, 'wide'], [HOP + HOP_D / 2 - 2, 'x'], [HOP + HOP_D / 2 + 12, 'wide']] as const)}
        mouth={step(f, [[0, 'scream'], [HOP + HOP_D / 2 - 2, 'wavy'], [HOP + HOP_D / 2 + 12, 'scream']] as const)}
        brows="up"
        sweat
        seed={7}
      />
      {f >= HOP - 4 && f < HOP + HOP_D + 20 && (
        <Stickman
          frame={f}
          x={jumperX}
          y={PRO.y}
          scale={1.0}
          pose={f < HOP + HOP_D ? walkPose(f * 0.6, 10) : P.stand}
          lift={jumperLift}
          rot={hopK > 0 && hopK < 1 ? 15 : 0}
          eyes="determined"
          mouth="grin"
          seed={33}
          lite
        />
      )}
      <Ono frame={f} text="¡AY!" x={PRO.x - 210} y={proHead[1] - 160} start={HOP + HOP_D / 2} size={110} rot={-12} fill={C.red} dur={30} />
      <EmojiFloat frame={f} kind="scream" x={PRO.x + 230} y={proHead[1] - 40} start={B + 10} dur={70} size={150} />
      <EmojiFloat frame={f} kind="scream" x={PRO.x - 240} y={proHead[1] + 40} start={HOP + HOP_D + 10} dur={60} size={130} />
    </SceneFrame>
  );
};

export {FONT_MAIN};
