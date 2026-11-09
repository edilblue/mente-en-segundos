import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp, pop, prog, tw} from '../lib/anim';
import {Frase} from '../lib/timing';
import {BODY_FONT, TITLE_FONT} from './fonts';

export const ORANGE = '#ff9a1f';
export const YELLOW = '#ffd23f';
export const GREEN = '#5cf28a';
export const CYAN = '#5fd4ff';

const stroke = (w: number, c = '#0a1230') => ({
  WebkitTextStroke: `${w}px ${c}`,
  paintOrder: 'stroke fill' as const,
});

/** Título gigante con pop palabra a palabra. Palabras entre *asteriscos* se resaltan con `hi`. */
export const Title: React.FC<{t: number; t0: number; t1?: number; text: string; hi?: string; y?: number; size?: number; color?: string; tiltSeed?: number}> = ({
  t, t0, t1 = 999, text, hi = ORANGE, y = 250, size = 128, color = '#ffffff', tiltSeed = 0,
}) => {
  if (t < t0 || t > t1 + 0.35) return null;
  const out = t > t1 ? clamp((t - t1) / 0.3) : 0;
  const words = text.split(' ');
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: y, pointerEvents: 'none'}}>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: 1000,
          transform: `translateY(${-out * 80}px) scale(${1 - out * 0.3})`, opacity: 1 - out,
        }}
      >
        {words.map((w, i) => {
          const isHi = w.startsWith('*');
          const s = pop(t, t0 + i * 0.07, 0.38);
          const wobble = Math.sin((t - t0) * 3 + i * 1.7 + tiltSeed) * 1.6;
          return (
            <span
              key={i}
              style={{
                fontFamily: TITLE_FONT, fontSize: size, lineHeight: 1.08, color: isHi ? hi : color, ...stroke(size * 0.13),
                transform: `scale(${s}) rotate(${wobble + (1 - s) * -12}deg)`, display: 'inline-block',
                textShadow: `0 ${size * 0.09}px 0 rgba(5,10,35,0.85), 0 0 40px rgba(0,0,0,0.35)`, letterSpacing: 2, padding: `0 ${size * 0.2}px`,
              }}
            >
              {w.replace(/\*/g, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const KEY = /^(tierra|girar|segundo|ecuador|mil|seiscientos|kilómetros|polos|inercia|golpe|aire|vientos|devastadores|destruir|océanos|movimiento|olas|gigantescas|inundaciones|catastróficas|sol|año|luz|oscuridad|increíble|velocidad|rotación|planeta|impresionante|eje|orbitando)$/i;
const KEY_COLOR = (w: string) => {
  const x = w.toLowerCase();
  if (/^(vientos|devastadores|destruir|catastróficas|inundaciones|gigantescas|olas|golpe)$/.test(x)) return ORANGE;
  if (/^(inercia|rotación|velocidad|movimiento|increíble|impresionante)$/.test(x)) return GREEN;
  return YELLOW;
};

/** Subtítulos dinámicos: frase actual, palabra activa con pop. */
export const Captions: React.FC<{t: number; frases: Frase[]; y?: number}> = ({t, frases, y = 1395}) => {
  const f = frases.find((x, i) => t >= x.start - 0.05 && t < (frases[i + 1]?.start ?? x.end + 0.6) - 0.05 && t < x.end + 0.6);
  if (!f) return null;
  // máximo ~4-5 palabras por "página"
  const words = f.palabras;
  const pages: typeof words[] = [];
  let cur: typeof words = [];
  words.forEach((w) => {
    cur.push(w);
    const len = cur.reduce((s, x) => s + x.w.length + 1, 0);
    if (cur.length >= 4 || len > 20 || /[,:]$/.test(w.w)) {
      pages.push(cur);
      cur = [];
    }
  });
  if (cur.length) pages.push(cur);
  const page = pages.find((p, i) => t < (pages[i + 1]?.[0].start ?? 1e9)) ?? pages[pages.length - 1];
  const pStart = page[0].start;
  const enter = pop(t, pStart - 0.05, 0.22);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: y, pointerEvents: 'none'}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: 1000, transform: `scale(${0.85 + enter * 0.15})`}}>
        {page.map((w, i) => {
          const active = t >= w.start - 0.03 && t < w.end + 0.05;
          const said = t >= w.start - 0.03;
          const clean = w.w.replace(/[^\p{L}\p{N}]/gu, '');
          const isKey = KEY.test(clean);
          const color = isKey ? KEY_COLOR(clean) : '#ffffff';
          const bump = active ? 1 + 0.1 * Math.sin(clamp((t - w.start) / Math.max(0.12, w.end - w.start)) * Math.PI) : 1;
          return (
            <span
              key={i}
              style={{
                fontFamily: BODY_FONT, fontWeight: 900, fontSize: 78, lineHeight: 1.12, textTransform: 'uppercase',
                color: said ? color : '#ffffff', opacity: said ? 1 : 0.7, ...stroke(14), display: 'inline-block',
                transform: `scale(${bump}) translateY(${active ? -4 : 0}px)`,
                textShadow: '0 7px 0 rgba(5,10,35,0.8)', padding: '3px 20px',
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Tag: React.FC<{t: number; t0: number; t1: number; text: string; x?: number; y?: number; bg?: string; color?: string; size?: number; align?: 'left' | 'center' | 'right'; icon?: string}> = ({
  t, t0, t1, text, x = 540, y = 170, bg = 'rgba(10,18,48,0.78)', color = '#ffffff', size = 34, align = 'center', icon,
}) => {
  if (t < t0 || t > t1 + 0.3) return null;
  const s = pop(t, t0, 0.3) * (t > t1 ? 1 - clamp((t - t1) / 0.25) : 1);
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0%';
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, transform: `translate(${tx}, 0) scale(${s})`, transformOrigin: align === 'left' ? 'left center' : align === 'right' ? 'right center' : 'center',
        background: bg, color, fontFamily: BODY_FONT, fontWeight: 900, fontSize: size, padding: `${size * 0.3}px ${size * 0.6}px`,
        borderRadius: size, border: '3px solid rgba(255,255,255,0.18)', whiteSpace: 'nowrap', letterSpacing: 1,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)', textTransform: 'uppercase',
      }}
    >
      {icon ? <span style={{marginRight: 12}}>{icon}</span> : null}
      {text}
    </div>
  );
};

export const Flash: React.FC<{t: number; t0: number; dur?: number; color?: string; max?: number}> = ({t, t0, dur = 0.35, color = '#ffffff', max = 0.85}) => {
  const a = t < t0 ? 0 : Math.max(0, 1 - (t - t0) / dur) * max;
  if (a <= 0) return null;
  return <AbsoluteFill style={{background: color, opacity: a, mixBlendMode: 'screen'}} />;
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.65}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(2,6,22,${strength}) 100%)`, pointerEvents: 'none'}} />
);

/** Líneas de velocidad 2D (anime) */
export const SpeedLines: React.FC<{t: number; amount: number; dir?: 'h' | 'radial'; color?: string}> = ({t, amount, dir = 'radial', color = 'rgba(255,255,255,0.75)'}) => {
  if (amount <= 0.01) return null;
  const lines = Array.from({length: 46}, (_, i) => i);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden', opacity: amount}}>
      <svg width={1080} height={1920}>
        {lines.map((i) => {
          const r1 = Math.sin(i * 91.7) * 0.5 + 0.5;
          const r2 = Math.sin(i * 37.3 + 2) * 0.5 + 0.5;
          if (dir === 'h') {
            const y = r1 * 1920;
            const len = 200 + r2 * 500;
            const x = ((t * (2600 + r2 * 1800) + r1 * 3000) % 2600) - 700;
            return <rect key={i} x={x} y={y} width={len} height={3 + r2 * 6} rx={3} fill={color} />;
          }
          const a = (i / lines.length) * Math.PI * 2 + r1 * 0.1;
          const ph = (t * 3 + r2) % 1;
          const R0 = 520 + ph * 500;
          const R1 = R0 + 160 + r2 * 220;
          return (
            <line key={i} x1={540 + Math.cos(a) * R0} y1={960 + Math.sin(a) * R0} x2={540 + Math.cos(a) * R1} y2={960 + Math.sin(a) * R1} stroke={color} strokeWidth={3 + r2 * 5} strokeLinecap="round" />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Barra de progreso fina arriba (retención) */
export const Progress: React.FC<{p: number}> = ({p}) => (
  <div style={{position: 'absolute', left: 60, right: 60, top: 92, height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.14)'}}>
    <div style={{width: `${p * 100}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${YELLOW}, ${ORANGE})`, boxShadow: `0 0 16px ${ORANGE}`}} />
  </div>
);

/** Efecto "rebobinar" estilo VHS */
export const Rewind: React.FC<{t: number; t0: number; t1: number}> = ({t, t0, t1}) => {
  if (t < t0 || t > t1) return null;
  const k = Math.sin(prog(t, t0, t1, (x) => x) * Math.PI);
  const bands = Array.from({length: 7}, (_, i) => i);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 6px)', opacity: k}} />
      {bands.map((i) => {
        const y = ((i * 311 + (t - t0) * 2400) % 2100) - 100;
        return <div key={i} style={{position: 'absolute', left: 0, right: 0, top: y, height: 18 + (i % 3) * 14, background: 'rgba(200,230,255,0.22)', filter: 'blur(3px)', opacity: k}} />;
      })}
      <div style={{position: 'absolute', left: 70, top: 200, fontFamily: BODY_FONT, fontWeight: 900, fontSize: 64, color: '#fff', opacity: k, ...stroke(10), textShadow: '0 0 18px rgba(120,200,255,0.9)'}}>
        ◀◀ REBOBINANDO
      </div>
    </AbsoluteFill>
  );
};

export const Disclaimer: React.FC<{t: number; t0: number; t1: number; text?: string}> = ({t, t0, t1, text = 'Escenario hipotético · simulación ilustrativa'}) => {
  if (t < t0 || t > t1) return null;
  const a = tw(t, [t0, t0 + 0.4, t1 - 0.3, t1], [0, 1, 1, 0], (x) => x);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 128, textAlign: 'center', opacity: a * 0.92}}>
      <span style={{fontFamily: BODY_FONT, fontWeight: 800, fontSize: 30, color: '#d8e6ff', background: 'rgba(8,14,40,0.55)', padding: '6px 18px', borderRadius: 20, letterSpacing: 1}}>
        ⚠ {text}
      </span>
    </div>
  );
};
