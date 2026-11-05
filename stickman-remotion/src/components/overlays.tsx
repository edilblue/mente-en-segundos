import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FPS, H, SAFE_BOTTOM, SAFE_TOP, W, boilSeed, clamp, ease, iv, norm, rnd, sp} from '../lib';
import {SCENES, TOTAL_FRAMES} from '../timeline';
import {ComicText, FONT_SUB, wobble} from './fx';

// ------------------------------------------------------------------ Subtítulos
type Chunk = {words: {w: string; t: number; key: boolean}[]; start: number; end: number};

const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  for (const s of SCENES) {
    const base = s.from / FPS;
    const local: Chunk[] = [];
    let cur: Chunk['words'] = [];
    s.words.forEach((w, i) => {
      cur.push({w: w.w, t: base + w.start, key: s.claves.includes(norm(w.w))});
      const chars = cur.reduce((a, b) => a + b.w.length, 0);
      const pausa = /[….,!?:;]$/.test(w.w);
      if (pausa || cur.length >= 3 || chars >= 15 || i === s.words.length - 1) {
        local.push({words: cur, start: cur[0].t, end: 0});
        cur = [];
      }
    });
    // Cada bloque dura hasta que empieza el siguiente; el último, hasta poco antes del corte.
    const last = s.words[s.words.length - 1];
    const sceneEnd = (s.from + s.frames) / FPS - 0.3;
    local.forEach((c, i) => {
      c.end = i < local.length - 1 ? local[i + 1].start : Math.min(sceneEnd, base + (last ? last.end : 0) + 1.2);
    });
    out.push(...local);
  }
  return out;
})();

export const Subtitles: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const c = CHUNKS.find((k) => t >= k.start - 0.02 && t < k.end);
  if (!c) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        bottom: H - SAFE_BOTTOM + 24,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-end',
        columnGap: 22,
        rowGap: 0,
        lineHeight: 1.08,
      }}
    >
      {c.words.map((w, i) => {
        if (t < w.t - 0.02) return null;
        const k = sp(t, w.t - 0.02, {damping: 8, stiffness: 220, mass: 0.6});
        const active = i === c.words.length - 1 || t < c.words[i + 1].t;
        const s = (0.35 + 0.65 * k) * (active ? 1.04 : 1);
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT_SUB,
              fontSize: 92,
              color: w.key ? C.yellow : '#fff',
              WebkitTextStroke: `17px ${C.ink}`,
              paintOrder: 'stroke fill',
              textShadow: `0 9px 0 ${C.ink}`,
              textTransform: 'uppercase',
              display: 'inline-block',
              padding: '0 10px',
              transform: `scale(${Math.min(s, 1)},${s}) rotate(${active ? -2 : 0}deg)`,
              transformOrigin: '50% 80%',
              letterSpacing: 1,
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ Barra de progreso con forma de lápiz
export const PencilProgress: React.FC = () => {
  const f = useCurrentFrame();
  const p = clamp(f / (TOTAL_FRAMES - 1));
  const x0 = 70;
  const x1 = W - 70;
  const y = SAFE_TOP + 38;
  const tip = x0 + 150 + (x1 - x0 - 150) * p;
  const s = boilSeed(f);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <path d={wobble(x0, y, x1, y, 50 + s, 1.2, 10)} stroke={C.ink} strokeWidth={4} strokeDasharray="4 16" strokeLinecap="round" fill="none" opacity={0.45} />
      <path d={wobble(x0, y, tip - 4, y, 60 + s, 1.5, 12)} stroke="#3a3a3a" strokeWidth={11} strokeLinecap="round" fill="none" />
      <g transform={`translate(${tip},${y}) rotate(${Math.sin(f * 0.35) * 2})`}>
        {/* punta de grafito y madera */}
        <path d="M0,0 L-34,-19 L-34,19 Z" fill="#f2d4a6" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        <path d="M0,0 L-12,-7 L-12,7 Z" fill={C.ink} />
        {/* cuerpo amarillo */}
        <rect x={-150} y={-20} width={116} height={40} fill={C.yellow} stroke={C.ink} strokeWidth={5} />
        <path d="M-150,-6 L-34,-6 M-150,7 L-34,7" stroke="#d9a400" strokeWidth={3} />
        {/* virola y borrador */}
        <rect x={-166} y={-21} width={16} height={42} fill="#c9c9c9" stroke={C.ink} strokeWidth={5} />
        <rect x={-196} y={-20} width={30} height={40} rx={9} fill={C.red} stroke={C.ink} strokeWidth={5} />
      </g>
    </svg>
  );
};

// ------------------------------------------------------------------ Etiqueta "PARTE 2" (primeros 5 s)
export const ParteBadge: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t > 5) return null;
  const k = sp(t, 0.15, {damping: 7, stiffness: 160});
  const out = iv(t, [4.6, 5], [1, 0], ease.in);
  const wig = Math.sin(t * 5) * 3;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <g transform={`translate(${W - 190},${SAFE_TOP + 130}) rotate(${6 + wig}) scale(${k * out})`}>
        <rect x={-130} y={-50} width={260} height={100} rx={18} fill={C.red} stroke={C.ink} strokeWidth={9} />
        <ComicText x={0} y={4} size={78} fill="#fff">
          PARTE 2
        </ComicText>
      </g>
    </svg>
  );
};

// ------------------------------------------------------------------ Transición con barrido de tinta negra
const HALF = 9; // frames antes/después del corte
export const InkWipe: React.FC = () => {
  const f = useCurrentFrame();
  const b = SCENES.slice(1).find((s) => Math.abs(f - s.from) <= HALF);
  if (!b) return null;
  // SFX: swoosh — en cada corte de escena (ver public/audio/README)
  const p = (f - b.from + HALF) / (HALF * 2);
  const lead = iv(p, [0, 0.5], [-260, W + 260], ease.inOut);
  const trail = iv(p, [0.5, 1], [-260, W + 260], ease.inOut);
  const seed = b.id * 7;
  const edge = (x: number, ph: number, rev: boolean) => {
    const pts: string[] = [];
    for (let y = -80; y <= H + 80; y += 60) {
      const xx = x + Math.sin(y * 0.011 + ph) * 46 + (rnd(seed + y) - 0.5) * 30 + (y - H / 2) * 0.12;
      pts.push(`${xx},${y}`);
    }
    return rev ? pts.reverse() : pts;
  };
  const d = `M${[...edge(trail, seed, false), ...edge(lead, seed + 2, true)].join(' L')} Z`;
  const drops = [];
  for (let i = 0; i < 9; i++) {
    const y = rnd(seed + i * 5) * H;
    const r = 14 + rnd(seed + i) * 34;
    drops.push(<circle key={i} cx={lead + 40 + rnd(seed + i * 9) * 110 + (y - H / 2) * 0.12} cy={y} r={r * (p < 0.5 ? 1 : 0)} fill={C.ink} />);
  }
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <path d={d} fill={C.ink} stroke={C.ink} strokeWidth={24} strokeLinejoin="round" />
      {drops}
    </svg>
  );
};
