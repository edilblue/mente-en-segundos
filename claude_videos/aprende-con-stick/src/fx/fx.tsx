import React from 'react';
import {C, FONT} from '../lib/theme';
import {clamp, ease, flash, invLerp, lerp, noise1, pop, prog, rnd, springAt} from '../lib/anim';

type Pt = [number, number];

// ---------------------------------------------------------------- curvas
export const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};
export type Curve = [Pt, Pt, Pt, Pt];
export const curveD = (c: Curve) => `M ${c[0]} C ${c[1]} ${c[2]} ${c[3]}`;
export const curvePt = (c: Curve, t: number) => bez(c[0], c[1], c[2], c[3], t);

/** Nervio/conexión que se dibuja (draw-on) y por el que viajan pulsos luminosos. */
export const Signal: React.FC<{
  c: Curve;
  t: number;
  t0: number; // inicio del trazado
  draw?: number; // segundos de trazado
  pulses?: number; // pulsos por segundo
  color?: string;
  width?: number;
  speed?: number;
  dashed?: boolean;
  active?: number; // 0..1 intensidad de los pulsos
}> = ({c, t, t0, draw = 0.6, pulses = 1.6, color = C.yellow, width = 10, speed = 0.9, dashed = false, active = 1}) => {
  const p = prog(t, t0, t0 + draw, ease.out);
  if (p <= 0) return null;
  // longitud aproximada
  let len = 0;
  let prev = c[0];
  for (let i = 1; i <= 24; i++) {
    const q = curvePt(c, i / 24);
    len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    prev = q;
  }
  const n = Math.max(1, Math.round(pulses * 2));
  const dots = [];
  if (p >= 1 && active > 0) {
    for (let i = 0; i < n; i++) {
      const u = ((t - t0 - draw) * speed + i / n) % 1;
      if (u < 0) continue;
      const q = curvePt(c, u);
      dots.push(
        <g key={i} opacity={active * Math.sin(u * Math.PI)}>
          <circle cx={q[0]} cy={q[1]} r={width * 1.6} fill={color} opacity={0.35} />
          <circle cx={q[0]} cy={q[1]} r={width * 0.85} fill={C.white} stroke={color} strokeWidth={4} />
        </g>,
      );
    }
  }
  return (
    <g>
      <path d={curveD(c)} fill="none" stroke={C.ink} strokeOpacity={0.12} strokeWidth={width + 8} strokeLinecap="round"
        strokeDasharray={`${len * p} ${len}`} />
      <path d={curveD(c)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"
        strokeDasharray={dashed ? '2 22' : `${len * p} ${len}`} opacity={dashed ? p : 1} />
      {dots}
    </g>
  );
};

// ---------------------------------------------------------------- textos
export const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  t: number;
  t0: number;
  t1?: number;
  bg?: string;
  fg?: string;
  size?: number;
  rot?: number;
  border?: boolean;
}> = ({x, y, text, t, t0, t1 = 1e9, bg = C.white, fg = C.ink, size = 44, rot = 0, border = true}) => {
  const s = pop(t, t0) * (1 - prog(t, t1, t1 + 0.25, ease.in));
  if (s <= 0.001) return null;
  const w = text.length * size * 0.56 + size * 1.1;
  const h = size * 1.55;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <rect x={-w / 2 + 6} y={-h / 2 + 8} width={w} height={h} rx={h / 2} fill={C.shadow} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={bg} stroke={border ? C.ink : 'none'} strokeWidth={7} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={size} fill={fg}>
        {text}
      </text>
    </g>
  );
};

/** Titular con contorno grueso (estilo cartoon). */
export const Title: React.FC<{
  x: number;
  y: number;
  text: string;
  t: number;
  t0: number;
  t1?: number;
  size?: number;
  fill?: string;
  rot?: number;
  anchor?: 'middle' | 'start' | 'end';
}> = ({x, y, text, t, t0, t1 = 1e9, size = 92, fill = C.yellow, rot = 0, anchor = 'middle'}) => {
  const s = pop(t, t0) * (1 - prog(t, t1, t1 + 0.22, ease.in));
  if (s <= 0.001) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} fontFamily={FONT} fontWeight={700} fontSize={size}>
      <text x={6} y={8} textAnchor={anchor} fill={C.ink} opacity={0.25}>
        {text}
      </text>
      <text x={0} y={0} textAnchor={anchor} fill="none" stroke={C.ink} strokeWidth={size * 0.2} strokeLinejoin="round">
        {text}
      </text>
      <text x={0} y={0} textAnchor={anchor} fill={fill}>
        {text}
      </text>
    </g>
  );
};

/** Sello que cae con fuerza ("¡ALTO!"). */
export const Stamp: React.FC<{x: number; y: number; text: string; t: number; t0: number; color?: string; rot?: number; size?: number}> = ({
  x,
  y,
  text,
  t,
  t0,
  color = C.red,
  rot = -10,
  size = 92,
}) => {
  if (t < t0) return null;
  const u = clamp((t - t0) / 0.16);
  const sc = lerp(2.6, 1, ease.in(u)) + (u >= 1 ? (1 - springAt(t, t0 + 0.16, {stiffness: 400, damping: 14})) * -0.12 : 0);
  const w = text.length * size * 0.62 + 80;
  const h = size * 1.45;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={lerp(0.2, 1, u)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={26} fill={C.white} fillOpacity={0.9} stroke={color} strokeWidth={14} />
      <rect x={-w / 2 + 16} y={-h / 2 + 16} width={w - 32} height={h - 32} rx={16} fill="none" stroke={color} strokeWidth={5} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={size} fill={color}>
        {text}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------- efectos gráficos
export const Burst: React.FC<{cx: number; cy: number; t: number; colors?: [string, string]; rays?: number; r?: number; spin?: number}> = ({
  cx,
  cy,
  t,
  colors = [C.yellow, C.yellowSoft],
  rays = 18,
  r = 1800,
  spin = 8,
}) => (
  <g transform={`translate(${cx} ${cy}) rotate(${t * spin})`}>
    <circle r={r} fill={colors[1]} />
    {Array.from({length: rays}).map((_, i) => {
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = a0 + Math.PI / rays;
      return <path key={i} d={`M0 0 L ${Math.cos(a0) * r} ${Math.sin(a0) * r} L ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`} fill={colors[0]} />;
    })}
  </g>
);

export const SpeedLines: React.FC<{cx: number; cy: number; t: number; r0?: number; n?: number; color?: string; opacity?: number}> = ({
  cx,
  cy,
  t,
  r0 = 420,
  n = 34,
  color = C.ink,
  opacity = 1,
}) => (
  <g opacity={opacity}>
    {Array.from({length: n}).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + rnd(i, 3) * 0.15;
      const jitter = noise1(t * 12 + i, 5) * 60;
      const ra = r0 + rnd(i, 1) * 120 + jitter;
      const rb = 1500;
      const w = 6 + rnd(i, 2) * 16;
      const p = (q: number) => `${cx + Math.cos(a) * q} ${cy + Math.sin(a) * q}`;
      const n2 = [Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w];
      return (
        <path
          key={i}
          d={`M ${p(ra)} L ${cx + Math.cos(a) * rb + n2[0]} ${cy + Math.sin(a) * rb + n2[1]} L ${cx + Math.cos(a) * rb - n2[0]} ${cy + Math.sin(a) * rb - n2[1]} Z`}
          fill={color}
        />
      );
    })}
  </g>
);

/** Ondas expansivas (alarmas, golpes, ladridos). */
export const Rings: React.FC<{x: number; y: number; t: number; t0: number; color?: string; every?: number; r0?: number; r1?: number; width?: number; until?: number}> = ({
  x,
  y,
  t,
  t0,
  color = C.red,
  every = 0.45,
  r0 = 30,
  r1 = 200,
  width = 8,
  until = 1e9,
}) => {
  if (t < t0) return null;
  const out = [];
  for (let k = 0; k < 4; k++) {
    const start = t0 + Math.floor((t - t0) / every) * every - k * every;
    if (start < t0 || start > until) continue;
    const u = (t - start) / (every * 3);
    if (u > 1) continue;
    out.push(<circle key={k} cx={x} cy={y} r={lerp(r0, r1, ease.out(u))} fill="none" stroke={color} strokeWidth={width * (1 - u)} opacity={1 - u} />);
  }
  return <g>{out}</g>;
};

/** Líneas de "sonido" que salen de un punto en un abanico (ladrido, alarma). */
export const SoundLines: React.FC<{x: number; y: number; angle: number; t: number; on: number; color?: string; spread?: number; s?: number}> = ({
  x,
  y,
  angle,
  t,
  on,
  color = C.ink,
  spread = 50,
  s = 1,
}) => {
  if (on <= 0.01) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`} opacity={on}>
      {[-1, 0, 1].map((k) => {
        const a = (k * spread * Math.PI) / 180 / 1.5;
        const r0 = 30 + ((t * 120) % 30);
        return (
          <line
            key={k}
            x1={Math.cos(a) * r0}
            y1={Math.sin(a) * r0}
            x2={Math.cos(a) * (r0 + 46)}
            y2={Math.sin(a) * (r0 + 46)}
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
};

export const Sparkle: React.FC<{x: number; y: number; s: number; color?: string; rot?: number}> = ({x, y, s, color = C.yellow, rot = 0}) =>
  s <= 0.01 ? null : (
    <path
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
      d="M0 -30 C 4 -6 6 -4 30 0 C 6 4 4 6 0 30 C -4 6 -6 4 -30 0 C -6 -4 -4 -6 0 -30 Z"
      fill={color}
      stroke={C.ink}
      strokeWidth={4}
    />
  );

/** Notas musicales flotando (silbido despreocupado). */
export const Notes: React.FC<{x: number; y: number; t: number; on?: number}> = ({x, y, t, on = 1}) => (
  <g opacity={on}>
    {[0, 1, 2].map((i) => {
      const u = (t * 0.7 + i / 3) % 1;
      const px = x + u * 70 + Math.sin(u * 8 + i) * 14;
      const py = y - u * 150;
      return (
        <g key={i} transform={`translate(${px} ${py}) rotate(${Math.sin(u * 6) * 14}) scale(${0.8 + 0.3 * Math.sin(u * Math.PI)})`} opacity={Math.sin(u * Math.PI)}>
          <ellipse cx={0} cy={0} rx={13} ry={10} fill={C.blue} stroke={C.ink} strokeWidth={4} transform="rotate(-20)" />
          <line x1={11} y1={-2} x2={11} y2={-46} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
          {i % 2 === 0 && <path d="M11 -46 Q 30 -40 26 -24" fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" />}
        </g>
      );
    })}
  </g>
);

/** Superposición de "pausa": congela la acción (tinte azul, marco y símbolo ⏸). */
export const FreezeOverlay: React.FC<{t: number; t0: number; t1?: number}> = ({t, t0, t1 = 1e9}) => {
  const a = prog(t, t0, t0 + 0.12) * (1 - prog(t, t1, t1 + 0.15));
  if (a <= 0) return null;
  const f = flash(t, t0, 0.3);
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill={C.blue} opacity={0.16 * a} />
      <rect x={0} y={0} width={1080} height={1920} fill={C.white} opacity={0.75 * f} />
      <rect x={30} y={170} width={1020} height={1580} rx={30} fill="none" stroke={C.white} strokeWidth={10} strokeDasharray="60 30" opacity={0.85 * a} />
      <g transform={`translate(110 260) scale(${a})`} opacity={a}>
        <circle r={58} fill={C.white} stroke={C.ink} strokeWidth={8} />
        <rect x={-22} y={-26} width={14} height={52} rx={4} fill={C.ink} />
        <rect x={8} y={-26} width={14} height={52} rx={4} fill={C.ink} />
      </g>
    </g>
  );
};

/** Barrido de cámara rápido (whip pan): franjas horizontales de movimiento. */
export const WhipStripes: React.FC<{t: number; t0: number; dur?: number; dir?: 1 | -1}> = ({t, t0, dur = 0.42, dir = 1}) => {
  const u = invLerp(t0 - dur / 2, t0 + dur / 2, t);
  if (u <= 0 || u >= 1) return null;
  const a = Math.sin(u * Math.PI);
  return (
    <g opacity={a}>
      <rect x={0} y={0} width={1080} height={1920} fill={C.paper} opacity={0.75 * a} />
      {Array.from({length: 26}).map((_, i) => {
        const y = (i / 26) * 1920 + rnd(i) * 40;
        const w = 300 + rnd(i, 4) * 700;
        const x = dir * (u * 2400 - 1200) + rnd(i, 6) * 600 - 300;
        return <rect key={i} x={x} y={y} width={w} height={10 + rnd(i, 8) * 24} rx={10} fill={i % 3 ? C.blueSoft : C.ink} opacity={0.5} />;
      })}
    </g>
  );
};

/** Iris: máscara circular para transiciones motivadas. Renderiza children dentro del círculo. */
export const Iris: React.FC<{cx: number; cy: number; r: number; id: string; children: React.ReactNode}> = ({cx, cy, r, id, children}) => (
  <g>
    <defs>
      <clipPath id={id}>
        <circle cx={cx} cy={cy} r={Math.max(0, r)} />
      </clipPath>
    </defs>
    <g clipPath={`url(#${id})`}>{children}</g>
  </g>
);

/** Fondo de papel con textura de puntos muy suave. */
export const Paper: React.FC<{color?: string; dots?: string}> = ({color = C.paper, dots = '#E9E2D2'}) => (
  <g>
    <defs>
      <pattern id="paperDots" width={36} height={36} patternUnits="userSpaceOnUse">
        <circle cx={6} cy={6} r={2.2} fill={dots} />
      </pattern>
    </defs>
    <rect width={1080} height={1920} fill={color} />
    <rect width={1080} height={1920} fill="url(#paperDots)" opacity={0.6} />
  </g>
);
