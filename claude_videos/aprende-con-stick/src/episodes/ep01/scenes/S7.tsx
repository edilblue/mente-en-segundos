// ESCENA 7 — CIERRE: pregunta al espectador, invitación a comentar y pose característica de Stick.
import React from 'react';
import {Cue} from '../../../lib/scene';
import {useScene, SceneCtx} from '../../../lib/timeline';
import {C, FONT} from '../../../lib/theme';
import {ease, lerp, pop, prog} from '../../../lib/anim';
import {Stick} from '../../../stick/Stick';
import {EXPR, exprAt} from '../../../stick/expressions';
import {POSES, idle, poseAt} from '../../../stick/poses';
import {Brain} from '../../../world/Brain';
import {Bell} from '../../../world/Props';
import {Logo} from '../../../world/Brand';
import {Paper, Sparkle, Title} from '../../../fx/fx';

const beats = (c: SceneCtx) => ({
  dime: c.at('dime'),
  a: c.at('nunca') - 0.3,
  b: c.at('controlarlo') - 0.3,
  coment: c.at('comentarios') - 0.2,
  end: Math.max(c.vozFin + 0.15, c.D - 2.3),
});

export const cues = (c: SceneCtx): Cue[] => {
  const b = beats(c);
  return [
    {at: 0.05, sfx: 'brillo', vol: 0.3},
    {at: b.a, sfx: 'pop', vol: 0.35},
    {at: b.b, sfx: 'pop', vol: 0.35},
    {at: b.coment, sfx: 'ding', vol: 0.3},
    {at: b.end, sfx: 'whoosh', vol: 0.35},
    {at: b.end + 0.25, sfx: 'final', vol: 0.5},
  ];
};

const Choice: React.FC<{x: number; y: number; s: number; letter: string; text: string; color: string; icon: React.ReactNode}> = ({x, y, s, letter, text, color, icon}) =>
  s <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-430 + 10} y={-78 + 14} width={860} height={156} rx={40} fill={C.shadow} />
      <rect x={-430} y={-78} width={860} height={156} rx={40} fill={C.white} stroke={C.ink} strokeWidth={9} />
      <circle cx={-350} cy={0} r={52} fill={color} stroke={C.ink} strokeWidth={8} />
      <text x={-350} y={20} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={58} fill={C.white}>
        {letter}
      </text>
      <text x={-275} y={18} fontFamily={FONT} fontWeight={700} fontSize={50} fill={C.ink}>
        {text}
      </text>
      <g transform="translate(355 0)">{icon}</g>
    </g>
  );

export const Scene: React.FC = () => {
  const c = useScene();
  const {t} = c;
  const b = beats(c);
  const out = prog(t, b.end - 0.1, b.end + 0.35, ease.inBack);
  const fin = pop(t, b.end + 0.15);
  const stickX = lerp(330, 540, prog(t, b.end, b.end + 0.45, ease.inOut));
  const hop = Math.sin(prog(t, b.end, b.end + 0.45) * Math.PI) * 90;
  const pose = poseAt(t, [
    [0, POSES.wave],
    [b.dime - 0.1, POSES.pointDiag],
    [b.coment, POSES.open],
    [b.end + 0.45, POSES.signature],
  ]);
  const expr = exprAt(t, [
    [0, EXPR.happy],
    [b.dime, EXPR.curious],
    [b.coment, EXPR.grin],
    [b.end + 0.5, EXPR.wink],
  ]);
  const bob = Math.sin(t * 2.2) * 18;
  return (
    <g>
      <Paper color="#EAF4FF" dots="#D3E5FB" />
      {/* pregunta */}
      <g opacity={1 - out}>
        <Title x={540} y={250} text="¿TÚ QUÉ PREFIERES?" size={84} fill={C.yellow} t={t} t0={b.dime - 0.1} />
        <Choice
          x={540}
          y={470 - out * 600}
          s={pop(t, b.a)}
          letter="A"
          text="No sentir miedo nunca"
          color={C.red}
          icon={
            <g>
              <Bell x={0} y={10} s={0.42} color={C.grey} />
              <line x1={-40} y1={-40} x2={40} y2={40} stroke={C.red} strokeWidth={12} strokeLinecap="round" />
            </g>
          }
        />
        <Choice
          x={540}
          y={665 - out * 800}
          s={pop(t, b.b)}
          letter="B"
          text="Aprender a controlarlo"
          color={C.green}
          icon={
            <g>
              <circle r={42} fill="#DDE6F2" stroke={C.ink} strokeWidth={7} />
              <line x1={0} y1={0} x2={22} y2={-24} stroke={C.ink} strokeWidth={8} strokeLinecap="round" transform={`rotate(${Math.sin(t * 2) * 30})`} />
            </g>
          }
        />
        {/* cerebro flotante */}
        <g transform={`translate(0 ${bob})`}>
          <Brain x={790} y={1060} s={0.6 * pop(t, 0.1, true)} t={t} glow={{amygdala: 0.6 + 0.3 * Math.sin(t * 4)}} />
          {[0, 1, 2].map((i) => (
            <Sparkle key={i} x={790 + Math.cos(t * 1.5 + i * 2.1) * 230} y={1060 + Math.sin(t * 1.5 + i * 2.1) * 150} s={0.6 + 0.25 * Math.sin(t * 5 + i)} rot={t * 60} />
          ))}
        </g>
        {/* comenta */}
        <g transform={`translate(790 1420) scale(${pop(t, b.coment)})`}>
          <path d="M -170 -70 Q -170 -110 -130 -110 L 130 -110 Q 170 -110 170 -70 L 170 30 Q 170 70 130 70 L -40 70 L -90 120 L -80 70 L -130 70 Q -170 70 -170 30 Z" fill={C.yellow} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
          <text x={0} y={-6} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={56} fill={C.ink}>
            ¡COMENTA!
          </text>
          <g transform={`translate(0 ${170 + Math.sin(t * 8) * 12})`}>
            <path d="M -26 0 L 26 0 L 26 40 L 52 40 L 0 92 L -52 40 L -26 40 Z" fill={C.red} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
          </g>
        </g>
      </g>
      {/* final: identidad visual */}
      <Logo x={540} y={640} s={fin} t={t} sub="Episodio 1 · El miedo" />
      <Stick x={stickX} y={1700} scale={lerp(1.1, 1.3, prog(t, b.end, b.end + 0.45))} pose={idle(pose, t)} lift={hop} expr={expr} t={t} turn={0} look={t < b.end ? [0.6, -0.6] : [0, 0]} />
    </g>
  );
};
