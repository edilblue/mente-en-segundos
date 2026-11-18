import React from 'react';
import {P, clamp, ease, iv, lerp, mix, plumaje, rnd, spr, wt} from '../lib';
import {Beak, Eyes, Flamingo} from '../components/Flamingo';
import {Algae, Bubbles, Pigment, Shrimp, Tag} from '../components/Critters';
import {ChalkText, Sparkle} from '../components/Chalk';
import {Cam, Water} from './common';

const WATER = 1010;
const FX = 400; // flamenco en el plano general
const S = 0.85;
const MOUTH = {x: 500, y: 770}; // boca del primer plano

/** Primer plano: cabeza y pico abierto filtrando el agua. */
const BeakCloseup: React.FC<{t: number; open: number; gulp: number}> = ({t, open, gulp}) => {
  const col = plumaje(1);
  const sway = Math.sin(t * 2.4) * 6;
  return (
    <g transform={`translate(0,${sway})`}>
      {/* cuello que baja desde la superficie */}
      <path d="M150,180 C190,360 120,480 250,650" stroke={P.chalk} strokeWidth={130} fill="none" strokeLinecap="round" />
      <path d="M150,180 C190,360 120,480 250,650" stroke={col} strokeWidth={104} fill="none" strokeLinecap="round" />
      <circle cx={290} cy={690} r={135} fill={col} stroke={P.chalk} strokeWidth={10} />
      <g transform={`translate(390,700) scale(${2.7 - gulp * 0.1})`}>
        <Beak open={open} base={mix('#e2dad6', '#ffd3dd', 0.6)} />
        {/* láminas filtradoras (peine) en el borde del pico */}
        {open > 0.05 &&
          Array.from({length: 9}, (_, i) => (
            <line key={i} x1={6 + i * 6} y1={14 + i * 1.4} x2={6 + i * 6 + 2} y2={20 + i * 1.4 + open * 6} stroke={P.chalk} strokeWidth={1.6} opacity={0.85} />
          ))}
      </g>
      <Eyes cx={262} cy={660} r={30} gap={70} skin={col} look={[0.9, 0.2]} brows={0.5} blink={Math.sin(t * 1.3) > 0.985 ? 1 : 0} />
    </g>
  );
};


/** Escena 2 — dieta: algas y camarones con carotenoides. */
export const S2: React.FC<{t: number}> = ({t}) => {
  const tColor = wt(2, 'color');
  const tViene = wt(2, 'viene');
  const tComen = wt(2, 'comen');
  const tAlgas = wt(2, 'algas');
  const tCam = wt(2, 'camarones');
  const tPig = wt(2, 'pigmentos');
  const tCaro = wt(2, 'carotenoides');
  const tCut = tAlgas - 0.12; // corte al primer plano

  if (t < tCut) {
    // ---------------------------------------------------------------- plano general
    const dive = iv(t, [tComen - 0.4, tComen + 0.25], [0, 1], ease.inOut);
    const zoom = iv(t, [tCut - 0.3, tCut], [1, 2.4], ease.in);
    const headTo: [number, number] = [210 * dive, 650 * dive];
    const entry = {x: FX + (45 + 210 - 10) * S, y: WATER};
    return (
      <Cam z={zoom} px={lerp(480, entry.x, clamp(zoom - 1))} py={lerp(900, entry.y, clamp(zoom - 1))}>
        <Flamingo
          id="f2"
          x={FX}
          y={1150}
          s={S}
          color={plumaje(1)}
          wing={clamp(spr(t, tColor, 2.5, 4)) * (1 - dive) * (0.6 + 0.4 * Math.sin(t * 10))}
          look={dive > 0.2 ? [0.8, 0.6] : t > tColor ? [-0.7, 0.8] : [0, 0]}
          brows={t > tViene ? 0.9 : 0.3}
          blush={t > tColor ? 1 : 0}
          head={headTo}
          headRot={150 * dive}
          lean={8 * dive}
          legBend={0.25 * dive}
          beakOpen={0.3 * dive}
        />
        <Water y={WATER} t={t} />
        <ChalkText x={640} y={330} text="?" size={190} pop={clamp(spr(t, tViene - 0.05, 3, 5)) * (1 - dive)} rot={12} />
        <ChalkText x={250} y={470} text="?" size={110} pop={clamp(spr(t, tViene + 0.15, 3, 5)) * (1 - dive)} rot={-10} fill={P.pink} />
        {dive > 0.6 &&
          [0, 1, 2].map((i) => {
            const k = ((t - tComen + i * 0.25) % 0.75) / 0.75;
            return <ellipse key={i} cx={entry.x} cy={WATER + 4} rx={40 + k * 160} ry={10 + k * 30} fill="none" stroke={P.chalk} strokeWidth={5 * (1 - k)} opacity={1 - k} />;
          })}
      </Cam>
    );
  }

  // ---------------------------------------------------------------- primer plano subacuático
  const zin = iv(t, [tCut, tCut + 0.35], [1.5, 1], ease.out);
  const gulpT = tCaro + 1.05;
  const gulp = t > gulpT && t < gulpT + 0.35 ? Math.sin(((t - gulpT) / 0.35) * Math.PI) : 0;
  const open = 0.55 + 0.12 * Math.sin(t * 5) - 0.55 * gulp;
  const gulpEnd = gulpT + 0.18;
  const algas = [0, 1, 2, 3, 4].map((i) => ({t0: tAlgas - 0.3 + i * 0.32, y0: [560, 930, 700, 1000, 820][i], seed: i}));
  // camarones: entran nadando hasta su sitio, forcejean contra la corriente y el pico los traga en el ¡ÑAM!
  const camarones = [
    {x: 730, y: 400, t0: tCam - 0.35},
    {x: 770, y: 600, t0: tCam - 0.15},
    {x: 770, y: 800, t0: tCam + 0.05},
    {x: 730, y: 1000, t0: tCam + 0.25},
  ];
  const pig = clamp(spr(t, tPig, 2.5, 5));
  return (
    <Cam z={zin} px={MOUTH.x} py={MOUTH.y}>
      <Water y={250} t={t} fill={false} />
      <rect x={-300} y={250} width={1700} height={1400} fill="#2a3a40" opacity={0.35} />
      <Bubbles t={t} x={60} y={300} w={820} h={760} />
      {/* corriente hacia el pico */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M1100,${620 + i * 130} C900,${600 + i * 120} 750,${720 + i * 30} ${MOUTH.x + 60},${MOUTH.y}`}
          stroke={P.chalk}
          strokeWidth={4}
          fill="none"
          strokeDasharray="26 34"
          strokeDashoffset={t * 160}
          opacity={0.3}
        />
      ))}
      {algas.map((it, i) => {
        const age = t - it.t0;
        if (age < 0) return null;
        const x = 1160 - 330 * age;
        const toMouth = clamp((780 - x) / (780 - MOUTH.x));
        const y = lerp(it.y0, MOUTH.y, ease.inOut(toMouth)) + Math.sin(t * 5 + it.seed) * 14 * (1 - toMouth);
        if (x < MOUTH.x + 10) return null;
        const shrink = 1 - 0.75 * clamp((MOUTH.x + 110 - x) / 100);
        return (
          <g key={i}>
            <Algae x={x} y={y} s={1.1 * shrink} t={t} seed={it.seed} rot={rnd(it.seed) * 40 - 20} dots={1} />
            {i === 2 && x < 820 && <Tag x={x} y={y - 30} dx={40} dy={-100} text="algas" p={clamp(spr(t, it.t0 + (1160 - 820) / 330, 3, 6)) * shrink} color={P.algae} size={50} />}
          </g>
        );
      })}
      {camarones.map((c, i) => {
        const inK = ease.out(clamp((t - c.t0) / 0.7));
        if (inK <= 0) return null;
        const suck = ease.in(clamp((t - (gulpT - 0.25 + i * 0.03)) / 0.3));
        if (suck >= 1) return null;
        const x0 = lerp(1180, c.x, inK) + Math.sin(t * 4 + i) * 8;
        const y0 = c.y + Math.sin(t * 3 + i * 2) * 10;
        const x = lerp(x0, MOUTH.x + 30, suck);
        const y = lerp(y0, MOUTH.y, suck);
        const sc = 1.15 * (1 - 0.8 * suck);
        return (
          <g key={i}>
            <Shrimp x={x} y={y} s={sc} t={t} seed={i + 10} flip fear={0.6 + 0.4 * inK} rot={Math.sin(t * 8 + i) * 8 - 20 * suck} />
            <Pigment x={x - 8 * sc} y={y - 78 * sc} r={(12 + 6 * pig) * (sc / 1.15)} t={t} seed={i} ring={t > tPig ? ((t - tPig + i * 0.17) % 0.8) / 0.8 : 0} />
            <g transform={`translate(${x - 8 * sc},${y - 118 * sc}) scale(${clamp(spr(t, tCaro - 0.05 + i * 0.07, 3, 6)) * (1 - suck)})`}>
              <text textAnchor="middle" fontFamily='"Cabin Sketch", sans-serif' fontWeight={700} fontSize={36} fill={P.orange} stroke="#0d1311" strokeWidth={8} style={{paintOrder: 'stroke'}}>
                carotenoides
              </text>
            </g>
          </g>
        );
      })}
      <BeakCloseup t={t} open={open} gulp={gulp} />
      {t > gulpT - 0.05 && t < gulpEnd + 0.4 && <ChalkText x={700} y={430} text="¡ÑAM!" size={110} pop={clamp(spr(t, gulpT, 3, 5))} rot={-12} fill={P.chalk} />}
      {t > tCaro && <Sparkle x={760} y={470} s={0.8 + 0.3 * Math.sin(t * 10)} color={P.orangeGlow} rot={t * 120} />}
    </Cam>
  );
};
