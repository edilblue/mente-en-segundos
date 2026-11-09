import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import * as THREE from 'three';
import {Character} from '../three/Character';
import {Clouds, Planet} from '../three/Planet';
import {Building, Car, Glow, KeyLight, Label3D, LampPost, Rig, Stars, Tree} from '../three/Props';
import {SKY, SkyClouds} from '../three/Ground';
import {Stage} from '../three/Stage';
import {clamp, damped, lerp, noise3, pop, prog, rng, shake, tw} from '../lib/anim';
import {escena, fs, useT, ws} from '../lib/timing';
import {Captions, Disclaimer, Flash, ORANGE, SpeedLines, Tag, Title, Vignette} from '../overlays/Overlays';

const R = 3.2;
const CUT = () => fs(3, 2) - 0.25;

const AirShot: React.FC = () => {
  const t = useT();
  const airSpin = 0.5 + t * 1.6;
  return (
    <>
      <Rig pos={[Math.sin(t * 0.2) * 2, 2.5 - t * 0.3, 19 - t * 1.2]} target={[0, 0.3, 0]} fov={40} />
      <ambientLight intensity={0.6} color="#9fb6ff" />
      <KeyLight pos={[-10, 8, 12]} intensity={3.2} size={8} />
      <directionalLight position={[10, -3, -6]} intensity={1.2} color="#5fa8ff" />
      <Stars />
      <Glow color="#4aa8ff" size={R * 3.6} opacity={0.4} />
      <group rotation={[0.25, 0, 0.41]}>
        <Planet radius={R} spin={1.2} tilt={0} cloudSpin={airSpin} />
        {/* capa de aire que sigue girando */}
        {Array.from({length: 9}, (_, i) => {
          const lat = (i - 4) * 0.16;
          const rr = R * (1.22 + (i % 3) * 0.05) * Math.cos(lat);
          return (
            <group key={i} position={[0, R * 1.22 * Math.sin(lat), 0]} rotation={[0, airSpin * (1 + (i % 2) * 0.15) + i, 0]}>
              {[0, 1, 2].map((j) => (
                <mesh key={j} rotation={[Math.PI / 2, 0, (j * Math.PI * 2) / 3]}>
                  <torusGeometry args={[rr, 0.035, 6, 40, 1.1]} />
                  <meshBasicMaterial color="#bfe8ff" transparent opacity={0.85} />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
      <Label3D text="SUELO: DETENIDO" bg="#ff5a5a" fg="#ffffff" height={0.55} position={[-0.6, -R - 0.9, 2]} scale={pop(t, 0.35, 0.4)} />
      <Label3D text="AIRE: ¡SIGUE MOVIÉNDOSE!" bg="#5fd4ff" height={0.55} position={[0.4, R + 1.4, 1]} scale={pop(t, 1.0, 0.4)} />
    </>
  );
};

const BUILDINGS = (() => {
  const r = rng(21);
  const cols = ['#ff7b7b', '#ffb347', '#6fc3ff', '#9b8cff', '#5ad1a0', '#ffd23f', '#ff8fc8', '#7fa0ff'];
  const out: {x: number; z: number; w: number; h: number; d: number; c: string}[] = [];
  for (let x = -16; x < 34; x += 0) {
    const w = 2 + r() * 1.6;
    out.push({x: x + w / 2, z: -4.2 - r() * 0.8, w, h: 3.5 + r() * 6, d: 2.2 + r(), c: cols[Math.floor(r() * cols.length)]});
    x += w + 0.4;
  }
  for (let x = -20; x < 40; x += 0) {
    const w = 2.5 + r() * 2;
    out.push({x: x + w / 2, z: -10 - r() * 2, w, h: 7 + r() * 9, d: 3, c: cols[Math.floor(r() * cols.length)]});
    x += w + 0.6;
  }
  return out;
})();

const CityShot: React.FC = () => {
  const t = useT();
  const tD = ws(3, 'destruir') - CUT();
  const wind = prog(t, 0.0, 0.8);
  const gust = wind * (0.75 + 0.25 * noise3(t * 2.5, 0, 0, 4));
  const crane = prog(t, fs(3, 3) - CUT() - 0.3, fs(3, 3) - CUT() + 2.2);
  const sh = shake(t, 0.06 * gust + (t > tD ? 0.25 * Math.exp(-(t - tD) * 2) : 0), 2);
  const cam: [number, number, number] = [lerp(-2.6, -6, crane) + sh[0], lerp(2.3, 10, crane) + sh[1], lerp(6.2, 19, crane)];
  const tgt: [number, number, number] = [lerp(0.6, 3, crane), lerp(2.2, 3.4, crane), lerp(0, -3, crane)];
  const debris = useMemo(() => {
    const r = rng(77);
    return Array.from({length: 70}, (_, i) => ({
      x0: r() * 60 - 25, y: 0.3 + r() * 9, z: -3 + r() * 6.5, sp: 18 + r() * 14, rot: r() * 10, kind: i % 4, s: 0.12 + r() * 0.2, ph: r() * 6,
    }));
  }, []);
  const streaks = useMemo(() => {
    const r = rng(78);
    return Array.from({length: 45}, () => ({x0: r() * 60 - 25, y: 0.4 + r() * 10, z: -6 + r() * 9, sp: 35 + r() * 25, len: 2 + r() * 4}));
  }, []);
  const wrap = (v: number) => ((((v + 25) % 60) + 60) % 60) - 25;
  const flutter = (k: number) => Math.sin(t * 22 + k) * 0.12 * gust;
  return (
    <>
      <Rig pos={cam} target={tgt} fov={44} />
      <ambientLight intensity={0.5} color="#a8b8ff" />
      <hemisphereLight args={['#cfe0ff', '#3a3a5a', 0.55]} />
      <KeyLight pos={[-10, 16, 10]} target={[2, 0, -2]} intensity={2.8} size={22} color="#ffe2c0" />
      <SkyClouds shift={t * 25 * wind} y={16} z={-30} />
      {/* calle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0, -10]} receiveShadow>
        <planeGeometry args={[140, 60]} />
        <meshStandardMaterial color="#5c6b8a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.01, 0.2]} receiveShadow>
        <planeGeometry args={[140, 3.6]} />
        <meshStandardMaterial color="#353b52" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.02, -2.6]} receiveShadow>
        <planeGeometry args={[140, 1.8]} />
        <meshStandardMaterial color="#a3adc4" />
      </mesh>
      {BUILDINGS.map((b, i) => {
        const front = b.z > -6;
        const rip = front && i % 3 === 1 ? clamp((t - tD - (i % 5) * 0.08) / 2.2) : 0;
        const off: [number, number, number] = [rip * rip * 28 + rip * 4, rip * 7 - rip * rip * 3, rip * 2];
        return <Building key={i} position={[b.x, 0, b.z]} w={b.w} h={b.h} d={b.d} color={b.c} seed={i} topOffset={off} topRot={[rip * 2, rip * 1.5, -rip * 4]} />;
      })}
      {[-6, -1.5, 4.5, 9, 14].map((x, i) => (
        <Tree key={i} position={[x, 0, -2.4]} scale={0.95} seed={i + 3} bend={gust * 1.1 + flutter(i)} />
      ))}
      {/* coches arrastrados */}
      {[{x: -5, c: '#ff4d6d'}, {x: 3.5, c: '#4dd2ff'}, {x: 10, c: '#ffd23f'}].map((c, i) => {
        const slide = Math.max(0, t - 0.6 - i * 0.3);
        const dx = slide * slide * (1.2 + i * 0.4);
        return <Car key={i} position={[c.x + dx, Math.abs(Math.sin(slide * 5)) * 0.1 * gust, 0.6 - i * 0.5]} rotation={[0, 0, -Math.min(0.3, slide * 0.08) * Math.sin(slide * 4)]} color={c.c} wheelSpin={-dx * 2} />;
      })}
      {/* personaje agarrado al poste, ondeando como bandera */}
      <LampPost position={[0, 0, 1.4]} bend={gust * 0.15} />
      <group position={[0.1, 2.25, 1.5]} rotation={[0, 0, -Math.PI / 2 * gust + flutter(1) * 1.5]}>
        <group position={[0, -1.3, 0]}>
          <Character
            rotation={[0, -0.4, 0]}
            pose={{armsUp: 1, eyes: 1.5, mouth: 'open', brows: -0.8, look: [-0.5, 0.2], walk: t * 30, walkAmp: 0.4 * gust, run: true, headTurn: -0.3}}
          />
        </group>
      </group>
      {/* escombros y hojas */}
      {debris.map((d, i) => {
        const x = wrap(d.x0 + t * d.sp * wind);
        const y = d.y + Math.sin(t * 3 + d.ph) * 0.6;
        const col = ['#5ac85a', '#ffffff', '#e2533b', '#ffd23f'][d.kind];
        return (
          <mesh key={i} position={[x, y, d.z]} rotation={[t * d.rot, t * d.rot * 0.7, d.ph]} scale={d.s * wind} castShadow>
            {d.kind === 2 ? <boxGeometry args={[2, 0.4, 1.2]} /> : <tetrahedronGeometry args={[1, 0]} />}
            <meshStandardMaterial color={col} flatShading />
          </mesh>
        );
      })}
      {streaks.map((s, i) => (
        <mesh key={i} position={[wrap(s.x0 + t * s.sp), s.y, s.z]} scale={[s.len, 0.035, 0.035]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#e6f4ff" transparent opacity={0.55 * wind} depthWrite={false} />
        </mesh>
      ))}
      <Label3D text="VIENTO →" bg="#ffffff" height={0.6} position={[3.5, 5.3, 0.5]} scale={pop(t, 0.5, 0.4) * (1 - crane)} />
    </>
  );
};

export const S3: React.FC = () => {
  const t = useT();
  const e = escena(3);
  const cut = CUT();
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={Math.round(cut * 30)} layout="none">
        <Stage>
          <AirShot />
        </Stage>
      </Sequence>
      <Sequence from={Math.round(cut * 30)} layout="none">
        <Stage bg={SKY} fog={['#5a7fbf', 25, 90]}>
          <CityShot />
        </Stage>
      </Sequence>
      <Vignette strength={0.6} />
      <SpeedLines t={t} amount={t > cut ? 0.5 * prog(t, cut, cut + 0.8) : 0} dir="h" color="rgba(230,245,255,0.55)" />
      <Flash t={t} t0={cut} dur={0.25} max={0.5} />
      <Flash t={t} t0={ws(3, 'destruir')} dur={0.3} max={0.35} color="#ffd9a0" />
      <Disclaimer t={t} t0={0.2} t1={e.duracion} />
      <Title t={t} t0={ws(3, 'aire') - 0.1} t1={cut - 0.15} text="EL *AIRE* NO FRENA" hi="#5fd4ff" size={120} y={220} />
      <Title t={t} t0={ws(3, 'vientos') - 0.05} text="*VIENTOS* *EXTREMOS*" hi={ORANGE} size={140} y={220} tiltSeed={2} />
      <Tag t={t} t0={fe3() + 0.2} t1={e.duracion} text="Los efectos dependerían de cómo se detuviera" y={1255} size={34} bg="rgba(255,255,255,0.92)" color="#14204a" />
      <Captions t={t} frases={e.frases} />
    </AbsoluteFill>
  );
};
const fe3 = () => escena(3).frases[2].start + 0.6;
export const _u = [THREE, damped, tw, Clouds];
