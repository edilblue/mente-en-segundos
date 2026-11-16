// ESCENA 2 — EL MIEDO COMO ALARMA: congelamos, entramos en la cabeza de Stick,
// la amígdala da la alarma y las señales llegan al corazón y a los músculos.
import React from 'react';
import {Cue} from '../../../lib/scene';
import {useScene, SceneCtx} from '../../../lib/timeline';
import {C, FONT} from '../../../lib/theme';
import {clamp, ease, flash, lerp, pop, prog, shake} from '../../../lib/anim';
import {Brain, Heart, heartbeat, REGION, RegionTag} from '../../../world/Brain';
import {Bell} from '../../../world/Props';
import {Dog} from '../../../world/Dog';
import {Curve, FreezeOverlay, Label, Rings, Signal} from '../../../fx/fx';
import {CloseUp, CLOSE} from './S1';

const beats = (c: SceneCtx) => {
  const zoomIn: [number, number] = [0.42, 1.2];
  const body = c.at('preparar') - 0.35;
  return {
    zoomIn,
    inside: zoomIn[1] - 0.08,
    defecto: c.at('defecto'),
    alarma: c.at('alarma'),
    amenaza: c.at('detectar'),
    body,
    bodyEnd: body + 0.9,
    corazon: c.at('corazón') - 0.45,
    musculos: c.at('músculos') - 0.4,
  };
};

export const cues = (c: SceneCtx): Cue[] => {
  const b = beats(c);
  return [
    {at: 0.02, sfx: 'click', vol: 0.6},
    {at: b.zoomIn[0], sfx: 'whoosh_largo', vol: 0.5},
    {at: b.inside + 0.05, sfx: 'pop', vol: 0.4},
    {at: b.defecto, sfx: 'error', vol: 0.3},
    {at: b.alarma, sfx: 'alarma', vol: 0.32},
    {at: b.amenaza + 0.1, sfx: 'pop', vol: 0.3},
    {at: b.body, sfx: 'whoosh', vol: 0.45},
    {at: b.corazon + 0.4, sfx: 'latidos', vol: 0.65},
    {at: b.musculos + 0.35, sfx: 'tension', vol: 0.4},
  ];
};

const GRID = () => (
  <g>
    <rect width={1080} height={1920} fill="#E4F0FF" />
    {Array.from({length: 19}).map((_, i) => (
      <line key={`v${i}`} x1={i * 60} y1={0} x2={i * 60} y2={1920} stroke="#CFE2FA" strokeWidth={3} />
    ))}
    {Array.from({length: 33}).map((_, i) => (
      <line key={`h${i}`} x1={0} y1={i * 60} x2={1080} y2={i * 60} stroke="#CFE2FA" strokeWidth={3} />
    ))}
  </g>
);

type P = [number, number];
const L = (a: P, b: P, u: number): P => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

/** Fase acumulada del latido con frecuencia que sube de bpm0 a bpm1 entre t1 y t2. */
const beatPhase = (t: number, t1: number, t2: number, bpm0 = 70, bpm1 = 128) => {
  const f0 = bpm0 / 60;
  const f1 = bpm1 / 60;
  if (t < t1) return t * f0;
  const d = Math.min(t, t2) - t1;
  const ramp = f0 * d + ((f1 - f0) * d * d) / (2 * (t2 - t1));
  return t1 * f0 + ramp + Math.max(0, t - t2) * f1;
};

export const Scene: React.FC = () => {
  const c = useScene();
  const {t} = c;
  const b = beats(c);

  // -------------------------------------------------- fase A: congelado + zoom hacia la cabeza
  if (t < b.inside) {
    const z = prog(t, b.zoomIn[0], b.zoomIn[1], ease.in);
    const zoom = lerp(1.07, 16, z);
    const white = prog(t, b.zoomIn[1] - 0.3, b.zoomIn[1]);
    return (
      <g>
        <CloseUp t={0.3} danger={1} zoom={zoom} fx={540} fy={lerp(960, CLOSE.y, z)} lines={0.1} />
        <FreezeOverlay t={t} t0={0} t1={b.zoomIn[0] + 0.1} />
        <rect width={1080} height={1920} fill={C.white} opacity={white} />
      </g>
    );
  }

  // -------------------------------------------------- fase B/C: dentro de la cabeza
  const u = t - b.inside;
  const toBody = prog(t, b.body, b.bodyEnd, ease.inOut);
  const ringC = L([540, 820], [540, 430], toBody);
  const ringS = lerp(1, 0.42, toBody);
  const brainPop = pop(t, b.inside + 0.1, true);
  const alarm = prog(t, b.alarma - 0.05, b.alarma + 0.25);
  const amyGlow = alarm * (0.75 + 0.25 * Math.sin(t * 10));
  const BS = 1.36; // escala del cerebro dentro de la cabeza
  const brainOff: P = [0, 20];
  const toScreen = (p: P): P => [ringC[0] + (brainOff[0] + p[0] * BS) * ringS, ringC[1] + (brainOff[1] + p[1] * BS) * ringS];
  const amy = toScreen(REGION.amygdala);
  const bodyOn = prog(t, b.body + 0.35, b.bodyEnd + 0.5);
  const heartOn = prog(t, b.corazon + 0.3, b.corazon + 0.6);
  const tense = prog(t, b.musculos + 0.3, b.musculos + 0.7, ease.outBack);
  const phase = beatPhase(t, b.corazon + 0.4, b.corazon + 1.6);
  const beat = heartbeat(phase);
  const bpm = Math.round(lerp(70, 128, prog(t, b.corazon + 0.4, b.corazon + 1.6, ease.linear)));
  const [sx, sy] = shake(t, flash(t, b.alarma, 0.5) * 10 + tense * 2.2);

  // esqueleto de Stick en "modo rayos X" (debajo de la cabeza)
  const sh: P = [540, 700];
  const hip: P = [540, 1240];
  const armL = {e: L([420, 930], [395, 860], tense), h: L([385, 1130], [470, 745], tense)};
  const armR = {e: L([660, 930], [685, 860], tense), h: L([695, 1130], [610, 745], tense)};
  const legL = {k: L([455, 1470], [425, 1450], tense), f: L([430, 1710], [380, 1710], tense)};
  const legR = {k: L([625, 1470], [655, 1450], tense), f: L([650, 1710], [700, 1710], tense)};
  const bone = (pts: P[], key: string) => {
    const d = `M ${pts.map((p) => p.join(' ')).join(' L ')}`;
    return (
      <g key={key}>
        <path d={d} fill="none" stroke={C.blue} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${bodyOn} 1`} />
        <path d={d} fill="none" stroke="#9CC6FF" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${bodyOn} 1`} />
      </g>
    );
  };
  const muscle = (a: P, bb: P, k: string, w = 34) => {
    const m = L(a, bb, 0.5);
    const ang = (Math.atan2(bb[1] - a[1], bb[0] - a[0]) * 180) / Math.PI;
    const len = Math.hypot(bb[0] - a[0], bb[1] - a[1]) * 0.42;
    const sc = lerp(0.85, 1.35, tense) + Math.sin(t * 40) * 0.03 * tense;
    return (
      <g key={k} transform={`translate(${m[0]} ${m[1]}) rotate(${ang}) scale(1 ${sc})`} opacity={bodyOn}>
        <ellipse rx={len} ry={w} fill={tense > 0.2 ? '#FF8E8E' : C.redSoft} stroke={C.ink} strokeWidth={6} />
        <path d={`M ${-len * 0.6} ${-w * 0.3} Q 0 ${-w * 0.6} ${len * 0.6} ${-w * 0.3}`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
      </g>
    );
  };
  const sigHeart: Curve = [amy, [amy[0] - 30, 650], [560, 760], [585, 820]];
  const sigArmL: Curve = [amy, [500, 640], [430, 700], L(sh, armL.e, 0.55)];
  const sigArmR: Curve = [amy, [600, 640], [660, 700], L(sh, armR.e, 0.55)];
  const sigLegL: Curve = [amy, [520, 900], [470, 1150], L(hip, legL.k, 0.5)];
  const sigLegR: Curve = [amy, [560, 900], [610, 1150], L(hip, legR.k, 0.5)];
  const threat = pop(t, b.amenaza - 0.15) * (1 - prog(t, b.body - 0.2, b.body + 0.1));

  return (
    <g transform={`translate(${sx} ${sy})`}>
      <GRID />
      {/* cuerpo en rayos X */}
      {toBody > 0 && (
        <g>
          {bone([[540, 632], hip], 'torso')}
          {bone([sh, armL.e, armL.h], 'aL')}
          {bone([sh, armR.e, armR.h], 'aR')}
          {bone([hip, legL.k, legL.f], 'lL')}
          {bone([hip, legR.k, legR.f], 'lR')}
          {muscle(sh, armL.e, 'mL')}
          {muscle(sh, armR.e, 'mR')}
          {muscle(hip, legL.k, 'qL', 40)}
          {muscle(hip, legR.k, 'qR', 40)}
          {[armL.h, armR.h].map((h, i) => (
            <circle key={i} cx={h[0]} cy={h[1]} r={26 * bodyOn} fill={C.white} stroke={C.blue} strokeWidth={9} />
          ))}
          <g opacity={bodyOn}>
            <Heart x={585} y={880} s={0.72 * (0.9 + heartOn * 0.1)} beat={beat * (0.4 + heartOn * 0.6)} />
          </g>
          <Signal c={sigHeart} t={t} t0={b.corazon} draw={0.45} color={C.red} pulses={2.5} speed={1.3} />
          <Signal c={sigArmL} t={t} t0={b.musculos} draw={0.4} color={C.yellow} pulses={2} speed={1.4} width={8} />
          <Signal c={sigArmR} t={t} t0={b.musculos + 0.05} draw={0.4} color={C.yellow} pulses={2} speed={1.4} width={8} />
          <Signal c={sigLegL} t={t} t0={b.musculos + 0.1} draw={0.45} color={C.yellow} pulses={2} speed={1.2} width={8} />
          <Signal c={sigLegR} t={t} t0={b.musculos + 0.15} draw={0.45} color={C.yellow} pulses={2} speed={1.2} width={8} />
          {/* pulsaciones */}
          {heartOn > 0 && (
            <g transform={`translate(830 880) scale(${pop(t, b.corazon + 0.35)})`}>
              <rect x={-120} y={-52} width={240} height={104} rx={52} fill={C.white} stroke={C.red} strokeWidth={8} />
              <Heart x={-72} y={2} s={0.32} beat={beat} />
              <text x={30} y={16} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={46} fill={C.ink}>
                {bpm}
              </text>
              <text x={30} y={44} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={20} fill={C.greyDark}>
                latidos/min
              </text>
            </g>
          )}
          {tense > 0.1 &&
            [armL.e, armR.e, legL.k, legR.k].map((p, i) => (
              <g key={i} opacity={tense} transform={`translate(${p[0] + (i % 2 ? 60 : -60)} ${p[1] - 20})`}>
                {[0, 1, 2].map((k) => (
                  <line key={k} x1={0} y1={k * 22 - 22} x2={(i % 2 ? 1 : -1) * (24 + Math.sin(t * 30 + k) * 6)} y2={k * 22 - 26} stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
                ))}
              </g>
            ))}
        </g>
      )}
      {/* la cabeza (círculo) con el cerebro dentro */}
      <g transform={`translate(${ringC[0]} ${ringC[1]}) scale(${ringS})`}>
        <circle r={470} fill="#F7FBFF" stroke={C.ink} strokeWidth={18 / Math.max(0.5, ringS)} />
        <g transform={`scale(${brainPop})`}>
          <Brain x={brainOff[0]} y={brainOff[1]} s={BS} t={t} glow={{amygdala: amyGlow}} />
        </g>
      </g>
      <Rings x={amy[0]} y={amy[1]} t={t} t0={b.alarma} r0={30 * ringS + 10} r1={lerp(260, 140, toBody)} color={C.red} every={0.5} />
      {/* amenaza detectada: el perro de la escena 1 en una burbuja de pensamiento */}
      {threat > 0.01 && (
        <g>
          <g transform={`translate(270 1540) scale(${threat})`}>
            <circle r={130} fill={C.white} stroke={C.ink} strokeWidth={9} />
            <defs>
              <clipPath id="threatClip">
                <circle r={122} />
              </clipPath>
            </defs>
            <g clipPath="url(#threatClip)">
              <Dog x={40} y={110} s={0.5} bark={0.5 + 0.5 * Math.sin(t * 14)} t={t} />
            </g>
            <circle cx={120} cy={-140} r={22} fill={C.white} stroke={C.ink} strokeWidth={7} />
            <circle cx={150} cy={-185} r={13} fill={C.white} stroke={C.ink} strokeWidth={6} />
          </g>
          <Signal c={[[420, 1400], [520, 1300], [amy[0] - 40, amy[1] + 200], [amy[0] - 10, amy[1] + 30]]} t={t} t0={b.amenaza} draw={0.4} color={C.red} pulses={1.5} width={8} />
        </g>
      )}
      {/* etiquetas */}
      <g opacity={1 - toBody}>
        <Label x={540} y={1480} text="DEFECTO" t={t} t0={b.defecto - 0.1} t1={b.alarma - 0.25} fg={C.greyDark} size={66} />
        {t > b.defecto + 0.3 && t < b.alarma - 0.05 && (
          <line
            x1={330}
            y1={1484}
            x2={330 + 420 * prog(t, b.defecto + 0.3, b.defecto + 0.55)}
            y2={1476}
            stroke={C.red}
            strokeWidth={12}
            strokeLinecap="round"
          />
        )}
      </g>
      <g transform={`translate(${lerp(880, 840, toBody)} ${lerp(330, 250, toBody)}) scale(${lerp(1.15, 0.9, toBody)})`}>
        <Bell x={0} y={0} s={pop(t, b.alarma - 0.1)} ring={alarm * (1 - prog(t, b.body, b.body + 1.5) * 0.6)} t={t} />
      </g>
      <RegionTag
        x={lerp(amy[0] + 30, 830, toBody)}
        y={lerp(amy[1] + 210, 560, toBody)}
        text="AMÍGDALA"
        color={C.red}
        s={pop(t, b.alarma + 0.2) * 1.45}
        align="middle"
      />
      <rect width={1080} height={1920} fill={C.white} opacity={1 - clamp(u / 0.3)} />
    </g>
  );
};
