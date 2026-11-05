import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Dust, FocusLines, Ono, SpeedLines} from '../components/Effects';
import {SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, tinyMan} from '../components/Stickman';
import {C, FONT_COMIC, FONT_MAIN, boil, jit, pop, ramp, rnd, shakeAt, smoothPath, step, tw, tween, wobblyLine} from '../lib/anim';

/** Momentos clave (frames locales; la escena empieza en 27.0 s). */
export const S4 = {
  N3: 9, // SFX: conteo "3" @ 27.3 s
  N2: 48, // SFX: conteo "2" @ 28.6 s
  N1: 87, // SFX: conteo "1" @ 29.9 s
  GO: 126, // SFX: "¡SALTEN!" + multitud @ 31.2 s
  LAUNCH: 146, // SFX: "¡BOING!" @ 31.87 s
  PEAK: 168, // IMPACT FRAME @ 32.6 s (frames globales 978-979)
  SLOW_END: 255, // fin de la cámara lenta @ 35.5 s
  LAND: 277, // SFX: golpe "¡PUM!" + polvo @ 36.23 s
};

const ROWS = [
  {y: 860, s: 0.5, n: 20},
  {y: 935, s: 0.62, n: 17},
  {y: 1015, s: 0.76, n: 14},
  {y: 1105, s: 0.92, n: 11},
  {y: 1210, s: 1.1, n: 8},
];

const BigCount: React.FC<{f: number; text: string; at: number; size?: number; dur?: number}> = ({f, text, at, size = 560, dur = 36}) => {
  const t = f - at;
  if (t < 0 || t > dur) return null;
  const s = pop(f, at, {damping: 7, stiffness: 200, mass: 0.7}) * (1 - ramp(f, at + dur - 6, at + dur));
  const r = Math.sin(t * 0.8) * 8 * Math.exp(-t / 12) - 4;
  return (
    <g transform={`translate(540 ${500}) rotate(${r}) scale(${s})`}>
      <text x={14} y={18} textAnchor="middle" dominantBaseline="central" fontFamily={FONT_COMIC} fontSize={size} fill={C.ink} stroke={C.ink} strokeWidth={size * 0.12} strokeLinejoin="round">
        {text}
      </text>
      <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT_COMIC} fontSize={size} fill={C.yellow} stroke={C.ink} strokeWidth={size * 0.08} strokeLinejoin="round" paintOrder="stroke">
        {text}
      </text>
    </g>
  );
};

export const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  const {N3, N2, N1, GO, LAUNCH, PEAK, SLOW_END, LAND} = S4;

  // Altura del salto normalizada (0 suelo → 1 punto más alto)
  const jumpK = tw(f, [
    [0, 0],
    [LAUNCH, 1, 'out', PEAK - LAUNCH],
    [PEAK, 1.07, 'linear', SLOW_END - PEAK], // cámara lenta: casi no se mueven
    [SLOW_END, 0, 'in', LAND - SLOW_END],
    [LAND, 0, 'linear', 1],
  ]);
  const crouchK = tw(f, [
    [0, 0],
    [GO, 1, 'snap'],
    [LAUNCH, 0, 'linear', 4],
    [LAND, 1, 'linear', 2],
    [LAND + 10, 0, 'spring'],
  ]);
  const squash = tw(f, [
    [0, 1],
    [GO, 0.8, 'snap'],
    [LAUNCH, 1.35, 'linear', 3],
    [LAUNCH + 4, 1.0, 'soft'],
    [SLOW_END + 6, 1.18, 'linear', LAND - SLOW_END - 6],
    [LAND, 0.58, 'linear', 1],
    [LAND + 2, 1, 'snap'],
  ]);
  const airborne = f >= LAUNCH && f < LAND;
  const slow = f >= PEAK && f < SLOW_END;
  const armsUp = airborne ? (slow ? 0.75 + 0.25 * Math.sin(f * 0.12) : 1) : f >= LAND + 40 && f < LAND + 90 ? 1 : 0;

  // Multitud
  const crowd: React.ReactNode[] = [];
  ROWS.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const x = (1080 / row.n) * (i + 0.5) + jit(`rx${ri}${i}`, 18) + (ri % 2) * 14;
      if (ri === 4 && Math.abs(x - 540) < 150) continue; // hueco para Stickman Pro
      const delay = rnd(`rd${ri}${i}`) * 3;
      const ownK = slow ? jumpK + Math.sin(f * 0.1 + i) * 0.02 : jumpK;
      const lift = ownK * 420 * row.s;
      const nerv = f < GO ? Math.max(0, Math.sin((f + i * 5 + ri * 3) * 0.35)) * 5 : 0;
      const rot = slow ? Math.sin(f * 0.06 + i * 2) * 10 : f >= LAND && f < LAND + 30 ? jit(`rr${ri}${i}`, 10) * (1 - (f - LAND) / 30) : 0;
      crowd.push(
        tinyMan(`${ri}-${i}`, x, row.y, row.s, {
          crouch: crouchK,
          arms: airborne ? armsUp : f < GO && (i + ri) % 4 === 0 ? 0.3 + 0.3 * Math.sin(f * 0.3 + i) : armsUp,
          lift: lift + nerv + (delay && airborne && !slow ? -delay * 4 : 0),
          sq: squash,
          rot,
          eyes: ri >= 3,
        }),
      );
    }
    if (ri === 3) crowd.push(<g key="sep" />);
  });

  // Stickman Pro
  const proPose = tween<Pose>(
    f,
    [
      {at: 0, v: P.stand},
      {at: N3 - 4, v: P.halfCrouch},
      {at: N1 + 10, v: P.stand},
      {at: GO, v: P.crouch, e: 'snap'},
      {at: LAUNCH, v: P.jump, e: 'snap'},
      {at: PEAK + 4, v: P.float, e: 'soft'},
      {at: SLOW_END, v: P.fall},
      {at: LAND, v: P.crouch, e: 'snap'},
      {at: LAND + 14, v: P.stand},
      {at: LAND + 40, v: P.cheer},
      {at: LAND + 80, v: P.wipe},
    ],
    P.stand,
  );
  const proLift = jumpK * 520;
  const eyes = step(f, [
    [0, 'dot'],
    [N3, 'determined'],
    [LAUNCH, 'happy'],
    [SLOW_END, 'wide'],
    [LAND, 'squint'],
    [LAND + 14, 'happy'],
  ] as const);
  const mouth = step(f, [
    [0, 'smile'],
    [N3, 'flat'],
    [GO, 'grin'],
    [LAUNCH, 'laugh'],
    [SLOW_END, 'scream'],
    [LAND, 'wavy'],
    [LAND + 14, 'grin'],
  ] as const);
  const brows = step(f, [
    [0, 'none'],
    [N3, 'angry'],
    [LAUNCH, 'none'],
    [SLOW_END, 'up'],
    [LAND + 14, 'none'],
  ] as const);

  // Cámara
  const zoom = tw(f, [
    [0, 0.98],
    [N3, 1.06, 'snap'],
    [N2, 1.13, 'snap'],
    [N1, 1.21, 'snap'],
    [GO, 1.0, 'snap'],
    [PEAK, 1.0],
    [PEAK + 2, 1.2, 'linear', SLOW_END - PEAK - 2],
    [SLOW_END, 1.0, 'ease', 20],
    [LAND, 1.12, 'snap'],
    [LAND + 20, 0.96, 'linear', 90],
  ]);
  const camY = tw(f, [
    [0, 980],
    [LAUNCH, 760, 'out', PEAK - LAUNCH],
    [PEAK, 730, 'linear', SLOW_END - PEAK],
    [SLOW_END, 980, 'in', LAND - SLOW_END],
  ]);
  const camRot = tw(f, [
    [0, 0],
    [PEAK + 2, -4, 'linear', 2],
    [PEAK + 4, 3, 'linear', SLOW_END - PEAK - 4],
    [SLOW_END, 0, 'ease', 16],
  ]);
  const shake = shakeAt(f, [
    {at: N3, amp: 10, dur: 8},
    {at: N2, amp: 12, dur: 8},
    {at: N1, amp: 14, dur: 8},
    {at: GO, amp: 8, dur: LAUNCH - GO},
    {at: GO + 6, amp: 8, dur: LAUNCH - GO - 6},
    {at: LAUNCH, amp: 18, dur: 10},
    {at: LAND, amp: 40, dur: 24},
  ]);
  const b = boil(f, 3);
  const clouds = [
    [180, 360, 1],
    [820, 300, 0.8],
    [560, 520, 0.6],
  ];

  return (
    <SceneFrame
      frame={f}
      cam={{x: 540, y: camY, zoom, rot: camRot}}
      shake={shake}
      screen={
        <>
          <BigCount f={f} text="3" at={N3} />
          <BigCount f={f} text="2" at={N2} />
          <BigCount f={f} text="1" at={N1} />
          <BigCount f={f} text="¡SALTEN!" at={GO} size={122} dur={LAUNCH - GO + 2} />
          {f >= LAUNCH && f < PEAK && <SpeedLines frame={f} dir="down" count={30} seed="up" />}
          {f >= SLOW_END && f < LAND && <SpeedLines frame={f} dir="up" count={26} seed="dn" />}
          {slow && <FocusLines frame={Math.floor(f / 3)} inner={560} count={50} opacity={0.35} />}
          <Ono frame={f} text="¡BOING!" x={540} y={1180} start={LAUNCH + 1} size={170} rot={-8} dur={30} />
          {slow && (
            <g transform={`translate(240 300) rotate(-6)`}>
              <rect x={-170} y={-44} width={340} height={88} rx={14} fill="#fff" stroke={C.ink} strokeWidth={7} />
              <circle cx={-128} cy={0} r={16} fill={C.red} opacity={Math.floor(f / 8) % 2 ? 1 : 0.25} />
              <text x={14} y={2} textAnchor="middle" dominantBaseline="central" fontFamily={FONT_MAIN} fontSize={42} fill={C.ink}>
                CÁMARA LENTA
              </text>
            </g>
          )}
          <Ono frame={f} text="¡PUM!" x={540} y={560} start={LAND + 1} size={190} rot={6} dur={30} />
        </>
      }
    >
      {/* Cielo con nubes de cuaderno */}
      {clouds.map(([x, y, s], i) => {
        const cx = x + ((f * (0.6 + i * 0.3)) % 200) - 100;
        return (
          <path
            key={i}
            transform={`translate(${cx} ${y}) scale(${s})`}
            d={smoothPath([[-110, 20], [-120, -20], [-70, -50], [-20, -70], [40, -60], [90, -40], [120, 0], [100, 30]].map(([px, py], k) => [px + jit(`cl${i}${k}${b}`, 2), py + jit(`cly${i}${k}${b}`, 2)] as [number, number]))}
            fill="#fff"
            stroke={C.ink}
            strokeWidth={6}
          />
        );
      })}
      <path d={wobblyLine(-300, 830, 1380, 830, f, 'horizon', 2)} stroke={C.ink} strokeWidth={7} fill="none" />
      {[...Array(14)].map((_, i) => (
        <path key={i} d={`M${60 + i * 75 + jit(`gr${i}`, 20)},${1250 + jit(`gry${i}`, 60)} l8,-16 l8,16`} stroke={C.ink} strokeWidth={4} fill="none" opacity={0.35} strokeLinecap="round" />
      ))}
      {crowd}
      {/* Polvo al aterrizar */}
      {ROWS.map((row, ri) =>
        [0, 1, 2].map((k) => <Dust key={`${ri}${k}`} frame={f} x={160 + k * 380 + ri * 20} y={row.y} start={LAND} scale={row.s * 1.2} spread={260} seed={`d4${ri}${k}`} dur={34} />),
      )}
      <Dust frame={f} x={540} y={1295} start={LAND} scale={1.8} count={10} spread={360} seed="dpro" dur={38} />
      {/* Partículas flotando en cámara lenta */}
      {slow &&
        [...Array(24)].map((_, i) => (
          <circle key={i} cx={rnd(`pp${i}`) * 1080 + Math.sin(f * 0.05 + i) * 20} cy={500 + rnd(`ppy${i}`) * 800 - (f - PEAK) * 0.6} r={4 + rnd(`ppr${i}`) * 6} fill={C.ink} opacity={0.35} />
        ))}
      <Stickman
        frame={f}
        x={540}
        y={1295}
        scale={1.3}
        pose={proPose}
        lift={proLift}
        squash={squash}
        cap
        eyes={eyes}
        mouth={mouth}
        brows={brows}
        sweat={f >= N2 && f < GO}
        rot={slow ? Math.sin(f * 0.07) * 6 : 0}
        seed={7}
      />
    </SceneFrame>
  );
};
