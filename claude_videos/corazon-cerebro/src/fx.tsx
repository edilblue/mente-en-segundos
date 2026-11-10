import React from 'react';
import {W, H, rng, noise1, clamp, rgba, project, Cam, V3, ramp} from './lib';
import {FONT_SANS, FONT_SERIF} from './fonts';

export const PAL = {
  bg: '#04050d',
  deep: '#0b0b24',
  violet: '#7b4dff',
  rose: '#ff4f86',
  coral: '#ff7a59',
  gold: '#ffc06b',
  cyan: '#45e0ff',
  teal: '#2fd6b5',
  ice: '#bfe9ff',
  blood: '#c4123a',
};

/** Fondo: degradado profundo + "nebulosa" + rayos volumétricos simulados */
export const Atmos: React.FC<{t: number; hue?: 'cool' | 'warm' | 'cold' | 'dawn'; rays?: number; drift?: number}> = ({t, hue = 'cool', rays = 0.6, drift = 0}) => {
  const c = {
    cool: ['#140a33', '#04050d', PAL.violet, PAL.rose],
    warm: ['#3a1428', '#090510', PAL.gold, PAL.rose],
    cold: ['#06142a', '#02040a', '#2a6bff', '#8fb4ff'],
    dawn: ['#2b1640', '#070712', PAL.coral, PAL.gold],
  }[hue];
  const sway = Math.sin(t * 0.25) * 40 + drift;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: `radial-gradient(120% 80% at ${50 + sway / 20}% 35%, ${c[0]} 0%, ${c[1]} 70%)`}}>
      <div
        style={{
          position: 'absolute',
          inset: -200,
          background: `radial-gradient(40% 30% at ${30 + Math.sin(t * 0.2) * 6}% ${25 + Math.cos(t * 0.17) * 4}%, ${rgba(c[2], 0.28)}, transparent 70%),
                       radial-gradient(45% 35% at ${72 + Math.cos(t * 0.15) * 5}% ${70 + Math.sin(t * 0.21) * 5}%, ${rgba(c[3], 0.22)}, transparent 70%)`,
        }}
      />
      {rays > 0 &&
        [0, 1, 2, 3, 4].map((i) => {
          const a = -28 + i * 13 + Math.sin(t * 0.3 + i) * 3;
          const op = rays * (0.05 + 0.04 * Math.sin(t * 0.7 + i * 1.7));
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: W * 0.5 - 90 + sway,
                top: -300,
                width: 180 + i * 40,
                height: H * 1.6,
                transformOrigin: '50% 0%',
                transform: `rotate(${a}deg)`,
                background: `linear-gradient(180deg, ${rgba(c[3], op * 2)} 0%, ${rgba(c[2], op)} 35%, transparent 80%)`,
                filter: 'blur(28px)',
                mixBlendMode: 'screen',
              }}
            />
          );
        })}
    </div>
  );
};

/** Partículas de polvo en un volumen 3D real, proyectadas con la cámara (paralaje auténtico) */
export const Dust: React.FC<{t: number; cam?: Partial<Cam>; n?: number; color?: string; seed?: number; speed?: number; size?: number; opacity?: number}> = ({
  t,
  cam = {},
  n = 140,
  color = PAL.ice,
  seed = 7,
  speed = 1,
  size = 1,
  opacity = 1,
}) => {
  const pts = React.useMemo(() => {
    const r = rng(seed);
    return Array.from({length: n}, () => [(r() - 0.5) * 2600, (r() - 0.5) * 4200, 200 + r() * 2600, r(), r()] as const);
  }, [n, seed]);
  const c: Cam = {x: 0, y: 0, z: 0, yaw: 0, pitch: 0, f: 900, ...cam};
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      {pts.map(([x, y, z, a, b], i) => {
        const yy = y - t * 25 * speed * (0.5 + a);
        const wrapY = ((((yy + 2100) % 4200) + 4200) % 4200) - 2100;
        const zz = ((((z - c.z - 200) % 2600) + 2600) % 2600) + 200 + c.z;
        const p: V3 = [x + Math.sin(t * 0.4 + b * 9) * 30, wrapY, zz];
        const [sx, sy, depth, s] = project(p, c);
        if (depth < 60 || sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) return null;
        const r = clamp((2 + a * 4) * s * size, 0.4, 26);
        const near = clamp(1 - depth / 2800);
        const tw = 0.6 + 0.4 * Math.sin(t * (1 + b * 2) + a * 20);
        return <circle key={i} cx={sx} cy={sy} r={r} fill={color} opacity={opacity * near * tw * (r > 8 ? 0.25 : 0.8)} />;
      })}
    </svg>
  );
};

/** bokeh cinematográfico (luces de ciudad desenfocadas) */
export const Bokeh: React.FC<{t: number; seed?: number; n?: number; colors?: string[]; slow?: number; opacity?: number; y0?: number; y1?: number}> = ({
  t,
  seed = 3,
  n = 34,
  colors = [PAL.gold, PAL.rose, PAL.coral, '#ffe0b0', PAL.violet],
  slow = 1,
  opacity = 1,
  y0 = 0,
  y1 = H,
}) => {
  const items = React.useMemo(() => {
    const r = rng(seed);
    return Array.from({length: n}, () => ({x: r() * W, y: y0 + r() * (y1 - y0), s: 30 + r() * 120, c: Math.floor(r() * 5), ph: r() * 10, d: r()}));
  }, [seed, n, y0, y1]);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}>
      <defs>
        {colors.map((c, i) => (
          <radialGradient key={i} id={`bk${seed}_${i}`}>
            <stop offset="0%" stopColor={c} stopOpacity={0.35} />
            <stop offset="78%" stopColor={c} stopOpacity={0.22} />
            <stop offset="92%" stopColor={c} stopOpacity={0.45} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>
      {items.map((b, i) => {
        const x = b.x + Math.sin(t * 0.3 * slow + b.ph) * 20 * b.d - t * 8 * slow * (b.d - 0.5);
        const y = b.y + Math.cos(t * 0.25 * slow + b.ph) * 14;
        const o = opacity * (0.45 + 0.35 * Math.sin(t * 0.8 * slow + b.ph));
        return <circle key={i} cx={x} cy={y} r={b.s} fill={`url(#bk${seed}_${b.c % colors.length})`} opacity={o} />;
      })}
    </svg>
  );
};

/** etiqueta científica con línea guía */
export const Label: React.FC<{x: number; y: number; tx: number; ty: number; text: string; sub?: string; color?: string; p: number; align?: 'left' | 'right'}> = ({
  x,
  y,
  tx,
  ty,
  text,
  sub,
  color = PAL.cyan,
  p,
  align = 'left',
}) => {
  if (p <= 0.001) return null;
  const lp = clamp(p * 1.6);
  const tp = clamp(p * 1.6 - 0.6);
  const ex = x + (tx - x) * lp;
  const ey = y + (ty - y) * lp;
  return (
    <>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <circle cx={x} cy={y} r={7 + 10 * (1 - lp)} fill="none" stroke={color} strokeWidth={2} opacity={lp} />
        <circle cx={x} cy={y} r={4} fill={color} opacity={lp} />
        <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth={2} opacity={0.85 * lp} />
        <line x1={tx} y1={ty} x2={tx + (align === 'left' ? 1 : -1) * 260 * tp} y2={ty} stroke={color} strokeWidth={2} opacity={0.85 * tp} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: align === 'left' ? tx + 4 : undefined,
          right: align === 'right' ? W - tx + 4 : undefined,
          top: ty - 62,
          textAlign: align,
          opacity: tp,
          transform: `translateY(${(1 - tp) * 14}px)`,
          fontFamily: FONT_SANS,
          color: '#fff',
          textShadow: `0 0 18px ${rgba(color, 0.9)}`,
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{fontSize: 40, fontWeight: 800, letterSpacing: 3}}>{text}</div>
        {sub && <div style={{fontSize: 26, fontWeight: 500, letterSpacing: 2, color: rgba('#ffffff', 0.75), marginTop: 76}}>{sub}</div>}
      </div>
    </>
  );
};

/** texto breve y estratégico, con revelado por letras y brillo */
export const Title: React.FC<{text: string; p: number; out?: number; y?: number; size?: number; color?: string; serif?: boolean; glow?: string; spacing?: number}> = ({
  text,
  p,
  out = 0,
  y = 300,
  size = 76,
  color = '#fff',
  serif = false,
  glow = PAL.rose,
  spacing = 2,
}) => {
  const vis = clamp(p) * (1 - clamp(out));
  if (vis <= 0.001) return null;
  const chars = [...text];
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: y,
        textAlign: 'center',
        fontFamily: serif ? FONT_SERIF : FONT_SANS,
        fontWeight: serif ? 700 : 900,
        fontStyle: serif ? 'italic' : 'normal',
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: spacing,
        color,
        opacity: 1 - clamp(out),
        filter: out > 0 ? `blur(${out * 12}px)` : undefined,
        textShadow: `0 0 30px ${rgba(glow, 0.8)}, 0 4px 30px rgba(0,0,0,0.8)`,
      }}
    >
      {(() => {
        let idx = 0;
        return text.split(' ').map((word, wi) => (
          <React.Fragment key={wi}>
            {wi > 0 && ' '}
            <span style={{display: 'inline-block', whiteSpace: 'nowrap'}}>
              {[...word].map((ch) => {
                const i = idx++;
                const q = clamp(p * (chars.length / 7 + 1) - i / 7);
                return (
                  <span key={i} style={{opacity: q, display: 'inline-block', transform: `translateY(${(1 - q) * 30}px) scale(${0.9 + 0.1 * q})`}}>
                    {ch}
                  </span>
                );
              })}
            </span>
          </React.Fragment>
        ));
      })()}
    </div>
  );
};

/** viñeta + brillo de bordes + aberración sutil */
export const Grade: React.FC<{t: number; vignette?: number; flash?: number; tint?: string; tintA?: number; desat?: number}> = ({t, vignette = 0.75, flash = 0, tint, tintA = 0}) => (
  <>
    {tint && tintA > 0 && <div style={{position: 'absolute', inset: 0, background: tint, opacity: tintA, mixBlendMode: 'color'}} />}
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(75% 60% at 50% 48%, transparent 45%, rgba(0,0,0,${vignette}) 100%)`}} />
    {flash > 0 && <div style={{position: 'absolute', inset: 0, background: '#fff6f0', opacity: flash, mixBlendMode: 'screen'}} />}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.05 + 0.02 * noise1(t * 8),
        background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 2px, transparent 4px)',
      }}
    />
  </>
);

/** marca del canal */
export const Brand: React.FC<{o?: number}> = ({o = 1}) => (
  <div style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', opacity: 0.55 * o, fontFamily: FONT_SANS, fontWeight: 800, fontSize: 24, letterSpacing: 9, color: '#fff'}}>
    MENTE EN SEGUNDOS
  </div>
);

/** contenedor de transición: entra/sale con zoom + desenfoque + fundido */
export const Shot: React.FC<{t: number; dur: number; inT?: number; outT?: number; inZoom?: number; outZoom?: number; children: React.ReactNode}> = ({
  t,
  dur,
  inT = 0.6,
  outT = 0.6,
  inZoom = 1.15,
  outZoom = 0.9,
  children,
}) => {
  const a = inT > 0 ? ramp(t, 0, inT) : 1;
  const b = outT > 0 ? ramp(t, dur - outT, dur) : 0;
  const z = (1 + (inZoom - 1) * (1 - a)) * (1 + (outZoom - 1) * b);
  const blur = (1 - a) * 14 + b * 14;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: a * (1 - b), transform: `scale(${z})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>{children}</div>
  );
};
