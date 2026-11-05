// Escena 7 — El gran salto: cuenta regresiva, todos saltan, impact frame, cámara lenta, ¡SPLASH! y aterrizaje.
import React from 'react';
import {Ant, Cow, Elephant, Kangaroo, Whale} from '../animals';
import {ComicText, Dust, EmojiFloat, Ground, Onomatopeya, SpeedLines, Stage} from '../components/fx';
import {POSES, Stickman, blinkAt, mixPose} from '../components/Stickman';
import {C, FPS, clamp, ease, iv, rnd, shake, sp} from '../lib';
import {Word, scene, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

const RISE = 0.62;
const SLOW = 2.6; // cámara lenta
const FALL = 0.45;

export const beats7 = (dur: number, w: Word[]) => {
  const [n3, n2, n1, go] = ordered([wt(w, 'tres', 0.35), wt(w, 'dos', 1.2), wt(w, 'uno', 2.0), wt(w, 'salten', 2.9)], 0.45);
  const apex = go + RISE;
  const land = Math.min(dur - 2.2, apex + SLOW + FALL);
  return {n3, n2, n1, go, crouch: go - 0.35, apex, slowEnd: land - FALL, land};
};

/** Frames globales del "impact frame" (2 frames invertidos). */
export const impactFrames = () => {
  const s = scene(7);
  const b = beats7(s.dur, s.words);
  const f = s.from + Math.round(b.apex * FPS);
  return [f, f + 1];
};

/** Altura normalizada del salto (0 suelo, 1 punto más alto) con cámara lenta en el pico. */
const jumpH = (t: number, b: ReturnType<typeof beats7>) => {
  if (t < b.go || t > b.land) return 0;
  if (t < b.apex) return 0.86 * ease.out((t - b.go) / RISE);
  if (t < b.slowEnd) return 0.86 + 0.14 * Math.sin(((t - b.apex) / (b.slowEnd - b.apex)) * Math.PI);
  return 0.86 * (1 - ease.in((t - b.slowEnd) / (b.land - b.slowEnd)));
};

const BACK = 1120;
const WATER_X = 770;
const WATER_Y = 1290;

export const S7: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats7(dur, words);
  const h = jumpH(t, b);
  const air = t > b.go && t < b.land;
  const slow = t > b.apex && t < b.slowEnd;
  const crouching = t > b.crouch && t < b.go;
  const landK = t > b.land ? Math.exp(-(t - b.land) * 6) * Math.cos((t - b.land) * 20) : 0;
  const squash = crouching ? 0.25 : air ? (t < b.apex ? -0.22 * (1 - (t - b.go) / RISE) : 0) : 0.3 * landK;
  const pose = air
    ? t < b.apex
      ? POSES.jump
      : t < b.slowEnd
        ? mixPose(POSES.jump, POSES.tuck, clamp((t - b.apex) / 0.6))
        : POSES.jump
    : crouching
      ? POSES.crouch
      : t > b.land + 0.6
        ? POSES.open
        : t > b.land
          ? POSES.crouch
          : POSES.stand;
  const face = (seed: number) => ({
    look: (air ? [0, -0.8] : t > b.land ? [0, 0.2] : [0.2, -0.6]) as [number, number],
    blink: crouching ? 0.6 : blinkAt(t, seed),
    mouth: (air ? 'grin' : t > b.land ? 'open' : crouching ? 'flat' : 'smile') as 'grin',
    brow: (crouching ? 'angry' : air ? 'up' : 'none') as 'up',
    eyeScale: t > b.land && t < b.land + 1 ? 1.25 : 1,
  });

  // Cuenta regresiva
  const numbers: [string, number, number, string][] = [
    ['3', b.n3, b.n2, '#fff'],
    ['2', b.n2, b.n1, '#fff'],
    ['1', b.n1, b.go, C.yellow],
  ];
  const zoom = slow ? 1.08 : iv(t, [b.go, b.apex], [1, 1.08]) * (t > b.land ? iv(t, [b.land, b.land + 0.6], [1.08, 1]) / 1.08 : 1);
  const camY = -h * 140; // la cámara sube un poco con ellos

  // Ballena: sale del océano con un arco más alto
  const wLift = -95 + h * 760;
  const wRot = air ? iv(t, [b.go, b.land], [-25, 30]) : 0;

  return (
    <Stage shake={shake(t, b.land, 1.3, 30)} zoom={zoom} zx={540} zy={900}>
      <g transform={`translate(0,${-camY * 0.5})`}>
        {/* fila de fondo: humanos y el elefante (que no puede) */}
        <Ground y={BACK} x1={60} x2={WATER_X - 20} sw={5} />
        {[150, 260, 370, 480].map((x, i) => (
          <Stickman key={x} x={x} ground={BACK} scale={0.42} sw={16} pose={pose} lift={h * 300 * (0.9 + rnd(i) * 0.2)} squash={squash} face={face(i + 3)} />
        ))}
        <Elephant x={640} y={BACK} s={0.42} ears={air ? 0.6 + Math.sin(t * 20) * 0.4 : 0} squash={crouching ? 0.12 : 0} trunk={t * 2} look={air ? [0, -1] : [0, 0.2]} blink={blinkAt(t, 7)} mouth={air ? 'wavy' : t > b.land ? 'flat' : 'smile'} />
        {/* océano y ballena */}
        <Whale x={925} y={WATER_Y + 150} s={0.74} flip lift={air ? wLift + 95 : Math.sin(t * 2) * 8} rot={wRot} t={t} look={air ? [0, -0.5] : [0.4, 0]} blink={blinkAt(t, 8)} mouth={air ? 'grin' : 'smile'} spout={!air && t < b.go ? iv((t * 0.7) % 1, [0, 0.3, 1], [0, 1, 0]) : 0} />
        {/* océano: relleno suave y solo la superficie con trazo */}
        <path
          d={`M${WATER_X},${WATER_Y} ${Array.from({length: 9}, (_, i) => `Q${WATER_X + i * 40 + 20},${WATER_Y - 16 * Math.sin(t * 4 + i)} ${WATER_X + (i + 1) * 40},${WATER_Y}`).join(' ')} L1100,${WATER_Y} L1100,1900 L${WATER_X},1900 Z`}
          fill={C.water}
          opacity={0.85}
        />
        <path
          d={`M${WATER_X},${WATER_Y} ${Array.from({length: 9}, (_, i) => `Q${WATER_X + i * 40 + 20},${WATER_Y - 16 * Math.sin(t * 4 + i)} ${WATER_X + (i + 1) * 40},${WATER_Y}`).join(' ')}`}
          fill="none"
          stroke={C.ink}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${WATER_X + 60 + i * 90 + Math.sin(t * 2 + i) * 20},${WATER_Y + 70 + i * 55} q20,-12 40,0 q20,12 40,0`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        ))}
        <Ground y={GROUND} x1={30} x2={WATER_X} />
        {/* fila delantera */}
        {[60, 115, 165].map((x, i) => (
          <Ant key={x} x={x} y={GROUND} s={0.85} lift={h * 330} squash={squash} legsUp={air ? 0.7 : 0} look={face(i).look} blink={blinkAt(t, i)} mouth={air ? 'grin' : 'smile'} />
        ))}
        <Cow x={265} y={GROUND} s={0.55} lift={h * 360} squash={squash} look={face(1).look} blink={blinkAt(t, 2)} mouth={air ? 'open' : 'smile'} />
        <SpeedLines t={t} x={470} y={GROUND - h * 430 + 40} w={260} h={300} n={10} seed={2} opacity={t > b.go && t < b.apex + 0.1 ? 1 : 0} />
        <Stickman x={470} ground={GROUND} scale={0.86} pose={pose} lift={h * 430} squash={squash} cap face={face(0)} />
        <Kangaroo x={640} y={GROUND} s={0.6} lift={h * 520} squash={squash} ext={air ? 1 : 0} look={face(4).look} blink={blinkAt(t, 4)} mouth={air ? 'grin' : 'smile'} />
        {/* polvo gigante al aterrizar — SFX: pum + multitud */}
        {[90, 270, 470, 640].map((x, i) => (
          <Dust key={x} t={t} at={b.land + i * 0.03} x={x} y={GROUND} size={2.1} dur={1.5} />
        ))}
        {/* gotas del splash */}
        {t > b.land && t < b.land + 1.4 &&
          Array.from({length: 14}, (_, i) => {
            const u = (t - b.land) / 1.4;
            const vx = (rnd(i) - 0.5) * 520;
            const vy = 500 + rnd(i + 9) * 600;
            return <circle key={i} cx={930 + vx * u} cy={WATER_Y - vy * u + 900 * u * u} r={18 + rnd(i * 3) * 18} fill={C.water} stroke={C.ink} strokeWidth={5} opacity={1 - u} />;
          })}
      </g>
      {/* cámara lenta: líneas flotando */}
      {slow && <SpeedLines t={t * 0.25} x={540} y={700} w={1000} h={900} n={8} seed={9} opacity={0.22} sw={5} />}
      {slow && (
        <g transform={`translate(110,${300 + 0})`} opacity={Math.floor(t * 3) % 2 ? 1 : 0.6}>
          <circle cx={0} cy={0} r={16} fill={C.red} />
          <ComicText x={30} y={2} size={50} fill="#fff" anchor="start" sw={6}>
            CÁMARA LENTA
          </ComicText>
        </g>
      )}
      {/* SFX: conteo (3, 2, 1) */}
      {numbers.map(([n, a, z, col]) =>
        t > a && t < z ? (
          <g key={n} transform={`translate(540,560) scale(${sp(t, a, {damping: 7, stiffness: 200}) * iv(t, [z - 0.12, z], [1, 0.4])}) rotate(${(Number(n) - 2) * 6})`}>
            <ComicText x={0} y={0} size={460} fill={col}>
              {n}
            </ComicText>
          </g>
        ) : null,
      )}
      {/* SFX: multitud gritando "¡salten!" */}
      <Onomatopeya t={t} at={b.go} text="¡SALTEN!" x={540} y={520} burst={C.red} color={C.yellow} size={170} rot={-6} dur={RISE + 0.3} />
      {/* SFX: boing — en el punto más alto */}
      <Onomatopeya t={t} at={b.apex + 0.1} text="¡BOING!" x={600} y={480} burst={C.yellow} color="#fff" size={160} rot={-8} dur={SLOW - 0.3} />
      {/* SFX: splash — cae la ballena */}
      <Onomatopeya t={t} at={b.land} text="¡SPLASH!" x={830} y={830} burst={null} color={C.blueLight} size={140} rot={10} dur={1.5} />
      <Onomatopeya t={t} at={b.land + 0.05} text="¡PUM!" x={280} y={760} burst={C.yellow} color="#fff" size={150} rot={-12} dur={1.2} />
      <EmojiFloat t={t} at={b.land + 0.7} e="🤯" x={560} y={760} dur={dur - b.land - 0.8} size={1.25} />
    </Stage>
  );
};
