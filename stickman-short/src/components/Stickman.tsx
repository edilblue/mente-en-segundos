import React from 'react';
import {C, boil, jit, rad} from '../lib/anim';

/**
 * Rig del stickman. Todos los ángulos en grados; 0 = apuntando hacia abajo,
 * positivo = gira hacia la derecha de la pantalla.
 *  torso: inclinación del torso      head: giro de la cabeza
 *  ls/le: hombro/codo izquierdo      rs/re: hombro/codo derecho
 *  lh/lk: cadera/rodilla izquierda   rh/rk: cadera/rodilla derecha
 * Codo y rodilla son relativos al segmento anterior.
 */
export type Pose = {
  torso: number;
  head: number;
  ls: number;
  le: number;
  rs: number;
  re: number;
  lh: number;
  lk: number;
  rh: number;
  rk: number;
};

export const P = {
  stand: {torso: 0, head: 0, ls: -14, le: -8, rs: 14, re: 8, lh: -8, lk: 2, rh: 8, rk: -2},
  crouch: {torso: 0, head: 0, ls: -38, le: -30, rs: 38, re: 30, lh: -62, lk: 98, rh: 62, rk: -98},
  halfCrouch: {torso: 0, head: 0, ls: -30, le: -20, rs: 30, re: 20, lh: -38, lk: 60, rh: 38, rk: -60},
  jump: {torso: 0, head: 0, ls: -165, le: -6, rs: 165, re: 6, lh: -6, lk: 2, rh: 6, rk: -2},
  fall: {torso: 0, head: 0, ls: -150, le: 35, rs: 150, re: -35, lh: -18, lk: 25, rh: 18, rk: -25},
  pointUpRight: {torso: 0, head: 6, ls: -16, le: -10, rs: 128, re: 4, lh: -8, lk: 2, rh: 8, rk: -2},
  pointRight: {torso: 0, head: 6, ls: -16, le: -10, rs: 94, re: 0, lh: -8, lk: 2, rh: 8, rk: -2},
  pointDown: {torso: 0, head: 10, ls: -16, le: -10, rs: 40, re: -14, lh: -8, lk: 2, rh: 8, rk: -2},
  scratch: {torso: -3, head: 10, ls: -14, le: -8, rs: 135, re: 55, lh: -8, lk: 2, rh: 8, rk: -2},
  coverEars: {torso: 0, head: 0, ls: -120, le: -70, rs: 120, re: 70, lh: -14, lk: 18, rh: 14, rk: -18},
  laugh: {torso: 0, head: -8, ls: -25, le: 105, rs: 25, re: -105, lh: -10, lk: 4, rh: 10, rk: -4},
  scared: {torso: 0, head: 0, ls: -140, le: -40, rs: 140, re: 40, lh: -16, lk: 14, rh: 16, rk: -14},
  float: {torso: 0, head: 0, ls: -100, le: -25, rs: 100, re: 25, lh: -20, lk: 28, rh: 24, rk: -12},
  armsWide: {torso: 0, head: 0, ls: -110, le: 12, rs: 110, re: -12, lh: -10, lk: 2, rh: 10, rk: -2},
  holdMap: {torso: 0, head: 0, ls: -78, le: -18, rs: 78, re: 18, lh: -10, lk: 2, rh: 10, rk: -2},
  magnifier: {torso: 4, head: 8, ls: -18, le: -12, rs: 72, re: 30, lh: -10, lk: 2, rh: 10, rk: -2},
  shrug: {torso: 0, head: 8, ls: -55, le: -85, rs: 55, re: 85, lh: -8, lk: 2, rh: 8, rk: -2},
  wave: {torso: 0, head: 6, ls: -14, le: -8, rs: 140, re: 20, lh: -8, lk: 2, rh: 8, rk: -2},
  cheer: {torso: 0, head: 0, ls: -150, le: 10, rs: 150, re: -10, lh: -10, lk: 2, rh: 10, rk: -2},
  dizzy: {torso: 6, head: 14, ls: -40, le: 20, rs: 40, re: -20, lh: -14, lk: 10, rh: 14, rk: -10},
  wipe: {torso: 0, head: -6, ls: -14, le: -8, rs: 150, re: 85, lh: -8, lk: 2, rh: 8, rk: -2},
} satisfies Record<string, Pose>;

/** Pose de caminar (frente a cámara) a partir de una fase en radianes. */
export const walkPose = (ph: number, lean = 0): Pose => {
  const s = Math.sin(ph);
  return {
    torso: lean,
    head: -lean * 0.5,
    ls: -18 + s * 28,
    le: -14,
    rs: 18 + s * 28,
    re: 14,
    lh: -6 - s * 24,
    lk: Math.max(0, s) * 30,
    rh: 6 - s * 24,
    rk: -Math.max(0, -s) * 30,
  };
};

export type Eyes = 'dot' | 'wide' | 'happy' | 'closed' | 'squint' | 'x' | 'flat' | 'spiral' | 'determined';
export type Mouth = 'smile' | 'grin' | 'o' | 'scream' | 'flat' | 'frown' | 'wavy' | 'laugh' | 'smirk' | 'none';
export type Brows = 'none' | 'up' | 'angry' | 'worried' | 'raised';

const L = {torso: 95, ua: 50, fa: 48, th: 56, sh: 56, r: 38, neck: 8};

type V = [number, number];
const dir = (a: number): V => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: V, d: V, l: number): V => [p[0] + d[0] * l, p[1] + d[1] * l];

/** Calcula las articulaciones con los pies apoyados en y=0. */
export function rig(p: Pose) {
  const hip: V = [0, 0];
  const td = dir(p.torso);
  const top: V = [hip[0] - td[0] * L.torso, hip[1] - td[1] * L.torso];
  const sh: V = add(top, td, 10);
  const lE = add(sh, dir(p.torso + p.ls), L.ua);
  const lH = add(lE, dir(p.torso + p.ls + p.le), L.fa);
  const rE = add(sh, dir(p.torso + p.rs), L.ua);
  const rH = add(rE, dir(p.torso + p.rs + p.re), L.fa);
  const lK = add(hip, dir(p.lh), L.th);
  const lF = add(lK, dir(p.lh + p.lk), L.sh);
  const rK = add(hip, dir(p.rh), L.th);
  const rF = add(rK, dir(p.rh + p.rk), L.sh);
  const hd = dir(p.torso + p.head);
  const head: V = [top[0] - hd[0] * (L.neck + L.r), top[1] - hd[1] * (L.neck + L.r)];
  const ground = Math.max(lF[1], rF[1]) + 3;
  const s = (v: V): V => [v[0], v[1] - ground];
  return {
    hip: s(hip),
    top: s(top),
    sh: s(sh),
    lE: s(lE),
    lH: s(lH),
    rE: s(rE),
    rH: s(rH),
    lK: s(lK),
    lF: s(lF),
    rK: s(rK),
    rF: s(rF),
    head: s(head),
    headAngle: p.torso + p.head,
    rForearm: p.torso + p.rs + p.re,
    lForearm: p.torso + p.ls + p.le,
  };
}

export type StickProps = {
  frame: number;
  x: number;
  y: number; // suelo (posición de los pies)
  scale?: number;
  pose: Pose;
  lift?: number; // altura sobre el suelo (px de pantalla)
  squash?: number; // escala vertical (squash & stretch), 1 = normal
  rot?: number; // rotación de todo el cuerpo
  eyes?: Eyes;
  mouth?: Mouth;
  brows?: Brows;
  look?: [number, number];
  cap?: boolean;
  helmet?: boolean;
  seed?: number;
  lite?: boolean; // versión ligera para multitudes
  sweat?: boolean;
  stroke?: string;
  opacity?: number;
  dashed?: boolean;
  rightHand?: (hx: number, hy: number, angle: number) => React.ReactNode;
};

/** Posición en mundo de la mano derecha (para sujetar objetos). */
export function handWorld(p: Pick<StickProps, 'x' | 'y' | 'scale' | 'lift' | 'pose'>, side: 'r' | 'l' = 'r'): V {
  const r = rig(p.pose);
  const h = side === 'r' ? r.rH : r.lH;
  const s = p.scale ?? 1;
  return [p.x + h[0] * s, p.y - (p.lift ?? 0) + h[1] * s];
}

export function headWorld(p: Pick<StickProps, 'x' | 'y' | 'scale' | 'lift' | 'pose'>): V {
  const r = rig(p.pose);
  const s = p.scale ?? 1;
  return [p.x + r.head[0] * s, p.y - (p.lift ?? 0) + r.head[1] * s];
}

const Face: React.FC<{
  eyes: Eyes;
  mouth: Mouth;
  brows: Brows;
  look: [number, number];
  blink: number;
  ink: string;
  frame: number;
}> = ({eyes, mouth, brows, look, blink, ink, frame}) => {
  const lx = look[0] * 6;
  const ly = look[1] * 5;
  const eye = (ex: number) => {
    const cx = ex + lx;
    const cy = -3 + ly;
    switch (eyes) {
      case 'dot':
      case 'determined':
        return <ellipse key={ex} cx={cx} cy={cy} rx={5.5} ry={7 * blink} fill={ink} />;
      case 'wide':
        return (
          <g key={ex}>
            <circle cx={ex} cy={-4} r={11} fill="#fff" stroke={ink} strokeWidth={3.5} />
            <ellipse cx={ex + lx * 0.8} cy={-4 + ly * 0.8} rx={4.5} ry={4.5 * Math.max(0.3, blink)} fill={ink} />
          </g>
        );
      case 'happy':
        return <path key={ex} d={`M${ex - 8},${-1} Q${ex},${-12} ${ex + 8},${-1}`} stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      case 'closed':
        return <path key={ex} d={`M${ex - 7},${-2} Q${ex},${3} ${ex + 7},${-2}`} stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      case 'squint': {
        const s = ex < 0 ? 1 : -1;
        return (
          <path
            key={ex}
            d={`M${ex - 7 * s},${-9} L${ex + 6 * s},${-3} L${ex - 7 * s},${3}`}
            stroke={ink}
            strokeWidth={4.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      }
      case 'x':
        return (
          <path key={ex} d={`M${ex - 6},${-9} L${ex + 6},${3} M${ex + 6},${-9} L${ex - 6},${3}`} stroke={ink} strokeWidth={4.5} strokeLinecap="round" />
        );
      case 'flat':
        return (
          <g key={ex}>
            <path d={`M${cx - 6},${-3} A6,6 0 0,0 ${cx + 6},${-3} Z`} fill={ink} />
            <path d={`M${ex - 9},${-4} L${ex + 9},${-4}`} stroke={ink} strokeWidth={4} strokeLinecap="round" />
          </g>
        );
      case 'spiral': {
        const a0 = frame * 0.5 * (ex < 0 ? 1 : -1);
        let d = '';
        for (let i = 0; i <= 18; i++) {
          const a = a0 + i * 0.7;
          const r = 1 + i * 0.5;
          d += `${i === 0 ? 'M' : 'L'}${(ex + Math.cos(a) * r).toFixed(1)},${(-3 + Math.sin(a) * r).toFixed(1)}`;
        }
        return <path key={ex} d={d} stroke={ink} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
      }
    }
  };
  let mouthEl: React.ReactNode = null;
  switch (mouth) {
    case 'smile':
      mouthEl = <path d="M-12,14 Q0,25 12,14" stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      break;
    case 'grin':
      mouthEl = <path d="M-14,12 Q0,32 14,12 Z" fill={ink} stroke={ink} strokeWidth={3} strokeLinejoin="round" />;
      break;
    case 'laugh':
      mouthEl = (
        <g>
          <path d="M-17,9 L17,9 Q0,40 -17,9 Z" fill={ink} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
          <path d="M-8,24 Q0,18 8,24 Q0,30 -8,24Z" fill={C.red} />
        </g>
      );
      break;
    case 'o':
      mouthEl = <ellipse cx={0} cy={19} rx={6} ry={8} fill={ink} />;
      break;
    case 'scream':
      mouthEl = <ellipse cx={0} cy={20} rx={11} ry={15} fill={ink} />;
      break;
    case 'flat':
      mouthEl = <path d="M-11,18 L11,18" stroke={ink} strokeWidth={4.5} strokeLinecap="round" />;
      break;
    case 'frown':
      mouthEl = <path d="M-11,22 Q0,12 11,22" stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      break;
    case 'wavy':
      mouthEl = <path d="M-14,18 L-7,13 L0,19 L7,13 L14,18" stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      break;
    case 'smirk':
      mouthEl = <path d="M-10,18 Q4,20 12,11" stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      break;
    case 'none':
      break;
  }
  let browEl: React.ReactNode = null;
  const bw = {stroke: ink, strokeWidth: 4, fill: 'none', strokeLinecap: 'round' as const};
  switch (brows) {
    case 'up':
      browEl = <path d="M-20,-22 Q-13,-29 -6,-23 M6,-23 Q13,-29 20,-22" {...bw} />;
      break;
    case 'angry':
      browEl = <path d="M-20,-20 L-6,-13 M6,-13 L20,-20" {...bw} />;
      break;
    case 'worried':
      browEl = <path d="M-20,-14 L-7,-21 M7,-21 L20,-14" {...bw} />;
      break;
    case 'raised':
      browEl = <path d="M-20,-16 L-6,-16 M6,-24 Q13,-31 20,-24" {...bw} />;
      break;
    case 'none':
      break;
  }
  return (
    <g>
      {eye(-13)}
      {eye(13)}
      {browEl}
      {mouthEl}
    </g>
  );
};

export const Stickman: React.FC<StickProps> = (props) => {
  const {
    frame,
    x,
    y,
    scale = 1,
    pose,
    lift = 0,
    squash = 1,
    rot = 0,
    eyes = 'dot',
    mouth = 'smile',
    brows = 'none',
    look = [0, 0],
    cap = false,
    helmet = false,
    seed = 1,
    lite = false,
    sweat = false,
    stroke = C.ink,
    opacity = 1,
    dashed = false,
  } = props;
  const r = rig(pose);
  const b = boil(frame, 3);
  // Boiling line: cada articulación vibra un poco cada 3 frames.
  const amp = lite ? 0 : 1.3;
  const J = (v: V, n: string): string => `${(v[0] + jit(`${seed}${n}${b}a`, amp)).toFixed(1)},${(v[1] + jit(`${seed}${n}${b}b`, amp)).toFixed(1)}`;
  const sw = 10;
  const sx = 1 / Math.pow(squash, 0.6);
  // Parpadeo periódico
  const bp = (frame + seed * 37) % 96;
  const blink = bp < 2 ? 0.12 : bp < 4 ? 0.5 : 1;
  const wob = lite ? [jit(`${seed}w${b}`, 1.2), jit(`${seed}v${b}`, 1.2)] : [0, 0];
  const line = {
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
    strokeDasharray: dashed ? '2 16' : undefined,
  };
  const legs = `M${J(r.lF, 'lf')} L${J(r.lK, 'lk')} L${J(r.hip, 'h')} L${J(r.rK, 'rk')} L${J(r.rF, 'rf')}`;
  const torso = `M${J(r.hip, 'h')} L${J(r.top, 't')}`;
  const arms = `M${J(r.lH, 'lh')} L${J(r.lE, 'le')} L${J(r.sh, 's')} L${J(r.rE, 're')} L${J(r.rH, 'rh')}`;
  const hx = r.head[0] + jit(`${seed}hx${b}`, amp * 0.8);
  const hy = r.head[1] + jit(`${seed}hy${b}`, amp * 0.8);
  const ink = stroke;
  return (
    <g transform={`translate(${x + wob[0]} ${y - lift + wob[1]}) scale(${scale})`} opacity={opacity}>
      <g transform={`rotate(${rot} 0 -130)`}>
        <g transform={`scale(${sx} ${squash})`}>
          <path d={legs} {...line} />
          <path d={torso} {...line} />
          <g transform={`translate(${hx} ${hy}) rotate(${r.headAngle})`}>
            {helmet && <circle cx={0} cy={-6} r={62} fill={C.blueLight} fillOpacity={0.55} stroke={ink} strokeWidth={6} />}
            <circle cx={0} cy={0} r={38} fill={dashed ? 'none' : '#fff'} stroke={ink} strokeWidth={sw} strokeDasharray={dashed ? '2 16' : undefined} strokeLinecap="round" />
            {cap && (
              <g>
                <path d="M-40,-13 C-42,-62 42,-62 40,-13 Q0,-24 -40,-13Z" fill={C.red} stroke={ink} strokeWidth={7} strokeLinejoin="round" />
                <path d="M28,-19 Q60,-23 78,-10 Q72,0 34,-7Z" fill={C.red} stroke={ink} strokeWidth={7} strokeLinejoin="round" />
                <circle cx={0} cy={-49} r={5} fill={ink} />
                <path d="M-22,-40 Q-14,-48 -4,-50" stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.8} />
              </g>
            )}
            {!dashed && (
              <Face
                eyes={lite ? (eyes === 'dot' || eyes === 'wide' || eyes === 'happy' || eyes === 'x' || eyes === 'closed' ? eyes : 'dot') : eyes}
                mouth={mouth}
                brows={lite ? 'none' : brows}
                look={look}
                blink={blink}
                ink={ink}
                frame={frame}
              />
            )}
            {sweat && (
              <path d="M44,-30 Q52,-16 46,-10 Q38,-12 44,-30Z" fill={C.blue} stroke={ink} strokeWidth={2.5} />
            )}
            {helmet && <path d="M-40,-44 Q-28,-60 -8,-63" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.9} />}
          </g>
          <path d={arms} {...line} />
          {props.rightHand && props.rightHand(r.rH[0], r.rH[1], r.rForearm)}
        </g>
      </g>
    </g>
  );
};

/** Muñeco diminuto (1 path + cabeza) para multitudes de cientos/miles. */
export const tinyMan = (
  key: string | number,
  x: number,
  y: number,
  s: number,
  opts: {crouch?: number; arms?: number; lift?: number; phase?: number; rot?: number; ink?: string; sq?: number; eyes?: boolean} = {},
) => {
  const {crouch = 0, arms = 0, lift = 0, phase = 0, rot = 0, ink = C.ink, sq = 1, eyes = false} = opts;
  const legH = 40 - crouch * 14;
  const sp = 10 + crouch * 8;
  const sw = Math.sin(phase) * 8;
  const armY = -legH - 30;
  const ay = 20 - arms * 52;
  const d = `M${-sp + sw},0 L0,${-legH} L${sp - sw},0 M0,${-legH} L0,${-legH - 42} M${-22},${armY + ay} L0,${armY} L22,${armY + ay}`;
  return (
    <g key={key} transform={`translate(${x.toFixed(1)} ${(y - lift).toFixed(1)}) scale(${(s / Math.pow(sq, 0.6)).toFixed(3)} ${(s * sq).toFixed(3)}) rotate(${rot} 0 -50)`}>
      <path d={d} stroke={ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={0} cy={-legH - 58} r={16} fill="#fff" stroke={ink} strokeWidth={8} />
      {eyes && <path d={`M-5,${-legH - 60} l0,1 M5,${-legH - 60} l0,1`} stroke={ink} strokeWidth={5} strokeLinecap="round" />}
    </g>
  );
};
