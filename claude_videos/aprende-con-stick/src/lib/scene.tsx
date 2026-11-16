import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FPS} from './anim';
import {EscenaData, makeCtx, SceneCtx, SceneProvider} from './timeline';

export type Cue = {at: number; sfx: string; vol?: number; dur?: number};
export type SceneModule = {
  Scene: React.FC;
  cues: (c: SceneCtx) => Cue[];
};

/** Monta una escena: calcula t en segundos y expone el contexto (palabras, duración). */
export const SceneHost: React.FC<{data: EscenaData; Scene: React.FC}> = ({data, Scene}) => {
  const frame = useCurrentFrame();
  const ctx = makeCtx(frame / FPS, data);
  return (
    <SceneProvider value={ctx}>
      <AbsoluteFill>
        <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{display: 'block'}}>
          <Scene />
        </svg>
      </AbsoluteFill>
    </SceneProvider>
  );
};

/** Cámara 2D: zoom alrededor de un foco + paneo + temblor. */
export const Cam: React.FC<{
  zoom?: number;
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
  rot?: number;
  shake?: [number, number];
  children: React.ReactNode;
}> = ({zoom = 1, fx = 540, fy = 960, x = 0, y = 0, rot = 0, shake = [0, 0], children}) => (
  <g
    transform={`translate(${540 + shake[0]} ${960 + shake[1]}) rotate(${rot}) scale(${zoom}) translate(${-fx - x} ${-fy - y})`}
  >
    {children}
  </g>
);
