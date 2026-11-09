import React, {useMemo} from 'react';
import * as THREE from 'three';
import {fbm3, rng} from '../lib/anim';

const C = {
  deep: new THREE.Color('#1f6fd6'),
  shallow: new THREE.Color('#38a3ff'),
  sand: new THREE.Color('#f2d58a'),
  grass: new THREE.Color('#58c45a'),
  forest: new THREE.Color('#2f9a4a'),
  hill: new THREE.Color('#8fbf4a'),
  rock: new THREE.Color('#a77f5a'),
  snow: new THREE.Color('#f4f8ff'),
  desert: new THREE.Color('#e8b45e'),
};

export const landAt = (p: THREE.Vector3) => fbm3(p.x * 1.6 + 3, p.y * 1.6 + 1, p.z * 1.6 + 7, 11, 4);
const LAND = 0.52;

/** Geometría low-poly del planeta (radio 1), con colores por cara y relieve. */
export const usePlanetGeometry = (detail = 5) =>
  useMemo(() => {
    const base = new THREE.IcosahedronGeometry(1, detail).toNonIndexed();
    const pos = base.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const heights = new Map<string, number>();
    const key = (x: number, y: number, z: number) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    // relieve por vértice (coherente entre caras)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const k = key(v.x, v.y, v.z);
      if (!heights.has(k)) {
        const n = landAt(v);
        const h = n > LAND ? 1 + (n - LAND) * 0.22 + Math.max(0, n - 0.62) * 0.35 : 0.985;
        heights.set(k, h);
      }
      const h = heights.get(k)!;
      pos.setXYZ(i, v.x * h, v.y * h, v.z * h);
    }
    const c = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      c.set(0, 0, 0);
      for (let j = 0; j < 3; j++) c.add(v.fromBufferAttribute(pos, i + j));
      c.divideScalar(3);
      const r = c.length();
      const dir = c.clone().normalize();
      const n = landAt(dir);
      const lat = Math.abs(dir.y);
      const jitter = fbm3(dir.x * 9, dir.y * 9, dir.z * 9, 5, 2) - 0.5;
      if (lat > 0.972 - jitter * 0.03) col.copy(C.snow);
      else if (n <= LAND) col.copy(C.deep).lerp(C.shallow, Math.max(0, Math.min(1, (n - 0.38) / 0.14)));
      else if (n < LAND + 0.015) col.copy(C.sand);
      else if (r > 1.075) col.copy(C.rock).lerp(C.snow, r > 1.1 ? 0.7 : 0);
      else if (lat < 0.35 && jitter > 0.08) col.copy(C.desert);
      else col.copy(C.grass).lerp(jitter > 0 ? C.forest : C.hill, Math.abs(jitter) * 2.2);
      col.offsetHSL(0, 0, jitter * 0.08);
      for (let j = 0; j < 3; j++) colors.set([col.r, col.g, col.b], (i + j) * 3);
    }
    base.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    base.computeVertexNormals();
    return base;
  }, [detail]);

/** puntos de tierra firme (para árboles/casas sobre el planeta) */
export const useLandPoints = (count: number, seed = 4) =>
  useMemo(() => {
    const r = rng(seed);
    const out: THREE.Vector3[] = [];
    let guard = 0;
    while (out.length < count && guard++ < 20000) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const p = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
      const n = landAt(p);
      if (n > LAND + 0.03 && n < 0.62 && Math.abs(p.y) < 0.8) out.push(p.multiplyScalar(1 + (n - LAND) * 0.22));
    }
    return out;
  }, [count, seed]);

const atmoVert = `varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const atmoFrag = `uniform vec3 uColor; uniform float uPower; uniform float uAlpha; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(1.0 - abs(dot(vN, vV)), uPower); gl_FragColor = vec4(uColor, f*uAlpha); }`;

export const Atmosphere: React.FC<{radius: number; color?: string; alpha?: number; power?: number}> = ({
  radius, color = '#6fc3ff', alpha = 0.9, power = 2.2,
}) => {
  const uniforms = useMemo(
    () => ({uColor: {value: new THREE.Color(color)}, uPower: {value: power}, uAlpha: {value: alpha}}),
    [color, power, alpha],
  );
  return (
    <mesh scale={radius}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial vertexShader={atmoVert} fragmentShader={atmoFrag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
    </mesh>
  );
};

/** Nubes low-poly (grupos de esferas) alrededor del planeta */
export const Clouds: React.FC<{radius: number; count?: number; seed?: number; opacity?: number}> = ({radius, count = 26, seed = 9, opacity = 0.95}) => {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: count}, () => {
      const u = r() * 1.6 - 0.8, th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const dir = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const puffs = Array.from({length: 3 + Math.floor(r() * 3)}, (_, i) => ({
        x: (i - 1.5) * 0.06 + (r() - 0.5) * 0.04, z: (r() - 0.5) * 0.06, s: 0.045 + r() * 0.04,
      }));
      return {dir, q, puffs, scale: 0.8 + r() * 0.6};
    });
  }, [count, seed]);
  return (
    <group>
      {items.map((c, i) => (
        <group key={i} position={c.dir.clone().multiplyScalar(radius * 1.075)} quaternion={c.q} scale={radius * c.scale}>
          {c.puffs.map((p, j) => (
            <mesh key={j} position={[p.x, 0, p.z]} scale={[p.s * 1.3, p.s * 0.75, p.s]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#ffffff" flatShading roughness={1} transparent={opacity < 1} opacity={opacity} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/** Árboles y casitas diminutas sobre el planeta */
export const PlanetDecor: React.FC<{radius: number; trees?: number; seed?: number}> = ({radius, trees = 90, seed = 4}) => {
  const pts = useLandPoints(trees, seed);
  return (
    <group scale={radius}>
      {pts.map((p, i) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
        const house = i % 7 === 0;
        return (
          <group key={i} position={p} quaternion={q}>
            {house ? (
              <>
                <mesh position={[0, 0.012, 0]} castShadow>
                  <boxGeometry args={[0.03, 0.024, 0.03]} />
                  <meshStandardMaterial color="#fff1d6" flatShading />
                </mesh>
                <mesh position={[0, 0.032, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                  <coneGeometry args={[0.026, 0.02, 4]} />
                  <meshStandardMaterial color="#e2533b" flatShading />
                </mesh>
              </>
            ) : (
              <mesh position={[0, 0.02, 0]} castShadow>
                <coneGeometry args={[0.014, 0.042, 5]} />
                <meshStandardMaterial color={i % 3 ? '#2e8b3e' : '#3fae4c'} flatShading />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

export const Planet: React.FC<{
  radius: number; spin?: number; tilt?: number; decor?: boolean; clouds?: boolean; cloudSpin?: number; atmo?: boolean; children?: React.ReactNode; detail?: number; shadows?: boolean;
}> = ({radius, spin = 0, tilt = 0.41, decor = true, clouds = true, cloudSpin, atmo = true, children, detail = 5, shadows = true}) => {
  const geo = usePlanetGeometry(detail);
  return (
    <group rotation={[0, 0, tilt]}>
      <group rotation={[0, spin, 0]}>
        <mesh geometry={geo} scale={radius} castShadow={shadows} receiveShadow={shadows}>
          <meshStandardMaterial vertexColors flatShading roughness={0.85} metalness={0} />
        </mesh>
        {decor && <PlanetDecor radius={radius} />}
        {children}
      </group>
      {clouds && (
        <group rotation={[0, cloudSpin ?? spin * 1.05, 0]}>
          <Clouds radius={radius} />
        </group>
      )}
      {atmo && <Atmosphere radius={radius * 1.13} />}
    </group>
  );
};
