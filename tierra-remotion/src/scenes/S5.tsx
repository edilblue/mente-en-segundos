import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import * as THREE from 'three';
import {Character} from '../three/Character';
import {Planet} from '../three/Planet';
import {Glow, House, KeyLight, Label3D, Rig, Stars, Sun, Tree} from '../three/Props';
import {Stage} from '../three/Stage';
import {clamp, easeInOut, lerp, pop, prog, tw} from '../lib/anim';
import {escena, fs, useT} from '../lib/timing';
import {Captions, Disclaimer, Flash, Tag, Title, Vignette, YELLOW} from '../overlays/Overlays';
import {BODY_FONT, TITLE_FONT} from '../overlays/fonts';

const ORB = 7;
const RE = 1.25;
const CUT = () => fs(5, 4) - 0.2;
const YEAR0 = () => fs(5, 3); // empieza el año acelerado
const YEAR1 = () => fs(5, 3) + 2.7;
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const phi = (t: number) => {
  const a = -0.35 + t * 0.05;
  const year = prog(t, YEAR0(), YEAR1(), easeInOut) * Math.PI * 2;
  return a + year;
};

const OrbitShot: React.FC = () => {
  const t = useT();
  const p = phi(t);
  const ep = new THREE.Vector3(Math.cos(p) * ORB, 0, Math.sin(p) * ORB);
  // marcador fijo (no gira): mira hacia -x del mundo
  const markDir = new THREE.Vector3(-1, 0.25, 0.35).normalize();
  const toSun = ep.clone().multiplyScalar(-1).normalize();
  const day = markDir.dot(toSun) > 0;
  const k = prog(t, 0.2, 3.2);
  const yr = prog(t, YEAR0() - 0.4, YEAR0() + 0.6);
  const camPos = new THREE.Vector3(lerp(ep.x * 1.4, 0, yr), lerp(4, 29, yr), lerp(ep.z * 1.4 + 9, 15, yr)).lerp(new THREE.Vector3(ep.x + 1.5, 1.6, ep.z + 6), (1 - k) * (1 - yr));
  const tgt = new THREE.Vector3().lerpVectors(ep.clone().multiplyScalar(1 - 0.12 * k), new THREE.Vector3(0, 0, 0), yr);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), markDir);
  return (
    <>
      <Rig pos={[camPos.x, camPos.y, camPos.z]} target={[tgt.x, tgt.y, tgt.z]} fov={42} />
      <ambientLight intensity={0.12} color="#8fa6ff" />
      <pointLight position={[0, 0, 0]} intensity={420} decay={2} color="#fff1d0" castShadow shadow-mapSize={[1024, 1024]} />
      <Stars count={2200} />
      <Sun radius={1.7} spin={t * 0.3} />
      {/* órbita */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ORB, 0.025, 6, 160]} />
        <meshBasicMaterial color="#7fb2ff" transparent opacity={0.5} />
      </mesh>
      {/* estela del recorrido */}
      {yr > 0 && (
        <mesh rotation={[Math.PI / 2, 0, -0.35]}>
          <torusGeometry args={[ORB, 0.07, 6, 160, Math.max(0.01, p + 0.35)]} />
          <meshBasicMaterial color={YELLOW} />
        </mesh>
      )}
      <group position={ep}>
        <Planet radius={RE} spin={0} tilt={0.41} decor={false} />
        {/* casita + bandera en un punto fijo: no gira con el día */}
        <group quaternion={q}>
          <group position={[0, RE * 1.04, 0]} scale={0.22}>
            <House />
            <mesh position={[1.1, 1.4, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 2.8, 6]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[1.5, 2.5, 0]}>
              <boxGeometry args={[0.8, 0.5, 0.05]} />
              <meshStandardMaterial color="#ff4d6d" emissive="#ff4d6d" emissiveIntensity={0.6} />
            </mesh>
          </group>
        </group>
        <Label3D text={day ? 'AQUÍ: DÍA' : 'AQUÍ: NOCHE'} bg={day ? YELLOW : '#3f5bd9'} fg={day ? '#1a1440' : '#ffffff'} height={0.5} position={[0, RE + 1.0, 0]} scale={pop(t, YEAR0() - 0.2, 0.4)} />
        <Label3D text="SIN GIRAR SOBRE SU EJE" bg="#ff5a5a" fg="#ffffff" height={0.26} position={[0, RE + 0.6, 0]} scale={pop(t, 0.6, 0.4) * (1 - yr)} />
      </group>
      <Label3D text="SIGUE ORBITANDO EL SOL" bg="#5fd4ff" height={0.6} position={[0, 3.0, 0]} scale={pop(t, fs(5, 2) + 0.2, 0.4)} />
    </>
  );
};

const SurfaceShot: React.FC<{tNight: number}> = ({tNight}) => {
  const t = useT();
  const n = prog(t, tNight - 0.35, tNight + 0.45);
  const sunPos: [number, number, number] = [lerp(-6, -9, prog(t, 0, 6)), lerp(9, -2, n), -14];
  return (
    <>
      <Rig pos={[Math.sin(t * 0.3) * 1.5 + 0.8, 2.4 - t * 0.04, 7.4 - t * 0.12]} target={[0, 1.4, 0]} fov={44} />
      <ambientLight intensity={lerp(0.6, 0.4, n)} color={n > 0.5 ? '#6f86ff' : '#fff2d8'} />
      <hemisphereLight args={[n > 0.5 ? '#3a4f9a' : '#cfe8ff', '#2a3a20', lerp(0.8, 0.45, n)]} />
      <KeyLight pos={n > 0.5 ? [6, 8, 6] : [-6, 10, 5]} intensity={lerp(3.6, 1.8, n)} color={n > 0.5 ? '#9fb4ff' : '#fff0c8'} size={8} />
      <Stars count={1600} opacity={n} />
      {n < 1 && <Sun radius={1.1} position={sunPos} />}
      {n > 0 && (
        <group position={[7, 9, -14]}>
          <mesh>
            <icosahedronGeometry args={[0.9, 2]} />
            <meshBasicMaterial color="#e9edff" transparent opacity={n} />
          </mesh>
        </group>
      )}
      {/* suelo curvo */}
      <mesh position={[0, -30, 0]} receiveShadow>
        <icosahedronGeometry args={[30, 5]} />
        <meshStandardMaterial color={n > 0.5 ? '#3f8f6a' : '#8bc84a'} flatShading />
      </mesh>
      {/* nieve/escarcha de noche */}
      {n > 0.5 && (
        <mesh position={[0, -29.97, 0]} scale={n}>
          <icosahedronGeometry args={[30, 5]} />
          <meshStandardMaterial color="#dfe9ff" flatShading transparent opacity={0.55 * n} />
        </mesh>
      )}
      <Tree position={[-2.4, -0.1, -1.5]} scale={1.2} bend={0} color={n > 0.5 ? '#2f7a6a' : '#e0b84a'} />
      <House position={[2.6, -0.1, -2.2]} rotation={[0, -0.5, 0]} scale={1.2} />
      <Character
        position={[0, 0, 0.6]}
        rotation={[0, -0.2, 0]}
        pose={
          n < 0.5
            ? {sunglasses: true, sweat: t * 0.8, mouth: 'open', eyes: 1, brows: -0.2, armsUp: 0.15 + Math.abs(Math.sin(t * 6)) * 0.15, headTilt: 0.1}
            : {blanket: 1, shiver: t, mouth: 'grit', eyes: 1.1, brows: -0.6, look: [0.2, 0.3]}
        }
      />
      {/* aliento helado */}
      {n > 0.7 &&
        [0, 1, 2].map((i) => {
          const ph = (t * 0.8 + i / 3) % 1;
          return (
            <mesh key={i} position={[0.15 + ph * 0.6, 1.4 + ph * 0.5, 1.2]} scale={0.08 + ph * 0.18}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={(1 - ph) * 0.6} />
            </mesh>
          );
        })}
    </>
  );
};

const Calendar: React.FC<{t: number; t0: number; tNight: number; t1: number}> = ({t, t0, tNight, t1}) => {
  if (t < t0) return null;
  const night = t >= tNight;
  const m = night ? 6 + Math.min(5, Math.floor(((t - tNight) / (t1 - tNight)) * 6)) : Math.min(5, Math.floor(((t - t0) / (tNight - t0)) * 6));
  const s = pop(t, t0, 0.35);
  const flip = ((night ? (t - tNight) / (t1 - tNight) : (t - t0) / (tNight - t0)) * 6) % 1;
  return (
    <div style={{position: 'absolute', right: 70, top: 520, transform: `scale(${s}) rotate(4deg)`, transformOrigin: 'top right', width: 220, borderRadius: 26, overflow: 'hidden', boxShadow: '0 14px 30px rgba(0,0,0,0.4)'}}>
      <div style={{background: night ? '#3f5bd9' : '#ff5a5a', color: '#fff', fontFamily: BODY_FONT, fontWeight: 900, fontSize: 34, textAlign: 'center', padding: '8px 0'}}>{night ? 'NOCHE' : 'DÍA'}</div>
      <div style={{background: '#ffffff', color: '#14204a', fontFamily: TITLE_FONT, fontSize: 92, textAlign: 'center', padding: '6px 0 0', transform: `rotateX(${flip < 0.15 ? (1 - flip / 0.15) * 80 : 0}deg)`}}>{MESES[m]}</div>
      <div style={{background: '#ffffff', color: '#6b7699', fontFamily: BODY_FONT, fontWeight: 800, fontSize: 26, textAlign: 'center', paddingBottom: 10}}>mes {m + 1} de 12</div>
    </div>
  );
};

export const S5: React.FC = () => {
  const t = useT();
  const e = escena(5);
  const cut = CUT();
  const tNight = fs(5, 5) - 0.1;
  const y0 = YEAR0(), y1 = YEAR1();
  const days = Math.round(prog(t, y0, y1, easeInOut) * 365);
  const n = prog(t, tNight - 0.35, tNight + 0.45);
  const skyDay = 'linear-gradient(180deg, #2a6fd1 0%, #5aa6ec 55%, #a9d6ff 100%)';
  const skyNight = 'linear-gradient(180deg, #030716 0%, #0b1a44 60%, #182c66 100%)';
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={Math.round(cut * 30)} layout="none">
        <Stage bg="radial-gradient(ellipse at 50% 50%, #142a5c 0%, #070f2b 60%, #02050f 100%)">
          <OrbitShot />
        </Stage>
      </Sequence>
      <Sequence from={Math.round(cut * 30)} layout="none">
        <AbsoluteFill style={{background: skyDay}} />
        <AbsoluteFill style={{background: skyNight, opacity: n}} />
        <Stage bg="transparent">
          <SurfaceShot tNight={tNight - cut} />
        </Stage>
      </Sequence>
      <Vignette strength={0.6} />
      <Flash t={t} t0={cut} dur={0.25} max={0.5} />
      <Disclaimer t={t} t0={0.2} t1={e.duracion} text="Escenario hipotético · ilustración no a escala" />
      {t > y0 - 0.2 && t < cut && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1210, textAlign: 'center', transform: `scale(${pop(t, y0 - 0.2, 0.35)})`}}>
          <span style={{fontFamily: TITLE_FONT, fontSize: 66, color: '#fff', background: 'rgba(10,18,48,0.8)', padding: '10px 34px', borderRadius: 40, WebkitTextStroke: '0px', letterSpacing: 2}}>
            1 DÍA SOLAR = <span style={{color: YELLOW}}>{days}</span> DÍAS
          </span>
        </div>
      )}
      <Title t={t} t0={fs(5, 3) - 0.05} t1={cut - 0.2} text="UN DÍA DE *CASI* *UN* *AÑO*" hi={YELLOW} size={126} y={210} />
      <Calendar t={t} t0={cut + 0.2} tNight={tNight} t1={e.duracion} />
      <Tag t={t} t0={cut + 0.15} t1={tNight - 0.2} text="Meses de luz" y={250} size={58} bg={YELLOW} color="#1a1440" />
      <Tag t={t} t0={tNight} t1={e.duracion} text="Meses de oscuridad" y={250} size={58} bg="#3f5bd9" />
      <Captions t={t} frases={e.frases} />
    </AbsoluteFill>
  );
};
export const _u = [clamp, tw, Glow];
