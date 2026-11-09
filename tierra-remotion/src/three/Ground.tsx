import React, {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {House, Tree} from './Props';

/** Suelo con carretera, árboles, casas y montañas a lo largo del eje x */
export const Ground: React.FC<{from?: number; to?: number; mountainShift?: number; treeBend?: number; seed?: number; houses?: boolean; color?: string}> = ({
  from = -30, to = 120, mountainShift = 0, treeBend = 0, seed = 3, houses = true, color = '#4fb85a',
}) => {
  const deco = useMemo(() => {
    const r = rng(seed);
    const trees: {x: number; z: number; s: number; c: string}[] = [];
    for (let x = from; x < to; x += 2.6 + r() * 2) trees.push({x, z: -3.6 - r() * 2.5, s: 0.7 + r() * 0.5, c: ['#3fb84f', '#2f9a4a', '#6cc94a'][Math.floor(r() * 3)]});
    const hs: {x: number; z: number; c: string; roof: string}[] = [];
    for (let x = from + 3; x < to; x += 9 + r() * 6)
      hs.push({x, z: -8 - r() * 2, c: ['#fff1d6', '#ffd9e8', '#d8f0ff'][Math.floor(r() * 3)], roof: ['#e2533b', '#3f6fd9', '#f29b30'][Math.floor(r() * 3)]});
    const mts = Array.from({length: 26}, (_, i) => ({x: -120 + i * 11 + r() * 6, z: -60 - r() * 25, h: 10 + r() * 16, r: 9 + r() * 7, snow: r() > 0.5}));
    return {trees, hs, mts};
  }, [from, to, seed]);
  const len = to - from;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(from + to) / 2, 0, -20]} receiveShadow>
        <planeGeometry args={[len + 200, 140]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(from + to) / 2, 0.01, 0]} receiveShadow>
        <planeGeometry args={[len, 3.2]} />
        <meshStandardMaterial color="#3c4258" roughness={0.9} />
      </mesh>
      {Array.from({length: Math.floor(len / 2)}, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[from + i * 2, 0.02, 0]}>
          <planeGeometry args={[1, 0.14]} />
          <meshStandardMaterial color="#ffe08a" emissive="#ffd040" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {deco.trees.map((t, i) => (
        <Tree key={i} position={[t.x, 0, t.z]} scale={t.s} color={t.c} seed={i} bend={treeBend} />
      ))}
      {houses && deco.hs.map((h, i) => <House key={i} position={[h.x, 0, h.z]} color={h.c} roof={h.roof} scale={1.1} rotation={[0, 0.2, 0]} />)}
      <group position={[mountainShift, 0, 0]}>
        {deco.mts.map((m, i) => (
          <group key={i} position={[m.x, 0, m.z]}>
            <mesh position={[0, m.h / 2, 0]}>
              <coneGeometry args={[m.r, m.h, 6]} />
              <meshStandardMaterial color={i % 2 ? '#4f6aa8' : '#5a78b8'} flatShading />
            </mesh>
            {m.snow && (
              <mesh position={[0, m.h * 0.83, 0]}>
                <coneGeometry args={[m.r * 0.345, m.h * 0.34, 6]} />
                <meshStandardMaterial color="#eef4ff" flatShading />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </group>
  );
};

/** nubes sueltas en el cielo */
export const SkyClouds: React.FC<{shift?: number; y?: number; z?: number; count?: number; seed?: number}> = ({shift = 0, y = 14, z = -35, count = 14, seed = 5}) => {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: count}, (_, i) => ({x: -60 + i * 12 + r() * 6, y: y + r() * 6, z: z - r() * 15, s: 1.5 + r() * 1.6}));
  }, [count, seed, y, z]);
  const span = count * 12;
  return (
    <group>
      {items.map((c, i) => {
        const x = ((((c.x + shift + 60) % span) + span) % span) - 60;
        return (
          <group key={i} position={[x, c.y, c.z]} scale={c.s}>
            {[-0.8, 0, 0.8].map((dx, j) => (
              <mesh key={j} position={[dx, j === 1 ? 0.35 : 0, 0]} scale={j === 1 ? 1.1 : 0.8}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color="#e8f0ff" flatShading roughness={1} transparent opacity={0.92} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

export const SKY = 'linear-gradient(180deg, #0d1d4a 0%, #23498f 45%, #4f86c9 75%, #7fb2e0 100%)';
export const _unused = THREE;
