import React, {useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
type G = ThreeElements['group'];
import {useThree} from '@react-three/fiber';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {rng} from '../lib/anim';

// ---------------------------------------------------------------- cámara
export const Rig: React.FC<{pos: [number, number, number]; target: [number, number, number]; fov?: number; roll?: number; up?: [number, number, number]}> = ({pos, target, fov = 40, roll = 0, up = [0, 1, 0]}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  camera.up.set(...up);
  camera.lookAt(...target);
  if (roll) camera.rotateZ(roll);
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.near = 0.05;
  camera.far = 600;
  camera.updateProjectionMatrix();
  return null;
};

export const KeyLight: React.FC<{pos?: [number, number, number]; intensity?: number; color?: string; size?: number; target?: [number, number, number]; map?: number}> = ({pos = [6, 10, 7], intensity = 3, color = '#fff4e0', size = 12, target = [0, 0, 0], map = 2048}) => {
  const light = useMemo(() => new THREE.DirectionalLight(), []);
  light.position.set(...pos);
  light.target.position.set(...target);
  light.target.updateMatrixWorld();
  light.color.set(color);
  light.intensity = intensity;
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const cam = light.shadow.camera;
  cam.left = -size; cam.right = size; cam.top = size; cam.bottom = -size; cam.near = 0.5; cam.far = 200;
  cam.updateProjectionMatrix();
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
  light.shadow.radius = 4;
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
};

// ---------------------------------------------------------------- flecha
export const Arrow3D: React.FC<{length: number; color?: string; radius?: number; emissive?: number} & G> = ({length, color = '#ffd23f', radius = 0.12, emissive = 0.5, ...p}) => {
  if (length <= 0.02) return null;
  const head = Math.min(radius * 3.2, length * 0.6);
  const shaft = Math.max(0.001, length - head);
  return (
    <group {...p}>
      {/* apunta hacia +x */}
      <mesh position={[shaft / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius, radius, shaft, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.4} />
      </mesh>
      <mesh position={[shaft + head / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[radius * 2.4, head, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.4} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- etiqueta 3D (canvas → sprite)
const labelCache = new Map<string, {tex: THREE.CanvasTexture; aspect: number}>();
export const makeLabel = (text: string, bg: string, fg: string, font = 'Luckiest Guy') => {
  const k = `${text}|${bg}|${fg}|${font}`;
  if (labelCache.has(k)) return labelCache.get(k)!;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const fs = 120;
  ctx.font = `${fs}px "${font}"`;
  const w = Math.ceil(ctx.measureText(text).width) + fs * 1.0;
  const h = Math.ceil(fs * 1.55);
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const r = h / 2.3;
  if (bg !== 'none') {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.roundRect(6, 14, w - 12, h - 16, r);
    g.fill();
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(4, 4, w - 12, h - 18, r);
    g.fill();
  }
  g.font = `${fs}px "${font}"`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (bg === 'none') {
    g.lineWidth = 22;
    g.strokeStyle = '#0b1430';
    g.lineJoin = 'round';
    g.strokeText(text, w / 2 - 4, h / 2);
  }
  g.fillStyle = fg;
  g.fillText(text, w / 2 - 4, h / 2 + fs * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const res = {tex, aspect: w / h};
  labelCache.set(k, res);
  return res;
};

export const Label3D: React.FC<{text: string; height?: number; bg?: string; fg?: string; opacity?: number; scale?: number} & G> = ({text, height = 0.6, bg = '#ffd23f', fg = '#1a1440', opacity = 1, scale = 1, ...p}) => {
  const {tex, aspect} = makeLabel(text, bg, fg);
  if (scale <= 0.001 || opacity <= 0.001) return null;
  return (
    <group {...p}>
      <sprite scale={[height * aspect * scale, height * scale, 1]} renderOrder={10}>
        <spriteMaterial map={tex} transparent opacity={opacity} depthTest={false} depthWrite={false} />
      </sprite>
    </group>
  );
};

// ---------------------------------------------------------------- estrellas
export const Stars: React.FC<{count?: number; radius?: number; size?: number; opacity?: number; seed?: number}> = ({count = 1600, radius = 220, size = 1.6, opacity = 1, seed = 7}) => {
  const geo = useMemo(() => {
    const r = rng(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const rr = radius * (0.8 + r() * 0.2);
      pos.set([s * Math.cos(th) * rr, u * rr, s * Math.sin(th) * rr], i * 3);
      const tint = r();
      const c = new THREE.Color(tint < 0.15 ? '#ffd9a0' : tint < 0.3 ? '#a8c8ff' : '#ffffff').multiplyScalar(0.55 + r() * 0.45);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count, radius, seed]);
  const tex = useGlowTexture();
  return (
    <points geometry={geo}>
      <pointsMaterial size={size} sizeAttenuation vertexColors map={tex} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

let glowTex: THREE.Texture | null = null;
export const useGlowTexture = () => {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
};

export const Glow: React.FC<{color: string; size: number; opacity?: number} & G> = ({color, size, opacity = 1, ...p}) => {
  const tex = useGlowTexture();
  return (
    <group {...p}>
      <sprite scale={[size, size, 1]}>
        <spriteMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
};

export const Sun: React.FC<{radius: number; spin?: number} & G> = ({radius, spin = 0, ...p}) => (
  <group {...p}>
    <mesh rotation={[0.3, spin, 0]}>
      <icosahedronGeometry args={[radius, 3]} />
      <meshBasicMaterial color="#ffd04a" />
    </mesh>
    <mesh rotation={[0, -spin * 1.3, 0.4]} scale={1.04}>
      <icosahedronGeometry args={[radius, 1]} />
      <meshBasicMaterial color="#ffb21f" wireframe transparent opacity={0.35} />
    </mesh>
    <Glow color="#ffb347" size={radius * 5} opacity={0.9} />
    <Glow color="#ff7b1f" size={radius * 9} opacity={0.45} />
  </group>
);

// ---------------------------------------------------------------- objetos cotidianos
const rbCache = new Map<string, THREE.BufferGeometry>();
export const roundBox = (w: number, h: number, d: number, r = 0.08) => {
  const k = `${w},${h},${d},${r}`;
  if (!rbCache.has(k)) rbCache.set(k, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1)));
  return rbCache.get(k)!;
};

export const Building: React.FC<{w: number; h: number; d: number; color: string; roof?: string; seed?: number; lit?: number; topOffset?: [number, number, number]; topRot?: [number, number, number]} & G> = ({w, h, d, color, roof = '#e9e2d0', seed = 1, lit = 0.25, topOffset, topRot, ...p}) => {
  const wins = useMemo(() => {
    const r = rng(seed);
    const out: {x: number; y: number; on: boolean}[] = [];
    const cols = Math.max(1, Math.floor(w / 0.55));
    const rows = Math.max(1, Math.floor((h - 0.6) / 0.7));
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) out.push({x: (i - (cols - 1) / 2) * (w / cols), y: 0.55 + j * 0.7, on: r() < 0.55});
    return out;
  }, [w, h, seed]);
  const topH = Math.min(0.9, h * 0.22);
  return (
    <group {...p}>
      <mesh geometry={roundBox(w, h - topH, d, 0.1)} position={[0, (h - topH) / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {wins.filter((x) => x.y < h - topH - 0.2).map((x, i) => (
        <mesh key={i} position={[x.x, x.y, d / 2 + 0.01]}>
          <boxGeometry args={[0.28, 0.36, 0.04]} />
          <meshStandardMaterial color={x.on ? '#ffe08a' : '#2b3c66'} emissive={x.on ? '#ffc94a' : '#000000'} emissiveIntensity={x.on ? lit * 3 : 0} />
        </mesh>
      ))}
      {/* parte superior (se puede arrancar con el viento) */}
      <group position={[(topOffset?.[0] ?? 0), h - topH + (topOffset?.[1] ?? 0), topOffset?.[2] ?? 0]} rotation={topRot ?? [0, 0, 0]}>
        <mesh geometry={roundBox(w * 1.04, topH, d * 1.04, 0.1)} position={[0, topH / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={roof} roughness={0.7} />
        </mesh>
        <mesh position={[w * 0.2, topH + 0.15, 0]} castShadow>
          <boxGeometry args={[0.35, 0.3, 0.35]} />
          <meshStandardMaterial color="#9aa7c4" />
        </mesh>
      </group>
    </group>
  );
};

export const Tree: React.FC<{bend?: number; scale?: number; color?: string; seed?: number} & G> = ({bend = 0, scale = 1, color = '#3fb84f', seed = 2, ...p}) => {
  const r = rng(seed);
  const blobs = [0, 1, 2].map(() => ({x: (r() - 0.5) * 0.5, y: r() * 0.4, s: 0.45 + r() * 0.25}));
  return (
    <group {...p} scale={scale}>
      <group rotation={[0, 0, -bend * 0.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.14, 0.9, 7]} />
          <meshStandardMaterial color="#8a5a35" flatShading />
        </mesh>
        <group position={[0, 0.9, 0]} rotation={[0, 0, -bend * 0.6]}>
          {blobs.map((b, i) => (
            <mesh key={i} position={[b.x + bend * 0.3, 0.35 + b.y, 0]} scale={[b.s * (1 + bend * 0.3), b.s, b.s]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={i === 1 ? new THREE.Color(color).offsetHSL(0, 0, 0.06) : color} flatShading roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};

export const Palm: React.FC<{bend?: number; scale?: number} & G> = ({bend = 0, scale = 1, ...p}) => (
  <group {...p} scale={scale}>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh key={i} position={[bend * i * i * 0.04, 0.3 + i * 0.5, 0]} rotation={[0, 0, -bend * i * 0.12]} castShadow>
        <cylinderGeometry args={[0.1 - i * 0.008, 0.12 - i * 0.008, 0.52, 7]} />
        <meshStandardMaterial color={i % 2 ? '#9b6b3c' : '#b07d48'} flatShading />
      </mesh>
    ))}
    <group position={[bend * 0.7, 2.6, 0]}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} rotation={[0, (i / 6) * Math.PI * 2, 0.9 - bend * 0.4 * Math.cos((i / 6) * Math.PI * 2)]} position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 1.3, 0.35]} />
          <meshStandardMaterial color="#2fae4f" flatShading />
        </mesh>
      ))}
    </group>
  </group>
);

export const Car: React.FC<{color?: string; wheelSpin?: number} & G> = ({color = '#ff4d6d', wheelSpin = 0, ...p}) => (
  <group {...p}>
    <mesh geometry={roundBox(1.7, 0.5, 0.9, 0.18)} position={[0, 0.45, 0]} castShadow>
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
    <mesh geometry={roundBox(0.95, 0.42, 0.8, 0.16)} position={[-0.1, 0.85, 0]} castShadow>
      <meshStandardMaterial color="#bfe6ff" roughness={0.1} metalness={0.2} />
    </mesh>
    {[[-0.55, 0.45], [0.55, 0.45], [-0.55, -0.45], [0.55, -0.45]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, wheelSpin]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 12]} />
        <meshStandardMaterial color="#222233" flatShading />
      </mesh>
    ))}
    <mesh position={[0.86, 0.5, 0.25]}>
      <sphereGeometry args={[0.07, 8, 6]} />
      <meshStandardMaterial color="#fff6c2" emissive="#ffe27a" emissiveIntensity={1} />
    </mesh>
    <mesh position={[0.86, 0.5, -0.25]}>
      <sphereGeometry args={[0.07, 8, 6]} />
      <meshStandardMaterial color="#fff6c2" emissive="#ffe27a" emissiveIntensity={1} />
    </mesh>
  </group>
);

export const LampPost: React.FC<G & {bend?: number}> = ({bend = 0, ...p}) => (
  <group {...p}>
    <mesh position={[0, 1.6, 0]} castShadow>
      <cylinderGeometry args={[0.07, 0.1, 3.2, 8]} />
      <meshStandardMaterial color="#3a4766" metalness={0.3} roughness={0.5} />
    </mesh>
    <group position={[0, 3.2, 0]} rotation={[0, 0, -bend]}>
      <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 6]} />
        <meshStandardMaterial color="#3a4766" />
      </mesh>
      <mesh position={[0.6, -0.1, 0]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#fff2b0" emissive="#ffd860" emissiveIntensity={1.2} />
      </mesh>
    </group>
  </group>
);

export const Crate: React.FC<G & {size?: number}> = ({size = 0.7, ...p}) => (
  <group {...p}>
    <mesh geometry={roundBox(size, size, size, 0.05)} castShadow receiveShadow>
      <meshStandardMaterial color="#d9954a" roughness={0.9} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[0, 0, s * size * 0.5]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[size * 1.2, size * 0.12, 0.03]} />
        <meshStandardMaterial color="#a8682c" />
      </mesh>
    ))}
  </group>
);

export const Ball: React.FC<G & {r?: number}> = ({r = 0.35, ...p}) => (
  <group {...p}>
    <mesh castShadow>
      <sphereGeometry args={[r, 20, 16]} />
      <meshStandardMaterial color="#ff4d6d" roughness={0.4} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.005}>
      <torusGeometry args={[r, r * 0.12, 6, 24]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  </group>
);

export const TrafficCone: React.FC<G> = (p) => (
  <group {...p}>
    <mesh position={[0, 0.35, 0]} castShadow>
      <coneGeometry args={[0.24, 0.7, 12]} />
      <meshStandardMaterial color="#ff8a1f" />
    </mesh>
    <mesh position={[0, 0.32, 0]}>
      <cylinderGeometry args={[0.135, 0.165, 0.12, 12]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
    <mesh position={[0, 0.03, 0]} castShadow>
      <boxGeometry args={[0.55, 0.06, 0.55]} />
      <meshStandardMaterial color="#ff8a1f" />
    </mesh>
  </group>
);

export const House: React.FC<G & {color?: string; roof?: string}> = ({color = '#fff1d6', roof = '#e2533b', ...p}) => (
  <group {...p}>
    <mesh geometry={roundBox(1.4, 1.0, 1.2, 0.06)} position={[0, 0.5, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} />
    </mesh>
    <mesh position={[0, 1.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[1.12, 0.75, 4]} />
      <meshStandardMaterial color={roof} flatShading />
    </mesh>
    <mesh position={[0, 0.32, 0.61]}>
      <boxGeometry args={[0.3, 0.55, 0.04]} />
      <meshStandardMaterial color="#7a4a2a" />
    </mesh>
    <mesh position={[0.4, 0.62, 0.61]}>
      <boxGeometry args={[0.28, 0.26, 0.04]} />
      <meshStandardMaterial color="#9fe0ff" emissive="#6cc8ff" emissiveIntensity={0.3} />
    </mesh>
  </group>
);

export const Bench: React.FC<G> = (p) => (
  <group {...p}>
    <mesh geometry={roundBox(1.6, 0.1, 0.5, 0.04)} position={[0, 0.5, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#c9783e" />
    </mesh>
    <mesh geometry={roundBox(1.6, 0.4, 0.08, 0.03)} position={[0, 0.8, -0.22]} castShadow>
      <meshStandardMaterial color="#c9783e" />
    </mesh>
    {[-0.65, 0.65].map((x) => (
      <mesh key={x} position={[x, 0.25, 0]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.45]} />
        <meshStandardMaterial color="#3a4766" />
      </mesh>
    ))}
  </group>
);
