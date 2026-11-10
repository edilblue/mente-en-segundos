import React from 'react';
import {W, H, smoothPath, rgba, clamp, sampleSpline, along, rng, lerp} from './lib';
import {PAL} from './fx';
import {Heart} from './Heart';

// Cuerpo holográfico (vista frontal, coordenadas de pantalla 1080×1920).
const HALF: [number, number][] = [
  [540, 180], [612, 196], [652, 250], [660, 330], [646, 410], [610, 468], [598, 520], [640, 548], [742, 576], [800, 620], [822, 700],
  [840, 860], [868, 1040], [892, 1220], [912, 1360], [920, 1430], [900, 1470], [872, 1440], [852, 1360], [818, 1200], [790, 1030],
  [772, 880], [760, 1000], [748, 1160], [760, 1300], [770, 1460], [760, 1700], [700, 1920],
];
const outline = (() => {
  const right = HALF;
  const left = [...HALF].reverse().map(([x, y]) => [1080 - x, y] as [number, number]);
  return smoothPath([...right, ...left.slice(1, -1)], true, 0.8);
})();

export const ORG = {
  brain: [540, 300] as [number, number],
  heart: [575, 820] as [number, number],
  stomach: [610, 1040] as [number, number],
  adrenalL: [470, 1110] as [number, number],
  adrenalR: [612, 1110] as [number, number],
  handR: [905, 1420] as [number, number],
  handL: [175, 1420] as [number, number],
};

const SPINE: [number, number][] = [[540, 420], [540, 600], [540, 800], [540, 1000], [540, 1200], [540, 1350]];
const CHAIN_L: [number, number][] = [[505, 560], [500, 760], [500, 960], [502, 1160], [505, 1320]];
const CHAIN_R: [number, number][] = [[575, 560], [580, 760], [580, 960], [578, 1160], [575, 1320]];
const NERVES: [number, number][][] = [
  [[580, 720], [600, 780], [575, 820]], // corazón
  [[580, 960], [610, 1000], [610, 1040]], // estómago
  [[502, 1080], [480, 1100], [470, 1110]], // suprarrenal izq
  [[578, 1080], [600, 1100], [612, 1110]], // suprarrenal der
  [[580, 620], [700, 640], [800, 760], [850, 1000], [890, 1250], [905, 1400]], // brazo der
  [[500, 620], [380, 640], [280, 760], [230, 1000], [190, 1250], [175, 1400]], // brazo izq
];
const VESSELS: [number, number][][] = [
  [[560, 800], [560, 600], [520, 520], [500, 420]],
  [[560, 840], [560, 1100], [530, 1300], [520, 1500]],
  [[560, 700], [700, 650], [820, 800], [870, 1100], [900, 1400]],
  [[540, 700], [380, 650], [260, 800], [210, 1100], [180, 1400]],
];

export const Body: React.FC<{
  t: number;
  reveal: number;
  spine: number; // 0..1 señal bajando por la médula
  chain: number; // brillo de la cadena simpática
  adrenal: number;
  blood: number; // adrenalina en sangre
  heartGlow: number;
  stomach: number;
  hands: number;
  brainGlow?: number;
  link?: number; // conexión cerebro→corazón
  phase: number;
  color?: string;
}> = ({t, reveal, spine, chain, adrenal, blood, heartGlow, stomach, hands, brainGlow = 0.5, link = 0, phase, color = PAL.cyan}) => {
  const scanY = lerp(-100, H + 100, reveal);
  const p = phase - Math.floor(phase);
  const beat = Math.exp(-Math.pow((p - 0.16) / 0.08, 2));
  const pulseOn = (pts: [number, number][], u: number, col: string, r = 12, key = '') => {
    const s = sampleSpline(pts, 40);
    const [x, y] = along(s, clamp(u));
    return u > 0 && u < 1 ? <circle key={key} cx={x} cy={y} r={r} fill={col} opacity={0.95} /> : null;
  };
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rgba(color, 0.16)} />
          <stop offset="100%" stopColor={rgba(color, 0.02)} />
        </linearGradient>
        <clipPath id="bodyReveal">
          <rect x={0} y={0} width={W} height={Math.max(0, scanY)} />
        </clipPath>
        <radialGradient id="orgGlow">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.9} />
          <stop offset="30%" stopColor="#fff" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g clipPath="url(#bodyReveal)">
        <path d={outline} fill="url(#bodyFill)" stroke={rgba(color, 0.85)} strokeWidth={3} />
        <path d={outline} fill="none" stroke={rgba(color, 0.2)} strokeWidth={16} />
        {/* rejilla holográfica */}
        {Array.from({length: 40}, (_, i) => (
          <line key={i} x1={0} x2={W} y1={180 + i * 44} y2={180 + i * 44} stroke={rgba(color, 0.05)} strokeWidth={2} />
        ))}
        {/* vasos sanguíneos */}
        {VESSELS.map((v, i) => (
          <g key={'v' + i}>
            <path d={smoothPath(v)} stroke={rgba('#ff4060', 0.25 + 0.45 * blood)} strokeWidth={5} fill="none" />
            {blood > 0.05 &&
              Array.from({length: 7}, (_, k) => {
                const u = (t * 0.45 + k / 7 + i * 0.13) % 1;
                const [x, y] = along(sampleSpline(v, 30), u);
                return <circle key={k} cx={x} cy={y} r={6} fill={PAL.gold} opacity={blood * Math.sin(u * Math.PI)} />;
              })}
          </g>
        ))}
        {/* médula y cadena simpática */}
        <path d={smoothPath(SPINE)} stroke={rgba('#ffffff', 0.35 + 0.5 * clamp(spine * 2))} strokeWidth={12} fill="none" strokeLinecap="round" />
        {[CHAIN_L, CHAIN_R].map((c, i) => (
          <g key={'c' + i}>
            <path d={smoothPath(c)} stroke={rgba(PAL.gold, 0.15 + 0.7 * chain)} strokeWidth={4} fill="none" strokeDasharray="2 10" strokeLinecap="round" />
            {c.map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={9 + 6 * chain} fill={PAL.gold} opacity={0.25 + 0.7 * chain * (0.6 + 0.4 * Math.sin(t * 6 + k))} />
            ))}
          </g>
        ))}
        {NERVES.map((n, i) => (
          <path key={'n' + i} d={smoothPath(n)} stroke={rgba(PAL.gold, 0.12 + 0.6 * chain)} strokeWidth={3} fill="none" />
        ))}
        {spine > 0 && pulseOn(SPINE, spine, '#fff', 16, 'sp')}
        {chain > 0.2 && NERVES.map((n, i) => pulseOn(n, ((t * 0.9 + i * 0.17) % 1) * chain, PAL.gold, 8, 'np' + i))}
        {/* órganos */}
        <g>
          <circle cx={ORG.brain[0]} cy={ORG.brain[1]} r={110} fill="url(#orgGlow)" opacity={0.3 + 0.5 * brainGlow} />
          <ellipse cx={ORG.brain[0]} cy={ORG.brain[1] - 10} rx={78} ry={62} fill={rgba('#c9a3ff', 0.35)} stroke={rgba('#e0c8ff', 0.9)} strokeWidth={3} />
          {[0, 1, 2, 3, 4].map((k) => (
            <path key={k} d={`M${470 + k * 30},${270 + (k % 2) * 10} q12,-22 24,0 q12,22 24,0`} stroke={rgba('#ffffff', 0.4)} strokeWidth={3} fill="none" />
          ))}
        </g>
        {/* corazón holográfico */}
        <circle cx={ORG.heart[0]} cy={ORG.heart[1]} r={120} fill="url(#orgGlow)" opacity={0.12 + 0.5 * heartGlow * (0.5 + beat)} />
        <Heart t={t} phase={phase} x={ORG.heart[0]} y={ORG.heart[1]} scale={0.2} rot={-14} glow={heartGlow} hue="holo" flow={heartGlow} />
        {/* estómago */}
        <g opacity={0.5 + 0.5 * stomach}>
          <path d="M590,980 C640,960 690,990 690,1040 C690,1100 640,1130 590,1110 C560,1100 560,1060 580,1050 C600,1040 610,1020 590,980 Z" fill={rgba(PAL.teal, 0.2 + 0.3 * stomach)} stroke={rgba(PAL.teal, 0.9)} strokeWidth={3} />
        </g>
        {/* suprarrenales sobre los riñones */}
        {[ORG.adrenalL, ORG.adrenalR].map(([x, y], i) => (
          <g key={'a' + i}>
            <ellipse cx={x} cy={y + 46} rx={30} ry={48} fill={rgba('#ff7a59', 0.18)} stroke={rgba('#ff9a79', 0.7)} strokeWidth={2} />
            <path d={`M${x - 26},${y + 6} L${x},${y - 26} L${x + 26},${y + 6} Z`} fill={rgba(PAL.gold, 0.25 + 0.75 * adrenal)} stroke={PAL.gold} strokeWidth={2} />
            <circle cx={x} cy={y - 6} r={50} fill="url(#orgGlow)" opacity={adrenal * (0.5 + 0.4 * Math.sin(t * 8))} />
          </g>
        ))}
        {/* manos */}
        {[ORG.handL, ORG.handR].map(([x, y], i) => (
          <circle key={'h' + i} cx={x} cy={y} r={60} fill="url(#orgGlow)" opacity={hands * 0.6} />
        ))}
        {/* enlace cerebro → corazón */}
        {link > 0 && (
          <g>
            <path d={smoothPath([ORG.brain, [560, 520], [570, 700], ORG.heart])} stroke={rgba('#ffffff', 0.5 * link)} strokeWidth={6} fill="none" />
            {[0, 1, 2].map((k) => pulseOn([ORG.brain, [560, 520], [570, 700], ORG.heart], (t * 0.8 + k / 3) % 1, '#fff', 14, 'lk' + k))}
          </g>
        )}
      </g>
      {/* línea de escaneo */}
      {reveal < 1 && <rect x={0} y={scanY - 3} width={W} height={6} fill={color} opacity={0.9} />}
    </svg>
  );
};

/** mano (palma) en primer plano con gotas de sudor que se forman y resbalan */
export const SweatyHand: React.FC<{t: number; sweat: number; x?: number; y?: number; scale?: number}> = ({t, sweat, x = 540, y = 1000, scale = 1}) => {
  const drops = React.useMemo(() => {
    const r = rng(31);
    return Array.from({length: 26}, () => ({x: -170 + r() * 340, y: -120 + r() * 380, s: 10 + r() * 16, d: r()}));
  }, []);
  const fingers: [number, number, number, number][] = [
    [-150, -170, -14, 230],
    [-62, -250, -4, 290],
    [32, -262, 3, 300],
    [122, -220, 10, 260],
  ];
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="palm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6a885" />
          <stop offset="100%" stopColor="#7a4436" />
        </linearGradient>
        <radialGradient id="drop" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
          <stop offset="35%" stopColor="#dff6ff" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#8fc8ff" stopOpacity={0.6} />
        </radialGradient>
      </defs>
      <g transform={`translate(${x},${y}) scale(${scale}) rotate(${-8 + Math.sin(t) * 2})`}>
        {fingers.map(([fx, fy, rot, len], i) => (
          <g key={i} transform={`translate(${fx},${fy}) rotate(${rot})`}>
            <rect x={-38} y={-len / 2} width={76} height={len} rx={38} fill="url(#palm)" />
            <path d={`M-20,${-len / 2 + 60} q20,-8 40,0 M-22,${-len / 2 + 150} q22,-8 44,0`} stroke={rgba('#5a2a20', 0.5)} strokeWidth={3} fill="none" />
            <rect x={-38} y={-len / 2} width={76} height={len} rx={38} fill="none" stroke={rgba('#ffd2b0', 0.6)} strokeWidth={3} />
          </g>
        ))}
        <g transform="translate(-250,120) rotate(-38)">
          <rect x={-42} y={-140} width={84} height={260} rx={42} fill="url(#palm)" />
        </g>
        <path d="M-210,-80 C-210,-140 200,-150 200,-60 C220,120 190,330 40,400 C-80,440 -200,380 -220,240 C-240,140 -210,40 -210,-80 Z" fill="url(#palm)" />
        {/* líneas de la palma */}
        <path d="M-180,40 C-80,0 40,10 160,-20" stroke={rgba('#5a2a20', 0.55)} strokeWidth={5} fill="none" />
        <path d="M-190,120 C-80,90 20,120 120,90" stroke={rgba('#5a2a20', 0.45)} strokeWidth={5} fill="none" />
        <path d="M-120,-40 C-170,100 -140,260 -40,360" stroke={rgba('#5a2a20', 0.5)} strokeWidth={5} fill="none" />
        {drops.map((d, i) => {
          const grow = clamp(sweat * 1.4 - d.d * 0.6);
          if (grow <= 0) return null;
          const slide = Math.max(0, sweat * 1.4 - d.d * 0.6 - 0.7) * 160;
          return (
            <g key={i}>
              <ellipse cx={d.x} cy={d.y + slide} rx={d.s * grow} ry={d.s * grow * 1.15} fill="url(#drop)" />
              <circle cx={d.x - d.s * 0.3 * grow} cy={d.y + slide - d.s * 0.35 * grow} r={d.s * 0.22 * grow} fill="#fff" />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** "mariposas": destellos con alas que aletean girando en espiral */
export const Butterflies: React.FC<{t: number; amount: number; cx: number; cy: number; radius?: number; n?: number}> = ({t, amount, cx, cy, radius = 260, n = 28}) => {
  const bs = React.useMemo(() => {
    const r = rng(55);
    return Array.from({length: n}, () => ({a: r() * 6.28, r: 0.3 + r() * 0.7, sp: 0.5 + r(), s: 0.6 + r() * 0.8, c: r(), h: r()}));
  }, [n]);
  if (amount <= 0.01) return null;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}>
      {bs.map((b, i) => {
        const a = b.a + t * b.sp;
        const x = cx + Math.cos(a) * radius * b.r;
        const y = cy + Math.sin(a * 1.3) * radius * b.r * 0.7 - Math.sin(t * 0.7 + b.h * 6) * 40;
        const flap = Math.abs(Math.sin(t * 14 * b.sp + b.h * 10));
        const col = b.c < 0.33 ? PAL.gold : b.c < 0.66 ? PAL.rose : PAL.cyan;
        const sc = 1.7 * b.s * clamp(amount * 1.5 - b.h * 0.5);
        return (
          <g key={i} transform={`translate(${x},${y}) rotate(${(a * 57) % 360}) scale(${sc})`}>
            <circle r={28} fill={col} opacity={0.18} />
            <ellipse cx={-12 * flap} cy={-4} rx={16 * flap + 2} ry={22} fill={col} opacity={0.85} />
            <ellipse cx={12 * flap} cy={-4} rx={16 * flap + 2} ry={22} fill={col} opacity={0.85} />
            <ellipse cx={-9 * flap} cy={14} rx={10 * flap + 2} ry={12} fill={col} opacity={0.7} />
            <ellipse cx={9 * flap} cy={14} rx={10 * flap + 2} ry={12} fill={col} opacity={0.7} />
            <rect x={-2} y={-18} width={4} height={36} rx={2} fill="#fff" />
          </g>
        );
      })}
    </svg>
  );
};
