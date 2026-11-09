import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';

/** Lienzo 3D estándar del video (1080×1920, sombras suaves, sin tone mapping para colores vivos). */
export const Stage: React.FC<{children: React.ReactNode; bg?: string; fog?: [string, number, number]}> = ({children, bg, fog}) => (
  <AbsoluteFill style={{background: bg ?? 'radial-gradient(ellipse at 50% 40%, #1b3a78 0%, #0c1a3d 55%, #050b1f 100%)'}}>
    <ThreeCanvas
      width={1080}
      height={1920}
      shadows="soft"
      gl={{antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15}}
      camera={{fov: 40, position: [0, 0, 10], near: 0.05, far: 600}}
    >
      {fog && <fog attach="fog" args={fog} />}
      {children}
    </ThreeCanvas>
  </AbsoluteFill>
);
