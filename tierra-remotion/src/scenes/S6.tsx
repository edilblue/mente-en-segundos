import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import * as THREE from 'three';
import {Character} from '../three/Character';
import {Planet} from '../three/Planet';
import {Arrow3D, Bench, Glow, KeyLight, Label3D, Rig, Stars, Tree} from '../three/Props';
import {Stage} from '../three/Stage';
import {clamp, easeInOut, lerp, pop, prog, rng, tw} from '../lib/anim';
import {escena, fs, useT, ws} from '../lib/timing';
import {Captions, Flash, GREEN, Rewind, SpeedLines, Tag, Title, Vignette, YELLOW} from '../overlays/Overlays';

const CUT1 = () => fs(6, 2) - 0.2;
const CUT2 = () => fs(6, 3) - 0.2;
const RW0 = 0.45, RW1 = 2.0;

const RewindShot: React.FC = () => {
  const t = useT();
  // antes: detenida · rebobinado: gira hacia atrás · después: rotación normal
  const back = tw(t, [RW0, RW1], [0, -9], easeInOut);
  const fwd = t > RW1 ? (t - RW1) * 0.9 * clamp((t - RW1) / 0.6) : 0;
  return (
    <>
      <Rig pos={[0, 1.5, lerp(17, 14, prog(t, 0, 3.5))]} target={[0, 0.2, 0]} fov={40} />
      <ambientLight intensity={0.55} color="#9fb6ff" />
      <KeyLight pos={[-10, 8, 12]} intensity={3.2} size={8} />
      <directionalLight position={[10, -3, -6]} intensity={1.2} color="#5fa8ff" />
      <Stars />
      <Glow color="#4aa8ff" size={14} opacity={0.4} />
      <Planet radius={3.6} spin={back + fwd} />
      <Label3D text="HOY: LA TIERRA SIGUE GIRANDO" bg={GREEN} height={0.5} position={[0, -4.6, 1]} scale={pop(t, RW1 + 0.15, 0.4)} />
      {t > RW1 &&
        [0, 1, 2].map((i) => (
          <mesh key={i} rotation={[Math.PI / 2 - 0.15, 0.41, ((t - RW1) * 2 + (i * Math.PI * 2) / 3) % (Math.PI * 2)]} scale={4.5}>
            <torusGeometry args={[1, 0.012, 6, 60, 1.2]} />
            <meshBasicMaterial color={GREEN} transparent opacity={0.8 * clamp((t - RW1) / 0.5)} />
          </mesh>
        ))}
    </>
  );
};

const MoonShot: React.FC = () => {
  const t = useT();
  const moonBumps = React.useMemo(() => {
    const r = rng(12);
    return Array.from({length: 14}, () => {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      return {p: new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)), s: 0.15 + r() * 0.25};
    });
  }, []);
  return (
    <>
      <Rig pos={[2.2 - t * 0.25, 2.6 + t * 0.1, 6.5 + t * 0.9]} target={[-1.5, 0.8, -6]} fov={42} />
      <ambientLight intensity={0.35} color="#9fb6ff" />
      <KeyLight pos={[-8, 8, 6]} intensity={3} size={8} />
      <Stars />
      <group position={[-4, 2.6, -16]}>
        <Planet radius={3.6} spin={t * 0.6} />
        <Glow color="#4aa8ff" size={14} opacity={0.4} />
      </group>
      {/* Luna */}
      <group position={[0, -4, 0]}>
        <mesh receiveShadow castShadow>
          <icosahedronGeometry args={[4.6, 3]} />
          <meshStandardMaterial color="#b7bccb" flatShading />
        </mesh>
        {moonBumps.map((b, i) => (
          <mesh key={i} position={b.p.clone().multiplyScalar(4.5)} scale={[b.s * 4, b.s, b.s * 4]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.p)}>
            <torusGeometry args={[1, 0.25, 6, 14]} />
            <meshStandardMaterial color="#9a9fb0" flatShading />
          </mesh>
        ))}
      </group>
      <Character
        position={[0.2, 0.62, 0.6]}
        rotation={[0, Math.PI + 0.6 - prog(t, 1.2, 1.8) * 1.4, 0]}
        pose={{sit: 1, legsSwing: t * 4, eyes: 1.3, mouth: 'o', look: [0, 0.4], headTurn: prog(t, 1.2, 1.8) * 0.4, brows: 0.6}}
      />
    </>
  );
};

const R = 4;
const OMEGA = 0.17;
const BenchShot: React.FC = () => {
  const t = useT();
  const th = OMEGA * (t - 3.4);
  const axisTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.45);
  const D0 = new THREE.Vector3(0, 1, 0).applyQuaternion(axisTilt.clone().invert()).normalize();
  const spinQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -th);
  const q = axisTilt.clone().multiply(spinQ);
  const n = D0.clone().applyQuaternion(q).normalize();
  const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(axisTilt);
  const east = new THREE.Vector3().crossVectors(axis, n).multiplyScalar(-1).normalize();
  const P = n.clone().multiplyScalar(R * 1.03);
  const X = new THREE.Vector3().crossVectors(n, east).normalize();
  // banco mira hacia la cámara (+z aprox): base con up = n, forward = -X o X
  const fwd = X.z > 0 ? X : X.clone().multiplyScalar(-1);
  const side = new THREE.Vector3().crossVectors(n, fwd).normalize();
  const qBench = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, n, fwd));
  const k = prog(t, 1.3, 4.6, easeInOut);
  const camClose = P.clone().add(n.clone().multiplyScalar(1.1)).add(fwd.clone().multiplyScalar(4.2)).add(east.clone().multiplyScalar(-0.6));
  const tgtClose = P.clone().add(n.clone().multiplyScalar(0.8));
  const camWide = new THREE.Vector3(0, 2.6, 20);
  const tgtWide = new THREE.Vector3(0, 1.7, 0);
  const cam = camClose.clone().lerp(camWide, k);
  const tgt = tgtClose.clone().lerp(tgtWide, k);
  const up = n.clone().lerp(new THREE.Vector3(0, 1, 0), k).normalize();
  const tLo = fs(6, 5) + 1.4;
  const arrowS = pop(t, ws(6, 'viajando') - CUT2(), 0.5);
  return (
    <>
      <Rig pos={[cam.x, cam.y, cam.z]} target={[tgt.x, tgt.y, tgt.z]} up={[up.x, up.y, up.z]} fov={lerp(36, 40, k)} />
      <ambientLight intensity={0.55} color="#9fb6ff" />
      <hemisphereLight args={['#bcd4ff', '#1a2448', 0.5]} />
      <KeyLight pos={[-9, 9, 12]} intensity={3.2} size={8} />
      <directionalLight position={[8, -2, -6]} intensity={1.2} color="#5fa8ff" />
      <Stars />
      <Glow color="#4aa8ff" size={R * 3.4} opacity={0.35} />
      <group quaternion={axisTilt}>
        <Planet radius={R} spin={-th} tilt={0}>
          <group quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), D0)}>
            <mesh position={[0, R * 0.985, 0]} scale={[1.3, 0.3, 1.3]} castShadow receiveShadow>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial color="#5bc85a" flatShading />
            </mesh>
            <Tree position={[-0.8, R * 1.03, -0.4]} scale={0.4} />
          </group>
        </Planet>
      </group>
      <group position={P} quaternion={qBench}>
        <group scale={0.5}>
          <Bench />
          <Character position={[0, 0.0, 0.05]} pose={{sit: 1, legsSwing: t * 3, mouth: t > tLo - CUT2() ? 'open' : 'smile', eyes: t > 4 ? 1.25 : 1, brows: 0.5, wave: t > tLo - CUT2() - 0.2 ? t * 10 : NaN, blink: t % 2.6 > 2.45 ? 1 : 0}} />
        </group>
      </group>
      {/* flecha de velocidad que acompaña al personaje */}
      <group position={P.clone().add(n.clone().multiplyScalar(1.5)).add(east.clone().multiplyScalar(-0.4))}>
        <group quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), east)}>
          <Arrow3D length={2.6 * arrowS} radius={0.12} color={GREEN} />
        </group>
        <Label3D text="≈1,670 KM/H" bg={GREEN} height={0.5} position={[0.6, 0.75, 0.5]} scale={arrowS} />
      </group>
    </>
  );
};

export const S6: React.FC = () => {
  const t = useT();
  const e = escena(6);
  const c1 = CUT1(), c2 = CUT2();
  const tLo = fs(6, 5) + 1.4;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={Math.round(c1 * 30)} layout="none">
        <Stage>
          <RewindShot />
        </Stage>
      </Sequence>
      <Sequence from={Math.round(c1 * 30)} durationInFrames={Math.round((c2 - c1) * 30)} layout="none">
        <Stage>
          <MoonShot />
        </Stage>
      </Sequence>
      <Sequence from={Math.round(c2 * 30)} layout="none">
        <Stage>
          <BenchShot />
        </Stage>
      </Sequence>
      <Vignette strength={0.55} />
      <Rewind t={t} t0={RW0} t1={RW1} />
      <Flash t={t} t0={RW1} dur={0.35} max={0.6} color="#d7fff0" />
      <Flash t={t} t0={c1} dur={0.25} max={0.4} />
      <Flash t={t} t0={c2} dur={0.25} max={0.4} />
      <SpeedLines t={t} amount={t > ws(6, 'viajando') && t < tLo ? 0.35 : 0} dir="h" color="rgba(160,255,200,0.55)" />
      <Tag t={t} t0={RW1 + 0.1} t1={c1 - 0.1} text="De vuelta al presente" y={250} size={54} bg={GREEN} color="#0b2a18" />
      <Title t={t} t0={ws(6, 'increíble') - 0.1} t1={c2 - 0.1} text="ALGO *INCREÍBLE...*" hi={YELLOW} size={120} y={220} />
      <Tag t={t} t0={ws(6, 'viajando') + 0.4} t1={tLo - 0.2} text="Menos velocidad lejos del ecuador" y={1255} size={36} bg="rgba(255,255,255,0.92)" color="#14204a" />
      <Title t={t} t0={tLo} text="¿LO *SABÍAS?*" hi={YELLOW} size={168} y={300} />
      <Captions t={t} frases={e.frases} />
    </AbsoluteFill>
  );
};
