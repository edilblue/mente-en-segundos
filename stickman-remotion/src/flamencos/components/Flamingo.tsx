import React from 'react';
import {P, mix, rnd} from '../lib';

/** Relleno con "pintura" que sube (o baja) por el cuerpo: from → to según level 0..1. */
export type Paint = {from: string; to: string; level: number; dir?: 'up' | 'down'; soft?: number};

const PaintGrad: React.FC<{id: string; paint: Paint; y0: number; y1: number}> = ({id, paint, y0, y1}) => {
  const soft = paint.soft ?? 0.06;
  const up = (paint.dir ?? 'up') === 'up';
  const l = paint.level * (1 + 2 * soft) - soft; // para que 0 y 1 sean colores puros
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} y1={up ? y0 : y1} x2={0} y2={up ? y1 : y0}>
      <stop offset={Math.max(0, l - soft)} stopColor={paint.to} />
      <stop offset={Math.min(1, Math.max(0, l + soft))} stopColor={paint.from} />
    </linearGradient>
  );
};

type Face = {
  look?: [number, number];
  blink?: number;
  lids?: number; // párpados cansados
  brows?: number; // -1 triste · 0 neutro · 1 sorprendido
  bags?: number; // ojeras
  blush?: number;
  tear?: number;
};

/** Ojos expresivos de dibujo animado (dos ojos de frente). */
export const Eyes: React.FC<Face & {cx: number; cy: number; r?: number; skin: string; gap?: number}> = ({
  cx,
  cy,
  r = 17,
  gap = 34,
  look = [0, 0],
  blink = 0,
  lids = 0,
  brows = 0,
  bags = 0,
  blush = 0,
  tear = 0,
  skin,
}) => {
  const eyes = [cx - gap / 2, cx + gap / 2];
  const close = Math.max(blink, lids * 0.55);
  return (
    <g>
      {eyes.map((ex, i) => (
        <g key={i}>
          {bags > 0 && (
            <path d={`M${ex - r},${cy + r * 0.7} Q${ex},${cy + r * 1.9} ${ex + r},${cy + r * 0.7}`} stroke="#5a4870" strokeWidth={6} fill="none" opacity={bags} strokeLinecap="round" />
          )}
          <ellipse cx={ex} cy={cy} rx={r} ry={r * 1.12} fill={P.chalk} />
          <circle cx={ex + look[0] * r * 0.42} cy={cy + look[1] * r * 0.42} r={r * 0.48} fill={P.dark} />
          <circle cx={ex + look[0] * r * 0.42 - r * 0.16} cy={cy + look[1] * r * 0.42 - r * 0.18} r={r * 0.15} fill={P.chalk} />
          {close > 0.01 && <rect x={ex - r - 2} y={cy - r * 1.2 - 2} width={2 * r + 4} height={(2.4 * r + 4) * close} fill={skin} />}
          {close > 0.01 && close < 0.97 && (
            <line x1={ex - r} x2={ex + r} y1={cy - r * 1.2 + 2.4 * r * close} y2={cy - r * 1.2 + 2.4 * r * close} stroke={P.chalk} strokeWidth={4} strokeLinecap="round" />
          )}
          {/* ceja: brows<0 → triste (extremo interior arriba) */}
          <line
            x1={ex - r * 0.9}
            x2={ex + r * 0.9}
            y1={cy - r * 1.75 - Math.max(0, brows) * 10 + (i === 0 ? 0.6 : -1) * Math.max(0, -brows) * 10}
            y2={cy - r * 1.75 - Math.max(0, brows) * 10 + (i === 0 ? -1 : 0.6) * Math.max(0, -brows) * 10}
            stroke={P.chalk}
            strokeWidth={6}
            strokeLinecap="round"
          />
          {blush > 0 && <ellipse cx={ex + (i ? 12 : -12)} cy={cy + r * 1.5} rx={11} ry={6} fill={P.pinkDeep} opacity={blush * 0.8} />}
        </g>
      ))}
      {tear > 0 && <path d={`M${eyes[0] - 6},${cy + r + 4 + tear * 30} q-7,12 0,16 q7,-4 0,-16Z`} fill="#9fd3ff" opacity={Math.min(1, tear * 2)} />}
    </g>
  );
};

/** Pico de flamenco (curvado hacia abajo, punta negra). Origen = base del pico. */
export const Beak: React.FC<{open?: number; base: string; s?: number}> = ({open = 0, base, s = 1}) => (
  <g transform={`scale(${s})`}>
    <g transform={`rotate(${open * 28})`}>
      <path d="M0,10 C20,16 44,22 58,32 C66,40 70,50 70,58 C60,46 46,36 30,30 C18,26 8,24 0,24Z" fill={base} stroke={P.chalk} strokeWidth={4} />
      <path d="M58,32 C66,40 70,50 70,58 C63,50 57,44 50,40Z" fill={P.beakTip} />
    </g>
    <path d="M0,-18 C30,-26 62,-22 80,0 C90,14 88,36 76,60 C72,44 64,30 50,22 C34,14 14,12 0,14Z" fill={base} stroke={P.chalk} strokeWidth={5} strokeLinejoin="round" />
    <path d="M70,-8 C86,8 88,36 76,60 C72,44 66,32 58,24 C64,14 68,4 70,-8Z" fill={P.beakTip} />
    <line x1={8} y1={-2} x2={60} y2={6} stroke={P.dark} strokeWidth={3} opacity={0.35} />
  </g>
);

export type FlamingoProps = Face & {
  id: string;
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  color?: string;
  paint?: Paint;
  sx?: number;
  sy?: number;
  lean?: number;
  bob?: number;
  head?: [number, number]; // desplazamiento de la cabeza
  headRot?: number;
  beakOpen?: number;
  wing?: number; // aleteo 0..1
  legBend?: number; // anticipación 0..1
  xray?: number;
  beakColor?: string;
  inner?: React.ReactNode; // órganos (modo rayos X), en coords del cuerpo (origen = centro del cuerpo)
  innerNeck?: React.ReactNode; // contenido a lo largo del cuello (recibe el path por neckPath)
  overHead?: React.ReactNode; // objetos pegados a la cabeza (origen = centro de la cabeza)
};

export const neckGeom = (bodyY: number, head: [number, number] = [0, 0]) => {
  const B = [-10, bodyY];
  const N0 = [B[0] + 100, B[1] - 50];
  const Hd = [B[0] + 55 + head[0], B[1] - 390 + head[1]];
  const C1 = [N0[0] + 100, N0[1] - 90];
  const C2 = [Hd[0] - 125, Hd[1] + 130];
  const E = [Hd[0], Hd[1] + 30];
  const d = `M${N0[0]},${N0[1]} C${C1[0]},${C1[1]} ${C2[0]},${C2[1]} ${E[0]},${E[1]}`;
  return {B, N0, Hd, d, C1, C2, E};
};

export const Flamingo: React.FC<FlamingoProps> = (p) => {
  const {id, x, y, s = 1, flip = false, sx = 1, sy = 1, lean = 0, bob = 0, head = [0, 0], headRot = 0, beakOpen = 0, wing = 0, legBend = 0, xray = 0} = p;
  const fill = p.paint ? `url(#${id}-g)` : p.color ?? P.pink;
  const skin = p.paint ? (p.paint.level > (p.paint.dir === 'down' ? 0.12 : 0.85) ? p.paint.to : p.paint.from) : p.color ?? P.pink;
  const bodyY = -372 + legBend * 70 + bob;
  const {B, Hd, d: neck} = neckGeom(bodyY, head);
  const J = [10 - legBend * 34, -175 + legBend * 30];
  const Hip = [0, bodyY + 60];
  const fo = 1 - 0.88 * xray; // opacidad del relleno
  const beak = p.beakColor ?? mix('#e2dad6', '#ffd3dd', 0.6);
  const tail = [0, 1, 2].map((i) => `M${B[0] - 120},${B[1] + 8 + i * 10} q-40,${10 + i * 14} -${70 + i * 8},${28 + i * 22}`);
  return (
    <g transform={`translate(${x},${y}) scale(${(flip ? -1 : 1) * s},${s}) rotate(${lean}) scale(${sx},${sy})`}>
      <defs>{p.paint && <PaintGrad id={`${id}-g`} paint={p.paint} y0={0} y1={-860} />}</defs>
      {/* pata (una sola, rodilla hacia atrás) + pie palmeado */}
      <path d={`M${Hip[0]},${Hip[1]} L${J[0]},${J[1]} L0,-8`} stroke={P.chalk} strokeWidth={24} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d={`M${Hip[0]},${Hip[1]} L${J[0]},${J[1]} L0,-8`} stroke={fill} strokeWidth={12} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={fo} />
      <circle cx={J[0]} cy={J[1]} r={11} fill={P.chalk} />
      <path d="M-30,0 L44,0 L10,-16Z" fill={fill} stroke={P.chalk} strokeWidth={6} strokeLinejoin="round" />
      {/* cola */}
      {tail.map((t, i) => (
        <path key={i} d={t} stroke={P.chalk} strokeWidth={8} fill="none" strokeLinecap="round" />
      ))}
      {/* cuerpo ovalado */}
      <ellipse cx={B[0]} cy={B[1]} rx={138} ry={86} transform={`rotate(-10 ${B[0]} ${B[1]})`} fill={fill} fillOpacity={fo} stroke={P.chalk} strokeWidth={8} />
      {/* cuello en S (contorno de tiza + color) */}
      <path d={neck} stroke={P.chalk} strokeWidth={42} fill="none" strokeLinecap="round" />
      <path d={neck} stroke={fill} strokeWidth={28} fill="none" strokeLinecap="round" opacity={fo} />
      {xray > 0 && (
        <g opacity={xray}>
          {p.innerNeck}
          <g transform={`translate(${B[0]},${B[1]})`}>{p.inner}</g>
        </g>
      )}
      {/* ala plegada que aletea */}
      <g transform={`rotate(${-wing * 38} ${B[0] + 60} ${B[1] - 40})`}>
        <path
          d={`M${B[0] + 70},${B[1] - 42} C${B[0] + 10},${B[1] - 70} ${B[0] - 90},${B[1] - 40} ${B[0] - 128},${B[1] + 22} C${B[0] - 60},${B[1] + 14} ${B[0] + 20},${B[1] + 10} ${B[0] + 70},${B[1] - 42}Z`}
          fill={fill}
          fillOpacity={fo}
          stroke={P.chalk}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <path d={`M${B[0] - 20},${B[1] - 30} q-40,22 -80,40 M${B[0] + 20},${B[1] - 30} q-40,22 -90,44`} stroke={P.chalk} strokeWidth={4} fill="none" opacity={0.6} strokeLinecap="round" />
      </g>
      {/* cabeza */}
      <g transform={`rotate(${headRot} ${Hd[0]} ${Hd[1]})`}>
        <circle cx={Hd[0]} cy={Hd[1]} r={54} fill={fill} fillOpacity={xray > 0 ? Math.max(fo, 0.35) : 1} stroke={P.chalk} strokeWidth={8} />
        <g transform={`translate(${Hd[0] + 44},${Hd[1] + 4})`}>
          <Beak open={beakOpen} base={beak} />
        </g>
        <Eyes cx={Hd[0] - 4} cy={Hd[1] - 10} skin={skin} {...p} />
        {p.overHead && <g transform={`translate(${Hd[0]},${Hd[1]})`}>{p.overHead}</g>}
      </g>
    </g>
  );
};

/** Contorno "esponjoso" para la cría. */
const fluff = (cx: number, cy: number, r: number, n: number, amp: number, seed: number) => {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 0.5) / n) * Math.PI * 2;
    const rr = r + amp * (0.6 + rnd(seed + i) * 0.6);
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
    const c = [cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr];
    d += i === 0 ? `M${p0[0]},${p0[1]}` : ` Q${c[0] - Math.cos(a1) * 0},${c[1]} ${p0[0]},${p0[1]}`;
  }
  return d + 'Z';
};

export type ChickProps = Face & {
  id: string;
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  color?: string;
  paint?: Paint;
  sx?: number;
  sy?: number;
  lean?: number;
  headRot?: number;
  beakOpen?: number;
  wobble?: number; // tambaleo de patas (torpe)
  t?: number;
};

/** Cría de flamenco: bola de plumón gris, cabezona, pico recto y patas torpes. */
export const Chick: React.FC<ChickProps> = (p) => {
  const {id, x, y, s = 1, flip = false, sx = 1, sy = 1, lean = 0, headRot = 0, beakOpen = 0, wobble = 0, t = 0} = p;
  const fill = p.paint ? `url(#${id}-g)` : p.color ?? P.gray;
  const skin = p.paint ? (p.paint.level > 0.8 ? p.paint.to : p.paint.from) : p.color ?? P.gray;
  const wl = Math.sin(t * 9) * 10 * wobble;
  const Bd = [0, -175];
  const Hd = [38, -318];
  return (
    <g transform={`translate(${x},${y}) scale(${(flip ? -1 : 1) * s},${s}) rotate(${lean}) scale(${sx},${sy})`}>
      <defs>{p.paint && <PaintGrad id={`${id}-g`} paint={p.paint} y0={0} y1={-390} />}</defs>
      {/* patas torpes (rodillas que tiemblan) */}
      {[-1, 1].map((k) => (
        <g key={k}>
          <path d={`M${k * 28},-100 L${k * 30 + wl * k},-50 L${k * 26},-6`} stroke={P.chalk} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${k * 28},-100 L${k * 30 + wl * k},-50 L${k * 26},-6`} stroke={P.grayDark} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${k * 26 - 24},0 L${k * 26 + 26},0 L${k * 26 + 2},-12Z`} fill={P.grayDark} stroke={P.chalk} strokeWidth={5} strokeLinejoin="round" />
        </g>
      ))}
      {/* cuello corto + cabeza grande */}
      <path d={`M10,-240 Q20,-270 ${Hd[0]},${Hd[1] + 30}`} stroke={P.chalk} strokeWidth={50} strokeLinecap="round" fill="none" />
      <path d={`M10,-240 Q20,-270 ${Hd[0]},${Hd[1] + 30}`} stroke={fill} strokeWidth={36} strokeLinecap="round" fill="none" />
      {/* cuerpo de plumón */}
      <path d={fluff(Bd[0], Bd[1], 96, 16, 16, 3)} fill={fill} stroke={P.chalk} strokeWidth={7} strokeLinejoin="round" />
      {/* alitas */}
      <path d={`M-70,-190 q-46,10 -50,52 q30,-6 52,-24`} fill={fill} stroke={P.chalk} strokeWidth={6} strokeLinejoin="round" transform={`rotate(${Math.sin(t * 7) * 8 * wobble} -70 -190)`} />
      <g transform={`rotate(${headRot} ${Hd[0]} ${Hd[1]})`}>
        <path d={fluff(Hd[0], Hd[1], 66, 12, 9, 9)} fill={fill} stroke={P.chalk} strokeWidth={7} strokeLinejoin="round" />
        {/* copete despeinado */}
        <path d={`M${Hd[0] - 10},${Hd[1] - 72} q-6,-30 14,-34 M${Hd[0] + 6},${Hd[1] - 72} q10,-26 28,-18 M${Hd[0] - 22},${Hd[1] - 68} q-22,-14 -16,-34`} stroke={P.chalk} strokeWidth={6} fill="none" strokeLinecap="round" />
        {/* pico recto de cría */}
        <g transform={`translate(${Hd[0] + 58},${Hd[1] + 8})`}>
          <path d={`M0,2 L50,8 L0,16Z`} fill={P.grayDark} stroke={P.chalk} strokeWidth={5} strokeLinejoin="round" transform={`rotate(${beakOpen * 30})`} />
          <path d="M0,-18 L58,0 L0,6Z" fill={P.grayDark} stroke={P.chalk} strokeWidth={5} strokeLinejoin="round" />
        </g>
        <Eyes cx={Hd[0] + 6} cy={Hd[1] - 8} r={22} gap={46} skin={skin} {...p} />
      </g>
    </g>
  );
};
