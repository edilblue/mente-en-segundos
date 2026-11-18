import React from 'react';
import {DUR, P, clamp, ease, iv, lerp, mix, plumaje, rnd, shake, spr, wt} from '../lib';
import {Flamingo} from '../components/Flamingo';
import {Algae, Pigment, Shrimp} from '../components/Critters';
import {ChalkText} from '../components/Chalk';
import {Cam, Ground} from './common';
import {LOOP_EYE} from './S1';

const GROUND = 1080;
const FX = 380;
const S = 0.95;
// Punto entre los ojos del adulto (cabeza sin desplazar) y zoom para que sus ojos midan lo mismo que los de la cría.
const EYE = {x: FX + 41 * S, y: GROUND - 772 * S};
const Z_END = (LOOP_EYE.z * 22 * 1.1) / (17 * S);

/** Escena 5 — sin carotenoides se destiñe; "Eres lo que comes"; zoom al ojo → loop. */
export const S5: React.FC<{t: number}> = ({t}) => {
  const tSin = wt(5, 'sin');
  const tDieta = wt(5, 'dieta');
  const tFlam = wt(5, 'flamenco');
  const tBlanco = wt(5, 'blanco');
  const tEres = wt(5, 'eres');
  const tComes = wt(5, 'comes');
  const tLit = wt(5, 'literalmente');
  const tZoom = Math.max(tLit + 1.0, DUR - 2.0);

  const drain = iv(t, [tFlam - 0.4, tBlanco + 0.5], [0, 1], ease.inOut);
  const endGray = iv(t, [tZoom, DUR - 0.15], [0.35, 1], ease.inOut);
  const paleTo = mix(P.pale, P.gray, endGray);
  const sad = clamp((t - tFlam) / 0.5);
  const relax = iv(t, [DUR - 1.2, DUR - 0.3], [0, 1]); // la cara se calma para empalmar con la cría
  const z = iv(t, [tZoom, DUR - 1 / 30], [0, 1], ease.in);
  // ancla fija en el ojo: el ojo viaja a la posición de los ojos de la cría del frame 0
  const cam = {z: lerp(1, Z_END, z), px: EYE.x, py: EYE.y, sx: lerp(EYE.x, LOOP_EYE.x, z), sy: lerp(EYE.y, LOOP_EYE.y, z)};
  const [shx, shy] = shake(t, tDieta + 0.05, 0.35, 14);

  // comida que se va: salta del plato y huye despidiéndose
  const leave = (i: number) => clamp((t - tSin - i * 0.12) / 1.3);
  const plate = {x: 720, y: GROUND};

  // título final palabra por palabra (va sincronizado con la voz)
  const title = 1 - iv(t, [tZoom - 0.1, tZoom + 0.35], [0, 1]);
  const words = [
    {w: 'ERES', at: tEres, x: 225, y: 1170, size: 96, fill: P.chalk},
    {w: 'LO', at: wt(5, 'lo'), x: 415, y: 1170, size: 96, fill: P.chalk},
    {w: 'QUE', at: wt(5, 'que'), x: 600, y: 1170, size: 96, fill: P.chalk},
    {w: 'COMES', at: tComes, x: 470, y: 1295, size: 150, fill: P.pink},
  ];

  return (
    <>
      <Cam z={cam.z} px={cam.px} py={cam.py} sx={cam.sx + shx} sy={cam.sy + shy}>
        <Ground y={GROUND} />
        {/* plato vacío */}
        <path d={`M${plate.x - 120},${plate.y - 60} q120,80 240,0 Z`} fill="#26332e" stroke={P.chalk} strokeWidth={8} strokeLinejoin="round" />
        <path d={`M${plate.x - 150},${plate.y - 60} L${plate.x + 150},${plate.y - 60}`} stroke={P.chalk} strokeWidth={8} strokeLinecap="round" />
        {[0, 1, 2].map((i) => {
          const k = leave(i);
          const x = plate.x - 40 + i * 40 + k * (500 + i * 80);
          const y = plate.y - 90 - Math.abs(Math.sin(k * Math.PI * 4)) * 60 * (1 - k * 0.5);
          return k < 1 ? <Shrimp key={i} x={x} y={y} s={0.9} t={t} seed={i + 3} flip fear={0.2} wave={k > 0.05 ? 1 : 0} /> : null;
        })}
        {leave(3) < 1 && <Algae x={plate.x + leave(3) * 600} y={plate.y - 80 - Math.abs(Math.sin(leave(3) * 10)) * 40} s={0.8} t={t} seed={7} />}
        <Flamingo
          id="f5"
          x={FX}
          y={GROUND}
          s={S}
          paint={drain < 1 ? {from: plumaje(1), to: plumaje(1, 1, paleTo), level: drain, dir: 'down', soft: 0.07} : undefined}
          color={plumaje(1, 1, paleTo)}
          look={t < tSin + 0.1 ? [0.7, 0.5] : t < tFlam ? [0.9, 0.3] : [lerp(0, 0, relax), lerp(0.25, 0, relax)]}
          brows={t < tSin ? 0.3 : t < tFlam ? 1 : lerp(-0.9 * sad, 0, relax)}
          beakOpen={t > tSin && t < tFlam ? 0.6 : 0}
          tear={t > tBlanco ? clamp((t - tBlanco) / 0.6) * (1 - relax) : 0}
          lean={-3 * sad * (1 - relax)}
          head={[0, 0]}
          headRot={-6 * sad * (1 - relax)}
          wing={t > tSin && t < tSin + 0.5 ? Math.abs(Math.sin((t - tSin) * 14)) : 0}
        />
        {/* los pigmentos se escapan del plumaje */}
        {Array.from({length: 10}, (_, i) => {
          const t0 = tFlam - 0.2 + i * 0.12;
          const k = (t - t0) / 1.4;
          if (k < 0 || k > 1) return null;
          const x0 = FX + (rnd(i * 3) - 0.4) * 260;
          const y0 = GROUND - 330 - rnd(i * 7) * 420;
          return (
            <g key={i} opacity={1 - k}>
              <Pigment x={x0 + Math.sin(k * 6 + i) * 30} y={y0 - k * 260} r={10} t={t} color={i % 3 ? P.pink : P.orange} seed={i} />
            </g>
          );
        })}
        {/* prohibido: sin camarones */}
        {t > tDieta - 0.05 && t < tEres && (
          <g transform={`translate(700,420) rotate(-8) scale(${clamp(spr(t, tDieta - 0.05, 3, 5)) * (1 - clamp((t - tEres + 0.35) / 0.3))})`}>
            <circle r={120} fill="none" stroke={P.red} strokeWidth={16} />
            <g transform="scale(1.3)">
              <Shrimp x={0} y={10} t={t} fear={0} s={0.9} />
            </g>
            <line x1={-84} y1={-84} x2={84} y2={84} stroke={P.red} strokeWidth={16} strokeLinecap="round" />
          </g>
        )}
      </Cam>
      {/* "ERES LO QUE COMES… LITERALMENTE" (hace de subtítulo en este tramo) */}
      {title > 0.01 && (
        <g opacity={title}>
          {words.map((w, i) => (
            <ChalkText key={i} x={w.x} y={w.y} text={w.w} size={w.size} fill={w.fill} pop={clamp(spr(t, w.at - 0.03, 3, 5))} rot={i === 3 ? -3 : -2} />
          ))}
          <ChalkText x={480} y={1410} text="…LITERALMENTE" size={74} fill={P.orangeGlow} pop={clamp(spr(t, tLit - 0.03, 2.6, 4))} rot={-5} />
        </g>
      )}
    </>
  );
};
