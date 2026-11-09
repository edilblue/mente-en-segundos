import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Character} from '../three/Character';
import {Water} from '../three/Water';
import {Arrow3D, Crate, House, KeyLight, Label3D, Palm, Rig, roundBox} from '../three/Props';
import {SkyClouds} from '../three/Ground';
import {Stage} from '../three/Stage';
import {clamp, easeIn, lerp, pop, prog, rng, shake, tw} from '../lib/anim';
import {escena, fs, useT, ws} from '../lib/timing';
import {Captions, Disclaimer, Flash, ORANGE, Tag, Title, Vignette} from '../overlays/Overlays';

const CUT = () => fs(4, 2) - 0.3;
const SEA_SKY = 'linear-gradient(180deg, #0b1a44 0%, #1f4288 50%, #3f78c0 80%, #6aa3d8 100%)';

const Boat: React.FC<{position: [number, number, number]; rot?: number}> = ({position, rot = 0}) => (
  <group position={position} rotation={[0, 0, rot]}>
    <mesh geometry={roundBox(2.2, 0.5, 0.9, 0.2)} position={[0, 0.2, 0]} castShadow>
      <meshStandardMaterial color="#ffffff" />
    </mesh>
    <mesh geometry={roundBox(2.24, 0.14, 0.94, 0.06)} position={[0, 0.0, 0]}>
      <meshStandardMaterial color="#ff4d6d" />
    </mesh>
    <mesh position={[0.1, 1.2, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
      <meshStandardMaterial color="#8a5a35" />
    </mesh>
    <mesh position={[0.45, 1.25, 0]} rotation={[0, 0, -0.05]} castShadow>
      <coneGeometry args={[0.55, 1.3, 3]} />
      <meshStandardMaterial color="#ffd23f" flatShading />
    </mesh>
  </group>
);

const FlowShot: React.FC = () => {
  const t = useT();
  const flow = 3.2;
  const h = (x: number, z: number) =>
    Math.sin((x - t * flow) * 0.45 + z * 0.2) * 0.35 + Math.sin((x - t * flow * 1.3) * 0.9 - z * 0.6) * 0.15 + Math.sin(z * 0.7 + t) * 0.08;
  return (
    <>
      <Rig pos={[-6 + t * 0.8, 9 - t * 0.6, 14]} target={[1 + t * 0.6, 0, -2]} fov={44} />
      <ambientLight intensity={0.6} color="#a8c0ff" />
      <hemisphereLight args={['#cfe0ff', '#123060', 0.6]} />
      <KeyLight pos={[-8, 14, 8]} intensity={3} size={20} />
      <SkyClouds shift={t * 6} y={10} z={-40} />
      <Water width={70} depth={50} segX={70} segZ={50} center={[0, -10]} height={h} foam={(x, z, hh) => (hh > 0.42 ? (hh - 0.42) * 4 : 0)} />
      <Boat position={[-4 + t * flow * 1.1, h(-4 + t * flow * 1.1, 1) + 0.15, 1]} rot={Math.sin(t * 2) * 0.1} />
      {[[-8, -3], [-2, -7], [4, -1], [-12, 2], [8, -6]].map(([x0, z], i) => {
        const x = ((x0 + t * flow * 1.4 + 14) % 28) - 14;
        return <Arrow3D key={i} length={2.2} radius={0.1} color="#5ff2ff" position={[x, h(x, z) + 0.45, z]} />;
      })}
      <Label3D text="EL AGUA SIGUE MOVIÉNDOSE →" bg="#5fd4ff" height={0.62} position={[1.5 + t * 0.6, 3.6, -1]} scale={pop(t, 0.8, 0.4)} />
    </>
  );
};

const BeachShot: React.FC = () => {
  const t = useT();
  const tCrash = ws(4, 'inundaciones') - CUT() + 0.05;
  const T = t;
  // ola gigante: avanza desde el horizonte (z negativo) hacia la costa (z ≈ 4)
  const zw = lerp(-70, 4, Math.pow(clamp(T / tCrash), 1.35));
  const H = tw(T, [0, tCrash - 0.6, tCrash, tCrash + 1.2], [0.5, 7, 6, 0.4]);
  const flood = tw(T, [tCrash, tCrash + 2.2], [0, 3.2], (x) => 1 - Math.pow(1 - x, 2));
  const h = (x: number, z: number) => {
    const d = z - zw;
    const ridge = H * Math.exp(-(d > 0 ? (d / 2.6) ** 2 : (d / 9) ** 2)) * (1 + 0.08 * Math.sin(x * 0.5));
    return -0.2 + flood + ridge + Math.sin(x * 0.6 + T * 2) * 0.12 + Math.sin(z * 0.8 - T * 3) * 0.1 * (1 + flood);
  };
  const foam = (x: number, z: number, hh: number) => {
    const d = z - zw;
    return (H > 1.2 && d > -2.5 && d < 1.5 && hh - flood > H * 0.55 ? 1 : 0) + (flood > 0.2 && Math.sin(x * 1.3 + z * 0.9 + T * 5) > 0.93 ? 0.4 : 0);
  };
  // cámara: detrás del personaje mirando al mar → lateral, la ola se eleva
  const side = prog(T, 1.4, 2.6);
  const after = prog(T, tCrash, tCrash + 1.4);
  const sh = shake(T, (T > tCrash ? 0.4 * Math.exp(-(T - tCrash) * 1.8) : 0) + 0.05 * prog(T, 1.5, tCrash), 6);
  const cam: [number, number, number] = [lerp(1.5, -17, side) + after * 5 + sh[0], lerp(4.4, 6.5, side) + after * 2.5 + sh[1], lerp(18, 7, side) + after * 9];
  const tgt: [number, number, number] = [0, lerp(2, 3.2, side), lerp(0, 4, side) + after * 7];
  // personaje: mira el mar, se gira y corre
  const turn = prog(T, 0.3, 0.8);
  const runT = Math.max(0, T - 1.0);
  const charZ = 9 + Math.min(runT, 1.8) * 2.4;
  const floodY = Math.max(0, flood - 0.2 - 0.6);
  const sand = (z: number) => 1.08 + (z - 8) * 0.12;
  const splash = useMemo(() => {
    const r = rng(31);
    return Array.from({length: 60}, () => ({x: (r() - 0.5) * 30, vx: (r() - 0.5) * 3, vy: 5 + r() * 9, vz: 2 + r() * 6, s: 0.2 + r() * 0.5}));
  }, []);
  const ts = T - tCrash;
  return (
    <>
      <Rig pos={cam} target={tgt} fov={46} />
      <ambientLight intensity={0.55} color="#a8c0ff" />
      <hemisphereLight args={['#cfe0ff', '#203050', 0.6]} />
      <KeyLight pos={[-12, 16, 10]} target={[0, 0, 2]} intensity={3} size={22} />
      <SkyClouds shift={T * 3} y={13} z={-60} />
      {/* playa (pendiente) */}
      <mesh position={[0, 1.08, 8]} rotation={[-Math.PI / 2 - Math.atan(0.12), 0, 0]} receiveShadow>
        <planeGeometry args={[80, 26]} />
        <meshStandardMaterial color="#f2d58a" roughness={1} />
      </mesh>
      <mesh position={[0, 2.35, 29]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 18]} />
        <meshStandardMaterial color="#5bc85a" />
      </mesh>
      {[[-11, 13], [-6.5, 14], [6.5, 13.5], [11, 14.5]].map(([x, z], i) => (
        <House key={i} position={[x, sand(z) - 0.05, z]} scale={1.3} rotation={[0, Math.PI + 0.2 * (i - 2), 0]} roof={['#e2533b', '#3f6fd9', '#f29b30'][i % 3]} />
      ))}
      {[[-10, 7], [-4.5, 6.5], [5, 7], [10, 6]].map(([x, z], i) => (
        <Palm key={i} position={[x, sand(z), z]} scale={1.1} bend={0.2 + (T > tCrash ? 0.8 * Math.min(1, ts * 2) : 0.3 * prog(T, 1, tCrash))} />
      ))}
      <Water width={80} depth={110} segX={64} segZ={140} center={[0, -38]} height={h} foam={foam} />
      {/* personaje */}
      <group position={[0.5, Math.max(sand(charZ), -0.2 + flood - 0.35), charZ]} rotation={[0, lerp(Math.PI, 0.25, turn), floodY > 0 ? Math.sin(T * 3) * 0.3 : 0]}>
        <Character
          pose={{
            walk: runT * 16, walkAmp: runT > 0 ? 1 : 0, run: true, armsUp: runT > 0 ? 0.85 : 0, eyes: turn > 0.5 ? 1.5 : 1, mouth: turn > 0.5 ? 'open' : 'smile', brows: turn > 0.5 ? -0.8 : 0.2, look: [0, 0.3],
          }}
        />
      </group>
      {floodY > 0 && <Crate position={[-2, floodY + 0.3, 11]} rotation={[0.2, T, 0.1]} size={0.8} />}
      {/* salpicaduras del choque */}
      {ts > 0 && ts < 2.5 &&
        splash.map((s, i) => (
          <mesh key={i} position={[s.x + s.vx * ts, 2 + s.vy * ts - 6 * ts * ts, 4 + s.vz * ts]} scale={s.s * (1 - ts / 2.5)}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#e8f7ff" flatShading transparent opacity={0.9} />
          </mesh>
        ))}
      <Label3D text="¡OLA GIGANTE!" bg="#ff9a1f" fg="#ffffff" height={0.8} position={[0, H + 2.2, zw]} scale={pop(T, 1.8, 0.4) * (T < tCrash ? 1 : 0)} />
    </>
  );
};

export const S4: React.FC = () => {
  const t = useT();
  const e = escena(4);
  const cut = CUT();
  const tCrash = ws(4, 'inundaciones') + 0.05;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={Math.round(cut * 30)} layout="none">
        <Stage bg={SEA_SKY} fog={['#4f7ec4', 30, 120]}>
          <FlowShot />
        </Stage>
      </Sequence>
      <Sequence from={Math.round(cut * 30)} layout="none">
        <Stage bg={SEA_SKY} fog={['#4f7ec4', 40, 140]}>
          <BeachShot />
        </Stage>
      </Sequence>
      <Vignette strength={0.6} />
      <Flash t={t} t0={cut} dur={0.25} max={0.5} />
      <Flash t={t} t0={tCrash} dur={0.45} max={0.75} color="#e8f7ff" />
      <Disclaimer t={t} t0={0.2} t1={e.duracion} />
      <Title t={t} t0={ws(4, 'océanos') - 0.05} text="*OCÉANOS* FUERA DE *CONTROL*" hi="#5fd4ff" size={118} y={210} />
      <Tag t={t} t0={tCrash + 0.4} t1={e.duracion} text="Inundaciones catastróficas" y={1255} size={40} bg={ORANGE} />
      <Captions t={t} frases={e.frases} />
    </AbsoluteFill>
  );
};
export const _u = [easeIn];
