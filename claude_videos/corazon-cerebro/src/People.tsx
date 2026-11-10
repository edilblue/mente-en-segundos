import React from 'react';
import {smoothPath, rgba, clamp} from './lib';

// Dos personajes originales de "Mente en Segundos", dibujados de perfil (mirando a la derecha
// en coordenadas locales 700×1000). Estilo: contraluz cinematográfico con luz de contorno cálida,
// piel en penumbra y rasgos legibles.

type P = [number, number];
interface Spec {
  face: P[];
  back: P[];
  hair: P[];
  eye: P;
  brow: [P, P];
  ear: P;
  skin: [string, string];
  hairCol: [string, string];
  rim: string;
  cloth: string;
  lashes: boolean;
}

const A: Spec = {
  // nuca → coronilla → frente → nariz → labios → mentón → cuello
  face: [
    [470, 195], [520, 250], [540, 320], [536, 362], [556, 412], [584, 462], [592, 482], [576, 496], [556, 500], [562, 522],
    [574, 540], [560, 553], [569, 568], [556, 590], [548, 608], [560, 648], [540, 690], [490, 705], [455, 720], [458, 800], [466, 1000],
  ],
  back: [[466, 1000], [290, 1000], [292, 770], [240, 650], [180, 560], [160, 460], [168, 360], [210, 262], [290, 196], [390, 172]],
  hair: [
    [505, 238], [470, 196], [400, 166], [300, 180], [215, 240], [168, 330], [160, 430], [178, 520], [212, 598], [228, 560], [218, 480], [236, 420], [270, 380],
    [300, 330], [346, 300], [400, 288], [450, 270], [488, 262], [512, 268],
  ],
  eye: [506, 392],
  brow: [[478, 352], [534, 356]],
  ear: [298, 448],
  skin: ['#c98a68', '#3a2030'],
  hairCol: ['#2a1a20', '#0c0610'],
  rim: '#ffc27a',
  cloth: '#1b1530',
  lashes: false,
};

const B: Spec = {
  face: [
    [468, 205], [515, 258], [532, 322], [528, 366], [546, 410], [570, 452], [576, 470], [562, 482], [544, 488], [550, 510],
    [566, 528], [552, 542], [562, 558], [550, 580], [538, 598], [546, 630], [528, 668], [484, 690], [450, 706], [450, 800], [456, 1000],
  ],
  back: [[456, 1000], [292, 1000], [290, 780], [244, 655], [186, 570], [166, 470], [172, 366], [214, 268], [292, 206], [390, 182]],
  hair: [
    [508, 250], [480, 204], [410, 170], [300, 176], [200, 236], [140, 340], [118, 470], [110, 620], [92, 780], [70, 930], [120, 990], [200, 960],
    [240, 860], [250, 760], [236, 640], [228, 540], [252, 450], [290, 390], [340, 330], [400, 300], [460, 286], [500, 290],
  ],
  eye: [500, 394],
  brow: [[472, 354], [526, 356]],
  ear: [300, 452],
  skin: ['#e0a585', '#3d2232'],
  hairCol: ['#5a2a2a', '#140608'],
  rim: '#ff9ab8',
  cloth: '#2a1630',
  lashes: true,
};

export const SPECS = {A, B};

export const Person: React.FC<{
  who: 'A' | 'B';
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  tilt?: number;
  blink?: number; // 0 abierto, 1 cerrado
  smile?: number;
  rim?: number;
  t?: number;
  shade?: number; // 0..1 cuánto se ven los rasgos (1 = solo silueta)
  rimColor?: string;
  breathe?: number;
}> = ({who, x, y, scale = 1, flip = false, tilt = 0, blink = 0, smile = 0, rim = 1, t = 0, shade = 0.15, rimColor, breathe = 1}) => {
  const s = who === 'A' ? A : B;
  const id = `p${who}${flip ? 'f' : ''}`;
  const rc = rimColor ?? s.rim;
  const head = smoothPath([...s.face, ...s.back], true, 0.9);
  const hair = smoothPath(s.hair, true, 0.9);
  const [ex, ey] = s.eye;
  const lid = clamp(blink);
  const br = Math.sin(t * 1.4) * 4 * breathe;
  // boca: comisura se eleva al sonreír
  const mouth = s.face[12];
  return (
    <g transform={`translate(${x},${y + br}) scale(${flip ? -scale : scale},${scale}) rotate(${tilt} 400 760) translate(-400,-560)`}>
      <defs>
        <linearGradient id={`${id}skin`} x1="0.2" y1="0" x2="1" y2="0.1">
          <stop offset="0%" stopColor={s.skin[1]} />
          <stop offset="70%" stopColor={s.skin[1]} />
          <stop offset="100%" stopColor={s.skin[0]} stopOpacity={1 - shade} />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="55%" stopColor={rc} stopOpacity={0} />
          <stop offset="85%" stopColor={rc} stopOpacity={0.7 * rim} />
          <stop offset="100%" stopColor="#fff6e8" stopOpacity={rim} />
        </linearGradient>
        <linearGradient id={`${id}hair`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor={s.hairCol[1]} />
          <stop offset="75%" stopColor={s.hairCol[0]} />
          <stop offset="100%" stopColor={rc} stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id={`${id}cloth`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#05030a" />
          <stop offset="80%" stopColor={s.cloth} />
          <stop offset="100%" stopColor={rc} stopOpacity={0.6 * rim} />
        </linearGradient>
        <radialGradient id={`${id}cheek`}>
          <stop offset="0%" stopColor="#ff6a7a" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#ff6a7a" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* hombros y torso */}
      <path
        d={smoothPath([[456, 860], [560, 900], [690, 990], [760, 1200], [760, 1500], [-80, 1500], [-60, 1180], [40, 980], [180, 900], [262, 860]], false)}
        fill={`url(#${id}cloth)`}
      />
      <path d={smoothPath([[456, 860], [560, 900], [690, 990], [760, 1200]])} fill="none" stroke={rc} strokeOpacity={0.6 * rim} strokeWidth={4} />
      {/* cabello largo por detrás */}
      {who === 'B' && <path d={hair} fill={`url(#${id}hair)`} />}
      <path d={head} fill={`url(#${id}skin)`} />
      {/* oreja */}
      {who === 'A' && (
        <g>
          <ellipse cx={s.ear[0]} cy={s.ear[1]} rx={30} ry={52} fill={s.skin[1]} stroke={rgba(rc, 0.35 * rim)} strokeWidth={3} />
          <path d={`M${s.ear[0] - 8},${s.ear[1] - 30} q18,20 4,52`} stroke={rgba('#000000', 0.4)} strokeWidth={5} fill="none" />
        </g>
      )}
      {/* mejilla sonrojada */}
      <ellipse cx={ex - 20} cy={ey + 80} rx={70} ry={50} fill={`url(#${id}cheek)`} opacity={0.4 + smile * 0.6} />
      {/* ceja */}
      <path d={`M${s.brow[0][0]},${s.brow[0][1] + smile * 3} Q${(s.brow[0][0] + s.brow[1][0]) / 2},${s.brow[0][1] - 12 - smile * 4} ${s.brow[1][0]},${s.brow[1][1]}`} stroke={s.hairCol[1]} strokeWidth={10} fill="none" strokeLinecap="round" />
      {/* ojo de perfil */}
      <g>
        <path d={`M${ex - 16},${ey - 4} Q${ex + 6},${ey - 16} ${ex + 26},${ey + 2} Q${ex + 6},${ey + 14} ${ex - 14},${ey + 8} Z`} fill="#f4e6e0" opacity={1 - lid} />
        <ellipse cx={ex + 13} cy={ey + 1} rx={7} ry={10} fill="#2a1408" opacity={1 - lid} />
        <circle cx={ex + 15} cy={ey - 3} r={2.5} fill="#fff" opacity={1 - lid} />
        {/* párpado */}
        <path
          d={`M${ex - 18},${ey - 6} Q${ex + 6},${ey - 18 + lid * 22} ${ex + 28},${ey + 2 + lid * 2}`}
          stroke={s.hairCol[1]}
          strokeWidth={s.lashes ? 6 : 4}
          fill={rgba(s.skin[1], lid)}
          strokeLinecap="round"
        />
        {s.lashes && [0, 1, 2].map((k) => <path key={k} d={`M${ex + 12 + k * 6},${ey - 8 + lid * 10} l${8 + k * 2},${-10 + lid * 8}`} stroke={s.hairCol[1]} strokeWidth={3} strokeLinecap="round" />)}
      </g>
      {/* boca */}
      <path d={`M${mouth[0] - 2},${mouth[1] + 1} q-16,${2 - smile * 10} -26,${-2 - smile * 8}`} stroke={rgba('#2a0c14', 0.8)} strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* cabello */}
      <path d={hair} fill={`url(#${id}hair)`} />
      {who === 'B' && <path d={smoothPath(s.hair.slice(14), false)} stroke={rgba(rc, 0.5 * rim)} strokeWidth={4} fill="none" />}
      {/* luz de contorno */}
      <path d={head} fill="none" stroke={`url(#${id}rim)`} strokeWidth={7} />
      <path d={head} fill="none" stroke={`url(#${id}rim)`} strokeWidth={22} opacity={0.25} />
      <path d={hair} fill="none" stroke={`url(#${id}rim)`} strokeWidth={5} opacity={0.8} />
    </g>
  );
};
