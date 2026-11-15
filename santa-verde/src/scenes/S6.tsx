import React from 'react';
import {C, SUIT, bounce, clamp, iv, sp, ease} from '../lib';
import {cue} from '../timeline';
import {Burst, ChalkText, chalkStroke} from '../components/Chalk';
import {Figure, POSES, blinkAt, poseAt} from '../components/Figure';
import {SceneProps, Stage} from './common';
import {HERO} from './S1';

/**
 * Escena 6 — "Coca-Cola no inventó al Santa rojo… solo lo hizo imposible de olvidar."
 * Santa rojo con el mismo encuadre que el frame 0. Texto "Lo popularizó, no lo inventó".
 * Guiño en "olvidar". En los últimos 0,5 s un borrador barre la pizarra y el traje vuelve a verde:
 * el último frame (Santa guiñando) empalma con el primero (Santa verde mirando a cámara).
 */
export const S6: React.FC<SceneProps> = ({t, dur}) => {
  const tInv = cue(6, 'inventó', 0.85);
  const tSolo = cue(6, 'solo', 2.5);
  const tImp = cue(6, 'imposible', 3.4);
  const tOlv = cue(6, 'olvidar', 4.35);
  const tWink = tOlv + 0.25;
  const tLoop = dur - 0.5; // inicio del borrado para el loop

  const pose = poseAt(t, [
    [0, POSES.hips],
    [tInv - 0.1, POSES.wag],
    [tSolo - 0.1, POSES.shrug],
    [tImp - 0.1, {...POSES.point, armR: [130, -10], head: 6}],
    [tWink - 0.15, POSES.stand],
  ]);
  if (t > tInv - 0.1 && t < tSolo - 0.1) pose.armR = [150 + Math.sin(t * 22) * 14, -25];

  const wink = iv(t, [tWink, tWink + 0.08], [0, 1]);
  // vuelta a verde para cerrar el loop (de abajo arriba, en sincronía con el borrador)
  const back = iv(t, [tLoop + 0.05, dur - 0.08], [0, 1], ease.inOut);
  // cámara: termina exactamente en el encuadre del frame 0 (zoom 1, sin desplazamiento)
  const zoom = 1 + iv(t, [0, tWink - 0.3], [0.08, 0.03]) * (1 - iv(t, [tWink - 0.3, tLoop], [0, 1], ease.inOut)) + bounce(t, tWink, 0.015, 2, 6) * (1 - iv(t, [tLoop - 0.2, tLoop], [0, 1]));
  const idle = Math.sin(t * Math.PI * 1.6) * 0.012 * (1 - iv(t, [tLoop - 0.3, tLoop], [0, 1]));

  const l1 = iv(t, [0.1, 0.55], [0, 1]);
  const l2 = iv(t, [tInv - 0.15, tInv + 0.35], [0, 1]);
  const erase = iv(t, [tLoop, dur - 0.1], [0, 1], ease.inOut);
  const eraserX = -200 + erase * 1500;

  return (
    <>
    <Stage>
      <g opacity={1 - clamp((eraserX - 200) / 500)}>
        <ChalkText x={480} y={205} text="LO POPULARIZÓ," size={80} p={l1} color={C.yellow} />
        <ChalkText x={480} y={295} text="NO LO INVENTÓ" size={80} p={l2} />
        {l2 >= 1 && (
          <path d="M230,312 Q480,330 730,310" {...chalkStroke(10, C.red)} strokeDasharray={520} strokeDashoffset={520 * (1 - iv(t, [tInv + 0.35, tInv + 0.7], [0, 1]))} filter="url(#chalk)" />
        )}
      </g>
    </Stage>
    <Stage zoom={zoom} cx={480} cy={720}>
      <Figure
        {...HERO}
        pose={pose}
        suit={SUIT.red}
        paint={back > 0 ? {from: SUIT.red, to: SUIT.green, p: back, dir: 'up'} : undefined}
        squash={idle + bounce(t, tImp - 0.05, 0.08, 2.6, 6) + bounce(t, tWink, 0.06, 2.6, 6) * (1 - iv(t, [tLoop - 0.2, tLoop], [0, 1]))}
        face={{
          look: t < tWink - 0.15 ? [0.3, -0.1] : [0, 0],
          mouth: t < tInv ? 'smile' : t < tSolo ? 'smirk' : t < tWink ? 'grin' : 'smile',
          brow: t < tWink ? (t > tInv && t < tSolo ? 'angry' : 'up') : 'raise',
          blink: t < tWink - 0.3 ? blinkAt(t, 1) : 0,
          wink,
        }}
        hatFlop={Math.sin(t * 3) * 3 * (1 - iv(t, [tLoop - 0.3, tLoop], [0, 1])) + bounce(t, tImp, 10, 1.6, 3)}
      />
      {/* destello del guiño */}
      {t > tWink && t < tWink + 0.6 && (
        <g transform={`translate(${HERO.x + 110},${HERO.ground - 650}) scale(${sp(t, tWink)}) rotate(${(t - tWink) * 90})`}>
          <path d="M0,-46 L10,-10 L46,0 L10,10 L0,46 L-10,10 L-46,0 L-10,-10 Z" fill={C.yellow} opacity={1 - (t - tWink) / 0.6} />
        </g>
      )}
      <Burst x={HERO.x} y={HERO.ground - 470} t={t} at={tImp} r={300} n={10} color={C.yellow} />
      {/* borrador de pizarra que cruza la pantalla (cierre del loop) */}
      {erase > 0 && erase < 1 && (
        <g transform={`translate(${eraserX},${300}) rotate(-8)`}>
          <rect x={-260} y={-40} width={260} height={120} fill={C.chalk} opacity={0.16} filter="url(#dust)" />
          <rect x={-70} y={-55} width={150} height={70} rx={12} fill="#7a5a3a" stroke={C.chalk} strokeWidth={6} />
          <rect x={-70} y={10} width={150} height={22} rx={6} fill={C.chalk} opacity={0.85} />
        </g>
      )}
    </Stage>
    </>
  );
};
