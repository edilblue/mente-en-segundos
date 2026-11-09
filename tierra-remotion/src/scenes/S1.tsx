import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import * as THREE from 'three';
import {Character} from '../three/Character';
import {Planet} from '../three/Planet';
import {Glow, KeyLight, Rig, Stars, Tree, House} from '../three/Props';
import {Stage} from '../three/Stage';
import {damped, easeInOut, lerp, prog, shake, tw} from '../lib/anim';
import {useT} from '../lib/timing';
import {Captions, Flash, SpeedLines, Title, Vignette} from '../overlays/Overlays';
import {escena, fe} from '../lib/timing';

const R = 4;
const ALPHA = 0.8; // inclinación del eje hacia la cámara
const OMEGA = 0.6;
export const S1_STOP = () => fe(1, 2) + 0.12; // la Tierra se detiene al terminar "en un solo segundo?"
const T_TOP = () => S1_STOP() - 0.75; // el personaje pasa por arriba poco antes del frenazo
const BRAKE = 0.18;

const theta = (t: number) => {
  const ts = S1_STOP();
  const tb = ts - BRAKE;
  if (t < tb) return -OMEGA * (t - T_TOP());
  const base = -OMEGA * (tb - T_TOP());
  const x = Math.min(t, ts) - tb;
  return base - OMEGA * (x - (x * x) / (2 * BRAKE)); // desaceleración lineal hasta 0
};

const AX = new THREE.Vector3(1, 0, 0);
const tiltQ = new THREE.Quaternion().setFromAxisAngle(AX, ALPHA);
// punto local (antes del giro) que queda arriba cuando theta = 0
const D0 = new THREE.Vector3(0, 1, 0).applyQuaternion(tiltQ.clone().invert()).normalize();

const frameAt = (th: number) => {
  // posición/ejes del personaje en el mundo para un ángulo dado
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), th);
  const q = tiltQ.clone().multiply(spin);
  const n = D0.clone().applyQuaternion(q).normalize();
  const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(tiltQ);
  const east = new THREE.Vector3().crossVectors(axis, n).multiplyScalar(-1).normalize(); // giro negativo → este
  const P = n.clone().multiplyScalar(R * 1.05);
  return {n, east, P};
};

export const S1: React.FC = () => {
  const t = useT();
  const e = escena(1);
  const ts = S1_STOP();
  const th = theta(t);
  const stopped = t >= ts;
  const ti = Math.max(0, t - ts);

  // personaje: sobre el planeta antes del frenazo; luego sale disparado por inercia
  const f = frameAt(th);
  const fs = frameAt(theta(ts));
  const v = OMEGA * R * 1.05 * 1.6; // exagerado para que se lea
  const flyPos = fs.P.clone().add(fs.east.clone().multiplyScalar(v * ti)).add(fs.n.clone().multiplyScalar(2.2 * ti - 1.4 * ti * ti * 0.35));
  const pos = stopped ? flyPos : f.P;
  const basis = (n: THREE.Vector3, east: THREE.Vector3) => {
    const X = new THREE.Vector3().crossVectors(n, east).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, n, east));
  };
  const qChar = stopped
    ? basis(fs.n, fs.east).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ti * 7))
    : basis(f.n, f.east);

  // cámara: plano cercano que viaja con el personaje → se aleja y revela el planeta
  const camClose = f.P.clone().add(f.n.clone().multiplyScalar(1.3)).add(new THREE.Vector3().crossVectors(f.n, f.east).multiplyScalar(-4.6)).add(f.east.clone().multiplyScalar(2.2));
  const tgtClose = f.P.clone().add(f.n.clone().multiplyScalar(0.85));
  const camWide = new THREE.Vector3(0, 3.2, 22);
  const tgtWide = new THREE.Vector3(0, 1.6, 0);
  const k = prog(t, 0.55, 2.5, easeInOut);
  // la cámara cercana debe mirar desde +z (lado visible) → elegir signo
  if (camClose.z < f.P.z) camClose.add(new THREE.Vector3().crossVectors(f.n, f.east).multiplyScalar(9.2));
  const cam = camClose.clone().lerp(camWide, k);
  const tgt = tgtClose.clone().lerp(tgtWide, k);
  const up = f.n.clone().lerp(new THREE.Vector3(0, 1, 0), k).normalize();
  // empuje tras el frenazo
  const push = tw(t, [ts, ts + 2], [0, 1.5]);
  cam.z -= push;
  const sh = shake(t, 0.35 * Math.exp(-ti * 2.2) * (stopped ? 1 : 0) + 0.04 * prog(t, ts - 0.6, ts, (x) => x), 5);

  const walkPhase = t * 9;
  const surprised = stopped ? 1 : 0;
  const ring = ti > 0 && ti < 1.4 ? ti : 0;

  return (
    <AbsoluteFill>
      <Stage>
        <Rig pos={[cam.x + sh[0], cam.y + sh[1], cam.z + sh[2]]} target={[tgt.x + sh[0] * 0.5, tgt.y + sh[1] * 0.5, tgt.z]} up={[up.x, up.y, up.z]} fov={lerp(32, 40, k)} />
        <ambientLight intensity={0.55} color="#9fb6ff" />
        <hemisphereLight args={['#bcd4ff', '#1a2448', 0.6]} />
        <KeyLight pos={[-9, 8, 12]} intensity={3.2} size={8} />
        <directionalLight position={[8, -2, -6]} intensity={1.3} color="#5fa8ff" />
        <Stars count={1800} radius={200} size={1.5} />
        <Glow color="#4aa8ff" size={R * 3.4} opacity={0.35} />
        <group quaternion={tiltQ}>
          <Planet radius={R} spin={th} tilt={0} cloudSpin={stopped ? th - (t - ts) * 0.5 : th * 1.04}>
            {/* islita con árbol y casa bajo el personaje */}
            <group quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), D0)}>
              <mesh position={[0, R * 0.985, 0]} scale={[1.25, 0.32, 1.25]} castShadow receiveShadow>
                <icosahedronGeometry args={[1, 2]} />
                <meshStandardMaterial color="#5bc85a" flatShading />
              </mesh>
              <Tree position={[-0.75, R * 1.04, -0.35]} scale={0.42} bend={stopped ? damped(t, ts, 2, 2) * 1.5 : 0} />
              <House position={[0.55, R * 1.04, -0.5]} scale={0.32} rotation={[0, 0.6, 0]} />
            </group>
          </Planet>
        </group>
        {/* personaje en coordenadas del mundo */}
        <group position={pos} quaternion={qChar}>
          <Character
            scale={0.5}
            pose={{
              walk: stopped ? ti * 26 : walkPhase, walkAmp: stopped ? 1 : 0.9, run: stopped,
              armsUp: stopped ? Math.min(1, ti * 5) : 0, eyes: 1 + surprised * 0.45, mouth: stopped ? 'o' : 'smile',
              brows: stopped ? -0.6 : 0.3, blink: !stopped && t % 2.3 > 2.15 ? 1 : 0, headTurn: stopped ? 0 : -0.35, look: stopped ? [0, 0.3] : [0.4, 0],
            }}
          />
        </group>
        {/* onda expansiva del frenazo */}
        {ring > 0 && (
          <group quaternion={tiltQ}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={R * (1.1 + ring * 1.8)}>
              <torusGeometry args={[1, 0.02, 8, 80]} />
              <meshBasicMaterial color="#ffd23f" transparent opacity={Math.max(0, 1 - ring / 1.4)} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        )}
      </Stage>
      <Vignette />
      <SpeedLines t={t} amount={prog(t, 0.6, 1.2) * (1 - prog(t, 2.2, 2.6)) * 0.6} />
      <SpeedLines t={t} amount={stopped ? Math.max(0, 0.9 - ti * 0.7) : 0} dir="h" color="rgba(255,230,160,0.8)" />
      <Flash t={t} t0={ts} dur={0.3} max={0.7} color="#fff3c4" />
      <Title t={t} t0={0.15} text="¿Y SI LA TIERRA *SE* *DETUVIERA?*" size={122} y={210} />
      <Captions t={t} frases={e.frases} />
    </AbsoluteFill>
  );
};
