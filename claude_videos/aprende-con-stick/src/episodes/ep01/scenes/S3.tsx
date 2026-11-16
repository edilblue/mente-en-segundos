// ESCENA 3 — EL MUNDO SIN MIEDO: Stick subestima tres peligros. Cada situación se congela
// ANTES de cualquier accidente (sello "¡ALTO!"); al final, resumen en tres fotos.
import React from 'react';
import {Cue} from '../../../lib/scene';
import {useScene, SceneCtx} from '../../../lib/timeline';
import {C} from '../../../lib/theme';
import {clamp, ease, flash, lerp, pop, prog, shake} from '../../../lib/anim';
import {Stick, handPos} from '../../../stick/Stick';
import {EXPR, exprAt} from '../../../stick/expressions';
import {POSES, Pose, idle, poseAt, walkPose} from '../../../stick/poses';
import {Buildings, Cloud, Sky, Sun, Tree} from '../../../world/Street';
import {Bell, Car, Hive, WarningSign} from '../../../world/Props';
import {FreezeOverlay, Label, Stamp, WhipStripes} from '../../../fx/fx';

const beats = (c: SceneCtx) => {
  const fA = c.at('peligros') + 0.2;
  const swB = fA + 0.7;
  const fB = c.end('retroceder') - 0.05;
  const swC = fB + 0.7;
  const fC = c.at('arriesgadas') + 0.1;
  const recap = Math.min(fC + 0.85, c.D - 2.6);
  return {fA, swB, fB, swC, fC, recap};
};

export const cues = (c: SceneCtx): Cue[] => {
  const b = beats(c);
  return [
    {at: 0, sfx: 'whoosh', vol: 0.4},
    {at: 0.1, sfx: 'pasos', vol: 0.22},
    {at: b.fA, sfx: 'sello', vol: 0.7},
    {at: b.swB - 0.15, sfx: 'whoosh', vol: 0.45},
    {at: b.fB - 1.0, sfx: 'claxon', vol: 0.4},
    {at: b.fB, sfx: 'sello', vol: 0.7},
    {at: b.swC - 0.15, sfx: 'whoosh', vol: 0.45},
    {at: b.swC + 0.2, sfx: 'zumbido', vol: 0.3},
    {at: b.fC, sfx: 'sello', vol: 0.7},
    {at: b.recap, sfx: 'whoosh', vol: 0.4},
    {at: b.recap + 0.25, sfx: 'pop', vol: 0.3},
    {at: b.recap + 0.45, sfx: 'pop', vol: 0.3},
    {at: b.recap + 0.65, sfx: 'pop', vol: 0.3},
    {at: b.recap + 1.1, sfx: 'error', vol: 0.3},
  ];
};

const EDGE = 700;

// ---------------------------------------------------------------- precipicio
const CliffStation: React.FC<{t: number; f: number}> = ({t, f}) => {
  const walkEnd = f - 0.75;
  const x = lerp(90, 600, prog(t, 0, walkEnd, ease.linear));
  const walking = t < walkEnd;
  const w = walkPose(t * 0.95, 1);
  const edgePose: Pose = {torso: 14, head: 16, armL: [-40, 30], armR: [55, -30], legL: [-6, 0], legR: [40, -8], handL: 'open', handR: 'open'};
  const pose = walking ? w.pose : poseAt(t, [[walkEnd, w.pose], [walkEnd, edgePose]], 0.35);
  const expr = exprAt(t, [
    [0, EXPR.calm],
    [walkEnd + 0.1, EXPR.curious],
    [walkEnd + 0.45, EXPR.happy],
  ]);
  return (
    <g>
      <Sky id="skyCliff" top="#B4D9FF" bottom="#EEF7FF" />
      <Sun x={880} y={330} t={t} />
      <path d="M -50 1250 L 150 1080 L 300 1180 L 480 980 L 700 1210 L 880 1060 L 1130 1260 L 1130 1500 L -50 1500 Z" fill="#CFE0F5" stroke="#A9C3E3" strokeWidth={6} />
      <Cloud x={900} y={1650} s={1.3} />
      <Cloud x={760} y={1830} s={1.1} o={0.9} />
      <Cloud x={1040} y={1500} s={0.9} o={0.9} />
      <path d={`M -60 1460 L ${EDGE} 1460 L ${EDGE - 30} 1560 L ${EDGE + 10} 1650 L ${EDGE - 50} 1760 L ${EDGE - 10} 1950 L -60 1950 Z`} fill="#D2B48C" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
      <path d={`M -60 1440 L ${EDGE + 4} 1440 L ${EDGE + 4} 1475 L -60 1475 Z`} fill="#6FD898" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      {[[150, 1620], [380, 1720], [560, 1580], [240, 1850]].map(([px, py], i) => (
        <path key={i} d={`M ${px} ${py} q 30 -20 60 0`} fill="none" stroke="#A88A63" strokeWidth={7} strokeLinecap="round" />
      ))}
      <WarningSign x={330} y={1462} s={0.62} text="¡PELIGRO!" sway={Math.sin(t * 2) * 1.5} />
      <Stick x={x} y={1462} pose={walking ? pose : idle(pose, t, 0.6)} lift={walking ? w.bob : 0} expr={expr} t={t} look={walking ? [0.3, 0] : [0.7, 0.8]} turn={0.4} />
    </g>
  );
};

// ---------------------------------------------------------------- auto
const RoadStation: React.FC<{t: number; f: number}> = ({t, f}) => {
  const carX = lerp(1800, 900, prog(t, 0, f, ease.out));
  const honk = prog(t, f - 1.0, f - 0.9) * (0.6 + 0.4 * Math.sin(t * 30));
  const pose = poseAt(t, [
    [0, POSES.stand],
    [0.25, POSES.wave],
  ]);
  const waveAnim: Pose = {...pose, armR: [pose.armR[0] + Math.sin(t * 12) * 12, pose.armR[1]]};
  return (
    <g>
      <Sky id="skyRoad" />
      <Buildings off={200} base={1300} />
      <rect x={0} y={1290} width={1080} height={60} fill="#E8E1D3" stroke={C.ink} strokeWidth={6} />
      <rect x={0} y={1350} width={1080} height={600} fill="#8796AD" />
      {Array.from({length: 6}).map((_, i) => (
        <rect key={i} x={300 + i * 0} y={1390 + i * 95} width={340} height={52} rx={8} fill={C.white} opacity={0.92} />
      ))}
      <Car x={carX} y={1700} s={1.05} t={t} speed={1} honk={honk} />
      <Stick x={470} y={1660} pose={idle(waveAnim, t)} expr={EXPR.grin} t={t} turn={0.5} look={[0.8, 0]} />
    </g>
  );
};

// ---------------------------------------------------------------- colmena
const HiveStation: React.FC<{t: number; f: number}> = ({t, f}) => {
  const poke = Math.max(0, Math.sin(t * 9)) * prog(t, 0.4, 0.7);
  const base: Pose = {torso: 8, head: -6, armL: [-30, 20], armR: [128, -10], legL: [-14, 0], legR: [18, 0], handR: 'fist'};
  const pose: Pose = {...base, armR: [base.armR[0] - poke * 8, base.armR[1] + poke * 6]};
  const sx = 360;
  const sy = 1640;
  const [hx, hy] = handPos(pose, 'R');
  const hand: [number, number] = [sx + hx, sy + hy];
  const tip: [number, number] = [hand[0] + 260 + poke * 30, hand[1] - 330 - poke * 30];
  const agitation = clamp(prog(t, 0.5, f) + poke * 0.2);
  return (
    <g>
      <Sky id="skyHive" top="#C5E5FF" bottom="#F5FBFF" />
      <Cloud x={250} y={380} s={1} />
      <rect x={0} y={1580} width={1080} height={400} fill="#8FDCA9" />
      <rect x={0} y={1570} width={1080} height={26} fill="#6FD898" stroke={C.ink} strokeWidth={7} />
      <Tree x={880} y={1600} s={1.5} t={t} />
      <path d="M 820 1080 Q 760 1060 720 1090" fill="none" stroke={C.ink} strokeWidth={22} strokeLinecap="round" />
      <path d="M 820 1080 Q 760 1060 720 1090" fill="none" stroke="#B98552" strokeWidth={12} strokeLinecap="round" />
      <Hive x={720} y={1260} s={0.95} t={t} agitation={agitation} />
      <WarningSign x={150} y={1590} s={0.58} text="ABEJAS" />
      <line x1={hand[0]} y1={hand[1]} x2={tip[0]} y2={tip[1]} stroke={C.ink} strokeWidth={20} strokeLinecap="round" />
      <line x1={hand[0]} y1={hand[1]} x2={tip[0]} y2={tip[1]} stroke="#B98552" strokeWidth={10} strokeLinecap="round" />
      <Stick x={sx} y={sy} pose={idle(pose, t, 0.4)} expr={EXPR.smug} t={t} turn={0.5} look={[0.7, -0.8]} />
    </g>
  );
};

const Card: React.FC<{x: number; y: number; rot: number; s: number; children: React.ReactNode; id: string; cross: number}> = ({x, y, rot, s, children, id, cross}) => {
  const W = 1080 * 0.27;
  const H = 1920 * 0.27;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <rect x={-W / 2 - 18 + 10} y={-H / 2 - 18 + 14} width={W + 36} height={H + 80} rx={10} fill={C.shadow} />
      <rect x={-W / 2 - 18} y={-H / 2 - 18} width={W + 36} height={H + 80} rx={10} fill={C.white} stroke={C.ink} strokeWidth={6} />
      <defs>
        <clipPath id={id}>
          <rect x={-W / 2} y={-H / 2} width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <g transform={`translate(${-W / 2} ${-H / 2}) scale(0.27)`}>{children}</g>
      </g>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="none" stroke={C.ink} strokeWidth={4} />
      {cross > 0 && (
        <g stroke={C.red} strokeWidth={22} strokeLinecap="round">
          <line x1={-90} y1={-90} x2={-90 + 180 * clamp(cross * 2)} y2={-90 + 180 * clamp(cross * 2)} />
          {cross > 0.5 && <line x1={90} y1={-90} x2={90 - 180 * clamp(cross * 2 - 1)} y2={-90 + 180 * clamp(cross * 2 - 1)} />}
        </g>
      )}
    </g>
  );
};

export const Scene: React.FC = () => {
  const c = useScene();
  const {t} = c;
  const b = beats(c);
  const fadeIn = 1 - prog(t, 0, 0.25);
  let content: React.ReactNode;
  if (t < b.swB) {
    const tt = Math.min(t, b.fA);
    content = (
      <g>
        <CliffStation t={tt} f={b.fA} />
        <FreezeOverlay t={t} t0={b.fA} />
        <Stamp x={540} y={760} text="¡ALTO!" t={t} t0={b.fA + 0.05} />
      </g>
    );
  } else if (t < b.swC) {
    const tt = Math.min(t - b.swB, b.fB - b.swB);
    content = (
      <g>
        <RoadStation t={tt} f={b.fB - b.swB} />
        <FreezeOverlay t={t} t0={b.fB} />
        <Stamp x={540} y={760} text="¡ALTO!" t={t} t0={b.fB + 0.05} rot={8} />
      </g>
    );
  } else if (t < b.recap) {
    const tt = Math.min(t - b.swC, b.fC - b.swC);
    content = (
      <g>
        <HiveStation t={tt} f={b.fC - b.swC} />
        <FreezeOverlay t={t} t0={b.fC} />
        <Stamp x={540} y={700} text="¡ALTO!" t={t} t0={b.fC + 0.05} rot={-6} />
      </g>
    );
  } else {
    const r = t - b.recap;
    const cards = [
      {x: 215, y: 640, rot: -7, node: <CliffStation t={b.fA} f={b.fA} />},
      {x: 540, y: 600, rot: 2, node: <RoadStation t={b.fB - b.swB} f={b.fB - b.swB} />},
      {x: 865, y: 650, rot: 8, node: <HiveStation t={b.fC - b.swC} f={b.fC - b.swC} />},
    ];
    const pose = poseAt(r, [
      [0, POSES.stand],
      [0.9, POSES.shrug],
    ]);
    const [sx2, sy2] = shake(t, flash(t, b.recap + 1.1, 0.3) * 8);
    content = (
      <g transform={`translate(${sx2} ${sy2})`}>
        <rect width={1080} height={1920} fill={C.cream} />
        {Array.from({length: 12}).map((_, i) => (
          <line key={i} x1={0} y1={160 * i} x2={1080} y2={160 * i - 120} stroke="#F3E6CB" strokeWidth={30} />
        ))}
        {cards.map((cd, i) => (
          <Card key={i} id={`card${i}`} x={cd.x} y={cd.y + (1 - pop(r, 0.2 + i * 0.2)) * -900} rot={cd.rot} s={0.98} cross={prog(r, 1.0 + i * 0.12, 1.35 + i * 0.12)}>
            {cd.node}
          </Card>
        ))}
        <g transform="translate(250 1430)">
          <Bell x={0} y={0} s={0.9 * pop(r, 0.6)} ring={0} t={t} color={C.grey} />
          {r > 0.8 && <line x1={-90} y1={-80} x2={90} y2={70} stroke={C.red} strokeWidth={18} strokeLinecap="round" />}
        </g>
        <Label x={250} y={1580} text="SIN ALARMA" t={r} t0={0.8} bg={C.white} fg={C.red} size={44} />
        <Stick x={720} y={1720} pose={idle(pose, t)} expr={exprAt(r, [[0, EXPR.blank], [0.9, EXPR.oops]])} t={t} turn={-0.2} />
      </g>
    );
  }
  return (
    <g>
      {content}
      <WhipStripes t={t} t0={b.swB} />
      <WhipStripes t={t} t0={b.swC} />
      <WhipStripes t={t} t0={b.recap} dir={-1} />
      <rect width={1080} height={1920} fill={C.white} opacity={fadeIn} />
    </g>
  );
};
