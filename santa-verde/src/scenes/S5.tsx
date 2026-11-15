import React from 'react';
import {C, SUIT, bounce, clamp, iv, lerp, rnd, sp, ease} from '../lib';
import {cue} from '../timeline';
import {Burst, ChalkText, chalkStroke} from '../components/Chalk';
import {Figure, POSES, blinkAt} from '../components/Figure';
import {Globe, Poster} from '../components/Props';
import {SceneProps, Stage} from './common';

// Rejilla de carteles que llega a cubrir toda la pantalla (orden: del centro hacia fuera)
const COLS = 5;
const ROWS = 7;
const GRID = Array.from({length: COLS * ROWS}, (_, i) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const x = 100 + c * 220 + (r % 2 ? 50 : -10);
  const y = 170 + r * 270;
  const d = Math.hypot(x - 480, (y - 640) * 0.8);
  return {x, y, d, rot: (rnd(i * 3.7) - 0.5) * 14};
})
  .sort((a, b) => a.d - b.d)
  .map((p, i) => ({...p, i}));

/**
 * Escena 5 — "Esos anuncios se repitieron por más de treinta años y el mundo entero lo adoptó."
 * Los carteles se duplican (1 → 2 → 4 → 8 …) hasta tapar la pantalla mientras corre el contador 1931 → 1964;
 * en "el mundo entero" la cámara se aleja y aparece un globo lleno de gorros rojos.
 */
export const S5: React.FC<SceneProps> = ({t}) => {
  const tRep = cue(5, 'repitieron', 0.9);
  const tAnos = cue(5, 'años', 2.4);
  const tMundo = cue(5, 'mundo', 3.2);
  const tAdopto = cue(5, 'adoptó', 4.1);

  // nº de carteles: crecimiento exponencial desde "anuncios" hasta "años"
  const g = iv(t, [0.15, tAnos + 0.1], [0, 1]);
  const count = g <= 0 ? 0 : Math.min(GRID.length, Math.floor(Math.pow(2, g * 5.2)));
  const year = Math.round(iv(t, [0.3, tAnos + 0.2], [1931, 1964]));
  const worldT = iv(t, [tMundo - 0.25, tMundo + 0.35], [0, 1], ease.inOut);
  const zoom = lerp(1.04 - iv(t, [0, tMundo], [0, 0.08]), 0.55, worldT) + bounce(t, tRep, 0.02, 2, 5);

  return (
    <>
      <Stage zoom={zoom} cx={480} cy={700}>
        <g opacity={1 - worldT * 0.85}>
          {GRID.slice(0, count).map((p) => {
            // cada cartel aparece con "pop" (el momento de aparición depende de su índice)
            const at = 0.15 + (Math.log2(p.i + 1) / 5.2) * (tAnos + 0.1 - 0.15);
            const k = sp(t, at, {damping: 9, stiffness: 220});
            return (
              <g key={p.i} transform={`translate(${p.x},${p.y}) rotate(${p.rot * k}) scale(${k})`}>
                <Poster s={0.95} year={1931 + Math.min(33, Math.round(p.i * 0.95))} tint={1} />
              </g>
            );
          })}
        </g>
      </Stage>
      {/* Mundo entero: globo con gorros rojos (fuera del zoom de los carteles) */}
      {worldT > 0 && (
        <Stage zoom={lerp(0.4, 1, ease.back(worldT))} cx={480} cy={640}>
          <g transform="translate(480,650)">
            <Globe r={230} spin={t * 0.25} />
            {Array.from({length: 11}, (_, i) => {
              const a = (i / 11) * Math.PI * 2 + 0.4;
              const rr = 120 + rnd(i * 5.1) * 100;
              const k = sp(t, tMundo + 0.1 + i * 0.06 + (t > tAdopto ? 0 : 0), {damping: 8});
              const x = Math.cos(a) * rr * 0.95;
              const y = Math.sin(a) * rr * 0.8;
              return (
                <g key={i} transform={`translate(${x},${y}) scale(${0.55 * k}) rotate(${(rnd(i) - 0.5) * 40})`}>
                  <path d="M-30,10 C-24,-34 10,-48 40,-30 C22,-22 26,-6 30,10 Z" fill={C.red} filter="url(#chalkFill)" />
                  <rect x={-36} y={4} width={72} height={16} rx={8} fill={C.chalk} />
                  <circle cx={40} cy={-30} r={9} fill={C.chalk} />
                </g>
              );
            })}
          </g>
          {/* Santa rojo saludando sobre el globo */}
          <Figure
            x={480}
            ground={430 + bounce(t, tAdopto, 10, 2, 4)}
            pose={t > tAdopto - 0.1 ? POSES.cheer : POSES.wave}
            scale={0.62 * sp(t, tMundo + 0.05)}
            suit={SUIT.red}
            face={{mouth: 'grin', brow: 'up', blink: blinkAt(t, 3)}}
            hatFlop={Math.sin(t * 8) * 8}
            squash={bounce(t, tAdopto, 0.15, 2.6, 5)}
          />
          <Burst x={480} y={650} t={t} at={tAdopto} r={300} n={12} color={C.yellow} />
        </Stage>
      )}
      {/* contador de años + línea de tiempo (zona de datos, siempre legible) */}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <g opacity={1 - worldT}>
          <rect x={250} y={175} width={460} height={170} rx={24} fill={C.board} opacity={0.88} />
          <ChalkText x={480} y={315} text={String(year)} size={150} color={C.yellow} />
        </g>
        <rect x={60} y={1255} width={860} height={175} rx={24} fill={C.board} opacity={0.9} />
        <TimelineBar t={t} tEnd={tAnos + 0.2} />
      </svg>
    </>
  );
};

const TimelineBar: React.FC<{t: number; tEnd: number}> = ({t, tEnd}) => {
  const p = iv(t, [0.3, tEnd], [0, 1], ease.inOut);
  const x0 = 140;
  const x1 = 820;
  const y = 1335;
  const xm = lerp(x0, x1, p);
  return (
    <g filter="url(#chalk)">
      <path d={`M${x0},${y} L${x1},${y}`} {...chalkStroke(8)} opacity={0.5} />
      <path d={`M${x0},${y} L${xm},${y}`} {...chalkStroke(12, C.red)} />
      {Array.from({length: 8}, (_, i) => (
        <path key={i} d={`M${lerp(x0, x1, i / 7)},${y - 14} l0,28`} {...chalkStroke(6)} opacity={0.7} />
      ))}
      <circle cx={xm} cy={y} r={18} fill={C.red} stroke={C.chalk} strokeWidth={6} />
      <text x={x0} y={y + 72} textAnchor="middle" fontFamily="Cabin Sketch" fontWeight={700} fontSize={46} fill={C.chalk}>
        1931
      </text>
      <text x={x1} y={y + 72} textAnchor="middle" fontFamily="Cabin Sketch" fontWeight={700} fontSize={46} fill={clamp(p) >= 1 ? C.yellow : C.chalk}>
        1964
      </text>
      <text x={480} y={y + 72} textAnchor="middle" fontFamily="Cabin Sketch" fontWeight={700} fontSize={40} fill={C.chalkDim}>
        +30 años
      </text>
    </g>
  );
};
