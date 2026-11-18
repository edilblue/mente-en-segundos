import React from 'react';
import {P, clamp, ease, iv, lerp, plumaje, spr, wt} from '../lib';
import {Chick, Flamingo, neckGeom} from '../components/Flamingo';
import {ColorBattery, Tag} from '../components/Critters';
import {ChalkText, Sparkle} from '../components/Chalk';
import {Cam, Ground, bez} from './common';

const GROUND = 1060;
const PS = 0.68; // escala de los padres
const L = 175; // padre izquierdo (mira a la derecha)
const R = 755; // padre derecho (volteado)
const CH = {x: 470, y: 968, s: 0.72};

/** Chorro de "leche de buche" rojiza, ondulado y con gotitas. */
const Stream: React.FC<{a: number[]; b: number[]; t: number; p: number}> = ({a, b, t, p}) => {
  if (p <= 0) return null;
  const n = 12;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * p;
    const x = lerp(a[0], b[0], u) + Math.sin(u * 9 + t * 18) * 9 * Math.sin(u * Math.PI);
    const y = lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 30;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return (
    <g>
      <path d={d} stroke={P.red} strokeWidth={22} fill="none" strokeLinecap="round" opacity={0.35} />
      <path d={d} stroke={P.red} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray="22 8" strokeDashoffset={-t * 120} />
      {[0, 1, 2].map((i) => {
        const k = (t * 2.2 + i / 3) % 1;
        return <circle key={i} cx={lerp(a[0], b[0], k * p) + 14} cy={lerp(a[1], b[1], k * p) - Math.sin(k * Math.PI) * 30 + 12} r={6} fill={P.red} />;
      })}
    </g>
  );
};

/** Escena 4 — los padres alimentan a la cría con leche de buche y quedan pálidos. */
export const S4: React.FC<{t: number}> = ({t}) => {
  const tPadres = wt(4, 'padres');
  const tAlim = wt(4, 'alimentan');
  const tCrias = wt(4, 'crias');
  const tLeche = wt(4, 'leche');
  const tProd = wt(4, 'producen');
  const tPor = wt(4, 'por');
  const tCriar = wt(4, 'criar');
  const tPal = wt(4, 'palidos');
  const tSwap = (tLeche + tPor) / 2 + 0.1; // la cría se voltea hacia el otro padre

  const inL = clamp(spr(t, tPadres - 0.35, 2.2, 5));
  const inR = clamp(spr(t, tPadres - 0.2, 2.2, 5));
  const bendR = iv(t, [tAlim - 0.1, tAlim + 0.35], [0, 1], ease.inOut) * (1 - iv(t, [tSwap - 0.1, tSwap + 0.25], [0, 1], ease.inOut));
  const bendL = iv(t, [tSwap - 0.15, tSwap + 0.25], [0, 1], ease.inOut) * (1 - iv(t, [tPor - 0.1, tPor + 0.3], [0, 1], ease.inOut));
  const streamR = iv(t, [tLeche - 0.15, tLeche + 0.25], [0, 1]) * (1 - iv(t, [tSwap - 0.25, tSwap - 0.05], [0, 1]));
  const streamL = iv(t, [tSwap + 0.2, tSwap + 0.5], [0, 1]) * (1 - iv(t, [tPor - 0.15, tPor + 0.05], [0, 1]));
  const pale = iv(t, [tPor, tPal + 0.4], [0, 0.85], ease.inOut);
  const tired = iv(t, [tPor + 0.1, tCriar + 0.4], [0, 1]);
  const chickPink = iv(t, [tLeche, tPor + 0.2], [0, 1], ease.inOut);
  const zoom = 1 + 0.14 * clamp(spr(t, tCriar - 0.1, 1.6, 4));
  const facingLeft = t > tSwap;

  // cabeza de cada padre: erguida → inclinada sobre la cría
  const headL: [number, number] = [124 * bendL, -32 * bendL + 30 * tired];
  const headR: [number, number] = [109 * bendR, -32 * bendR + 30 * tired];
  const tipL = [L + (45 + headL[0] + 120) * PS, GROUND + (-762 + headL[1] + 90) * PS];
  const tipR = [R - (45 + headR[0] + 120) * PS, GROUND + (-762 + headR[1] + 90) * PS];
  const chickBeak = (left: boolean) => [CH.x + (left ? -1 : 1) * 150 * CH.s, CH.y - 312 * CH.s];

  // buche (base del cuello) del padre derecho: brilla al "producir" la leche
  const g = neckGeom(-372, headR);
  const crop = bez(g.N0, g.C1, g.C2, g.E, 0.22);
  const cropS = [R - crop[0] * PS, GROUND + crop[1] * PS];
  const cropGlow = clamp(spr(t, tLeche - 0.05, 2, 4)) * (t < tPor ? 1 : 1 - clamp((t - tPor) / 0.4));

  const parent = (id: string, x: number, flip: boolean, head: [number, number], bend: number, enter: number) => (
    <Flamingo
      id={id}
      x={x + (flip ? 1 : -1) * 520 * (1 - enter)}
      y={GROUND}
      s={PS}
      flip={flip}
      color={plumaje(1, pale)}
      head={head}
      headRot={40 * bend}
      look={bend > 0.5 ? [0.6, 0.9] : tired > 0.3 ? [0, 0.2] : [0.3, 0]}
      lids={tired * 0.85}
      bags={tired}
      brows={tired > 0.2 ? -0.9 * tired : 0.4}
      beakOpen={bend > 0.5 ? 0.45 : 0}
      bob={Math.sin(t * 3 + x) * 4}
      lean={enter < 1 ? (1 - enter) * (flip ? 10 : -10) : tired * (flip ? -4 : 4)}
    />
  );

  return (
    <Cam z={zoom} px={CH.x} py={620}>
      <Ground y={GROUND} />
      {/* nido de barro (montículo) */}
      <path d={`M${CH.x - 190},${GROUND} L${CH.x - 110},${CH.y} L${CH.x + 110},${CH.y} L${CH.x + 190},${GROUND}Z`} fill="#26332e" stroke={P.chalk} strokeWidth={8} strokeLinejoin="round" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${CH.x - 130 + i * 70},${GROUND - 20} l30,-40`} stroke={P.chalk} strokeWidth={4} opacity={0.4} />
      ))}
      {parent('pL', L, false, headL, bendL, inL)}
      {parent('pR', R, true, headR, bendR, inR)}
      {cropGlow > 0.01 && <circle cx={cropS[0]} cy={cropS[1]} r={34 + 6 * Math.sin(t * 12)} fill={P.red} opacity={0.45 * cropGlow} filter="url(#glow)" />}
      <Stream a={tipR} b={chickBeak(false)} t={t} p={streamR} />
      <Stream a={tipL} b={chickBeak(true)} t={t} p={streamL} />
      <Chick
        id="c4"
        t={t}
        x={CH.x}
        y={CH.y}
        s={CH.s}
        flip={facingLeft}
        paint={{from: plumaje(0), to: plumaje(1), level: chickPink, dir: 'up', soft: 0.08}}
        look={[0.6, -0.8]}
        brows={0.8}
        beakOpen={(bendR > 0.4 || bendL > 0.4) ? 0.8 + 0.2 * Math.sin(t * 20) : 0.2}
        headRot={-14}
        wobble={0.7}
        blush={chickPink > 0.9 ? 1 : 0}
        sx={1 + 0.04 * Math.sin(t * 10)}
        sy={1 - 0.04 * Math.sin(t * 10)}
      />
      {/* rótulos */}
      <ChalkText x={L + 30} y={300} text="MAMÁ" size={58} pop={clamp(spr(t, tPadres, 3, 6)) * (1 - clamp((t - tPor + 0.3) / 0.2))} rot={-6} />
      <ChalkText x={R - 30} y={300} text="PAPÁ" size={58} pop={clamp(spr(t, tPadres + 0.12, 3, 6)) * (1 - clamp((t - tPor + 0.3) / 0.2))} rot={6} />
      <ChalkText x={CH.x} y={CH.y - 380} text="¡PÍO PÍO!" size={52} pop={clamp(spr(t, tCrias - 0.05, 3, 6)) * (1 - clamp((t - tLeche + 0.1) / 0.2))} rot={-4} />
      <Tag x={cropS[0]} y={cropS[1]} dx={30} dy={-300} text="leche de buche" p={clamp(spr(t, tLeche + 0.3, 3, 6)) * (t < tProd + 0.6 ? 1 : 1 - clamp((t - tProd - 0.6) / 0.2))} color={P.red} size={44} />
      {/* baterías de color que se agotan */}
      {[L + 40, R - 40].map((x, i) => {
        const p = clamp(spr(t, tPor + i * 0.1, 3, 6));
        const lvl = iv(t, [tPor + 0.2, tPal + 0.5], [1, 0.12]);
        return p > 0.01 ? (
          <g key={i} transform={`translate(${x},${280}) scale(${0.85 * p})`} opacity={lvl < 0.2 && Math.sin(t * 20) > 0 ? 0.55 : 1}>
            <ColorBattery level={lvl} />
          </g>
        ) : null;
      })}
      {/* gotas de sudor de cansancio */}
      {tired > 0.5 &&
        [L + 90, R - 90].map((x, i) => (
          <path key={i} d={`M${x},${470 + ((t * 60 + i * 20) % 40)} q-9,14 0,18 q9,-4 0,-18Z`} fill="#9fd3ff" />
        ))}
      {chickPink > 0.95 &&
        [0, 1, 2].map((i) => <Sparkle key={i} x={CH.x + [-120, 130, 20][i]} y={CH.y - [120, 200, 360][i]} s={0.7 + 0.3 * Math.sin(t * 12 + i)} color={P.pink} rot={t * 120} />)}
    </Cam>
  );
};
