// ESCENA 5 — EL GIRO CIENTÍFICO (Feinstein et al., Nature Neuroscience, 2013):
// personas con lesiones en ambas amígdalas mostraron poco miedo ante amenazas externas,
// pero algunas sintieron pánico ante una señal interna: más CO₂ en el aire inhalado.
// Stick solo OBSERVA las ilustraciones; no hay ningún experimento peligroso en pantalla.
import React from 'react';
import {Cue} from '../../../lib/scene';
import {useScene, SceneCtx} from '../../../lib/timeline';
import {C, FONT} from '../../../lib/theme';
import {ease, flash, lerp, osc, pop, prog, shake} from '../../../lib/anim';
import {Stick} from '../../../stick/Stick';
import {EXPR, exprAt} from '../../../stick/expressions';
import {POSES, idle, poseAt} from '../../../stick/poses';
import {Brain, REGION} from '../../../world/Brain';
import {LabRoom, LabScreen} from '../../../world/Lab';
import {Gauge, Meter} from '../../../world/Props';
import {CO2, Person, Snake} from '../../../world/People';
import {Label, Rings, WhipStripes} from '../../../fx/fx';

const beats = (c: SceneCtx) => ({
  head: c.at('estudios') - 0.1,
  lesion: c.at('lesiones'),
  panelA: c.at('algunas') - 0.35,
  poco: c.at('poco'),
  panelB: c.at('pero') - 0.25,
  panico: c.at('pánico'),
  senales: c.at('señales'),
  co2: c.at('dióxido'),
  resp: c.at('respiraban'),
});

export const cues = (c: SceneCtx): Cue[] => {
  const b = beats(c);
  return [
    {at: 0, sfx: 'whoosh', vol: 0.4},
    {at: b.head, sfx: 'pop', vol: 0.3},
    {at: b.panelA, sfx: 'whoosh', vol: 0.35},
    {at: b.poco, sfx: 'siseo', vol: 0.35},
    {at: b.panelB, sfx: 'whoosh', vol: 0.35},
    {at: b.panelB + 0.3, sfx: 'tic', vol: 0.4},
    {at: b.panico, sfx: 'alarma', vol: 0.28},
    {at: b.panico + 0.1, sfx: 'latidos', vol: 0.45},
    {at: b.co2, sfx: 'ding', vol: 0.3},
  ];
};

export const Scene: React.FC = () => {
  const c = useScene();
  const {t} = c;
  const b = beats(c);
  const aIn = pop(t, b.panelA);
  const bIn = pop(t, b.panelB);
  const snakeRise = prog(t, b.poco - 0.4, b.poco + 0.4, ease.outBack);
  const fearA = 0.12 + Math.sin(t * 3) * 0.02;
  const gauge = lerp(0.12, 0.86, prog(t, b.panelB + 0.3, b.panico + 0.4, ease.inOut)) + Math.sin(t * 20) * 0.006;
  const panic = prog(t, b.panico - 0.05, b.panico + 0.45, ease.out);
  const flashRed = panic * (0.5 + 0.5 * Math.sin(t * 12));
  const [kx, ky] = shake(t, flash(t, b.panico, 0.4) * 9);

  const pose = poseAt(t, [
    [0, POSES.stand],
    [b.panelA + 0.1, POSES.lean],
    [b.panico + 0.05, POSES.stepBack],
    [b.co2 - 0.1, {...POSES.pointDiag, torso: -6}],
    [b.resp + 0.4, POSES.chinScratch],
  ]);
  const expr = exprAt(t, [
    [0, EXPR.curious],
    [b.poco, EXPR.thinking],
    [b.panico + 0.05, EXPR.surprised],
    [b.co2 - 0.1, EXPR.amazed],
    [b.resp + 0.4, EXPR.thinking],
  ]);
  const look: [number, number] = t < b.panelB ? [0.5, -1] : [0.3, -0.7];
  // introducción: cerebro grande con la amígdala lesionada → se convierte en el icono del encabezado
  const move = prog(t, b.panelA - 0.55, b.panelA + 0.05, ease.inOut);
  const brainX = lerp(560, 210, move);
  const brainY = lerp(820, 150, move);
  const brainS = lerp(1.25, 0.2, move) * pop(t, 0.1, true);
  const lesion = prog(t, b.lesion - 0.1, b.lesion + 0.2);
  const amy: [number, number] = [brainX + REGION.amygdala[0] * brainS, brainY + REGION.amygdala[1] * brainS];

  return (
    <g transform={`translate(${kx} ${ky})`}>
      <LabRoom t={t} screen={false} />
      {/* encabezado: el estudio */}
      <g transform={`translate(540 150) scale(${pop(t, b.panelA)})`}>
        <rect x={-420} y={-62} width={840} height={124} rx={62} fill={C.white} stroke={C.ink} strokeWidth={8} />
        <text x={50} y={-6} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={38} fill={C.ink}>
          Lesión en AMBAS amígdalas
        </text>
        <text x={50} y={34} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={27} fill={C.greyDark}>
          pocos casos estudiados · no ocurre igual en todos
        </text>
      </g>
      {/* panel A: amenaza externa */}
      <g transform={`translate(540 540) scale(${aIn}) translate(-540 -540)`} opacity={Math.min(1, aIn * 2)}>
        <LabScreen id="s5a" x={70} y={290} w={940} h={500} title="AMENAZA EXTERNA" tint="#E9F4FF">
          <rect x={70} y={700} width={940} height={110} fill="#CFE2C6" />
          <Person x={340} y={725} s={0.72} t={t} calmLook={0.6} />
          <Snake x={620} y={725} s={0.95} rise={snakeRise} t={t} />
          <Meter x={900} y={690} h={300} value={fearA} label="MIEDO" color={C.blue} />
        </LabScreen>
      </g>
      {/* panel B: señal interna (CO₂) */}
      <g transform={`translate(540 1100) scale(${bIn}) translate(-540 -1100)`} opacity={Math.min(1, bIn * 2)}>
        <LabScreen id="s5b" x={70} y={850} w={940} h={500} title="SEÑAL INTERNA" tint={panic > 0 ? '#FFEDED' : '#E9F4FF'}>
          <rect x={70} y={850} width={940} height={500} fill={C.red} opacity={flashRed * 0.12} />
          <Gauge
            x={255}
            y={1110}
            s={0.86}
            value={gauge}
            label={
              <>
                <tspan>CO</tspan>
                <tspan fontSize={30} dy={10}>
                  2
                </tspan>
              </>
            }
            sub="en el aire"
            zones={[C.green, C.yellow, C.red]}
          />
          {Array.from({length: 6}).map((_, i) => {
            const u = (t * 0.35 + i / 6) % 1;
            const on = prog(t, b.panelB + 0.4, b.panelB + 0.8) * gauge;
            return <CO2 key={i} x={lerp(420, 600, u)} y={990 + Math.sin(u * 7 + i) * 45 + i * 10} s={0.75} o={on * Math.sin(u * Math.PI)} />;
          })}
          <Person x={640} y={1320} s={0.72} t={t} panic={panic} xray={1} />
          <Meter x={900} y={1250} h={300} value={0.1 + panic * 0.86} label="PÁNICO" color={C.red} />
        </LabScreen>
        <Rings x={255} y={1110} t={t} t0={b.co2} every={0.6} r0={140} r1={230} color={C.yellow} until={b.co2 + 1.3} width={10} />
      </g>
      {/* Stick observa desde abajo */}
      <Stick x={200} y={1775} scale={0.78} pose={idle(pose, t)} expr={expr} t={t} look={look} turn={0.45} />
      <Label x={700} y={1690} text="Feinstein et al., 2013" t={t} t0={b.lesion + 0.2} size={34} fg={C.greyDark} />
      {/* cerebro: amígdala lesionada (gris + X) */}
      {brainS > 0.01 && (
        <g>
          <Brain x={brainX} y={brainY} s={brainS} t={t} dim={move > 0.5 ? 1 : 0} glow={{}} stem={move < 0.5} />
          <g transform={`translate(${amy[0]} ${amy[1]}) scale(${brainS / 1.25})`} opacity={lesion}>
            <ellipse rx={36} ry={25} transform="rotate(-24)" fill="#9AA2B1" stroke={C.ink} strokeWidth={6} />
            <path d="M -40 -40 L 40 40 M 40 -40 L -40 40" stroke={C.red} strokeWidth={14} strokeLinecap="round" />
          </g>
          {move < 0.05 && <Rings x={amy[0]} y={amy[1]} t={t} t0={b.lesion} every={0.55} r0={40} r1={200} color={C.greyDark} />}
          <Label x={560} y={1290} text="AMBAS AMÍGDALAS" t={t} t0={b.lesion + 0.1} t1={b.panelA - 0.6} fg={C.ink} size={60} />
        </g>
      )}
      <WhipStripes t={c.t} t0={0} dir={-1} />
    </g>
  );
};
