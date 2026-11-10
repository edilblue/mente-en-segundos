import React from 'react';
import {rgba, clamp, sampleSpline, along, smoothPath} from './lib';

// Corazón anatómico estilizado en vista anterior (lienzo 600×760; ápex abajo a la derecha del espectador).
// Latido: las aurículas se contraen un instante antes que los ventrículos (fase desplazada),
// los ventrículos se acortan hacia la base y los grandes vasos se dilatan con la eyección.

const VENTRICLES = 'M168,318 C140,380 138,470 170,548 C205,630 290,700 392,724 C430,733 462,716 480,680 C512,612 538,520 544,438 C548,380 530,334 500,306 C450,286 380,282 320,290 C260,296 206,300 168,318 Z';
const RIGHT_ATRIUM = 'M178,330 C130,322 96,282 98,232 C100,188 134,160 176,166 C214,172 236,206 236,248 C236,290 214,326 178,330 Z';
const RIGHT_AURICLE = 'M228,226 C250,206 284,212 292,236 C298,258 278,272 258,268 C244,265 234,250 228,226 Z';
const LEFT_AURICLE = 'M488,300 C512,270 552,268 566,292 C578,316 556,338 528,336 C508,334 494,320 488,300 Z';
const AORTA = [[318, 300], [304, 220], [312, 150], [360, 104], [430, 98], [480, 130], [494, 196], [494, 260]] as [number, number][];
const PULM = [[392, 352], [400, 270], [416, 206], [452, 178]] as [number, number][];
const PULM_L = [[452, 178], [510, 172], [568, 186]] as [number, number][];
const PULM_R = [[420, 196], [370, 196], [300, 200]] as [number, number][];
const SVC = [[196, 190], [196, 120], [200, 40]] as [number, number][];
const BRANCHES: [number, number][][] = [
  [[338, 128], [330, 70], [326, 10]],
  [[392, 104], [394, 50], [398, 0]],
  [[446, 108], [462, 56], [480, 4]],
];
const LAD = [[392, 300], [404, 380], [414, 470], [418, 560], [424, 640], [420, 700]] as [number, number][];
const RCA = [[300, 298], [250, 340], [198, 410], [182, 480], [200, 560]] as [number, number][];
const DIAG = [[408, 400], [460, 440], [500, 500]] as [number, number][];
const DIAG2 = [[414, 500], [462, 560], [480, 620]] as [number, number][];
const MARG = [[188, 470], [240, 520], [290, 600]] as [number, number][];
const VEIN = [[440, 320], [452, 420], [470, 520], [478, 600]] as [number, number][];

export const Heart: React.FC<{
  t: number;
  phase: number; // fase del latido (en latidos)
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  glow?: number;
  flow?: number;
  yaw?: number;
  opacity?: number;
  hue?: 'real' | 'holo';
}> = ({t, phase, x = 540, y = 960, scale = 1, rot = -12, glow = 0.6, flow = 1, yaw = 0, opacity = 1, hue = 'real'}) => {
  const p = phase - Math.floor(phase);
  const atr = Math.exp(-Math.pow((p - 0.02) / 0.06, 2)) + Math.exp(-Math.pow((p - 1.02) / 0.06, 2));
  const ven = Math.exp(-Math.pow((p - 0.16) / 0.07, 2)) * 1 + Math.exp(-Math.pow((p - 0.34) / 0.05, 2)) * 0.35;
  const vs = 1 - 0.075 * ven;
  const as = 1 - 0.09 * atr;
  const vessel = 1 + 0.06 * ven;
  const id = 'ht';
  const holo = hue === 'holo';
  const red = holo ? '#ff5a8a' : '#d8283f';
  const mid = holo ? '#b0306a' : '#9e1530';
  const dark = holo ? '#3a0a3a' : '#3d0612';
  const blue = holo ? '#6a6aff' : '#5b4fb8';
  const fibers = React.useMemo(() => {
    const out: string[] = [];
    for (let k = 0; k < 16; k++) {
      const u = k / 15;
      out.push(
        smoothPath([
          [170 + u * 40, 330 + u * 10],
          [210 + u * 70, 430 + u * 40],
          [270 + u * 90, 560 + u * 30],
          [360 + u * 60, 680 - u * 40],
        ]),
      );
    }
    return out;
  }, []);
  const tube = (pts: [number, number][], w: number, c1: string, c2: string, key: string) => {
    const d = smoothPath(pts);
    return (
      <g key={key}>
        <path d={d} stroke={c2} strokeWidth={w * vessel + 6} fill="none" strokeLinecap="round" />
        <path d={d} stroke={c1} strokeWidth={w * vessel} fill="none" strokeLinecap="round" />
        <path d={d} stroke={rgba('#ffffff', 0.28)} strokeWidth={w * 0.22} fill="none" strokeLinecap="round" transform={`translate(${-w * 0.18},${-w * 0.12})`} />
      </g>
    );
  };
  const flowDots = (pts: [number, number][], n: number, speed: number, color: string, key: string, rad = 5) => {
    const s = sampleSpline(pts, 30);
    return (
      <g key={key}>
        {Array.from({length: n}, (_, k) => {
          const u = (t * speed * (0.6 + ven * 1.5) + k / n) % 1;
          const [px, py] = along(s, u);
          return <circle key={k} cx={px} cy={py} r={rad} fill={color} opacity={flow * 0.85 * Math.sin(u * Math.PI)} />;
        })}
      </g>
    );
  };
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${scale * Math.cos(yaw * 0.5)},${scale}) translate(-330,-400)`} opacity={opacity}>
      <defs>
        <radialGradient id={`${id}v`} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0%" stopColor={holo ? '#ff9ac0' : '#ff6a6a'} />
          <stop offset="35%" stopColor={red} />
          <stop offset="75%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${id}a`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0%" stopColor={holo ? '#ff8fb5' : '#e2525e'} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0%" stopColor={holo ? '#ff6aa0' : '#ff3355'} stopOpacity={0.55} />
          <stop offset="100%" stopColor="#ff3355" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}spec`}>
          <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}clip`}>
          <path d={VENTRICLES} />
        </clipPath>
      </defs>
      <ellipse cx={330} cy={440} rx={420 + 60 * ven} ry={460 + 60 * ven} fill={`url(#${id}g)`} opacity={glow * (0.6 + 0.6 * ven)} />
      {/* vasos posteriores */}
      {tube(PULM_R, 50, blue, '#1d1440', 'pr')}
      {tube(SVC, 62, blue, '#1d1440', 'svc')}
      {BRANCHES.map((b, i) => tube(b, 30, red, dark, 'b' + i))}
      {tube(AORTA, 82, red, dark, 'ao')}
      {flowDots(AORTA, 10, 0.6, '#ffd0d0', 'fa', 6)}
      {/* aurículas */}
      <g transform={`translate(176,250) scale(${as}) translate(-176,-250)`}>
        <path d={RIGHT_ATRIUM} fill={`url(#${id}a)`} stroke={dark} strokeWidth={3} />
        <path d={RIGHT_AURICLE} fill={`url(#${id}a)`} stroke={dark} strokeWidth={2} />
      </g>
      <g transform={`translate(520,304) scale(${as}) translate(-520,-304)`}>
        <path d={LEFT_AURICLE} fill={`url(#${id}a)`} stroke={dark} strokeWidth={2} />
      </g>
      {/* ventrículos (se acortan hacia la base durante la sístole) */}
      <g transform={`translate(340,300) scale(${1 - 0.05 * ven},${vs}) translate(-340,-300)`}>
        <path d={VENTRICLES} fill={`url(#${id}v)`} />
        <g clipPath={`url(#${id}clip)`}>
          {fibers.map((d, i) => (
            <path key={i} d={d} stroke={rgba('#000000', 0.12)} strokeWidth={5} fill="none" />
          ))}
          {fibers.map((d, i) => (
            <path key={'f' + i} d={d} stroke={rgba('#ffffff', 0.06)} strokeWidth={2} fill="none" transform="translate(-4,-3)" />
          ))}
          {/* grasa epicárdica en los surcos */}
          <path d={smoothPath(LAD)} stroke={rgba('#f7d58a', 0.45)} strokeWidth={30} fill="none" strokeLinecap="round" />
          <path d={smoothPath(RCA)} stroke={rgba('#f7d58a', 0.4)} strokeWidth={26} fill="none" strokeLinecap="round" />
          {[LAD, RCA, DIAG, DIAG2, MARG].map((P, i) => (
            <g key={'c' + i}>
              <path d={smoothPath(P)} stroke={dark} strokeWidth={i < 2 ? 12 : 8} fill="none" strokeLinecap="round" />
              <path d={smoothPath(P)} stroke={holo ? '#ff7aa8' : '#ff3b4e'} strokeWidth={i < 2 ? 8 : 5} fill="none" strokeLinecap="round" />
            </g>
          ))}
          <path d={smoothPath(VEIN)} stroke={blue} strokeWidth={7} fill="none" strokeLinecap="round" />
          {flowDots(LAD, 6, 0.8, '#ffe0e0', 'fl', 3)}
          {/* sombra de volumen y luz especular */}
          <path d={VENTRICLES} fill="none" stroke={rgba('#000000', 0.45)} strokeWidth={70} transform="translate(18,14)" />
          <ellipse cx={270} cy={410} rx={70} ry={110} fill={`url(#${id}spec)`} transform="rotate(-25 270 410)" opacity={0.7 + 0.3 * ven} />
        </g>
        <path d={VENTRICLES} fill="none" stroke={holo ? rgba('#ffb3d0', 0.9) : rgba('#ff9a9a', 0.3)} strokeWidth={2} />
      </g>
      {tube(PULM, 74, holo ? blue : '#4a3fa6', '#1d1440', 'pt')}
      {tube(PULM_L, 54, blue, '#1d1440', 'pl')}
      {flowDots([...PULM, ...PULM_L.slice(1)], 8, 0.55, '#c8c8ff', 'fp', 5)}
      {/* borde de luz */}
      <path d={VENTRICLES} fill="none" stroke={rgba(holo ? '#ffd0e4' : '#ffb0a0', 0.05 + 0.25 * ven * glow)} strokeWidth={10} />
    </g>
  );
};

export const ECG: React.FC<{t: number; phase: number; x: number; y: number; w: number; h: number; color?: string; opacity?: number; history?: number}> = ({
  t,
  phase,
  x,
  y,
  w,
  h,
  color = '#5dffb0',
  opacity = 1,
  history = 2.5,
}) => {
  // trazo PQRST desplazándose: muestreamos la fase pasada
  const n = 160;
  const pts: [number, number][] = [];
  const shape = (p: number) => {
    p = p - Math.floor(p);
    return (
      0.12 * Math.exp(-Math.pow((p - 0.9) / 0.03, 2)) -
      0.12 * Math.exp(-Math.pow((p - 0.975) / 0.008, 2)) +
      1 * Math.exp(-Math.pow((p - 0.995) / 0.008, 2)) -
      0.25 * Math.exp(-Math.pow((p - 0.015) / 0.01, 2)) +
      0.25 * Math.exp(-Math.pow((p - 0.2) / 0.05, 2))
    );
  };
  for (let i = 0; i <= n; i++) {
    const back = history * (1 - i / n);
    pts.push([x + (i / n) * w, y - shape(phase - back) * h]);
  }
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('');
  const last = pts[pts.length - 1];
  return (
    <g opacity={opacity}>
      <path d={d} stroke={rgba(color, 0.25)} strokeWidth={14} fill="none" strokeLinejoin="round" />
      <path d={d} stroke={color} strokeWidth={4} fill="none" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={9} fill="#fff" opacity={0.9 + 0.1 * Math.sin(t)} />
      <circle cx={last[0]} cy={last[1]} r={22} fill={color} opacity={0.25} />
    </g>
  );
};
export const clampN = clamp;
