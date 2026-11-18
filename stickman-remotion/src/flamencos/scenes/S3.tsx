import React from 'react';
import {P, clamp, ease, iv, lerp, mix, plumaje, rnd, spr, wt} from '../lib';
import {Flamingo, neckGeom} from '../components/Flamingo';
import {LiverChef, Pigment, Tag} from '../components/Critters';
import {ChalkText, Sparkle} from '../components/Chalk';
import {Cam, Ground, bez} from './common';

const GROUND = 1080;
const FX = 400;
const S = 1;
const N_DOTS = 9;

/** Escena 3 — rayos X: el hígado chef convierte los pigmentos y el rosa sube a las plumas. */
export const S3: React.FC<{t: number}> = ({t}) => {
  const e0 = 12.99;
  const tHig = wt(3, 'higado');
  const tTrans = wt(3, 'transforma');
  const tRos = wt(3, 'rosados');
  const tNar = wt(3, 'naranjas');
  const tGuardan = wt(3, 'guardan');
  const tPlumas = wt(3, 'plumas');
  const start = Math.min(e0, tHig - 0.6);

  const scan = iv(t, [start + 0.02, start + 0.45], [0, 1], ease.inOut);
  const xray = scan * (1 - iv(t, [tGuardan - 0.15, tGuardan + 0.35], [0, 1]));
  const paint = iv(t, [tGuardan - 0.05, tPlumas + 0.45], [0, 1], ease.inOut);
  const zoom = 1 + 0.32 * clamp(spr(t, tHig - 0.1, 1.6, 4)) - 0.32 * clamp(spr(t, tGuardan - 0.35, 1.6, 4));

  const g = neckGeom(-372);
  const toScreen = (p: number[]) => [FX + p[0] * S, GROUND + p[1] * S];
  const liver = toScreen([g.B[0] + 10, g.B[1] + 8]);
  const stir = t > tTrans - 0.1 && t < tGuardan ? 1 : 0;

  const dots = Array.from({length: N_DOTS}, (_, i) => {
    const d0 = start + 0.25 + i * 0.07; // salida desde la cabeza
    const travel = clamp((t - d0) / 0.55);
    let pos: number[];
    if (travel < 0.7) {
      pos = toScreen(bez(g.N0, g.C1, g.C2, g.E, 1 - travel / 0.7));
    } else {
      const k = (travel - 0.7) / 0.3;
      const n0 = toScreen(g.N0);
      pos = [lerp(n0[0], liver[0], k), lerp(n0[1], liver[1], k)];
    }
    // órbita alrededor del hígado (más rápida al "transformar")
    const orb = clamp((t - d0 - 0.55) / 0.3);
    const ang = (i / N_DOTS) * Math.PI * 2 + (t - tHig) * (stir ? 5.5 : 1.5);
    const rr = 120 + 18 * Math.sin(t * 3 + i);
    const o = [liver[0] + Math.cos(ang) * rr * 1.15, liver[1] + Math.sin(ang) * rr * 0.7];
    pos = [lerp(pos[0], o[0], orb), lerp(pos[1], o[1], orb)];
    // a las plumas: cada punto sale disparado a un sitio del plumaje y se funde
    const fly = clamp((t - (tGuardan - 0.1 + i * 0.05)) / 0.45);
    const dest = [
      [-120, -380],
      [60, -330],
      [-60, -430],
      [100, -470],
      [0, -620],
      [40, -760],
      [-150, -340],
      [90, -560],
      [20, -400],
    ][i];
    const dd = toScreen(dest);
    pos = [lerp(pos[0], dd[0], ease.out(fly)), lerp(pos[1], dd[1], ease.out(fly))];
    // color: naranja → rosa (algunos quedan naranja/coral)
    const naranja = i % 3 === 0;
    const toPink = clamp((t - (tRos - 0.1 + i * 0.05)) / 0.25);
    const toCoral = naranja ? clamp((t - (tNar - 0.05)) / 0.25) : 0;
    const color = mix(mix(P.orange, P.pink, toPink), P.coral, toCoral);
    return {pos, color, vis: t > d0 ? 1 - fly * fly : 0, seed: i};
  });

  return (
    <>
    <Cam z={zoom} px={liver[0]} py={liver[1]} sx={liver[0]} sy={lerp(liver[1], 830, clamp((zoom - 1) / 0.32))}>
      <Ground y={GROUND} />
      <Flamingo
        id="f3"
        x={FX}
        y={GROUND}
        s={S}
        paint={{from: plumaje(0), to: plumaje(1), level: paint, dir: 'up', soft: 0.05}}
        xray={xray}
        look={t > tPlumas ? [-0.5, 0.6] : t > tHig ? [-0.4, 0.9] : [0, 0]}
        brows={t > tGuardan ? 0.9 : 0.3}
        blush={clamp((t - tPlumas) / 0.3)}
        wing={t > tPlumas + 0.2 ? 0.5 + 0.5 * Math.sin(t * 12) : 0}
        inner={
          <g>
            {/* costillas de rayos X */}
            {[-70, -30, 10, 50].map((x, i) => (
              <path key={i} d={`M${x},-60 q22,60 0,120`} stroke={P.chalk} strokeWidth={5} fill="none" opacity={0.35} />
            ))}
            <g transform="translate(10,8)">
              <g transform={`scale(${clamp(spr(t, tHig - 0.08, 2.6, 5))})`}>
                <LiverChef t={t} stir={stir} whisk={stir} mood={t > tRos ? 1 : 0} s={1.05} />
              </g>
            </g>
          </g>
        }
        innerNeck={<path d={g.d} stroke={P.chalk} strokeWidth={5} strokeDasharray="10 12" fill="none" opacity={0.6} />}
      />
      {/* barra de escaneo */}
      {scan > 0 && scan < 1 && (
        <g>
          <rect x={-200} y={180 + scan * 950 - 6} width={1480} height={12} fill="#cfe9ff" opacity={0.9} />
          <rect x={-200} y={180 + scan * 950 - 60} width={1480} height={60} fill="#cfe9ff" opacity={0.12} />
        </g>
      )}
      {dots.map((d) =>
        d.vis > 0.01 ? (
          <g key={d.seed} opacity={d.vis}>
            <Pigment x={d.pos[0]} y={d.pos[1]} r={13} t={t} color={d.color} seed={d.seed} />
          </g>
        ) : null,
      )}
      <Tag x={liver[0] + 60} y={liver[1] + 50} dx={150} dy={170} text="HÍGADO" p={xray > 0.5 ? clamp(spr(t, tHig + 0.1, 3, 6)) : 0} color={P.chalk} size={46} />
      {/* destellos al pintarse */}
      {t > tPlumas &&
        [0, 1, 2, 3, 4].map((i) => (
          <Sparkle
            key={i}
            x={FX + [-200, 190, -90, 220, 120][i]}
            y={GROUND - [420, 520, 760, 300, 820][i]}
            s={clamp(spr(t, tPlumas + i * 0.06, 3, 6)) * (0.7 + 0.3 * Math.sin(t * 14 + i))}
            color={i % 2 ? P.pink : P.chalk}
            rot={t * 100 + rnd(i) * 90}
          />
        ))}
    </Cam>
    <ChalkText x={230} y={250} text="RAYOS X" size={64} pop={xray > 0.5 ? clamp(spr(t, start + 0.4, 3, 6)) * clamp(xray * 2 - 1) : 0} rot={-6} fill="#cfe9ff" />
    </>
  );
};
