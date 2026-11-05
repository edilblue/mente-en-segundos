import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, H, W, boil, jit, wobblyLine} from '../lib/anim';

/** Hoja de cuaderno con líneas azules tenues que "hierven" (boiling line). */
export const Notebook: React.FC<{frame: number; zoom?: number; dx?: number; dy?: number}> = ({
  frame,
  zoom = 1,
  dx = 0,
  dy = 0,
}) => {
  const lines: React.ReactNode[] = [];
  const pz = 1 + (zoom - 1) * 0.3; // parallax: el fondo se mueve menos que la escena
  for (let i = 0; i < 26; i++) {
    const y = 230 + i * 68;
    lines.push(
      <path key={i} d={wobblyLine(-40, y, W + 40, y, frame, `rule${i}`, 1.3, 135)} stroke={C.rule} strokeWidth={3} fill="none" opacity={0.75} />,
    );
  }
  const b = boil(frame, 4);
  return (
    <AbsoluteFill style={{backgroundColor: C.paper}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <g transform={`translate(${W / 2 + dx * 0.4} ${H / 2 + dy * 0.4}) scale(${pz}) translate(${-W / 2} ${-H / 2})`}>
          <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={C.paper} />
          {lines}
          <path d={wobblyLine(118, -60, 118, H + 60, frame, 'margin', 1.4, 160)} stroke={C.margin} strokeWidth={3.5} fill="none" />
          {[420, 960, 1500].map((y, i) => (
            <circle key={i} cx={52 + jit(`hole${i}${b}`, 0.8)} cy={y} r={20} fill="#EDEBE3" stroke="#D6D3C8" strokeWidth={3} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export type Cam = {x: number; y: number; zoom: number; rot?: number};
export type Shake = {x: number; y: number; r: number};

/**
 * Marco de escena: fondo de cuaderno + capa "mundo" con cámara (zoom, paneo,
 * rotación y temblor) + capa de pantalla (efectos fijos a la cámara).
 */
export const SceneFrame: React.FC<{
  frame: number;
  cam: Cam;
  shake?: Shake;
  children?: React.ReactNode;
  screen?: React.ReactNode;
  background?: React.ReactNode;
  paper?: boolean;
}> = ({frame, cam, shake = {x: 0, y: 0, r: 0}, children, screen, background, paper = true}) => {
  const t = `translate(${W / 2 + shake.x} ${H / 2 + shake.y}) rotate(${(cam.rot ?? 0) + shake.r}) scale(${cam.zoom}) translate(${-cam.x} ${-cam.y})`;
  return (
    <AbsoluteFill>
      {paper && <Notebook frame={frame} zoom={cam.zoom} dx={shake.x + (W / 2 - cam.x) * 0.15} dy={shake.y + (H / 2 - cam.y) * 0.15} />}
      <AbsoluteFill>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow: 'hidden'}}>
          {background}
          <g transform={t}>{children}</g>
          <g transform={`translate(${shake.x * 0.6} ${shake.y * 0.6})`}>{screen}</g>
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Línea de suelo dibujada a mano. */
export const Ground: React.FC<{frame: number; y: number; x0?: number; x1?: number; seed?: string; width?: number}> = ({
  frame,
  y,
  x0 = -300,
  x1 = W + 300,
  seed = 'ground',
  width = 9,
}) => (
  <g>
    <path d={wobblyLine(x0, y, x1, y, frame, seed, 2, 90)} stroke={C.ink} strokeWidth={width} fill="none" strokeLinecap="round" />
    <path d={wobblyLine(x0 + 60, y + 22, x1 - 200, y + 22, frame, seed + 'b', 2, 120)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="40 30" opacity={0.35} />
  </g>
);
