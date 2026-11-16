// ESCENA 1 — GANCHO: Stick pasea, un perro enorme le ladra… y ni se inmuta.
import React from 'react';
import {Cue} from '../../../lib/scene';
import {useScene, SceneCtx} from '../../../lib/timeline';
import {C} from '../../../lib/theme';
import {ease, flash, lerp, pop, prog, shake} from '../../../lib/anim';
import {Cam} from '../../../lib/scene';
import {Stick} from '../../../stick/Stick';
import {EXPR, exprAt} from '../../../stick/expressions';
import {POSES, walkPose, idle} from '../../../stick/poses';
import {Buildings, Cloud, Fence, Lamp, Sidewalk, Sky, Sun, Tree} from '../../../world/Street';
import {Dog} from '../../../world/Dog';
import {Burst, Notes, SoundLines, SpeedLines, Title} from '../../../fx/fx';

const beats = (c: SceneCtx) => {
  const cut = c.at('serías') - 0.12;
  const barks = [0.72, 1.08, 1.5, 1.86, 2.2].filter((b) => b < cut - 0.15);
  return {cut, barks, inv: c.at('invencible'), pel: c.at('peligro')};
};

export const cues = (c: SceneCtx): Cue[] => {
  const b = beats(c);
  return [
    {at: 0, sfx: 'pasos', vol: 0.25},
    {at: 0.38, sfx: 'pop', vol: 0.35},
    ...b.barks.map((at, i) => ({at, sfx: i % 2 ? 'ladrido2' : 'ladrido', vol: 0.55})),
    {at: b.cut, sfx: 'impacto', vol: 0.8},
    {at: b.inv, sfx: 'pop', vol: 0.3},
    {at: b.pel, sfx: 'golpe_grave', vol: 0.55},
  ];
};

const barkEnv = (t: number, barks: number[]) =>
  Math.max(0, ...barks.map((b) => (t < b ? 0 : t < b + 0.07 ? (t - b) / 0.07 : Math.max(0, 1 - (t - b - 0.07) / 0.22))));

export const Scene: React.FC = () => {
  const c = useScene();
  const {t} = c;
  const b = beats(c);
  if (t < b.cut) {
    // ---------------------------------------------------------------- calle
    const camX = t * 210;
    const w = walkPose(t * 0.68 + 0.1, 1);
    const bark = barkEnv(t, b.barks);
    const glance = prog(t, 1.15, 1.4) * (1 - prog(t, 2.05, 2.3));
    const dogUp = pop(t, 0.38);
    const dogX = 980 - camX;
    const confused = prog(t, b.barks[b.barks.length - 1] + 0.35, b.barks[b.barks.length - 1] + 0.6);
    const expr = exprAt(t, [
      [0, EXPR.calm],
      [1.2, EXPR.blank],
      [2.1, EXPR.calm],
    ]);
    const [sx, sy] = shake(t, bark * 7);
    return (
      <Cam shake={[sx, sy]}>
        <Sky />
        <Sun x={880} y={300} t={t} />
        <Cloud x={260 - camX * 0.08} y={360} s={1.1} />
        <Cloud x={760 - camX * 0.08} y={560} s={0.8} o={0.9} />
        <Buildings off={camX * 0.35} base={1190} />
        <Tree x={180 - camX} y={1490} t={t} />
        <Lamp x={1500 - camX} y={1490} />
        <g transform={`translate(0 ${(1 - dogUp) * 460})`}>
          <Dog x={dogX} y={1210} s={1.42} bark={bark} anger={1 - confused * 0.9} t={t} look={-0.5} />
        </g>
        <Fence x0={-200 - camX} x1={2600 - camX} top={1175} bottom={1500} shake={bark} t={t} />
        <Sidewalk y={1480} off={camX} />
        {/* ladridos */}
        {b.barks.map((bt, i) => (
          <Title
            key={i}
            x={dogX - 380 - i * 12}
            y={700 - (i % 2) * 120}
            text="¡GUAU!"
            size={78}
            fill={i % 2 ? C.red : C.yellow}
            rot={-12 + (i % 2) * 18}
            t={t}
            t0={bt}
            t1={bt + 0.42}
          />
        ))}
        <SoundLines x={dogX - 370} y={1000} angle={200} t={t} on={bark} s={1.4} />
        {confused > 0 && <Title x={dogX + 40} y={690} text="?" size={130} fill={C.white} t={t} t0={b.barks[b.barks.length - 1] + 0.4} />}
        <Stick
          x={400}
          y={1600}
          scale={0.98}
          pose={w.pose}
          lift={w.bob}
          expr={expr}
          t={t}
          look={[glance * 0.8, -glance * 0.6]}
          turn={0.35 + glance * 0.4}
        />
        <Notes x={470} y={1080} t={t} on={1 - glance} />
      </Cam>
    );
  }
  // ---------------------------------------------------------------- primer plano: rostro inexpresivo
  const u = t - b.cut;
  const imp = flash(t, b.cut, 0.3);
  const danger = prog(t, b.pel - 0.05, b.pel + 0.15);
  const zoom = lerp(1, 1.07, prog(t, b.cut, c.D, ease.out));
  const [sx, sy] = shake(t, imp * 30 + flash(t, b.pel, 0.3) * 18);
  return (
    <g>
      <CloseUp t={t} danger={danger} zoom={zoom} shake={[sx, sy]} lines={0.12 + imp * 0.6} />
      <Title x={540} y={330} text="¿INVENCIBLE…" size={104} fill={C.yellow} t={t} t0={b.inv - 0.05} rot={-3} />
      <Title x={540} y={460} text="…O EN PELIGRO?" size={104} fill={C.red} t={t} t0={b.pel - 0.05} rot={2} />
      <rect width={1080} height={1920} fill={C.white} opacity={imp * 0.9} />
    </g>
  );
};

/** Primer plano del rostro inexpresivo de Stick (se reutiliza al inicio de la escena 2). */
export const CloseUp: React.FC<{t: number; danger: number; zoom?: number; shake?: [number, number]; lines?: number; fx?: number; fy?: number}> = ({
  t,
  danger,
  zoom = 1,
  shake: sh = [0, 0],
  lines = 0.12,
  fx = 540,
  fy = 960,
}) => {
  const bg1 = danger > 0.5 ? '#FFC9C9' : '#CFE6FF';
  const bg2 = danger > 0.5 ? '#FFE7E7' : '#EAF4FF';
  return (
    <g>
      <Burst cx={540} cy={1000} t={t} colors={[bg1, bg2]} rays={20} />
      <Cam zoom={zoom} fx={fx} fy={fy} shake={sh}>
        <SpeedLines cx={540} cy={1000} t={t} r0={430} opacity={lines} />
        <Stick
          x={540}
          y={CLOSE.y + 437 * CLOSE.s}
          scale={CLOSE.s}
          pose={idle(POSES.stand, t, 0.4)}
          expr={EXPR.blank}
          t={t + 1.2}
          blinkSeed={2}
          turn={0.08}
          shadow={false}
        />
      </Cam>
    </g>
  );
};
export const CLOSE = {y: 1000, s: 3.3};
