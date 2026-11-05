import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Arrow, EmojiFloat, Flash, FocusLines, PopText, Tag} from '../components/Effects';
import {Ground, SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, headWorld, tinyMan} from '../components/Stickman';
import {C, FONT_MAIN, boil, clamp, jit, pop, ramp, rnd, shakeAt, smoothPath, tw, tween, wobblyLine} from '../lib/anim';

const MAP = {x: 90, y: 300, w: 900, h: 600};
const CONTINENTS: [number, number][][] = [
  [[120, 110], [230, 80], [330, 100], [350, 170], [290, 230], [250, 300], [200, 280], [150, 220], [100, 170]],
  [[260, 320], [320, 330], [350, 380], [320, 470], [290, 545], [268, 480], [250, 390]],
  [[440, 110], [500, 90], [540, 120], [520, 170], [470, 180], [440, 150]],
  [[450, 210], [540, 200], [590, 260], [570, 350], [530, 450], [500, 440], [480, 340], [440, 280]],
  [[545, 90], [680, 70], [800, 110], [825, 190], [760, 250], [700, 285], [640, 250], [585, 200], [555, 150]],
  [[720, 380], [800, 370], [830, 420], [790, 462], [730, 450]],
];
const PIN = {x: MAP.x + 610, y: MAP.y + 225};

/* Ciudad vista desde arriba */
const CITY = {x: 540, y: 700, rx: 430, ry: 390};
const cityR = (a: number) => 1 + 0.07 * Math.sin(3 * a + 1) + 0.05 * Math.cos(5 * a);
const cityPts: [number, number][] = [...Array(24)].map((_, i) => {
  const a = (i / 24) * Math.PI * 2;
  return [CITY.x + Math.cos(a) * CITY.rx * cityR(a), CITY.y + Math.sin(a) * CITY.ry * cityR(a)];
});
const PEOPLE: {x: number; y: number; d: number; i: number}[] = (() => {
  const out: {x: number; y: number; d: number; i: number}[] = [];
  let i = 0;
  for (let gy = CITY.y - CITY.ry * 1.1; gy < CITY.y + CITY.ry * 1.1; gy += 21) {
    const row = Math.round(gy);
    for (let gx = CITY.x - CITY.rx * 1.1 + ((row / 21) % 2) * 12; gx < CITY.x + CITY.rx * 1.1; gx += 24) {
      const dx = (gx - CITY.x) / CITY.rx;
      const dy = (gy - CITY.y) / CITY.ry;
      const a = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy) / cityR(a);
      if (d < 0.94) out.push({x: gx + jit(`px${i}`, 4), y: gy + jit(`py${i}`, 3), d, i: i++});
    }
  }
  return out.sort((a, b) => a.y - b.y);
})();
const BUILDINGS: {x: number; y: number; w: number; h: number; t: number}[] = (() => {
  const out: {x: number; y: number; w: number; h: number; t: number}[] = [];
  let k = 0;
  for (let by = CITY.y - CITY.ry; by < CITY.y + CITY.ry; by += 92) {
    for (let bx = CITY.x - CITY.rx; bx < CITY.x + CITY.rx; bx += 92) {
      const cx = bx + 46;
      const cy = by + 46;
      const dx = (cx - CITY.x) / CITY.rx;
      const dy = (cy - CITY.y) / CITY.ry;
      if (Math.hypot(dx, dy) / cityR(Math.atan2(dy, dx)) > 0.85) continue;
      const w = 40 + rnd(`bw${k}`) * 26;
      const h = 34 + rnd(`bh${k}`) * 26;
      out.push({x: cx - w / 2, y: cy - h / 2, w, h, t: 8 + rnd(`bt${k}`) * 16});
      k++;
    }
  }
  return out;
})();

export const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  const CUT = 125; // corte a la ciudad (19.2 s) SFX: swoosh

  if (f < CUT) {
    /* ===== Parte A: el mapa que se desenrolla ===== */
    const u = clamp(pop(f, 10, {damping: 14, stiffness: 90, mass: 0.9}), 0, 1.04);
    const rollX = MAP.x + MAP.w * Math.min(1, u);
    const zoom = tw(f, [
      [0, 0.95],
      [50, 1.04, 'soft'],
      [104, 4.2, 'in', 21],
    ]);
    const camX = tw(f, [
      [0, 540],
      [104, PIN.x, 'ease', 16],
    ]);
    const camY = tw(f, [
      [0, 790],
      [104, PIN.y, 'ease', 16],
    ]);
    const pose = tween<Pose>(
      f,
      [
        {at: 0, v: P.holdMap},
        {at: 40, v: P.pointUpRight},
      ],
      P.stand,
    );
    const b = boil(f, 3);
    const dots: React.ReactNode[] = [];
    for (let i = 0; i < 46; i++) {
      const c = CONTINENTS[i % CONTINENTS.length];
      const p = c[Math.floor(rnd(`dp${i}`) * c.length)];
      const cxs = c.reduce((s, q) => s + q[0], 0) / c.length;
      const cys = c.reduce((s, q) => s + q[1], 0) / c.length;
      const sx = MAP.x + (p[0] + cxs) / 2 + jit(`dx${i}`, 14);
      const sy = MAP.y + (p[1] + cys) / 2 + jit(`dy${i}`, 14);
      const k = ramp(f, 55 + (i % 10) * 2, 92 + (i % 10) * 2);
      const x = sx + (PIN.x - sx) * k;
      const y = sy + (PIN.y - sy) * k + Math.sin(k * Math.PI) * -30;
      if (f > 40 && rollX > sx) dots.push(<circle key={i} cx={x} cy={y} r={6} fill={C.ink} />);
    }
    return (
      <SceneFrame
        frame={f}
        cam={{x: camX, y: camY, zoom}}
        shake={shakeAt(f, [{at: 96, amp: 10, dur: 10}])}
        screen={<>{f >= 104 && <FocusLines frame={f} inner={380} opacity={ramp(f, 104, 110)} />}</>}
      >
        <Ground frame={f} y={1210} x0={-300} x1={1380} />
        <clipPath id="mapclip">
          <rect x={MAP.x - 10} y={MAP.y - 20} width={rollX - MAP.x + 10} height={MAP.h + 40} />
        </clipPath>
        <g clipPath="url(#mapclip)">
          <rect x={MAP.x + 12} y={MAP.y + 12} width={MAP.w} height={MAP.h} rx={10} fill={C.ink} />
          <rect x={MAP.x} y={MAP.y} width={MAP.w} height={MAP.h} rx={10} fill={C.blueLight} stroke={C.ink} strokeWidth={9} />
          {[1, 2, 3, 4].map((k) => (
            <path key={k} d={`M${MAP.x},${MAP.y + (k * MAP.h) / 5} L${MAP.x + MAP.w},${MAP.y + (k * MAP.h) / 5}`} stroke={C.blue} strokeWidth={2} strokeDasharray="10 12" opacity={0.6} />
          ))}
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <path key={k} d={`M${MAP.x + (k * MAP.w) / 7},${MAP.y} L${MAP.x + (k * MAP.w) / 7},${MAP.y + MAP.h}`} stroke={C.blue} strokeWidth={2} strokeDasharray="10 12" opacity={0.6} />
          ))}
          {CONTINENTS.map((c, i) => (
            <path
              key={i}
              d={smoothPath(c.map(([x, y], j) => [MAP.x + x + jit(`c${i}${j}${b}`, 1.2), MAP.y + y + jit(`cy${i}${j}${b}`, 1.2)] as [number, number]))}
              fill="#FFF8E6"
              stroke={C.ink}
              strokeWidth={6}
              strokeLinejoin="round"
            />
          ))}
          {[...Array(6)].map((_, k) => (
            <path key={k} d={`M${MAP.x + 60 + k * 140},${MAP.y + 520 - (k % 2) * 160} q14,-10 28,0 t28,0`} stroke={C.blue} strokeWidth={4} fill="none" strokeLinecap="round" />
          ))}
          {dots}
          {/* Flechas convergiendo */}
          {f > 52 &&
            [
              [MAP.x + 230, MAP.y + 170, -6],
              [MAP.x + 300, MAP.y + 430, -40],
              [MAP.x + 500, MAP.y + 360, -60],
              [MAP.x + 780, MAP.y + 420, -130],
              [MAP.x + 760, MAP.y + 130, 160],
            ].map(([x, y, a], i) => <Arrow key={i} x={x} y={y} len={110 * ramp(f, 52 + i * 3, 66 + i * 3)} angle={a} frame={f} width={7} seed={`ma${i}`} />)}
        </g>
        {/* Pin rojo que cae */}
        {f >= 88 && (
          <g transform={`translate(${PIN.x} ${PIN.y - (1 - pop(f, 88, {damping: 8, stiffness: 200, mass: 0.6})) * 300})`}>
            <path d="M0,0 C-10,-30 -34,-44 -34,-70 A34,34 0 1,1 34,-70 C34,-44 10,-30 0,0Z" fill={C.red} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
            <circle cx={0} cy={-70} r={12} fill="#fff" stroke={C.ink} strokeWidth={5} />
          </g>
        )}
        {/* Rollo del mapa */}
        {u < 1.02 && (
          <g>
            <rect x={rollX - 28} y={MAP.y - 30} width={56} height={MAP.h + 60} rx={28} fill="#FFF8E6" stroke={C.ink} strokeWidth={9} />
            {[0, 1, 2].map((k) => (
              <path key={k} d={wobblyLine(rollX - 12 + k * 12, MAP.y - 10, rollX - 12 + k * 12, MAP.y + MAP.h + 10, f, `roll${k}`, 1, 120)} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.4} />
            ))}
          </g>
        )}
        <PopText frame={f} text="¡AQUÍ!" x={PIN.x + 110} y={PIN.y - 120} start={92} size={46} fill={C.red} stroke="#fff" rot={8} />
        <Stickman frame={f} x={170} y={1210} scale={1.1} pose={pose} cap eyes="dot" mouth="smile" look={[0.8, -0.6]} seed={7} />
      </SceneFrame>
    );
  }

  /* ===== Parte B: la ciudad que se llena ===== */
  const SPREAD0 = 175; // SFX: murmullo de multitud creciendo (20.8 s → 23.3 s)
  const SPREAD1 = 250;
  const SURPRISE = 262; // SFX: "¡Uooh!" / efecto mente explotando @ 23.7 s
  const proPose = tween<Pose>(
    f,
    [
      {at: CUT, v: P.stand},
      {at: 150, v: P.pointUpRight},
      {at: SURPRISE, v: P.scared, e: 'snap'},
    ],
    P.stand,
  );
  const pro = {x: 915, y: 1235, scale: 0.95, pose: proPose};
  const hw = headWorld(pro);
  const zoom = tw(f, [
    [CUT, 1.8],
    [CUT, 1.0, 'soft'],
    [180, 1.06, 'linear', 70],
    [272, 1.75, 'snap'],
    [318, 0.96, 'soft'],
  ]);
  const camX = tw(f, [
    [CUT, 540],
    [180, 520, 'linear', 70],
    [272, hw[0] - 60, 'snap'],
    [318, 560, 'soft'],
  ]);
  const camY = tw(f, [
    [CUT, 700],
    [180, 790, 'linear', 70],
    [272, hw[1] + 40, 'snap'],
    [318, 820, 'soft'],
  ]);
  const grow = ramp(f, SPREAD0, SPREAD1);
  const b = boil(f, 3);
  const men: React.ReactNode[] = [];
  for (const p of PEOPLE) {
    const t0 = SPREAD0 + p.d * (SPREAD1 - SPREAD0);
    if (f < t0) continue;
    const s = pop(f, t0, {damping: 9, stiffness: 240, mass: 0.5}) * 0.2;
    men.push(tinyMan(p.i, p.x, p.y + 10, s, {arms: (p.i + Math.floor(f / 6)) % 9 === 0 ? 1 : 0}));
  }
  const blobPts = cityPts.map(([x, y], i) => {
    const k = grow * 1.02;
    return [CITY.x + (x - CITY.x) * k + jit(`bl${i}${b}`, 3), CITY.y + (y - CITY.y) * k + jit(`bly${i}${b}`, 3)] as [number, number];
  });
  return (
    <SceneFrame
      frame={f}
      cam={{x: camX, y: camY, zoom, rot: tw(f, [[CUT, 0], [272, -3, 'snap'], [318, 0, 'soft']])}}
      shake={shakeAt(f, [{at: SURPRISE, amp: 14, dur: 12}])}
      screen={<Flash frame={f} at={CUT} dur={6} />}
    >
      <clipPath id="cityclip">
        <path d={smoothPath(cityPts)} />
      </clipPath>
      <path d={smoothPath(cityPts.map(([x, y]) => [x + 12, y + 12]))} fill={C.ink} />
      <path d={smoothPath(cityPts)} fill="#F6F4EE" />
      <g clipPath="url(#cityclip)">
        {/* Río */}
        <path d={`M${CITY.x - 500},${CITY.y + 260} C${CITY.x - 200},${CITY.y + 120} ${CITY.x + 60},${CITY.y + 380} ${CITY.x + 500},${CITY.y + 200}`} stroke={C.blue} strokeWidth={40} fill="none" opacity={0.7} />
        {/* Calles */}
        {[...Array(11)].map((_, k) => (
          <path key={`h${k}`} d={wobblyLine(CITY.x - 500, CITY.y - CITY.ry + k * 92 - 4, CITY.x + 500, CITY.y - CITY.ry + k * 92 - 4, f, `st${k}`, 1, 140)} stroke={C.gray} strokeWidth={5} fill="none" />
        ))}
        {[...Array(11)].map((_, k) => (
          <path key={`v${k}`} d={wobblyLine(CITY.x - CITY.rx + k * 92 - 4, CITY.y - 500, CITY.x - CITY.rx + k * 92 - 4, CITY.y + 500, f, `sv${k}`, 1, 140)} stroke={C.gray} strokeWidth={5} fill="none" />
        ))}
        {/* Edificios */}
        {BUILDINGS.map((bd, k) => (
          <g key={k}>
            <path d={`M${bd.x},${bd.y} l${bd.t},${-bd.t} l${bd.w},0 l0,${bd.h} l${-bd.t},${bd.t} Z`} fill={C.gray} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
            <rect x={bd.x} y={bd.y} width={bd.w} height={bd.h} fill="#fff" stroke={C.ink} strokeWidth={3.5} />
            <path d={`M${bd.x + 8},${bd.y + bd.h / 2} L${bd.x + bd.w - 8},${bd.y + bd.h / 2}`} stroke={C.grayDark} strokeWidth={3} strokeDasharray="6 6" />
          </g>
        ))}
        {/* La mancha de gente */}
        {grow > 0 && <path d={smoothPath(blobPts)} fill={C.ink} opacity={0.16} />}
        {men}
      </g>
      <path d={smoothPath(cityPts)} fill="none" stroke={C.red} strokeWidth={8} strokeDasharray="22 16" strokeDashoffset={-f * 2} />
      <Tag frame={f} x={CITY.x - 120} y={CITY.y - CITY.ry - 40} text="UNA CIUDAD GRANDE" start={150} size={36} rot={-4} color={C.red} />
      <Tag frame={f} x={CITY.x + 40} y={CITY.y + CITY.ry + 10} text="≈ 2.000 km²" start={SPREAD1 + 4} size={52} rot={3} fill={C.yellow} />
      <PopText frame={f} text="8.000.000.000" x={CITY.x} y={CITY.y - 20} start={SPREAD1 - 10} size={70} fill="#fff" stroke={C.ink} rot={-6} />
      <Ground frame={f} y={1235} x0={780} x1={1060} seed="g3" />
      <Stickman
        frame={f}
        {...pro}
        cap
        eyes={f >= SURPRISE ? 'wide' : 'dot'}
        mouth={f >= SURPRISE ? 'scream' : 'smile'}
        brows={f >= SURPRISE ? 'up' : 'none'}
        look={f >= SURPRISE ? [0, 0] : [-0.8, -0.6]}
        seed={7}
      />
      {f >= SURPRISE && f < SURPRISE + 40 && (
        <g stroke={C.ink} strokeWidth={6} strokeLinecap="round">
          {[...Array(8)].map((_, k) => {
            const a = -Math.PI / 2 + (k - 3.5) * 0.32;
            const r0 = 70 + (f - SURPRISE) * 2;
            return <path key={k} d={`M${hw[0] + Math.cos(a) * r0},${hw[1] + Math.sin(a) * r0} l${Math.cos(a) * 30},${Math.sin(a) * 30}`} />;
          })}
        </g>
      )}
      <EmojiFloat frame={f} kind="mind" x={hw[0] - 170} y={hw[1] - 90} start={SURPRISE + 4} dur={70} size={150} drift={-120} />
    </SceneFrame>
  );
};
