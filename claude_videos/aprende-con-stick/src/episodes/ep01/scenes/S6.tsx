// ESCENA 6 — CONCLUSIÓN: no sentir miedo no te hace superhéroe. La alarma es incómoda,
// Stick casi la rompe… pero mejor la AJUSTA, sonríe y se gira hacia el espectador.
import React from 'react';
import {Cue} from '../../../lib/scene';
import {useScene, SceneCtx} from '../../../lib/timeline';
import {C} from '../../../lib/theme';
import {clamp, ease, flash, lerp, pop, prog, shake, springAt} from '../../../lib/anim';
import {Stick, handPos} from '../../../stick/Stick';
import {EXPR, exprAt} from '../../../stick/expressions';
import {POSES, Pose, idle, ik, poseAt} from '../../../stick/poses';
import {ALARM_KNOB, AlarmMachine, Mallet} from '../../../world/Props';
import {Burst, Rings, Sparkle, Title, WhipStripes} from '../../../fx/fx';

const beats = (c: SceneCtx) => {
  const sup = c.end('superhéroe');
  return {
    hero: 0.25,
    sup,
    deflate: sup + 0.05,
    machine: sup + 0.35,
    incomodo: c.at('incómodo') - 0.35,
    mallet: c.end('incómodo') + 0.05,
    hesitate: c.at('también') - 0.05,
    drop: c.at('herramienta') - 0.2,
    knob: c.at('esencial') - 0.25,
    smile: c.at('sobrevivir'),
    turn: c.D - 1.25,
  };
};

export const cues = (c: SceneCtx): Cue[] => {
  const b = beats(c);
  return [
    {at: 0, sfx: 'whoosh', vol: 0.4},
    {at: b.hero, sfx: 'boing', vol: 0.35},
    {at: b.hero + 0.1, sfx: 'brillo', vol: 0.3},
    {at: b.deflate, sfx: 'desinflar', vol: 0.45},
    {at: b.machine, sfx: 'whoosh', vol: 0.4},
    {at: b.incomodo, sfx: 'alarma_fuerte', vol: 0.3},
    {at: b.mallet, sfx: 'pop', vol: 0.3},
    {at: b.drop + 0.35, sfx: 'clunk', vol: 0.45},
    {at: b.knob, sfx: 'perilla', vol: 0.5},
    {at: b.smile, sfx: 'ding', vol: 0.35},
    {at: b.turn, sfx: 'whoosh', vol: 0.3},
  ];
};

const MX = 790;
const FLOOR = 1690;
const SX = 520;

export const Scene: React.FC = () => {
  const c = useScene();
  const {t} = c;
  const b = beats(c);

  // ---- alarma
  const machineIn = springAt(t, b.machine, {stiffness: 140, damping: 15});
  const knobV = 1 - prog(t, b.knob, b.knob + 0.7, ease.inOut) * 0.5;
  const level = t < b.machine ? 0 : t < b.knob ? lerp(0.7, 1, prog(t, b.incomodo - 0.2, b.incomodo + 0.2)) : lerp(1, 0.32, prog(t, b.knob, b.knob + 0.7));
  const ok = prog(t, b.knob + 0.6, b.knob + 0.7);

  // ---- Stick
  const heroLift = (springAt(t, b.hero, {stiffness: 160, damping: 10}) * 60) * (1 - prog(t, b.deflate, b.deflate + 0.25, ease.in));
  const knobPose = (() => {
    const sh: [number, number] = [Math.sin((8 * Math.PI) / 180) * 149, -188 - Math.cos((8 * Math.PI) / 180) * 149];
    const kx = MX + ALARM_KNOB[0] - SX;
    const ky = FLOOR + ALARM_KNOB[1] - FLOOR;
    return {...POSES.turnKnob, torso: 8, armR: ik(kx - sh[0], ky - sh[1], -1), handR: 'fist'} as Pose;
  })();
  const windup: Pose = {...POSES.windup};
  const hesitate: Pose = {...POSES.windup, torso: -4, head: 10, armL: [-150, -10], armR: [-142, -16]};
  const pose = poseAt(t, [
    [0, POSES.stand],
    [b.hero - 0.1, POSES.crouch],
    [b.hero + 0.05, POSES.heroFist],
    [b.deflate + 0.15, POSES.shrug],
    [b.incomodo, POSES.coverEars],
    [b.mallet, windup],
    [b.hesitate, hesitate],
    [b.drop, POSES.stand],
    [b.knob - 0.3, knobPose],
    [b.smile, POSES.thumbsUp],
    [b.turn + 0.2, POSES.wave],
  ]);
  const expr = exprAt(t, [
    [0, EXPR.happy],
    [b.hero, EXPR.proud],
    [b.deflate + 0.1, EXPR.oops],
    [b.incomodo, EXPR.wince],
    [b.mallet, EXPR.determined],
    [b.hesitate + 0.15, EXPR.thinking],
    [b.drop, EXPR.calm],
    [b.knob, EXPR.happy],
    [b.smile, EXPR.grin],
    [b.turn + 0.2, EXPR.happy],
  ]);
  const turn = lerp(0.45, 0, prog(t, b.turn, b.turn + 0.5));
  const look: [number, number] =
    t > b.hesitate + 0.15 && t < b.drop ? [-0.6, 0] : t > b.turn ? [0, 0] : t > b.machine ? [0.8, -0.3] : [0.3, -0.2];

  // ---- mazo: en las manos entre mallet y drop; luego cae
  const holding = t >= b.mallet && t < b.drop;
  const [hx, hy] = handPos(pose, 'R');
  const fall = prog(t, b.drop, b.drop + 0.35, ease.in);

  // ---- cámara: acercamiento final a Stick mirando al espectador
  const push = prog(t, b.turn, c.D, ease.inOut);
  const zoom = lerp(1, 1.55, push);
  const fx = lerp(540, SX + 20, push);
  const fy = lerp(960, FLOOR - 330, push);
  const [kx, ky] = shake(t, (t > b.incomodo && t < b.knob ? 6 : 0) + flash(t, b.drop + 0.35, 0.3) * 10);

  const burst = pop(t, b.hero) * (1 - prog(t, b.deflate, b.deflate + 0.3, ease.inBack));

  return (
    <g transform={`translate(${kx} ${ky})`}>
      <g transform={`translate(540 960) scale(${zoom}) translate(${-fx} ${-fy})`}>
        <rect width={1080} height={1920} fill="#FFF4DC" />
        {/* fondo: pared con franjas suaves y piso */}
        {Array.from({length: 9}).map((_, i) => (
          <rect key={i} x={i * 130 - 20} y={0} width={60} height={FLOOR} fill="#FFEBC2" opacity={0.6} />
        ))}
        {burst > 0.01 && (
          <g transform={`translate(${SX} ${FLOOR - 300}) scale(${burst}) translate(${-SX} ${-(FLOOR - 300)})`}>
            <Burst cx={SX} cy={FLOOR - 300} t={t} colors={[C.yellow, C.yellowSoft]} rays={16} r={700} spin={30} />
            {[0, 1, 2, 3].map((i) => (
              <Sparkle key={i} x={SX + Math.cos(i * 1.6 + t * 2) * 330} y={FLOOR - 300 + Math.sin(i * 1.6 + t * 2) * 330} s={0.9 + 0.3 * Math.sin(t * 6 + i)} rot={t * 90} />
            ))}
          </g>
        )}
        <rect x={0} y={FLOOR} width={1080} height={1920 - FLOOR} fill="#9CC6FF" />
        <line x1={0} y1={FLOOR} x2={1080} y2={FLOOR} stroke={C.ink} strokeWidth={8} />
        {/* alarma */}
        <g transform={`translate(${lerp(700, 0, machineIn)} 0)`}>
          <Rings x={MX} y={FLOOR - 540} t={t} t0={b.machine + 0.2} every={lerp(0.9, 0.32, level)} r0={120} r1={lerp(220, 520, level)} color={level > 0.5 ? C.red : C.blue} width={lerp(5, 12, level)} />
          <AlarmMachine x={MX} y={FLOOR} s={1} level={level} knob={knobV} t={t} ok={ok} />
        </g>
        {/* mazo */}
        {holding && <Mallet x={SX + hx} y={FLOOR + hy} angle={-30 + pose.torso} s={0.9} />}
        {t >= b.drop && t < b.drop + 1.2 && (
          <Mallet x={lerp(SX + 30, SX - 170, fall)} y={lerp(FLOOR - 560, FLOOR - 20, fall)} angle={lerp(-30, -95, fall)} s={0.9} />
        )}
        <Stick x={SX} y={FLOOR} pose={idle(pose, t)} lift={heroLift} expr={expr} t={t} look={look} turn={turn} />
        {/* textos */}
        <Title x={540} y={300} text="¿SÚPER-STICK?" size={100} fill={C.yellow} t={t} t0={b.hero + 0.1} t1={b.deflate} rot={-4} />
        <Title x={540} y={300} text="INCÓMODO…" size={92} fill={C.red} t={t} t0={b.incomodo + 0.1} t1={b.drop} rot={-3} />
        <Title x={540} y={300} text="…PERO ÚTIL" size={100} fill={C.green} t={t} t0={b.knob + 0.3} t1={b.turn} rot={3} />
      </g>
      {clamp(push) > 0 && <rect width={1080} height={1920} fill={C.white} opacity={prog(t, c.D - 0.2, c.D)} />}
      <WhipStripes t={c.t} t0={0} dir={-1} />
    </g>
  );
};
