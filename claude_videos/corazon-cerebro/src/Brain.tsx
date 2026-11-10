import React from 'react';
import {rng, fbm, smoothPath, sampleSpline, along, clamp, rgba, noise1} from './lib';
import {PAL} from './fx';

// Cerebro en vista lateral (frontal a la izquierda) en un lienzo de 1000×800.
// Ilusión de volumen: sombreado por capas, relieve de surcos (sombra + luz desplazadas),
// borde iluminado y paralaje entre la corteza y las estructuras profundas al "girar".

const OUTLINE: [number, number][] = [
  [80, 380], [95, 290], [140, 205], [215, 135], [310, 88], [420, 62], [540, 55], [650, 68], [750, 105], [835, 165],
  [895, 245], [925, 330], [928, 410], [910, 458], [870, 485], [812, 497], [750, 500], [692, 516], [642, 545],
  [570, 575], [480, 586], [400, 576], [330, 548], [292, 512], [282, 474], [255, 452], [190, 452], [130, 440], [92, 415],
];
const CEREBELLUM: [number, number][] = [
  [660, 540], [720, 506], [800, 500], [870, 515], [915, 555], [905, 610], [860, 645], [790, 656], [720, 636], [675, 596],
];
const STEM: [number, number][] = [
  [590, 500], [650, 500], [668, 560], [660, 630], [648, 700], [640, 780], [584, 780], [578, 700], [570, 630], [562, 560],
];

function inside(poly: [number, number][], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export type Region = 'vta' | 'caudate' | 'accumbens' | 'pfc' | 'hypothal' | 'pituitary' | 'amygdala' | 'hippo' | 'insula' | 'acc';

// posiciones (lienzo 1000×800) y profundidad relativa para el paralaje
export const REGIONS: Record<Region, {x: number; y: number; r: number; depth: number; color: string}> = {
  vta: {x: 596, y: 452, r: 26, depth: 0.7, color: PAL.gold},
  caudate: {x: 452, y: 300, r: 34, depth: 0.6, color: PAL.rose},
  accumbens: {x: 400, y: 410, r: 24, depth: 0.65, color: PAL.coral},
  pfc: {x: 200, y: 300, r: 90, depth: 0.1, color: PAL.violet},
  hypothal: {x: 492, y: 448, r: 24, depth: 0.7, color: PAL.gold},
  pituitary: {x: 474, y: 500, r: 14, depth: 0.7, color: PAL.gold},
  amygdala: {x: 452, y: 470, r: 24, depth: 0.55, color: PAL.rose},
  hippo: {x: 560, y: 470, r: 34, depth: 0.55, color: PAL.cyan},
  insula: {x: 420, y: 370, r: 50, depth: 0.4, color: '#ff5050'},
  acc: {x: 360, y: 252, r: 40, depth: 0.6, color: '#ff5050'},
};

interface Stroke {
  d: string;
  x: number;
  y: number;
  ph: number;
  w: number;
}

function useCortex() {
  return React.useMemo(() => {
    const r = rng(42);
    const strokes: Stroke[] = [];
    const cx = 510;
    const cy = 330;
    const ok = (x: number, y: number) => inside(OUTLINE, x, y) && !inside(CEREBELLUM, x, y);
    for (let gy = 50; gy < 600; gy += 36) {
      for (let gx = 70; gx < 950; gx += 36) {
        const x0 = gx + (r() - 0.5) * 24;
        const y0 = gy + (r() - 0.5) * 24;
        if (!ok(x0, y0)) continue;
        const pts: [number, number][] = [[x0, y0]];
        let x = x0;
        let y = y0;
        const len = 6 + Math.floor(r() * 6);
        const dir = r() < 0.5 ? 1 : -1;
        for (let k = 0; k < len; k++) {
          // tangente a capas concéntricas + meandro de ruido = pliegues orgánicos
          const tang = Math.atan2(y - cy, (x - cx) * 0.8) + Math.PI / 2;
          const a = tang + fbm(x * 0.009, y * 0.009) * 1.7 + Math.sin(k * 1.3 + x0 * 0.1) * 0.35;
          x += Math.cos(a) * 13 * dir;
          y += Math.sin(a) * 13 * dir;
          if (!ok(x, y)) break;
          pts.push([x, y]);
        }
        if (pts.length < 3) continue;
        strokes.push({d: smoothPath(pts), x: x0, y: y0, ph: r() * 6.28, w: 24 + r() * 7});
      }
    }
    // cerebelo: láminas paralelas
    const folia: string[] = [];
    for (let k = 0; k < 13; k++) {
      const yy = 515 + k * 10;
      const pts: [number, number][] = [];
      for (let xx = 670; xx <= 915; xx += 12) if (inside(CEREBELLUM, xx, yy + Math.sin(xx * 0.05 + k) * 4)) pts.push([xx, yy + Math.sin(xx * 0.05 + k) * 4 + (xx - 790) ** 2 * 0.0009]);
      if (pts.length > 2) folia.push(smoothPath(pts));
    }
    const outline = smoothPath(OUTLINE, true);
    const cereb = smoothPath(CEREBELLUM, true);
    const stem = smoothPath(STEM, true);
    // grandes cisuras
    const sylvian = smoothPath([[300, 468], [380, 430], [470, 400], [560, 380], [640, 360]]);
    const central = smoothPath([[580, 74], [560, 150], [540, 230], [515, 310], [490, 392]]);
    return {strokes, folia, outline, cereb, stem, sylvian, central};
  }, []);
}

// vías de recompensa (mesolímbica/mesocortical) en coordenadas del lienzo
export const PATH_MESOLIMBIC: [number, number][] = [[596, 452], [540, 430], [470, 420], [400, 410]];
export const PATH_MESOCORTICAL: [number, number][] = [[596, 452], [520, 380], [420, 320], [300, 280], [200, 300]];
export const PATH_NIGRO: [number, number][] = [[596, 452], [560, 380], [500, 320], [452, 300]];

export const Brain: React.FC<{
  t: number;
  /** giro aparente (-1..1) */
  yaw?: number;
  /** actividad global 0..1 (chispas en la corteza) */
  activity?: number;
  regions?: Partial<Record<Region, number>>;
  /** flujo de partículas de dopamina por las vías 0..1 */
  dopamine?: number;
  glass?: number;
  tint?: string;
  rim?: string;
  pain?: number;
  scale?: number;
  x?: number;
  y?: number;
  opacity?: number;
  calm?: number;
}> = ({t, yaw = 0, activity = 0.4, regions = {}, dopamine = 0, glass = 0.55, tint = '#c9a3ff', rim = PAL.cyan, pain = 0, scale = 1, x = 540, y = 900, opacity = 1, calm = 0}) => {
  const c = useCortex();
  const sx = Math.cos(yaw * 0.6);
  const shift = Math.sin(yaw * 0.6);
  const id = 'br';
  const pulseCol = pain > 0 ? '#ff4a5a' : PAL.gold;
  return (
    <g transform={`translate(${x},${y}) scale(${scale}) translate(-500,-400)`} opacity={opacity}>
      <defs>
        <radialGradient id={`${id}fill`} cx={0.38 - shift * 0.15} cy={0.35} r={0.8}>
          <stop offset="0%" stopColor={rgba(tint, 0.62)} />
          <stop offset="55%" stopColor={rgba(tint, 0.28)} />
          <stop offset="100%" stopColor={rgba('#2a1050', 0.5)} />
        </radialGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="25%" stopColor="#fff" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}halo`}>
          <stop offset="0%" stopColor={rim} stopOpacity={0.35} />
          <stop offset="100%" stopColor={rim} stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}clip`}>
          <path d={c.outline} />
        </clipPath>
        <linearGradient id={`${id}stem`} x1="0" x2="1">
          <stop offset="0%" stopColor={rgba(tint, 0.25)} />
          <stop offset="60%" stopColor={rgba(tint, 0.5)} />
          <stop offset="100%" stopColor={rgba('#2a1050', 0.4)} />
        </linearGradient>
      </defs>
      <ellipse cx={500} cy={380} rx={560} ry={420} fill={`url(#${id}halo)`} />
      <g transform={`translate(500,0) scale(${sx},1) translate(-500,0)`}>
        {/* tronco y cerebelo (detrás) */}
        <path d={c.stem} fill={`url(#${id}stem)`} stroke={rgba(rim, 0.5)} strokeWidth={2} />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <path key={k} d={`M${585 + k * 2},${560 + k * 35} q30,-6 ${70 - k * 3},0`} stroke={rgba('#ffffff', 0.12)} strokeWidth={2} fill="none" />
        ))}
        <path d={c.cereb} fill={rgba(tint, 0.38)} stroke={rgba(rim, 0.55)} strokeWidth={2.5} />
        {c.folia.map((d, i) => (
          <path key={i} d={d} stroke={rgba('#1a0830', 0.5)} strokeWidth={3} fill="none" />
        ))}
        {/* hemisferio */}
        <path d={c.outline} fill={`url(#${id}fill)`} />
        {/* estructuras profundas (vidrio), con paralaje propio */}
        <g transform={`translate(${shift * -40},0)`} opacity={glass}>
          <path d="M330,330 C360,250 470,215 560,225 C640,232 700,280 712,330 C690,300 640,268 560,262 C470,258 390,285 352,340 Z" fill={rgba('#ffffff', 0.22)} stroke={rgba('#ffffff', 0.35)} strokeWidth={1.5} />
          <ellipse cx={560} cy={385} rx={62} ry={44} fill={rgba('#ffd6f0', 0.18)} stroke={rgba('#ffffff', 0.3)} />
          <path d="M432,300 C470,270 560,262 640,300 C690,326 700,380 670,420" fill="none" stroke={rgba(PAL.rose, 0.35)} strokeWidth={16} strokeLinecap="round" />
          <path d="M520,480 C560,462 610,462 660,470" fill="none" stroke={rgba(PAL.cyan, 0.3)} strokeWidth={14} strokeLinecap="round" />
        </g>
        <g clipPath={`url(#${id}clip)`}>
          {/* circunvoluciones: surco oscuro → cuerpo → brillo desplazado (relieve) */}
          {c.strokes.map((s, i) => (
            <path key={i} d={s.d} stroke={rgba('#1a0633', 0.55)} strokeWidth={s.w + 7} fill="none" strokeLinecap="round" transform="translate(2,4)" />
          ))}
          {c.strokes.map((s, i) => (
            <path key={'b' + i} d={s.d} stroke={rgba(tint, 0.42)} strokeWidth={s.w} fill="none" strokeLinecap="round" />
          ))}
          {c.strokes.map((s, i) => (
            <path key={'h' + i} d={s.d} stroke={rgba('#ffffff', 0.2)} strokeWidth={s.w * 0.32} fill="none" strokeLinecap="round" transform="translate(-2.5,-3.5)" />
          ))}
          <path d={c.sylvian} stroke={rgba('#12052a', 0.75)} strokeWidth={9} fill="none" strokeLinecap="round" />
          <path d={c.central} stroke={rgba('#12052a', 0.6)} strokeWidth={7} fill="none" strokeLinecap="round" />
          {/* chispas de actividad neuronal: impulsos que recorren los pliegues */}
          {activity > 0.01 &&
            c.strokes.map((s, i) => {
              const speed = calm > 0 ? 1.2 - calm * 0.8 : 1.4 + pain * 2.2;
              const v = Math.sin(t * speed * 2 + s.ph * 3 + i * 0.37);
              const on = clamp((v - (1 - activity * 0.5)) * 4);
              if (on <= 0.02) return null;
              const col = pain > 0.3 && i % 2 === 0 ? '#ff4d5e' : i % 3 === 0 ? PAL.rose : i % 3 === 1 ? PAL.gold : PAL.cyan;
              return (
                <g key={'a' + i} opacity={on}>
                  <path d={s.d} stroke={col} strokeWidth={s.w * 0.55} fill="none" strokeLinecap="round" opacity={0.45} />
                  <circle cx={s.x} cy={s.y} r={6} fill="#fff" />
                </g>
              );
            })}
          {/* sombreado de volumen: borde oscuro inferior y luz superior */}
          <path d={c.outline} fill="none" stroke={rgba('#0a0218', 0.55)} strokeWidth={70} transform="translate(0,16)" />
          <path d={c.outline} fill="none" stroke={rgba('#ffffff', 0.12)} strokeWidth={40} transform="translate(-6,-10)" />
        </g>
        <path d={c.outline} fill="none" stroke={rgba(rim, 0.9)} strokeWidth={3.5} />
        <path d={c.outline} fill="none" stroke={rgba(rim, 0.25)} strokeWidth={14} />
        {/* regiones activas */}
        {(Object.keys(regions) as Region[]).map((k) => {
          const v = regions[k] ?? 0;
          if (v <= 0.01) return null;
          const R = REGIONS[k];
          const px = R.x - shift * 40 * R.depth;
          const flick = 0.85 + 0.15 * noise1(t * 6, R.x);
          return (
            <g key={k} style={{mixBlendMode: 'screen'}}>
              <circle cx={px} cy={R.y} r={R.r * (2.8 + 0.4 * Math.sin(t * 4))} fill={`url(#${id}glow)`} opacity={0.35 * v * flick} />
              <circle cx={px} cy={R.y} r={R.r * 1.2} fill={R.color} opacity={0.55 * v * flick} />
              <circle cx={px} cy={R.y} r={R.r * 0.55} fill="#fff" opacity={0.8 * v} />
            </g>
          );
        })}
        {/* partículas de dopamina recorriendo las vías */}
        {dopamine > 0.01 &&
          [PATH_MESOLIMBIC, PATH_MESOCORTICAL, PATH_NIGRO].map((P, pi) => {
            const pts = sampleSpline(P.map(([a, b]) => [a - shift * 30, b] as [number, number]), 40);
            return (
              <g key={pi}>
                <path d={smoothPath(pts)} stroke={rgba(pulseCol, 0.35 * dopamine)} strokeWidth={6} fill="none" strokeLinecap="round" />
                {Array.from({length: 14}, (_, k) => {
                  const u = (t * (0.35 + pi * 0.05) + k / 14) % 1;
                  const [px, py] = along(pts, u);
                  return <circle key={k} cx={px} cy={py} r={5 + 3 * Math.sin(k + t * 5)} fill={pi === 1 ? PAL.gold : '#ffe6a8'} opacity={dopamine * Math.sin(u * Math.PI)} />;
                })}
              </g>
            );
          })}
      </g>
    </g>
  );
};

/** posición en pantalla de una región, con los mismos parámetros que <Brain> */
export function regionXY(k: Region, o: {x?: number; y?: number; scale?: number; yaw?: number}): [number, number] {
  const {x = 540, y = 900, scale = 1, yaw = 0} = o;
  const R = REGIONS[k];
  const sx = Math.cos(yaw * 0.6);
  const shift = Math.sin(yaw * 0.6);
  const px = R.x - shift * 40 * R.depth;
  return [x + scale * sx * (px - 500), y + scale * (R.y - 400)];
}
