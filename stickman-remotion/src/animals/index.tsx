import React from 'react';
import {C} from '../lib';
import {Eye, Mouth, MouthShape} from '../components/Stickman';

/** Propiedades comunes: (x, y) = punto de apoyo en el suelo; mirando a la derecha. */
export type AnimalProps = {
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  lift?: number;
  squash?: number;
  rot?: number;
  look?: [number, number];
  blink?: number;
  mouth?: Mouth;
  mouthOpen?: number;
  t?: number; // tiempo para ciclos (caminar, aletear)
  walk?: number; // 0..1 intensidad del ciclo de caminar
};

const place = ({x, y, s = 1, flip = false, lift = 0, squash = 0, rot = 0}: AnimalProps) =>
  `translate(${x},${y - lift}) scale(${s * (flip ? -1 : 1) * (1 + squash * 0.5)},${s * (1 - squash)}) rotate(${rot})`;

const st = (w: number) => ({stroke: C.ink, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const});

// ------------------------------------------------------------------ Hormiga
export const Ant: React.FC<AnimalProps & {legsUp?: number}> = (p) => {
  const {t = 0, walk = 0, look = [0.3, 0], blink = 0, mouth = 'smile', legsUp = 0} = p;
  const legs = [-14, 0, 14].map((ox, i) => {
    const ph = Math.sin(t * 16 + i * 2.1) * walk;
    const fx = ox * 2.2 + ph * 14;
    const fy = -legsUp * 26 - Math.max(0, Math.cos(t * 16 + i * 2.1)) * 8 * walk;
    return <path key={i} d={`M${ox * 0.6},-34 L${ox * 1.4 + ph * 6},-52 L${fx},${fy}`} fill="none" {...st(6)} />;
  });
  return (
    <g transform={place(p)}>
      {legs}
      <ellipse cx={-40} cy={-36} rx={30} ry={22} fill="#fff" {...st(7)} />
      <ellipse cx={-2} cy={-38} rx={16} ry={12} fill="#fff" {...st(7)} />
      <path d={`M38,-62 q-2,-30 18,-40 M48,-60 q8,-26 30,-30`} fill="none" {...st(5)} />
      <circle cx={40} cy={-46} r={22} fill="#fff" {...st(7)} />
      <Eye x={33} y={-51} r={8.5} look={look} blink={blink} sw={3.5} />
      <Eye x={50} y={-51} r={8.5} look={look} blink={blink} sw={3.5} />
      <MouthShape x={44} y={-36} w={14} type={mouth} sw={3.5} />
    </g>
  );
};

// ------------------------------------------------------------------ Pulga
export const Flea: React.FC<AnimalProps & {ext?: number}> = (p) => {
  const {ext = 0, look = [0.4, -0.2], blink = 0, mouth = 'grin'} = p;
  // pata trasera: plegada (ext 0) o extendida (ext 1)
  const kx = -48 + ext * 20;
  const ky = -64 + ext * 66;
  const fx = -62 + ext * 6;
  const fy = 0 + ext * 50;
  return (
    <g transform={place(p)}>
      <path d={`M-14,-32 L${kx},${ky} L${fx},${fy}`} fill="none" {...st(6)} />
      <path d={`M2,-26 L-6,-10 L-16,0 M14,-28 L16,-12 L10,0`} fill="none" {...st(5)} />
      <ellipse cx={-6} cy={-44} rx={34} ry={26} transform="rotate(-18,-6,-44)" fill="#fff" {...st(6)} />
      <path d="M-24,-66 l-6,-12 M-10,-70 l-2,-13 M4,-70 l3,-12" fill="none" {...st(4)} />
      <circle cx={30} cy={-58} r={16} fill="#fff" {...st(6)} />
      <Eye x={33} y={-62} r={8} look={look} blink={blink} sw={3} />
      <MouthShape x={36} y={-50} w={11} type={mouth} sw={3} />
      <path d="M44,-56 L56,-48" {...st(4)} />
    </g>
  );
};

// ------------------------------------------------------------------ Canguro
export const Kangaroo: React.FC<AnimalProps & {ext?: number}> = (p) => {
  const {ext = 0, look = [0.5, 0], blink = 0, mouth = 'smile', mouthOpen = 1} = p;
  const footA = -ext * 55;
  return (
    <g transform={place(p)}>
      <path d={`M-40,-70 C-110,-60 -150,-30 -190,${-10 - ext * 30}`} fill="none" {...st(14)} />
      <path d={`M0,-30 L${Math.cos((footA * Math.PI) / 180) * 100},${-Math.sin((footA * Math.PI) / 180) * 100 - 6}`} fill="none" {...st(13)} />
      <ellipse cx={-6} cy={-68} rx={44} ry={52} fill="#fff" {...st(9)} />
      <ellipse cx={-4} cy={-150} rx={60} ry={92} transform="rotate(18,-4,-150)" fill="#fff" {...st(9)} />
      <path d="M10,-120 q24,22 4,46" fill="none" {...st(6)} />
      <path d="M38,-190 L70,-160 L88,-170" fill="none" {...st(8)} />
      <path d="M34,-178 L62,-140 L80,-146" fill="none" {...st(8)} />
      <ellipse cx={30} cy={-318} rx={11} ry={34} transform="rotate(-20,30,-318)" fill="#fff" {...st(7)} />
      <ellipse cx={52} cy={-312} rx={11} ry={34} transform="rotate(12,52,-312)" fill="#fff" {...st(7)} />
      <ellipse cx={46} cy={-262} rx={42} ry={34} fill="#fff" {...st(9)} />
      <ellipse cx={86} cy={-248} rx={32} ry={20} fill="#fff" {...st(8)} />
      <circle cx={114} cy={-252} r={6} fill={C.ink} />
      <Eye x={42} y={-272} r={11} look={look} blink={blink} sw={4} />
      <Eye x={66} y={-272} r={11} look={look} blink={blink} sw={4} />
      <MouthShape x={92} y={-238} w={22} type={mouth} open={mouthOpen} sw={5} />
    </g>
  );
};

// ------------------------------------------------------------------ Elefante
export const Elephant: React.FC<AnimalProps & {ears?: number; trunk?: number}> = (p) => {
  const {ears = 0, trunk = 0, look = [0.2, 0], blink = 0, mouth = 'smile', mouthOpen = 1} = p;
  const leg = (x: number) => <rect key={x} x={x} y={-120} width={62} height={120} rx={22} fill="#fff" {...st(9)} />;
  const sway = Math.sin(trunk) * 18;
  return (
    <g transform={place(p)}>
      <path d="M-200,-180 Q-222,-150 -214,-110" fill="none" {...st(7)} />
      <path d="M-222,-118 l-8,18 l16,-4 z" fill={C.ink} {...st(4)} />
      {leg(-165)}
      {leg(-90)}
      <ellipse cx={-50} cy={-180} rx={165} ry={112} fill="#fff" {...st(10)} />
      {leg(10)}
      {leg(78)}
      {[-150, -75, 25, 93].map((x) => (
        <path key={x} d={`M${x + 10},-6 q10,-12 20,0 M${x + 30},-6 q10,-12 20,0`} fill="none" {...st(4)} />
      ))}
      {/* oreja: gira hacia arriba con `ears` */}
      <g transform={`rotate(${-ears * 38},96,-270)`}>
        <ellipse cx={70} cy={-205} rx={66} ry={92} transform="rotate(-8,70,-205)" fill="#fff" {...st(9)} />
        <ellipse cx={72} cy={-205} rx={40} ry={62} transform="rotate(-8,72,-205)" fill="none" stroke={C.ink} strokeWidth={4} opacity={0.5} />
      </g>
      <circle cx={140} cy={-230} r={84} fill="#fff" {...st(10)} />
      <path d={`M196,-196 C236,-150 ${226 + sway},-90 ${212 + sway},-42 Q${205 + sway},-22 ${226 + sway},-26`} fill="none" {...st(30)} />
      <path d={`M196,-196 C236,-150 ${226 + sway},-90 ${212 + sway},-42 Q${205 + sway},-22 ${226 + sway},-26`} fill="none" stroke="#fff" strokeWidth={13} strokeLinecap="round" />
      <path d="M172,-170 q-6,30 22,40" fill="none" stroke="#fff" strokeWidth={0} />
      <path d="M160,-168 q8,28 -18,42" fill="#fff" {...st(6)} />
      <Eye x={118} y={-252} r={17} look={look} blink={blink} sw={5} />
      <Eye x={166} y={-252} r={17} look={look} blink={blink} sw={5} />
      <MouthShape x={146} y={-190} w={30} type={mouth} open={mouthOpen} sw={6} />
    </g>
  );
};

// ------------------------------------------------------------------ Vaca
export const Cow: React.FC<AnimalProps> = (p) => {
  const {look = [0.3, 0], blink = 0, mouth = 'smile', mouthOpen = 1, t = 0, walk = 0} = p;
  const lg = (x: number, i: number) => {
    const ph = Math.sin(t * 12 + i * 1.7) * walk * 12;
    return <path key={x} d={`M${x},-100 L${x + ph},-8`} fill="none" {...st(13)} />;
  };
  return (
    <g transform={place(p)}>
      <path d="M-150,-190 Q-182,-150 -176,-110" fill="none" {...st(6)} />
      <path d="M-184,-118 l-6,22 l18,-6 z" fill={C.ink} {...st(4)} />
      {[-120, -80, 40, 80].map(lg)}
      {[-120, -80, 40, 80].map((x) => (
        <rect key={x} x={x - 12} y={-14} width={24} height={14} rx={3} fill={C.ink} />
      ))}
      <clipPath id="cowbody">
        <rect x={-155} y={-215} width={270} height={125} rx={52} />
      </clipPath>
      <rect x={-155} y={-215} width={270} height={125} rx={52} fill="#fff" {...st(10)} />
      <g clipPath="url(#cowbody)">
        <path d="M-120,-220 q40,10 30,50 q-30,30 -60,0 q-10,-30 30,-50z" fill={C.ink} />
        <path d="M0,-150 q50,-10 50,30 q-20,40 -60,20 q-20,-30 10,-50z" fill={C.ink} />
        <path d="M60,-222 q30,20 10,40 q-30,0 -10,-40z" fill={C.ink} />
      </g>
      <rect x={-155} y={-215} width={270} height={125} rx={52} fill="none" {...st(10)} />
      <path d="M-30,-92 q12,22 30,0" fill="#ffb3c1" {...st(5)} />
      {/* cabeza */}
      <path d="M118,-268 q-24,-30 -10,-44 M178,-268 q24,-30 10,-44" fill="none" {...st(9)} />
      <ellipse cx={104} cy={-240} rx={26} ry={13} transform="rotate(25,104,-240)" fill="#fff" {...st(7)} />
      <ellipse cx={192} cy={-240} rx={26} ry={13} transform="rotate(-25,192,-240)" fill="#fff" {...st(7)} />
      <ellipse cx={148} cy={-220} rx={50} ry={58} fill="#fff" {...st(10)} />
      <ellipse cx={150} cy={-178} rx={46} ry={28} fill="#fff" {...st(8)} />
      <ellipse cx={136} cy={-182} rx={5} ry={7} fill={C.ink} />
      <ellipse cx={164} cy={-182} rx={5} ry={7} fill={C.ink} />
      <Eye x={130} y={-236} r={13} look={look} blink={blink} sw={4} />
      <Eye x={166} y={-236} r={13} look={look} blink={blink} sw={4} />
      <MouthShape x={150} y={-166} w={30} type={mouth} open={mouthOpen} sw={5} />
      <path d="M120,-150 q30,14 58,0" fill="none" {...st(6)} />
      <path d="M140,-146 h20 l4,22 h-28 z" fill={C.yellow} {...st(5)} />
    </g>
  );
};

// ------------------------------------------------------------------ Cerdo
export const Pig: React.FC<AnimalProps> = (p) => {
  const {look = [0.3, 0], blink = 0, mouth = 'smile'} = p;
  return (
    <g transform={place(p)}>
      <path d="M-105,-110 q-30,-6 -24,-26 q14,-10 18,8 q2,16 -20,14" fill="none" {...st(6)} />
      {[-70, -30, 30, 66].map((x) => (
        <path key={x} d={`M${x},-40 L${x},-4`} fill="none" {...st(14)} />
      ))}
      <ellipse cx={-10} cy={-96} rx={104} ry={70} fill="#fff" {...st(10)} />
      <path d="M58,-152 l10,-38 l26,30 z M98,-150 l22,-34 l12,38 z" fill="#fff" {...st(7)} />
      <ellipse cx={116} cy={-104} rx={22} ry={28} fill="#fff" {...st(8)} />
      <ellipse cx={111} cy={-110} rx={4} ry={7} fill={C.ink} />
      <ellipse cx={122} cy={-98} rx={4} ry={7} fill={C.ink} />
      <Eye x={66} y={-128} r={11} look={look} blink={blink} sw={4} />
      <Eye x={92} y={-130} r={11} look={look} blink={blink} sw={4} />
      <MouthShape x={86} y={-82} w={22} type={mouth} sw={5} />
    </g>
  );
};

// ------------------------------------------------------------------ Ballena
export const Whale: React.FC<AnimalProps & {spout?: number}> = (p) => {
  const {look = [-0.3, 0], blink = 0, mouth = 'smile', spout = 0, t = 0} = p;
  const tailA = Math.sin(t * 6) * 10;
  return (
    <g transform={place(p)}>
      <g transform={`rotate(${tailA},-210,-110)`}>
        <path d="M-200,-120 L-270,-190 Q-300,-150 -280,-110 Q-310,-80 -290,-40 Z" fill="#fff" {...st(10)} />
      </g>
      <path d="M230,-110 C230,-250 30,-270 -120,-200 C-170,-175 -195,-150 -215,-125 C-190,-80 -100,-10 40,-10 C170,-10 230,-40 230,-110 Z" fill="#fff" {...st(11)} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${200 - i * 50},${-50 + i * 2} Q${150 - i * 50},${-28 + i * 3} ${90 - i * 50},${-24 + i * 3}`} fill="none" stroke={C.ink} strokeWidth={5} opacity={0.55} />
      ))}
      <path d="M40,-60 q-50,40 -90,30 q30,-20 50,-50" fill="#fff" {...st(8)} />
      <path d="M232,-92 Q170,-66 104,-80" fill="none" {...st(7)} />
      <Eye x={140} y={-130} r={17} look={look} blink={blink} sw={5} />
      <Eye x={176} y={-132} r={15} look={look} blink={blink} sw={5} />
      <MouthShape x={184} y={-96} w={26} type={mouth} sw={5} />
      {spout > 0 && (
        <g opacity={spout} transform={`translate(120,-232) scale(${spout})`}>
          <path d="M0,0 C-10,-60 -60,-80 -70,-60 M0,0 C0,-70 0,-90 0,-100 M0,0 C10,-60 60,-80 70,-60" fill="none" stroke={C.water} strokeWidth={10} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

// ------------------------------------------------------------------ Pájaro (con lentes de sol opcionales)
export const Bird: React.FC<AnimalProps & {flap?: number; shades?: boolean}> = (p) => {
  const {flap = 0, shades = false, look = [0.4, 0], blink = 0, mouth = 'smile'} = p;
  const wing = Math.sin(flap) * 40;
  return (
    <g transform={place(p)}>
      <path d="M-46,-70 l-40,-14 l8,22 l-12,14 l40,-6" fill="#fff" {...st(7)} />
      <path d="M-6,-24 l-6,22 M8,-24 l4,22" fill="none" {...st(6)} />
      <ellipse cx={0} cy={-66} rx={52} ry={44} fill="#fff" {...st(9)} />
      <path d="M44,-80 L86,-70 L44,-58 Z" fill={C.yellow} {...st(6)} />
      {shades ? (
        <g>
          <path d="M-2,-92 L66,-92" {...st(6)} />
          <path d="M2,-92 h26 q0,22 -13,22 q-13,0 -13,-22 z M34,-92 h26 q0,22 -13,22 q-13,0 -13,-22 z" fill={C.ink} />
          <path d="M8,-86 l7,0" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          <MouthShape x={30} y={-56} w={18} type="smirk" sw={4} />
        </g>
      ) : (
        <>
          <Eye x={16} y={-84} r={10} look={look} blink={blink} sw={4} />
          <Eye x={40} y={-84} r={10} look={look} blink={blink} sw={4} />
          <MouthShape x={30} y={-56} w={16} type={mouth} sw={4} />
        </>
      )}
      <g transform={`rotate(${-wing},-6,-70)`}>
        <path d="M-6,-70 C-40,-130 -90,-110 -80,-90 C-60,-70 -30,-64 -6,-70 Z" fill="#fff" {...st(8)} />
      </g>
    </g>
  );
};

// ------------------------------------------------------------------ Tierra con cara
export const Earth: React.FC<{x: number; y: number; r: number; yawn?: number; sleepy?: number; look?: [number, number]; blink?: number; mouth?: Mouth; rot?: number}> = ({
  x,
  y,
  r,
  yawn = 0,
  sleepy = 0,
  look = [0, 0],
  blink = 0,
  mouth = 'smile',
  rot = 0,
}) => (
  <g transform={`translate(${x},${y})`}>
    <clipPath id="earthclip">
      <circle r={r} />
    </clipPath>
    <circle r={r} fill={C.blue} />
    <g clipPath="url(#earthclip)" transform={`rotate(${rot})`}>
      <path
        d={`M${-r * 0.7},${-r * 0.6} q${r * 0.3},${-r * 0.25} ${r * 0.55},${-r * 0.05} q${r * 0.1},${r * 0.3} ${-r * 0.1},${r * 0.45} q${-r * 0.2},${r * 0.35} ${-r * 0.45},${r * 0.1} q${-r * 0.2},${-r * 0.3} 0,${-r * 0.5}z`}
        fill="#8fd17e"
        stroke={C.ink}
        strokeWidth={7}
      />
      <path
        d={`M${r * 0.3},${-r * 0.75} q${r * 0.45},${r * 0.05} ${r * 0.55},${r * 0.4} q${-r * 0.05},${r * 0.35} ${-r * 0.35},${r * 0.25} q${-r * 0.25},${-r * 0.2} ${-r * 0.2},${-r * 0.65}z`}
        fill="#8fd17e"
        stroke={C.ink}
        strokeWidth={7}
      />
      <path
        d={`M${-r * 0.2},${r * 0.45} q${r * 0.35},${-r * 0.1} ${r * 0.5},${r * 0.15} q${-r * 0.05},${r * 0.35} ${-r * 0.35},${r * 0.3} q${-r * 0.25},${-r * 0.2} ${-r * 0.15},${-r * 0.45}z`}
        fill="#8fd17e"
        stroke={C.ink}
        strokeWidth={7}
      />
    </g>
    <circle r={r} fill="none" stroke={C.ink} strokeWidth={12} />
    <Eye x={-r * 0.3} y={-r * 0.12} r={r * 0.15} look={look} blink={Math.max(blink, sleepy * 0.7, yawn * 0.95)} sw={7} />
    <Eye x={r * 0.3} y={-r * 0.12} r={r * 0.15} look={look} blink={Math.max(blink, sleepy * 0.7, yawn * 0.95)} sw={7} />
    {yawn > 0.05 ? <MouthShape x={0} y={r * 0.2} w={r * 0.5} type="yawn" open={yawn} sw={8} /> : <MouthShape x={0} y={r * 0.28} w={r * 0.42} type={mouth} sw={8} />}
  </g>
);
