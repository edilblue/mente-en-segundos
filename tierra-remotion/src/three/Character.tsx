import React from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
type G = ThreeElements['group'];

export type Pose = {
  walk?: number;      // fase de caminata (radianes); 0 = quieto
  walkAmp?: number;   // amplitud de piernas/brazos 0..1
  run?: boolean;
  armsUp?: number;    // 0..1 brazos arriba (pánico)
  armsFwd?: number;   // 0..1 brazos hacia delante (agarrarse)
  lean?: number;      // inclinación del cuerpo hacia delante (rad)
  sit?: number;       // 0..1 sentado
  eyes?: number;      // escala de ojos (1 normal, 1.4 sorprendido)
  look?: [number, number]; // desplazamiento de pupilas
  mouth?: 'smile' | 'o' | 'grit' | 'flat' | 'open';
  brows?: number;     // -1 enfadado/asustado .. 1 alegre
  blink?: number;     // 0..1
  headTurn?: number;  // giro de cabeza (rad)
  headTilt?: number;
  shiver?: number;    // temblor (t)
  sunglasses?: boolean;
  sweat?: number;     // 0..1
  blanket?: number;   // 0..1
  wave?: number;      // saludo con la mano derecha (fase); NaN = no
  legsSwing?: number; // balanceo de piernas sentado (fase)
};

const SKIN = '#ffcf9e';
const HOODIE = '#ff7a2f';
const PANTS = '#2f5fd0';
const SHOE = '#ffffff';
const CAP = '#1d3e8a';

const M: React.FC<{color: string; rough?: number; emissive?: string}> = ({color, rough = 0.7, emissive}) => (
  <meshStandardMaterial color={color} roughness={rough} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 0.4 : 0} />
);

const Limb: React.FC<{len: number; r: number; color: string; rot: [number, number, number]; pos: [number, number, number]; end?: React.ReactNode; endColor?: string}> = ({len, r, color, rot, pos, end, endColor}) => (
  <group position={pos} rotation={rot}>
    <mesh position={[0, -len / 2, 0]} castShadow>
      <capsuleGeometry args={[r, len, 6, 12]} />
      <M color={color} />
    </mesh>
    <group position={[0, -len - r * 0.4, 0]}>
      {end ?? (
        <mesh castShadow>
          <sphereGeometry args={[r * 1.25, 14, 12]} />
          <M color={endColor ?? SKIN} />
        </mesh>
      )}
    </group>
  </group>
);

/** "Mini", la mascota de Mente en Segundos. Pies en y=0, mira hacia +z. Altura ≈ 1.9 */
export const Character: React.FC<{pose?: Pose} & G> = ({pose = {}, ...props}) => {
  const {
    walk = 0, walkAmp = 0, run = false, armsUp = 0, armsFwd = 0, lean = 0, sit = 0, eyes = 1, look = [0, 0], mouth = 'smile',
    brows = 0, blink = 0, headTurn = 0, headTilt = 0, shiver = 0, sunglasses = false, sweat = 0, blanket = 0, wave = NaN, legsSwing = NaN,
  } = pose;
  const sw = Math.sin(walk) * walkAmp * (run ? 1.1 : 0.7);
  const bob = Math.abs(Math.cos(walk)) * walkAmp * (run ? 0.12 : 0.06);
  const shv = shiver ? Math.sin(shiver * 70) * 0.025 : 0;
  // piernas
  const hipY = 0.62 - sit * 0.05;
  const legL = sit > 0 ? -sit * 1.45 + (isNaN(legsSwing) ? 0 : Math.sin(legsSwing) * 0.25) : sw;
  const legR = sit > 0 ? -sit * 1.45 + (isNaN(legsSwing) ? 0 : Math.sin(legsSwing + Math.PI) * 0.25) : -sw;
  const kneeL = sit > 0 ? sit * 1.4 : Math.max(0, -sw) * 0.8;
  const kneeR = sit > 0 ? sit * 1.4 : Math.max(0, sw) * 0.8;
  // brazos
  const armBase = -sw * 1.1;
  const armL: [number, number, number] = [armBase * (1 - armsUp) - armsFwd * 1.4, 0, 0.18 + armsUp * 2.5];
  const armR: [number, number, number] = [-armBase * (1 - armsUp) - armsFwd * 1.4, 0, -0.18 - armsUp * 2.5];
  if (!isNaN(wave)) {
    armR[2] = -2.6;
    armR[0] = 0;
    armR[1] = Math.sin(wave) * 0.35;
  }
  const eyeH = 0.13 * eyes * (1 - blink * 0.9);
  const shoe = (
    <mesh castShadow position={[0, -0.02, 0.06]} scale={[1, 0.7, 1.4]}>
      <sphereGeometry args={[0.12, 14, 10]} />
      <M color={SHOE} rough={0.5} />
    </mesh>
  );
  const leg = (side: number, a: number, knee: number) => (
    <group position={[side * 0.15, hipY, 0]} rotation={[a, 0, 0]}>
      <mesh position={[0, -0.14, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.2, 6, 10]} />
        <M color={PANTS} />
      </mesh>
      <group position={[0, -0.3, 0]} rotation={[knee, 0, 0]}>
        <mesh position={[0, -0.1, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.14, 6, 10]} />
          <M color={PANTS} />
        </mesh>
        <group position={[0, -0.24, 0]}>{shoe}</group>
      </group>
    </group>
  );
  return (
    <group {...props}>
      <group position={[shv, bob, 0]} rotation={[lean, 0, 0]}>
        {leg(-1, legL, kneeL)}
        {leg(1, legR, kneeR)}
        {/* cuerpo */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.32, 8, 16]} />
          <M color={HOODIE} />
        </mesh>
        <mesh position={[0, 0.92, 0.27]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.26, 0.12, 0.06]} />
          <M color="#ffa565" />
        </mesh>
        {/* brazos */}
        <Limb len={0.36} r={0.085} color={HOODIE} pos={[-0.36, 1.16, 0]} rot={armL} />
        <Limb len={0.36} r={0.085} color={HOODIE} pos={[0.36, 1.16, 0]} rot={armR} />
        {/* manta */}
        {blanket > 0 && (
          <mesh position={[0, 0.85, 0]} scale={[1, blanket, 1]} castShadow>
            <cylinderGeometry args={[0.42, 0.5, 0.95, 10, 1, true]} />
            <meshStandardMaterial color="#8a5cf0" side={THREE.DoubleSide} flatShading />
          </mesh>
        )}
        {/* cabeza */}
        <group position={[0, 1.58, 0]} rotation={[headTilt, headTurn, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.44, 28, 22]} />
            <M color={SKIN} rough={0.6} />
          </mesh>
          {/* orejas */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.43, -0.02, 0]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.1, 10, 8]} />
              <M color={SKIN} />
            </mesh>
          ))}
          {/* gorra */}
          <mesh position={[0, 0.12, 0]} scale={[1.03, 0.85, 1.03]} castShadow>
            <sphereGeometry args={[0.44, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <M color={CAP} />
          </mesh>
          <mesh position={[0, 0.14, 0.38]} rotation={[0.25, 0, 0]} scale={[1, 0.18, 1]} castShadow>
            <cylinderGeometry args={[0.28, 0.3, 0.12, 16, 1, false, -Math.PI / 2, Math.PI]} />
            <M color={CAP} />
          </mesh>
          <mesh position={[0, 0.49, 0]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <M color="#ffb627" />
          </mesh>
          {/* ojos */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.16, 0.0, 0.37]}>
              <mesh scale={[0.1 * eyes, eyeH, 0.07]}>
                <sphereGeometry args={[1, 18, 14]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} />
              </mesh>
              {blink < 0.7 && (
                <>
                  <mesh position={[look[0] * 0.04, look[1] * 0.04 - 0.005, 0.06]} scale={[0.055 * Math.min(eyes, 1.2), 0.065 * Math.min(eyes, 1.2) * (1 - blink), 0.03]}>
                    <sphereGeometry args={[1, 14, 12]} />
                    <meshStandardMaterial color="#1b1530" roughness={0.2} />
                  </mesh>
                  <mesh position={[look[0] * 0.04 + 0.02, look[1] * 0.04 + 0.025, 0.09]} scale={0.016}>
                    <sphereGeometry args={[1, 8, 6]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </>
              )}
              {/* ceja */}
              <mesh position={[0, 0.17 * Math.max(1, eyes * 0.95) + brows * 0.02, 0.02]} rotation={[0, 0, s * (brows * -0.35 + 0.05)]}>
                <boxGeometry args={[0.13, 0.028, 0.03]} />
                <meshStandardMaterial color="#4a2c1a" />
              </mesh>
            </group>
          ))}
          {sunglasses && (
            <group position={[0, 0.02, 0.42]}>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.16, 0, 0]}>
                  <boxGeometry args={[0.22, 0.13, 0.04]} />
                  <meshStandardMaterial color="#111122" roughness={0.1} metalness={0.4} />
                </mesh>
              ))}
              <mesh>
                <boxGeometry args={[0.1, 0.03, 0.03]} />
                <meshStandardMaterial color="#111122" />
              </mesh>
            </group>
          )}
          {/* mejillas */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.27, -0.12, 0.32]} scale={[0.07, 0.04, 0.02]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#ff8f8f" transparent opacity={0.8} />
            </mesh>
          ))}
          {/* boca */}
          <group position={[0, -0.19, 0.4]}>
            {mouth === 'smile' && (
              <mesh rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.09, 0.022, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#6b2323" />
              </mesh>
            )}
            {mouth === 'o' && (
              <mesh scale={[0.07, 0.09, 0.03]}>
                <sphereGeometry args={[1, 14, 12]} />
                <meshStandardMaterial color="#4a1515" />
              </mesh>
            )}
            {mouth === 'open' && (
              <mesh scale={[0.11, 0.07, 0.03]} position={[0, -0.01, 0]}>
                <sphereGeometry args={[1, 14, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color="#4a1515" side={THREE.DoubleSide} />
              </mesh>
            )}
            {mouth === 'grit' && (
              <mesh>
                <boxGeometry args={[0.18, 0.06, 0.03]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            )}
            {mouth === 'flat' && (
              <mesh>
                <boxGeometry args={[0.13, 0.022, 0.03]} />
                <meshStandardMaterial color="#6b2323" />
              </mesh>
            )}
          </group>
          {/* sudor */}
          {sweat > 0 &&
            [0, 1].map((k) => (
              <mesh key={k} position={[0.38 - k * 0.76, 0.15 - ((sweat * 2 + k * 0.5) % 1) * 0.35, 0.2]} scale={[0.04, 0.06, 0.04]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color="#7fd3ff" emissive="#3aa0ff" emissiveIntensity={0.3} />
              </mesh>
            ))}
        </group>
      </group>
    </group>
  );
};
