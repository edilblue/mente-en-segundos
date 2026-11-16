// ESCENA 4 — ¿DESAPARECERÍA TODO EL MIEDO? Stick busca "el interruptor del miedo" en el laboratorio,
// lo apaga… y la red cerebral sigue activa: el miedo depende de varias regiones y de señales del cuerpo.
import React from 'react';
import {Cue} from '../../../lib/scene';
import {useScene, SceneCtx} from '../../../lib/timeline';
import {C} from '../../../lib/theme';
import {ease, flash, lerp, pop, prog, shake} from '../../../lib/anim';
import {Stick} from '../../../stick/Stick';
import {EXPR, exprAt} from '../../../stick/expressions';
import {POSES, Pose, idle, ik, poseAt, walkPose} from '../../../stick/poses';
import {Brain, Gut, Heart, heartbeat, Lungs, REGION, RegionName, RegionTag} from '../../../world/Brain';
import {LabDoors, LabRoom, LabScreen, LeverSwitch, leverKnob} from '../../../world/Lab';
import {Curve, Signal, Title} from '../../../fx/fx';

const beats = (c: SceneCtx) => ({
  doors: [0.05, 0.85] as [number, number],
  arrive: Math.max(1.6, c.at('sorprendente') - 0.2),
  flip: c.at('interruptor') + 0.05,
  amy: c.at('amígdala'),
  otras: c.at('otras'),
  senales: c.at('señales'),
  part: c.at('participan'),
});

export const cues = (c: SceneCtx): Cue[] => {
  const b = beats(c);
  return [
    {at: b.doors[0], sfx: 'puerta', vol: 0.45},
    {at: 0.6, sfx: 'pasos', vol: 0.22},
    {at: b.flip - 0.25, sfx: 'click', vol: 0.3},
    {at: b.flip, sfx: 'clunk', vol: 0.6},
    {at: b.flip + 0.55, sfx: 'boing', vol: 0.3},
    {at: b.amy, sfx: 'ding', vol: 0.35},
    {at: b.otras + 0.1, sfx: 'pop', vol: 0.3},
    {at: b.otras + 0.45, sfx: 'pop', vol: 0.3},
    {at: b.otras + 0.8, sfx: 'pop', vol: 0.3},
    {at: b.senales, sfx: 'brillo', vol: 0.35},
    {at: b.part, sfx: 'brillo', vol: 0.3},
  ];
};

const SX = 560;
const SWX = 830;
const SWS = 0.95;
const BX = 560;
const BY = 560;
const BS = 1.22;
const R = (k: RegionName): [number, number] => [BX + REGION[k][0] * BS, BY + REGION[k][1] * BS];

export const Scene: React.FC = () => {
  const c = useScene();
  const {t} = c;
  const b = beats(c);

  const lever = 1 - prog(t, b.flip - 0.1, b.flip + 0.08, ease.in);
  // ---- Stick: entra caminando, llega al interruptor, lo baja, se sorprende, piensa
  const walkEnd = b.arrive;
  const sx = lerp(-120, SX, prog(t, 0.45, walkEnd, ease.linear));
  const walking = t > 0.45 && t < walkEnd;
  const w = walkPose(t * 0.95, 1);
  // la mano sigue exactamente al pomo de la palanca (IK desde el hombro)
  const knob = (on: number, torso: number): Pose => {
    const [kx0, ky0] = leverKnob(on);
    const kx = SWX + kx0 * SWS - SX;
    const ky = 1700 + ky0 * SWS - 1700;
    const shx = Math.sin((torso * Math.PI) / 180) * 149;
    const shy = -188 - Math.cos((torso * Math.PI) / 180) * 149;
    return {...POSES.reach, torso, armR: ik(kx - shx, ky - shy, -1), handR: 'fist'};
  };
  const grab = knob(1, 6);
  const pull = knob(0, 12);
  const leverPose = knob(lever, lerp(12, 6, lever));
  const onLever = t >= b.flip - 0.12 && t < b.flip + 0.3;
  const pose = walking
    ? w.pose
    : onLever
    ? leverPose
    : poseAt(t, [
        [0, POSES.stand],
        [walkEnd, POSES.stand],
        [b.flip - 0.45, grab],
        [b.flip + 0.3, pull],
        [b.flip + 0.6, POSES.surprised],
        [b.amy + 0.2, POSES.pointDiag],
        [b.otras + 0.3, POSES.chinScratch],
        [b.part - 0.1, POSES.open],
      ]);
  const expr = exprAt(t, [
    [0, EXPR.happy],
    [walkEnd, EXPR.determined],
    [b.flip + 0.1, EXPR.smug],
    [b.flip + 0.55, EXPR.surprised],
    [b.amy + 0.2, EXPR.curious],
    [b.otras + 0.3, EXPR.thinking],
    [b.part - 0.1, EXPR.amazed],
  ]);
  const look: [number, number] = t > b.flip + 0.5 ? [0.4, -1] : [0.6, 0];

  // ---- interruptor
  const spark = flash(t, b.flip, 0.45);

  // ---- red cerebral en la pantalla
  const amyOn = 1 - prog(t, b.flip, b.flip + 0.15) * 0.7 + prog(t, b.amy - 0.1, b.amy + 0.2) * 0.7;
  const others = (i: number) => prog(t, b.otras + i * 0.35, b.otras + i * 0.35 + 0.25);
  const body = prog(t, b.senales - 0.05, b.senales + 0.3);
  const all = prog(t, b.part - 0.1, b.part + 0.4);
  const glow: Partial<Record<RegionName, number>> = {
    amygdala: Math.min(1, amyOn) * (0.85 + 0.15 * Math.sin(t * 8)),
    insula: others(0),
    prefrontal: others(1),
    brainstem: others(2),
    hypothalamus: others(2) * 0.8,
  };
  const net: [RegionName, RegionName, number][] = [
    ['amygdala', 'insula', others(0)],
    ['amygdala', 'prefrontal', others(1)],
    ['amygdala', 'brainstem', others(2)],
    ['insula', 'prefrontal', others(1)],
    ['hypothalamus', 'brainstem', others(2)],
  ];
  const curve = (a: [number, number], z: [number, number], bend = 60): Curve => {
    const mx = (a[0] + z[0]) / 2;
    const my = (a[1] + z[1]) / 2 - bend;
    return [a, [mx, my], [mx, my], z];
  };
  const hb = heartbeat(t * 1.6);
  const bodyIcons: {x: number; y: number; node: React.ReactNode; to: RegionName}[] = [
    {x: 205, y: 900, node: <Heart x={205} y={900} s={0.55} beat={hb} />, to: 'brainstem'},
    {x: 340, y: 930, node: <Lungs x={340} y={935} s={0.62} breath={Math.sin(t * 2.4) * 0.5 + 0.5} />, to: 'brainstem'},
    {x: 870, y: 905, node: <Gut x={870} y={905} s={0.85} />, to: 'insula'},
  ];
  const zoom = lerp(1, 1.04, prog(t, b.part, c.D));
  const [kx, ky] = shake(t, spark * 10);

  return (
    <g transform={`translate(${kx} ${ky})`}>
      <g transform={`translate(540 960) scale(${zoom}) translate(-540 -960)`}>
        <LabRoom t={t} screen={false} />
        <LabScreen id="s4screen" title="RED DEL MIEDO">
          <Brain x={BX} y={BY} s={BS} t={t} glow={glow} deep={0.5} />
          {net.map(([a, z, on], i) =>
            on > 0 ? <Signal key={i} c={curve(R(a), R(z), 50 + i * 15)} t={t} t0={b.otras + i * 0.2} draw={0.35} color={C.yellow} width={7} pulses={1.5} speed={0.8} /> : null,
          )}
          {bodyIcons.map((ic, i) => (
            <g key={i}>
              <g opacity={0.25 + body * 0.75} transform={`translate(${ic.x} ${ic.y}) scale(${0.9 + body * 0.1 + all * Math.sin(t * 6 + i) * 0.04}) translate(${-ic.x} ${-ic.y})`}>
                <circle cx={ic.x} cy={ic.y} r={72} fill={C.white} opacity={0.9} stroke={C.ink} strokeWidth={6} />
                {ic.node}
              </g>
              <Signal c={curve([ic.x, ic.y - 70], R(ic.to), 80)} t={t} t0={b.senales + i * 0.15} draw={0.45} color="#7CF0B0" width={7} pulses={1.5} speed={1} />
            </g>
          ))}
          <RegionTag x={R('amygdala')[0] + 150} y={R('amygdala')[1] + 70} text="AMÍGDALA" color={C.red} s={pop(t, b.amy) * 1.15} />
          <RegionTag x={R('insula')[0] - 210} y={R('insula')[1] - 230} text="ÍNSULA" color={C.yellow} s={pop(t, b.otras) * 1.1} />
          <RegionTag x={R('prefrontal')[0] - 20} y={R('prefrontal')[1] - 200} text="CORTEZA PREFRONTAL" color={C.blue} s={pop(t, b.otras + 0.35) * 1.05} />
          <RegionTag x={R("brainstem")[0] - 245} y={R('brainstem')[1] - 70} text="TRONCO ENCEFÁLICO" color={C.green} s={pop(t, b.otras + 0.7) * 0.95} />
          <RegionTag x={540} y={985} text="SEÑALES DEL CUERPO" color="#7CF0B0" s={pop(t, b.senales + 0.2) * 1.05} />
        </LabScreen>
        <LeverSwitch x={SWX} y={1700} on={lever} label="MIEDO" s={SWS} spark={spark} t={t} />
        {t > b.flip + 0.5 && t < b.amy + 0.3 && <Title x={820} y={1150} text="?!" size={110} fill={C.white} t={t} t0={b.flip + 0.5} t1={b.amy} />}
        <Stick x={sx} y={1700} pose={walking ? pose : idle(pose, t)} lift={walking ? w.bob : 0} expr={expr} t={t} look={look} turn={0.45} />
      </g>
      <LabDoors open={prog(t, b.doors[0], b.doors[1], ease.inOut)} />
    </g>
  );
};
