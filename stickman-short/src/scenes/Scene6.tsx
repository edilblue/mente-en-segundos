import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EarthBall, EmojiFloat, FocusLines, Ono} from '../components/Effects';
import {Ground, SceneFrame} from '../components/Paper';
import {P, Pose, Stickman, handWorld, headWorld} from '../components/Stickman';
import {C, FONT_MAIN, boil, jit, pop, ramp, shakeAt, step, tw, tween} from '../lib/anim';

/** Escena 6 (48-55 s) — La lupa gigante: la Tierra se mueve menos que un átomo. */
export const Scene6: React.FC = () => {
  const f = useCurrentFrame();
  const OUT = 12; // SFX: swoosh al sacar la lupa @ 48.4 s
  const ZOOM_IN = 58; // SFX: swoosh de zoom @ 49.9 s
  const ARROW = 98; // la flechita aparece @ 51.3 s
  const ZOOM_OUT = 146;
  const EH = 156; // SFX: "¿EH?" @ 53.2 s

  const pose = tween<Pose>(
    f,
    [
      {at: 0, v: P.stand},
      {at: OUT, v: P.magnifier, e: 'snap'},
    ],
    P.stand,
  );
  const pro = {x: 240, y: 1330, scale: 1.3, pose};
  const hand = handWorld(pro);
  const head = headWorld(pro);
  const EARTH = {x: 760, y: 900, r: 250};
  const lensS = pop(f, OUT, {damping: 9, stiffness: 160, mass: 0.7});
  const lx = tw(f, [
    [0, hand[0] + 60],
    [OUT, 610, 'soft'],
  ]);
  const ly = tw(f, [
    [0, hand[1] - 60],
    [OUT, 690, 'soft'],
  ]) + Math.sin(f * 0.08) * 6;
  const LR = 150 * lensS;
  const inside = ramp(f, ZOOM_IN + 6, ZOOM_IN + 20);

  const zoom = tw(f, [
    [0, 1.0],
    [ZOOM_IN, 3.1, 'ease', 26],
    [ARROW, 3.6, 'linear', 40],
    [ZOOM_OUT, 1.75, 'snap'],
    [EH + 20, 1.9, 'linear', 30],
  ]);
  const camX = tw(f, [
    [0, 540],
    [ZOOM_IN, 610, 'ease', 26],
    [ZOOM_OUT, head[0] + 120, 'snap'],
  ]);
  const camY = tw(f, [
    [0, 950],
    [ZOOM_IN, 700, 'ease', 26],
    [ARROW, 720, 'linear', 30],
    [ZOOM_OUT, head[1] + 80, 'snap'],
  ]);
  const b = boil(f, 3);
  const st = {stroke: C.ink, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  // Electrones orbitando
  const orbit = (k: number) => {
    const a = f * 0.18 + k * 2.1;
    const rot = (k * 60 * Math.PI) / 180;
    const ex = Math.cos(a) * 70;
    const ey = Math.sin(a) * 24;
    return [ex * Math.cos(rot) - ey * Math.sin(rot), ex * Math.sin(rot) + ey * Math.cos(rot)];
  };
  const arrowPulse = 1 + Math.sin(f * 0.6) * 0.25;

  return (
    <SceneFrame
      frame={f}
      cam={{x: camX, y: camY, zoom, rot: tw(f, [[0, 0], [ZOOM_OUT, 4, 'snap']])}}
      shake={shakeAt(f, [
        {at: ZOOM_OUT, amp: 10, dur: 8},
        {at: EH, amp: 12, dur: 10},
      ])}
      screen={<>{f >= ZOOM_IN && f < ZOOM_IN + 20 && <FocusLines frame={f} inner={420} opacity={1 - ramp(f, ZOOM_IN + 12, ZOOM_IN + 20)} />}</>}
    >
      <Ground frame={f} y={1330} x0={-300} x1={1380} />
      <EarthBall frame={f} x={EARTH.x} y={EARTH.y} r={EARTH.r} face="bored" look={[-0.6, -0.4]} />
      <Stickman
        frame={f}
        {...pro}
        cap
        eyes={step(f, [[0, 'dot'], [OUT, 'wide'], [ZOOM_OUT, 'flat']] as const)}
        mouth={step(f, [[0, 'smile'], [OUT, 'grin'], [ZOOM_OUT, 'flat']] as const)}
        brows={step(f, [[0, 'none'], [OUT, 'up'], [ZOOM_OUT, 'none']] as const)}
        look={f < ZOOM_OUT ? [0.8, -0.5] : [0, 0]}
        seed={7}
      />
      {/* Lupa gigante */}
      {lensS > 0.01 && (
        <g>
          <path d={`M${hand[0]},${hand[1]} L${lx - LR * 0.72},${ly + LR * 0.72}`} {...st} stroke={C.ink} strokeWidth={34} />
          <path d={`M${hand[0]},${hand[1]} L${lx - LR * 0.72},${ly + LR * 0.72}`} {...st} stroke="#8A5A2B" strokeWidth={20} />
          <circle cx={lx} cy={ly} r={LR} fill="#fff" />
          {inside > 0 && (
            <g opacity={inside} transform={`translate(${lx} ${ly})`}>
              <circle r={LR - 4} fill={C.blueLight} opacity={0.35} />
              {/* Átomo */}
              <g transform="translate(0 -50)">
                {[0, 1, 2].map((k) => (
                  <ellipse key={k} rx={70} ry={24} transform={`rotate(${k * 60})`} stroke={C.grayDark} strokeWidth={3} fill="none" />
                ))}
                <circle r={11} fill={C.gray} stroke={C.ink} strokeWidth={3} />
                {[0, 1, 2].map((k) => {
                  const [ex, ey] = orbit(k);
                  return <circle key={k} cx={ex} cy={ey} r={5} fill={C.ink} />;
                })}
              </g>
              {/* Regla: ancho de un átomo */}
              <path d="M-70,32 L70,32 M-70,24 L-70,40 M70,24 L70,40" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
              <text x={0} y={56} textAnchor="middle" fontFamily={FONT_MAIN} fontSize={17} fill={C.ink}>
                ancho de 1 átomo
              </text>
              {/* La flechita diminuta */}
              {f >= ARROW && (
                <g>
                  <g transform={`translate(0 82) scale(${arrowPulse * pop(f, ARROW)})`}>
                    <path d="M-2.5,0 L2,0 M0.5,-1.5 L2.4,0 L0.5,1.5" stroke={C.red} strokeWidth={1.2} strokeLinecap="round" fill="none" />
                  </g>
                  <circle cx={0} cy={82} r={9 + jit(`la${b}`, 0.6)} stroke={C.red} strokeWidth={1.6} fill="none" strokeDasharray="3 2" opacity={ramp(f, ARROW + 6, ARROW + 12)} />
                  <text x={0} y={104} textAnchor="middle" fontFamily={FONT_MAIN} fontSize={13} fill={C.red} opacity={ramp(f, ARROW + 6, ARROW + 12)}>
                    lo que se mueve la Tierra
                  </text>
                  <text x={0} y={119} textAnchor="middle" fontFamily={FONT_MAIN} fontSize={11} fill={C.red} opacity={ramp(f, ARROW + 10, ARROW + 16)}>
                    (¡ni se ve!)
                  </text>
                </g>
              )}
            </g>
          )}
          <circle cx={lx} cy={ly} r={LR} fill="none" stroke={C.ink} strokeWidth={30} />
          <circle cx={lx} cy={ly} r={LR} fill="none" stroke={C.gray} strokeWidth={16} />
          <path d={`M${lx - LR * 0.6},${ly - LR * 0.35} A${LR * 0.7},${LR * 0.7} 0 0,1 ${lx - LR * 0.2},${ly - LR * 0.68}`} stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.9} />
        </g>
      )}
      <Ono frame={f} text="¿EH?" x={head[0] + 230} y={head[1] - 40} start={EH} size={110} rot={10} dur={50} />
      <EmojiFloat frame={f} kind="neutral" x={head[0] + 20} y={head[1] - 170} start={EH + 6} dur={48} size={110} drift={-50} />
    </SceneFrame>
  );
};
