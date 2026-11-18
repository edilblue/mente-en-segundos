import React from 'react';
import {CX, P, clamp, ease, iv, plumaje, shake, spr, squash, wt} from '../lib';
import {Chick, Flamingo} from '../components/Flamingo';
import {BigSign, Calendar} from '../components/Critters';
import {ChalkText, Dust, Sparkle} from '../components/Chalk';
import {Cam, Ground} from './common';

export const GROUND = 1030;
export const CHICK = {x: CX - 5, s: 1.1};
/** Punto entre los ojos de la cría en pantalla: el final del video hace zoom aquí (loop). */
export const LOOP_EYE = {x: CHICK.x + 44 * CHICK.s, y: GROUND - 326 * CHICK.s, z: 4.2};

/** Escena 1 — gancho: la cría gris y el cartel "¿ROSADO? NI DE CHISTE". */
export const S1: React.FC<{t: number}> = ({t}) => {
  const tDrop = wt(1, 'no') - 0.2;
  const tHit = tDrop + 0.36;
  const tGris = wt(1, 'nacen', 1);
  const tTardan = wt(1, 'tardan');
  const tAnos = wt(1, 'anos');
  const tCambiar = wt(1, 'cambiar');
  const tPoof = tCambiar + 0.32;

  // cámara: sale del ojo (continúa el loop) y "punch" en ¡grises!
  const zIn = iv(t, [0, 0.6], [LOOP_EYE.z, 1], ease.out);
  const punch = 1 + 0.07 * clamp(spr(t, tGris + 0.15, 2, 6)) - 0.07 * clamp(spr(t, tTardan - 0.1, 2, 6));
  const [shx, shy] = shake(t, tHit, 0.45, 22);

  // cartel: cae (gravedad), rebota y luego sale volando
  const fall = iv(t, [tDrop, tHit], [-1500, 0], ease.in);
  const rebound = t > tHit ? -36 * Math.exp(-7 * (t - tHit)) * Math.abs(Math.sin((t - tHit) * 16)) : 0;
  const leave = iv(t, [tTardan - 0.35, tTardan + 0.05], [0, -1700], ease.in);
  const signY = fall + rebound + leave;
  const [ssx, ssy] = squash(t, tHit, 0.12, 4, 8);

  // cría: aplastada por el golpe, salto en "¡grises!", crece con los años
  const [csx, csy] = squash(t, tHit, 0.38, 2.6, 4.5);
  const jump = t > tGris - 0.1 && t < tGris + 0.45 ? -Math.sin(((t - tGris + 0.1) / 0.55) * Math.PI) * 90 : 0;
  const [jsx, jsy] = squash(t, tGris + 0.35, 0.18, 4, 7);
  const grow = 1 + 0.1 * clamp(spr(t, tAnos, 3, 6)) + 0.1 * clamp(spr(t, tCambiar, 3, 6));
  const pinkK = 0.12 * clamp(spr(t, tAnos, 3, 6)) + 0.18 * clamp(spr(t, tCambiar, 3, 6));
  const poofK = clamp((t - tPoof) / 0.5);
  const showChick = t < tPoof + 0.08;
  const lookUp = t > tDrop - 0.1 && t < tHit + 0.1;
  const dizzy = t > tHit + 0.1 && t < tGris - 0.05;
  const blink = [2.15, 3.35, 4.6].some((b) => t > b && t < b + 0.12) ? 1 : 0;

  // muestra de color "GRIS"
  const sw = clamp(spr(t, tGris + 0.05, 3, 6)) * (1 - clamp((t - tTardan + 0.3) / 0.25));
  // calendario
  const cal = clamp(spr(t, tTardan - 0.15, 3, 6)) * (1 - iv(t, [tPoof + 0.2, tPoof + 0.45], [0, 1]));
  const year = t < tAnos ? 1 : t < tCambiar ? 2 : 3;
  const flip = t > tAnos - 0.12 && t < tAnos + 0.1 ? (t - tAnos + 0.12) / 0.22 : t > tCambiar - 0.12 && t < tCambiar + 0.1 ? (t - tCambiar + 0.12) / 0.22 : 0;

  return (
    <Cam z={zIn * punch} px={LOOP_EYE.x} py={LOOP_EYE.y} sx={LOOP_EYE.x + shx} sy={LOOP_EYE.y + shy}>
      <Ground y={GROUND} />
      {/* cartel detrás de la cría */}
      {t > tDrop && t < tTardan + 0.1 && (
        <g transform={`translate(${CX},${GROUND + signY}) scale(${ssx},${ssy})`}>
          <BigSign post={430} rot={t > tHit ? Math.sin((t - tHit) * 9) * 3 * Math.exp(-3 * (t - tHit)) : 0} />
        </g>
      )}
      {t > tHit && t < tHit + 0.5 && (
        <ChalkText x={CX + 260} y={GROUND - 250} text="¡TOC!" size={88} pop={clamp(spr(t, tHit, 3, 5))} rot={-14} />
      )}
      <Dust x={CHICK.x} y={GROUND} t={t} at={tHit} spread={220} />
      {showChick && (
        <g opacity={1 - clamp((t - tPoof) / 0.1)}>
          <Chick
            id="c1"
            t={t}
            x={CHICK.x}
            y={GROUND + jump}
            s={CHICK.s * grow}
            sx={csx * jsx}
            sy={csy * jsy}
            lean={Math.sin(t * 3.1) * 3 + (dizzy ? Math.sin(t * 9) * 6 : 0)}
            color={plumaje(pinkK)}
            wobble={1}
            look={lookUp ? [0.1, -1] : dizzy ? [Math.cos(t * 14), Math.sin(t * 14)] : t > tTardan ? [0.9, -0.6] : [0, 0]}
            brows={lookUp ? 1 : dizzy ? -0.6 : t > tGris ? 0.7 : 0}
            blink={blink}
            beakOpen={lookUp ? 0.6 : t > tGris && t < tGris + 0.5 ? 0.7 : 0}
            headRot={dizzy ? Math.sin(t * 8) * 10 : 0}
          />
        </g>
      )}
      {/* estrellitas de mareo */}
      {dizzy &&
        [0, 1, 2].map((i) => {
          const a = t * 7 + (i * Math.PI * 2) / 3;
          return <Sparkle key={i} x={CHICK.x + 44 + Math.cos(a) * 95} y={GROUND - 450 + Math.sin(a) * 26} s={0.9} rot={t * 200} />;
        })}
      {/* muestra de color: GRIS */}
      {sw > 0.01 && (
        <g transform={`translate(190,${GROUND - 330}) rotate(-8) scale(${sw})`}>
          <rect x={-95} y={-130} width={190} height={250} rx={12} fill={P.board} stroke={P.chalk} strokeWidth={7} />
          <rect x={-72} y={-108} width={144} height={140} rx={6} fill={P.gray} />
          <text x={0} y={80} textAnchor="middle" fontFamily='"Cabin Sketch", sans-serif' fontWeight={700} fontSize={56} fill={P.chalk}>
            GRIS
          </text>
          <path d="M100,40 q70,10 110,60" stroke={P.chalk} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M196,72 l14,28 l-30,-4" stroke={P.chalk} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {/* calendario de años */}
      {cal > 0.01 && (
        <g transform={`translate(740,${GROUND - 650}) rotate(6) scale(${cal})`}>
          <Calendar year={year} flip={flip} />
        </g>
      )}
      {/* ¡poof! → adulto rosado */}
      {t > tPoof - 0.05 && (
        <>
          <Dust x={CHICK.x} y={GROUND - 200} t={t} at={tPoof - 0.05} n={12} spread={330} />
          <g opacity={clamp((t - tPoof + 0.05) / 0.12)}>
            <Flamingo
              id="a1"
              x={CHICK.x - 10}
              y={GROUND}
              s={0.85 * (0.6 + 0.4 * clamp(spr(t, tPoof, 3, 5)))}
              color={plumaje(1)}
              wing={clamp(spr(t, tPoof + 0.05, 2.5, 4))}
              brows={0.8}
              blush={1}
              look={[0.3, 0]}
            />
          </g>
          {[0, 1, 2, 3].map((i) => (
            <Sparkle
              key={i}
              x={CHICK.x + [-220, 210, -160, 240][i]}
              y={GROUND - [560, 640, 300, 360][i]}
              s={clamp(spr(t, tPoof + i * 0.05, 3, 6)) * (0.8 + 0.4 * Math.sin(t * 12 + i))}
              color={i % 2 ? P.pink : P.chalk}
              rot={t * 90}
            />
          ))}
        </>
      )}
    </Cam>
  );
};
