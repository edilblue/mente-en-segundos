import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Dust, EarthBall, EmojiFloat, Flash, Ono, Sparkle, SpeedLines, Tag} from '../components/Effects';
import {Ground, SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, tinyMan} from '../components/Stickman';
import {C, FONT_MAIN, boil, jit, pop, rad, ramp, rnd, shakeAt, step, tw, tween, wobblyLine} from '../lib/anim';

/* ---------------- Parte A: contador tragamonedas ---------------- */
const DIGITS = '8000000000';
const SlotCounter: React.FC<{f: number; x: number; y: number}> = ({f, x, y}) => {
  const appear = pop(f, 4);
  const bump = 1 + 0.14 * Math.max(0, pop(f, 92, {damping: 6, stiffness: 260, mass: 0.5}) - ramp(f, 92, 110)) ;
  const DW = 66;
  const CW = 24;
  const cells: React.ReactNode[] = [];
  let cx = 0;
  const layout: {kind: 'd' | 'c'; i: number; x: number}[] = [];
  for (let i = 0; i < DIGITS.length; i++) {
    layout.push({kind: 'd', i, x: cx});
    cx += DW + 6;
    if (i === 0 || i === 3 || i === 6) {
      layout.push({kind: 'c', i, x: cx});
      cx += CW;
    }
  }
  const total = cx - 6;
  const b = boil(f, 3);
  for (const it of layout) {
    const lx = it.x - total / 2;
    if (it.kind === 'c') {
      cells.push(
        <text key={`c${it.i}`} x={lx + CW / 2 - 2} y={44} textAnchor="middle" fontFamily={FONT_MAIN} fontSize={90} fill={C.ink}>
          ,
        </text>,
      );
      continue;
    }
    const i = it.i;
    const lock = 40 + i * 5; // SFX: "clic" de tragamonedas en cada dígito que se detiene (6.33 s → 7.83 s)
    const final = Number(DIGITS[i]);
    let content: React.ReactNode;
    if (f < lock) {
      const p = (f - 4) * 0.85 + i * 3.7;
      const d0 = Math.floor(p) % 10;
      const frac = p - Math.floor(p);
      content = (
        <>
          <text x={lx + DW / 2} y={frac * 120} textAnchor="middle" dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={92} fill={C.ink} opacity={0.75}>
            {d0}
          </text>
          <text x={lx + DW / 2} y={frac * 120 - 120} textAnchor="middle" dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={92} fill={C.ink} opacity={0.75}>
            {(d0 + 1) % 10}
          </text>
        </>
      );
    } else {
      const s = pop(f, lock, {damping: 7, stiffness: 240, mass: 0.6});
      content = (
        <text x={lx + DW / 2} y={(1 - s) * -120} textAnchor="middle" dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={92} fill={C.ink}>
          {final}
        </text>
      );
    }
    cells.push(
      <g key={`d${i}`}>
        <clipPath id={`slot${i}`}>
          <rect x={lx} y={-60} width={DW} height={120} rx={10} />
        </clipPath>
        <rect x={lx} y={-60} width={DW} height={120} rx={10} fill={f >= lock && f < lock + 6 ? C.yellow : '#fff'} stroke={C.ink} strokeWidth={5} />
        <g clipPath={`url(#slot${i})`}>{content}</g>
      </g>,
    );
  }
  return (
    <g transform={`translate(${x + jit(`sc${b}`, 1)} ${y}) scale(${appear * bump})`}>
      <rect x={-total / 2 - 34 + 10} y={-100 + 10} width={total + 68} height={200} rx={34} fill={C.ink} />
      <rect x={-total / 2 - 34} y={-100} width={total + 68} height={200} rx={34} fill={C.yellow} stroke={C.ink} strokeWidth={8} />
      {[...Array(9)].map((_, k) => (
        <circle key={k} cx={-total / 2 - 10 + k * ((total + 20) / 8)} cy={-80} r={7} fill={(Math.floor(f / 4) + k) % 2 ? C.red : '#fff'} stroke={C.ink} strokeWidth={3} />
      ))}
      {cells}
      <text x={0} y={140} textAnchor="middle" fontFamily={FONT_MAIN} fontSize={52} fill={C.ink} opacity={ramp(f, 88, 96)}>
        PERSONAS
      </text>
    </g>
  );
};

/* ---------------- Parte B: la balanza ---------------- */
const PIVOT = {x: 540, y: 640};
const HALF = 350;
const STRING = 230;

export const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const B = 105; // corte a la balanza (8.5 s)
  const EARTH_LAND = 210; // SFX: golpe "¡PUM!" de la Tierra @ 12.0 s

  if (f < B) {
    /* ===== Parte A: zoom out + multiplicación + contador ===== */
    const zoom = tw(f, [
      [0, 1.7],
      [2, 0.95, 'soft'],
    ]);
    const cy = tw(f, [
      [0, 790],
      [2, 880, 'soft'],
    ]);
    const crowd: React.ReactNode[] = [];
    const N = 260;
    const items = [...Array(N)].map((_, i) => {
      const depth = rnd(`cd${i}`);
      return {i, depth, x: 40 + rnd(`cx${i}`) * 1000, y: 870 + depth * 250, rank: Math.floor(rnd(`cr${i}`) * N)};
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      const t0 = 6 + Math.log2(it.rank + 1) * 9; // aparecen duplicándose
      if (f < t0) continue;
      const s = pop(f, t0, {damping: 8, stiffness: 220, mass: 0.6}) * (0.42 + it.depth * 0.5);
      const hop = Math.max(0, Math.sin((f + it.i * 7) * 0.3)) * 6;
      crowd.push(tinyMan(it.i, it.x, it.y, s, {arms: rnd(`ca${it.i}`) > 0.7 ? 0.6 + Math.sin(f * 0.4 + it.i) * 0.4 : 0, lift: hop}));
    }
    const pose = tween<Pose>(
      f,
      [
        {at: 0, v: P.stand},
        {at: 18, v: P.pointUpRight},
        {at: 90, v: P.cheer},
      ],
      P.stand,
    );
    return (
      <SceneFrame frame={f} cam={{x: 540, y: cy, zoom}} shake={shakeAt(f, [{at: 92, amp: 14, dur: 10}])}>
        <Ground frame={f} y={1262} x0={-300} x1={1380} />
        {crowd}
        <Stickman frame={f} x={540} y={1262} scale={1.4} pose={pose} cap eyes={f > 18 ? 'wide' : 'dot'} brows="up" mouth={f > 90 ? 'grin' : 'o'} look={[0.6, -0.8]} seed={7} />
        <SlotCounter f={f} x={540} y={420} />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <Sparkle key={k} x={180 + k * 150 + jit(`spx${k}`, 30)} y={300 + jit(`spy${k}`, 60) + (k % 2) * 260} r={32} frame={f} start={92 + k * 2} />
        ))}
      </SceneFrame>
    );
  }

  /* ===== Parte B: balanza gigante ===== */
  const theta = tw(f, [
    [B, 0],
    [128, -9, 'soft'],
    [EARTH_LAND, 24, 'snap'],
  ]);
  const le = [PIVOT.x - Math.cos(rad(theta)) * HALF, PIVOT.y - Math.sin(rad(theta)) * HALF];
  const re = [PIVOT.x + Math.cos(rad(theta)) * HALF, PIVOT.y + Math.sin(rad(theta)) * HALF];
  const lp = [le[0], le[1] + STRING];
  const rp = [re[0], re[1] + STRING];
  const ER = 140;
  const earthY = f < EARTH_LAND ? tw(f, [[B, -500], [196, -500], [196, rp[1] - ER + 16, 'in', EARTH_LAND - 196]]) : rp[1] - ER + 16;

  // Stickmen que suben al platillo izquierdo y luego salen volando.
  const people: React.ReactNode[] = [];
  const NP = 16;
  for (let i = 0; i < NP; i++) {
    const row = i < 7 ? 0 : i < 12 ? 1 : 2;
    const col = row === 0 ? i : row === 1 ? i - 7 : i - 12;
    const ncol = row === 0 ? 7 : row === 1 ? 5 : 4;
    const ox = (col - (ncol - 1) / 2) * 40;
    const oy = -6 - row * 42;
    const t0 = 112 + i * 3.5;
    const sx = 40 + (i % 5) * 60;
    const sy = 1310;
    let x: number;
    let y: number;
    let rot = 0;
    if (f < t0) {
      x = sx;
      y = sy;
    } else if (f < t0 + 14) {
      const k = (f - t0) / 14;
      x = sx + (lp[0] + ox - sx) * k;
      y = sy + (lp[1] + oy - sy) * k - Math.sin(k * Math.PI) * 260;
    } else if (f < EARTH_LAND) {
      x = lp[0] + ox;
      y = lp[1] + oy;
    } else {
      // ¡Salen volando! SFX: swoosh múltiple @ 12.0 s
      const t = f - EARTH_LAND;
      const vx = -8 + rnd(`vx${i}`) * 14;
      const vy = -46 - rnd(`vy${i}`) * 18;
      const x0 = lp[0] + ox;
      const y0 = lp[1] + oy;
      x = x0 + vx * t;
      y = y0 + vy * t + 0.9 * t * t;
      rot = t * (12 + rnd(`vr${i}`) * 20) * (i % 2 ? 1 : -1);
    }
    if (f < 108 + i * 3.5 && f >= B) {
      // esperando en el suelo
    }
    if (y > -200) people.push(tinyMan(`p${i}`, x, y, 0.62, {arms: f >= EARTH_LAND ? 1 : 0.2, rot}));
  }

  const proPose = tween<Pose>(
    f,
    [
      {at: B, v: P.stand},
      {at: 120, v: P.pointUpRight},
      {at: 196, v: P.scared},
      {at: EARTH_LAND + 8, v: P.laugh},
    ],
    P.stand,
  );
  const laughing = f >= EARTH_LAND + 8;
  const zoom = tw(f, [
    [B, 1.3],
    [B, 1.0, 'snap'],
    [135, 1.06, 'soft'],
    [190, 1.0, 'soft'],
    [EARTH_LAND, 1.06, 'snap'],
    [232, 0.98, 'soft'],
  ]);
  const camX = tw(f, [
    [B, 540],
    [135, 450, 'soft'],
    [190, 560, 'soft'],
    [232, 540, 'soft'],
  ]);
  const camY = tw(f, [
    [B, 900],
    [135, 860, 'soft'],
    [190, 780, 'soft'],
    [232, 880, 'soft'],
  ]);
  const bb = boil(f, 3);
  const st = {stroke: C.ink, strokeWidth: 10, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const bowl = (p: number[], k: string) => (
    <g>
      <path d={`M${p[0] - 150},${p[1]} L${p[0]},${p[1] - STRING + jit(k + bb, 1)} L${p[0] + 150},${p[1]}`} fill="none" {...st} strokeWidth={5} />
      <path d={`M${p[0] - 165},${p[1]} Q${p[0]},${p[1] + 90} ${p[0] + 165},${p[1]} Z`} fill="#fff" {...st} />
    </g>
  );
  return (
    <SceneFrame
      frame={f}
      cam={{x: camX, y: camY, zoom}}
      shake={shakeAt(f, [{at: EARTH_LAND, amp: 34, dur: 18}])}
      screen={<Flash frame={f} at={B} dur={5} />}
    >
      <Ground frame={f} y={1310} x0={-300} x1={1380} />
      {/* Poste y base */}
      <path d={`M${PIVOT.x - 150},1312 L${PIVOT.x - 40},1230 L${PIVOT.x + 40},1230 L${PIVOT.x + 150},1312 Z`} fill={C.grayLight} {...st} />
      <path d={wobblyLine(PIVOT.x, 1232, PIVOT.x, PIVOT.y, f, 'post', 1.5)} fill="none" {...st} strokeWidth={22} />
      {/* Brazo de la balanza */}
      <path d={wobblyLine(le[0], le[1], re[0], re[1], f, 'beam', 1.5)} fill="none" {...st} strokeWidth={20} />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={26} fill={C.yellow} {...st} strokeWidth={8} />
      {/* Aguja indicadora */}
      <path d={`M${PIVOT.x},${PIVOT.y} L${PIVOT.x + Math.sin(rad(theta)) * 120},${PIVOT.y - Math.cos(rad(theta)) * 120}`} {...st} strokeWidth={8} stroke={C.red} />
      {bowl(lp, 'l')}
      {bowl(rp, 'r')}
      {people}
      <EarthBall frame={f} x={rp[0]} y={earthY} r={ER} face={f < EARTH_LAND ? 'smug' : 'happy'} rot={f < EARTH_LAND ? f * 3 : 0} />
      <Dust frame={f} x={rp[0]} y={rp[1] - 10} start={EARTH_LAND} scale={1.2} spread={200} />
      <Tag frame={f} x={lp[0]} y={lp[1] + 110} text="≈ 500 millones t" start={150} size={34} rot={-4} />
      <Tag frame={f} x={Math.min(rp[0], 880)} y={rp[1] + 110} text="≈ 6.000 trillones t" start={EARTH_LAND + 6} size={34} rot={3} fill={C.blueLight} />
      {f >= EARTH_LAND && f < EARTH_LAND + 26 && <SpeedLines frame={f} x0={0} x1={500} y0={-200} y1={900} dir="up" count={14} seed="fly" />}
      <Stickman
        frame={f}
        x={540}
        y={1312}
        scale={1.12}
        pose={proPose}
        lift={laughing ? Math.abs(Math.sin(f * 0.45)) * 18 : 0}
        cap
        eyes={laughing ? 'happy' : f >= 196 ? 'wide' : 'dot'}
        mouth={laughing ? 'laugh' : f >= 196 ? 'scream' : 'smile'}
        brows={f >= 196 && !laughing ? 'up' : 'none'}
        look={f < 196 ? [-0.6, -0.8] : [0.6, -0.8]}
        seed={7}
      />
      <Ono frame={f} text="¡PUM!" x={rp[0] - 40} y={rp[1] - 330} start={EARTH_LAND} size={160} rot={10} />
      <EmojiFloat frame={f} kind="laugh" x={250} y={1180} start={EARTH_LAND + 14} dur={70} size={150} drift={-70} />
      <Ono frame={f} text="¡JA JA!" x={330} y={960} start={EARTH_LAND + 40} size={84} rot={-10} burst={false} fill="#fff" dur={46} />
    </SceneFrame>
  );
};

export {step};
