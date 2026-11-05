import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EmojiFloat, Ono, PopText} from '../components/Effects';
import {Ground, SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, tinyMan} from '../components/Stickman';
import {C, FONT_MAIN, boil, jit, ramp, shakeAt, smoothPath, step, tw, tween} from '../lib/anim';

/** Escena 5 (40-48 s) — El ruido ensordecedor y luego el silencio. */
const Cricket: React.FC<{f: number; x: number; y: number; start: number}> = ({f, x, y, start}) => {
  if (f < start) return null;
  const hop = Math.max(0, Math.sin((f - start) * 0.25)) * 10 * (f - start < 30 ? 1 : 0.4);
  const ant = Math.sin(f * 0.4) * 8;
  const st = {stroke: C.ink, strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  const s = Math.min(1, (f - start) / 6);
  return (
    <g transform={`translate(${x} ${y - hop}) scale(${1.25 * s})`}>
      <path d={`M-40,-6 Q-80,${-60 + ant} -110,${-50 + ant}`} {...st} strokeWidth={3} />
      <path d={`M-40,-10 Q-70,${-80 - ant} -96,${-84 - ant}`} {...st} strokeWidth={3} />
      <path d="M-20,0 L-34,22 M0,4 L-6,24" {...st} />
      <path d="M20,-6 L52,-38 L64,20" {...st} strokeWidth={6} />
      <path d={smoothPath([[-48, -8], [-20, -26], [30, -22], [60, -6], [30, 10], [-30, 10]])} fill="#BFBFBF" stroke={C.ink} strokeWidth={5} />
      <path d="M-10,-20 Q20,-34 54,-8" {...st} strokeWidth={3} />
      <circle cx={-38} cy={-10} r={13} fill="#BFBFBF" stroke={C.ink} strokeWidth={5} />
      <circle cx={-42} cy={-12} r={3.5} fill={C.ink} />
    </g>
  );
};

export const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  const BOOM = 4; // SFX: "¡BOOOM!" @ 40.13 s (el impacto de 8 mil millones de personas)
  const QUIET = 130; // las ondas se apagan @ 44.3 s
  const CRICKET = 172; // SFX: grillo "cri cri" @ 45.7 s
  const GY = 1150;

  // Ondas de sonido que salen del suelo
  const waves: React.ReactNode[] = [];
  for (let k = 0; k < 18; k++) {
    const born = BOOM + k * 8;
    const t = f - born;
    const life = 46;
    if (t < 0 || t > life) continue;
    const strength = born < QUIET - 30 ? 1 : Math.max(0.12, 1 - (born - (QUIET - 30)) / 50);
    const r = (t / life) * 1100 * (0.4 + 0.6 * strength);
    const w = (30 * (1 - t / life) + 4) * strength;
    const op = 1 - t / life;
    const b = boil(f, 2);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI;
      const rr = r + jit(`w${k}${i}${b}`, 6 * strength);
      pts.push([540 + Math.cos(a) * rr, GY + Math.sin(a) * rr * 0.85]);
    }
    const d = smoothPath(pts, false);
    waves.push(
      <g key={k} opacity={op}>
        <path d={d} stroke={C.ink} strokeWidth={w + 12} fill="none" strokeLinecap="round" />
        <path d={d} stroke={k % 2 ? C.yellow : '#fff'} strokeWidth={w} fill="none" strokeLinecap="round" />
      </g>,
    );
  }
  const loud = f < QUIET ? 1 : Math.max(0, 1 - (f - QUIET) / 30);
  const proPose = tween<Pose>(
    f,
    [
      {at: 0, v: P.coverEars, e: 'snap'},
      {at: QUIET + 20, v: P.stand, e: 'soft'},
      {at: CRICKET + 28, v: P.shrug},
    ],
    P.stand,
  );
  const tremble = loud > 0.2 ? jit(`tr${f}`, 6 * loud) : 0;
  const zoom = tw(f, [
    [0, 1.12],
    [BOOM, 1.02, 'snap'],
    [60, 1.08, 'linear', 60],
    [QUIET, 1.0, 'soft'],
    [CRICKET - 2, 1.35, 'soft'],
    [CRICKET + 40, 1.05, 'soft'],
  ]);
  const camX = tw(f, [
    [0, 540],
    [CRICKET - 2, 760, 'soft'],
    [CRICKET + 40, 560, 'soft'],
  ]);
  const camY = tw(f, [
    [0, 960],
    [CRICKET - 2, 1100, 'soft'],
    [CRICKET + 40, 980, 'soft'],
  ]);
  const shake = shakeAt(f, [
    {at: BOOM, amp: 36, dur: 30},
    {at: BOOM + 24, amp: 22, dur: 30},
    {at: BOOM + 50, amp: 16, dur: 30},
    {at: BOOM + 80, amp: 10, dur: 30},
  ]);
  // Medidor de decibeles
  const needle = -80 + 160 * Math.min(1, loud * 0.95 + (loud > 0.5 ? jit(`nd${f}`, 0.05) : 0)) * ramp(f, 0, 8);
  const lookX = f > QUIET + 30 && f < CRICKET + 30 ? Math.sin((f - QUIET) * 0.12) : f >= CRICKET + 30 ? 0.8 : 0;

  return (
    <SceneFrame
      frame={f}
      cam={{x: camX, y: camY, zoom}}
      shake={shake}
      screen={
        <>
          <Ono frame={f} text="¡BOOOM!" x={540} y={500} start={BOOM} size={150} rot={-6} dur={74} burstFill={C.yellow} fill="#fff" />
          {/* Medidor de dB (alerta en rojo) */}
          <g transform="translate(870 330)">
            <path d="M-110,0 A110,110 0 0,1 110,0 Z" fill="#fff" stroke={C.ink} strokeWidth={7} />
            <path d="M44,-100 A110,110 0 0,1 110,0 L0,0Z" fill={C.red} opacity={0.85} />
            <path d="M-110,0 A110,110 0 0,1 110,0 Z" fill="none" stroke={C.ink} strokeWidth={7} />
            <path d={`M0,0 L${Math.sin((needle * Math.PI) / 180) * 92},${-Math.cos((needle * Math.PI) / 180) * 92}`} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
            <circle r={12} fill={C.ink} />
            <text x={0} y={46} textAnchor="middle" fontFamily={FONT_MAIN} fontSize={40} fill={C.ink}>
              dB
            </text>
            {loud > 0.6 && Math.floor(f / 5) % 2 === 0 && (
              <text x={130} y={-80} textAnchor="middle" fontFamily={FONT_MAIN} fontSize={80} fill={C.red} stroke={C.ink} strokeWidth={6} paintOrder="stroke">
                !
              </text>
            )}
          </g>
        </>
      }
    >
      {waves}
      <Ground frame={f} y={GY} x0={-300} x1={1380} />
      {[...Array(18)].map((_, i) => tinyMan(i, 40 + i * 60 + jit(`hx${i}`, 10), GY, 0.42, {arms: loud > 0.3 ? 1 : 0, lift: loud > 0.3 ? Math.abs(jit(`hj${i}${boil(f, 2)}`, 6)) : 0, eyes: true}))}
      <Ground frame={f} y={1345} x0={240} x1={840} seed="g5" width={7} />
      <Stickman
        frame={f}
        x={540 + tremble}
        y={1345}
        scale={1.35}
        pose={proPose}
        cap
        eyes={step(f, [[0, 'squint'], [QUIET + 20, 'dot'], [CRICKET, 'wide'], [CRICKET + 30, 'flat']] as const)}
        mouth={step(f, [[0, 'wavy'], [QUIET + 20, 'flat'], [CRICKET, 'o'], [CRICKET + 30, 'smirk']] as const)}
        brows={step(f, [[0, 'angry'], [QUIET + 20, 'none'], [CRICKET, 'up'], [CRICKET + 30, 'raised']] as const)}
        look={[lookX, 0]}
        squash={1 + Math.sin(f * 1.7) * 0.03 * loud}
        seed={7}
      />
      <EmojiFloat frame={f} kind="scream" x={250} y={900} start={14} dur={64} size={160} />
      <EmojiFloat frame={f} kind="scream" x={830} y={860} start={52} dur={60} size={130} />
      {f > QUIET + 20 && f < CRICKET + 10 && (
        <PopText frame={f} text="…" x={700} y={850} start={QUIET + 24} end={CRICKET + 10} size={120} rot={0} />
      )}
      <Cricket f={f} x={850} y={1290} start={CRICKET} />
      <PopText frame={f} text="cri" x={760} y={1150} start={CRICKET + 10} end={CRICKET + 30} size={46} rot={-12} />
      <PopText frame={f} text="cri" x={930} y={1120} start={CRICKET + 26} end={CRICKET + 46} size={46} rot={10} />
      <PopText frame={f} text="cri…" x={800} y={1110} start={CRICKET + 44} end={240} size={46} rot={-6} />
    </SceneFrame>
  );
};
