import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import * as THREE from 'three';
import {Character} from '../three/Character';
import {Planet} from '../three/Planet';
import {Arrow3D, Ball, Crate, Glow, KeyLight, Label3D, Rig, Stars, TrafficCone} from '../three/Props';
import {Ground, SKY, SkyClouds} from '../three/Ground';
import {Stage} from '../three/Stage';
import {damped, easeInOut, lerp, pop, prog, shake, tw} from '../lib/anim';
import {escena, fs, useT, ws} from '../lib/timing';
import {Captions, Disclaimer, Flash, GREEN, SpeedLines, Tag, Title, Vignette} from '../overlays/Overlays';

const R = 3.3;
const CUT = () => fs(2, 4) - 0.15; // corte al suelo: "Si se detuviera de golpe"

const LATS = [
  {lat: 0, label: '1,670 KM/H', bg: '#ffd23f'},
  {lat: 40, label: '≈1,280 KM/H', bg: '#ffb13f'},
  {lat: 68, label: '≈630 KM/H', bg: '#ff8f3f'},
];

const GlobeShot: React.FC = () => {
  const t = useT();
  const tMil = ws(2, 'mil');
  const tPolos = fs(2, 3);
  const spin = t * 0.45;
  const k = prog(t, tPolos - 0.3, tPolos + 1.4);
  const orbit = Math.sin(t * 0.25) * 0.25;
  const camPos: [number, number, number] = [Math.sin(orbit) * lerp(15.5, 14, k), lerp(0.6, 6.5, k), Math.cos(orbit) * lerp(15.5, 13, k)];
  const tgt: [number, number, number] = [0.4, lerp(-0.2, 1.4, k), 0];
  const times = [1.3, tPolos + 0.2, tPolos + 0.6];
  return (
    <>
      <Rig pos={camPos} target={tgt} fov={40} />
      <ambientLight intensity={0.6} color="#9fb6ff" />
      <hemisphereLight args={['#bcd4ff', '#1a2448', 0.5]} />
      <KeyLight pos={[-10, 8, 12]} intensity={3.2} size={8} />
      <directionalLight position={[10, -3, -6]} intensity={1.2} color="#5fa8ff" />
      <Stars />
      <Glow color="#4aa8ff" size={R * 3.4} opacity={0.35} />
      <group rotation={[0, 0, 0.41]}>
        <Planet radius={R} spin={spin} tilt={0} />
        {/* ecuador brillante */}
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={R * 1.035 * pop(t, 0.4, 0.5)}>
          <torusGeometry args={[1, 0.012, 8, 120]} />
          <meshBasicMaterial color="#ffd23f" />
        </mesh>
        {/* eje de rotación */}
        <mesh scale={[1, pop(t, tPolos - 0.2, 0.5), 1]}>
          <cylinderGeometry args={[0.05, 0.05, R * 2.7, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
        {LATS.map((l, i) => {
          const a = (l.lat * Math.PI) / 180;
          const s = pop(t, times[i], 0.45);
          const len = 2.6 * Math.cos(a) * s;
          const p = new THREE.Vector3(0, Math.sin(a), Math.cos(a)).multiplyScalar(R * 1.17);
          return (
            <group key={i} position={p}>
              {len > 0.05 && <Arrow3D length={len} color={l.bg} radius={0.1 + 0.06 * Math.cos(a)} rotation={[0, 0, 0]} />}
              <Label3D text={l.label} bg={l.bg} height={0.5 - i * 0.04} position={[1.0, 0.55, 0.3]} scale={pop(t, times[i] + 0.15, 0.4)} />
            </group>
          );
        })}
        <Label3D text="POLO: ≈ 0 KM/H" bg="#ffffff" height={0.5} position={[0, R * 1.5, 0.4]} scale={pop(t, tPolos + 1.0, 0.4)} />
      </group>
      <Label3D text="ECUADOR" bg="none" fg="#ffd23f" height={0.6} position={[-R * 0.1, -0.85, R * 1.1]} scale={pop(t, 0.6, 0.4) * (1 - k)} />
      <group visible={tMil > 0} />
    </>
  );
};

const STOP = () => ws(2, 'golpe') + 0.15 - CUT();
const OBJ = [
  {kind: 'crate', x: -3.2, z: 0.6, s: 0.85, spin: 4.5, hop: 1.1},
  {kind: 'cone', x: -1.8, z: 1.4, s: 1, spin: 7, hop: 0.6},
  {kind: 'ball', x: 2.0, z: 0.9, s: 1, spin: 9, hop: 1.6},
  {kind: 'crate', x: 3.4, z: -0.5, s: 0.6, spin: 6, hop: 1.4},
];

const GroundShot: React.FC = () => {
  const t = useT();
  const tS = STOP();
  const ti = Math.max(0, t - tS);
  const stopped = t >= tS;
  // distancia recorrida por los objetos sueltos (en el marco del suelo)
  const V = 7.2;
  const travel = V * (ti - (1 - Math.exp(-ti * 0.35)) * 0.6);
  const camX = stopped ? V * 0.93 * (ti - (1 - Math.exp(-ti * 1.6)) / 1.6) : 0;
  const sh = shake(t, stopped ? 0.32 * Math.exp(-ti * 2.5) : 0.015, 9);
  const preMove = stopped ? 0 : t * 30; // antes: el paisaje lejano corre (todo viaja junto)
  const camPos: [number, number, number] = [camX - 1 + sh[0] + Math.sin(t * 0.4) * 0.4, 2.8 + sh[1] + (stopped ? 0 : -0.3 + t * 0.12), 10.5];
  const tgt: [number, number, number] = [camX + 0.6, 1.1, 0];
  const charX = stopped ? travel * 0.95 : 0;
  const tumble = stopped ? Math.min(ti * 3.2, Math.PI * 0.35) + Math.max(0, ti - 0.5) * 2.4 : 0;
  const charY = stopped ? Math.abs(Math.sin(ti * 3.2)) * 0.9 * Math.exp(-ti * 0.3) + Math.min(ti, 0.6) * 0.6 : 0;
  const tIn = ws(2, 'inercia') - CUT();
  const arrowS = pop(t, 0.45, 0.4);
  return (
    <>
      <Rig pos={camPos} target={tgt} fov={42} />
      <ambientLight intensity={0.55} color="#b8c8ff" />
      <hemisphereLight args={['#cfe0ff', '#2a4a2a', 0.6]} />
      <KeyLight pos={[camX - 8, 14, 10]} target={[camX, 0, 0]} intensity={3.4} size={16} />
      <Ground mountainShift={-preMove} seed={8} treeBend={stopped ? damped(t, tS, 1.4, 1.5) * 0.8 : 0} />
      <SkyClouds shift={-preMove * 0.6} />
      {/* flecha del suelo: todo se mueve junto → luego 0 */}
      <group position={[camX - 2.2, 0.08, 2.4]}>
        <Arrow3D length={stopped ? 0.001 : 4.2 * arrowS} radius={0.14} color="#5fd4ff" rotation={[0, 0, 0]} />
        <Label3D text={stopped ? 'SUELO: 0 KM/H' : 'TODO GIRA JUNTO →'} bg={stopped ? '#ff5a5a' : '#5fd4ff'} height={0.5} position={[1.6, stopped ? 4.6 : 0.75, 0.4]} scale={arrowS} />
      </group>
      {/* personaje */}
      <group position={[charX, charY, 0.2]} rotation={[0, 0, -tumble]}>
        <Character
          rotation={[0, stopped ? 1.1 : 0.4, 0]}
          pose={{
            walk: stopped ? ti * 20 : 0, walkAmp: stopped ? 1 : 0, run: true, armsUp: stopped ? Math.min(1, ti * 4) : 0,
            eyes: stopped ? 1.45 : 1, mouth: stopped ? 'open' : 'smile', brows: stopped ? -0.7 : 0.4, look: stopped ? [0.6, 0] : [0, 0], blink: !stopped && t % 2.1 > 1.95 ? 1 : 0, wave: !stopped && t > 0.3 ? t * 9 : NaN,
          }}
        />
        {stopped && <Arrow3D length={2.4} color={GREEN} radius={0.12} position={[0.3, 2.5, 0]} rotation={[0, 0, tumble]} />}
      </group>
      {OBJ.map((o, i) => {
        const x = o.x + (stopped ? travel * (1 + i * 0.05) : 0);
        const y = stopped ? Math.abs(Math.sin(ti * (3 + i * 0.6))) * o.hop * Math.exp(-ti * 0.2) : 0;
        const rot = stopped ? ti * o.spin : 0;
        const base = o.kind === 'crate' ? o.s * 0.42 : o.kind === 'ball' ? 0.35 : 0;
        return (
          <group key={i} position={[x, base + y, o.z]} rotation={[0, 0, -rot]}>
            {o.kind === 'crate' && <Crate size={o.s * 0.84} />}
            {o.kind === 'cone' && <TrafficCone />}
            {o.kind === 'ball' && <Ball />}
          </group>
        );
      })}
      <Label3D text="¡INERCIA!" bg={GREEN} height={0.75} position={[charX + 1.2, 3.9, 0]} scale={pop(t, tIn, 0.4)} />
      {/* polvo al frenar */}
      {stopped && ti < 1.6 &&
        Array.from({length: 14}, (_, i) => {
          const a = i * 2.39;
          const r = ti * (2 + (i % 4));
          return (
            <mesh key={i} position={[-3 + (i % 7) * 1.2 + Math.cos(a) * r * 0.3, 0.2 + ti * 0.8 * ((i % 3) + 1) * 0.4, Math.sin(a) * r * 0.4]} scale={0.25 + ti * 0.5}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#e9dcc0" transparent opacity={Math.max(0, 0.8 - ti * 0.55)} flatShading />
            </mesh>
          );
        })}
    </>
  );
};

export const S2: React.FC = () => {
  const t = useT();
  const e = escena(2);
  const cut = CUT();
  const tStop = cut + STOP();
  const tMil = ws(2, 'mil');
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={Math.round(cut * 30)} layout="none">
        <Stage>
          <GlobeShot />
        </Stage>
      </Sequence>
      <Sequence from={Math.round(cut * 30)} layout="none">
        <Stage bg={SKY} fog={['#4f7ec4', 30, 140]}>
          <GroundShot />
        </Stage>
      </Sequence>
      <Vignette strength={0.55} />
      <SpeedLines t={t} amount={t > cut && t < tStop ? 0.45 : 0} dir="h" />
      <Flash t={t} t0={cut} dur={0.25} max={0.6} />
      <Flash t={t} t0={tStop} dur={0.3} max={0.6} color="#fff3c4" />
      <Disclaimer t={t} t0={0.2} t1={e.duracion} text="Escenario hipotético · ilustración no a escala" />
      <Title t={t} t0={tMil - 0.1} t1={fs(2, 3) + 1.6} text="¡MÁS DE *1,600* *KM/H!*" hi="#ffd23f" size={130} y={210} />
      <Tag t={t} t0={fs(2, 3) - 0.1} t1={cut - 0.1} text="La velocidad depende de la latitud" y={1255} size={40} bg="rgba(255,255,255,0.92)" color="#14204a" />
      <Tag t={t} t0={tStop - 0.05} t1={tStop + 2.2} text="Detención instantánea (hipotética)" y={240} size={42} bg="#ff5a5a" />
      <Title t={t} t0={ws(2, 'inercia') - 0.05} text="*INERCIA*" hi={GREEN} size={150} y={230} />
      <Captions t={t} frases={e.frases} />
    </AbsoluteFill>
  );
};
