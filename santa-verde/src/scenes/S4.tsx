import React from 'react';
import {C, SUIT, bounce, clamp, iv, lerp, shake, sp, ease} from '../lib';
import {cue} from '../timeline';
import {Burst, ChalkText, Dust, chalkStroke} from '../components/Chalk';
import {Figure, POSES, blinkAt, poseAt, walk} from '../components/Figure';
import {Bottle, Brush, Contract, Easel, Palette} from '../components/Props';
import {Ground, SceneProps, Stage} from './common';

const SIN_COLOR = {main: C.board, dark: C.board};
const CANVAS = {x: 650, y: 560, w: 380, h: 470};

/**
 * Escena 4 — "Pero en 1931, Coca-Cola contrató al ilustrador Haddon Sundblom, que lo pintó cálido, humano,
 * y con una botella en la mano."
 * Beats: año 1931 (golpe) → botella genérica → contrato firmado → el pintor (boina) pinta a Santa en el caballete →
 * brillo cálido → el Santa del cuadro cobra vida y salta fuera con una botella genérica.
 */
export const S4: React.FC<SceneProps> = ({t}) => {
  const tYear = cue(4, '1931', 0.5);
  const tCoca = cue(4, 'coca-cola', 1.8);
  const tContr = cue(4, 'contrató', 2.6);
  const tIlus = cue(4, 'ilustrador', 3.4);
  const tHaddon = cue(4, 'haddon', 4.1);
  const tPinto = cue(4, 'pintó', 5.4);
  const tCalido = cue(4, 'cálido', 5.8);
  const tHumano = cue(4, 'humano', 6.5);
  const tBot = cue(4, 'botella', 7.3);

  // --- Parte A: 1931 + botella + contrato
  const yearIn = sp(t, tYear - 0.1, {damping: 9});
  const toStudio = iv(t, [tIlus - 0.15, tIlus + 0.35], [0, 1], ease.inOut);
  const yearX = lerp(480, 190, toStudio);
  const yearY = lerp(330, 245, toStudio);
  const yearS = lerp(1, 0.48, toStudio) * yearIn;
  const bottleIn = sp(t, tCoca - 0.05);
  const bottleOut = iv(t, [tContr - 0.1, tContr + 0.2], [0, 1], ease.in);
  const contrIn = sp(t, tContr - 0.15, {damping: 11});
  const contrOut = iv(t, [tIlus - 0.15, tIlus + 0.25], [0, 1], ease.in);
  const sign = iv(t, [tContr + 0.1, tContr + 0.75], [0, 1]);

  // --- Parte B: estudio
  const studio = toStudio;
  const outline = iv(t, [tIlus + 0.3, tHaddon + 0.55], [0, 1], ease.inOut);
  const red = iv(t, [tHaddon + 0.4, tPinto + 0.35], [0, 1], ease.inOut);
  const glow = iv(t, [tCalido - 0.1, tCalido + 0.3], [0, 1]) * (1 + 0.15 * Math.sin(t * 9));
  const alive = clamp((t - (tBot - 0.35)) / 0.55); // salida del cuadro
  const aliveE = ease.out(alive);

  // Pintor: entra caminando y pinta con trazos amplios
  const painterIn = iv(t, [tIlus - 0.1, tIlus + 0.5], [0, 1], ease.out);
  const wk = walk(t, 2.6);
  const painting = t > tIlus + 0.5 && t < tBot - 0.3;
  const pPose = poseAt(t, [
    [0, POSES.paint],
    [tBot - 0.3, POSES.surprised],
  ]);
  if (painting) pPose.armR = [100 + Math.sin(t * 11) * 16, 10 + Math.sin(t * 7) * 18];
  const walkingIn = painterIn < 1;

  // Santa del cuadro → fuera del cuadro
  const sx = lerp(CANVAS.x, 610, aliveE);
  const sg = lerp(CANVAS.y + 205, 990, aliveE);
  const ss = lerp(0.55, 0.92, aliveE);
  const hop = alive > 0 && alive < 1 ? Math.sin(alive * Math.PI) * 160 : 0;
  const santaPose = poseAt(t, [
    [0, POSES.stand],
    [tHumano - 0.1, POSES.wave],
    [tBot - 0.35, POSES.jump],
    [tBot + 0.22, POSES.toast],
  ]);
  const landSq = bounce(t, tBot + 0.2, 0.2, 2.4, 5);
  const [kx, ky] = shake(t, tBot + 0.2, 0.3, 14);
  const [yx, yy] = shake(t, tYear, 0.3, 18);

  const zoom = 1 + iv(t, [0, tIlus], [0.06, 0]) + iv(t, [tIlus, tBot], [0, 0.05]) + bounce(t, tBot + 0.2, 0.03, 2, 5);

  return (
    <Stage zoom={zoom} cx={480} cy={640} dx={kx + yx} dy={ky + yy}>
      {/* ---------- Parte A ---------- */}
      {bottleOut < 1 && t > tCoca - 0.05 && (
        <g transform={`translate(${lerp(760, 1200, bottleOut)},${680}) rotate(${12 + bottleOut * 40}) scale(${2.4 * bottleIn})`}>
          <Bottle fizz={t} />
        </g>
      )}
      {contrOut < 1 && t > tContr - 0.15 && (
        <g transform={`translate(${lerp(480, -300, contrOut)},${720}) rotate(${-6 + contrOut * -30}) scale(${1.7 * contrIn})`}>
          <Contract sign={sign} />
        </g>
      )}
      {sign > 0.95 && t < tIlus && <Burst x={480} y={780} t={t} at={tContr + 0.75} r={150} n={8} color={C.yellow} />}

      {/* ---------- Parte B: estudio ---------- */}
      <g opacity={studio}>
        <Ground y={990} x0={40} x1={900} />
        <g transform={`translate(${CANVAS.x},${CANVAS.y})`}>
          <Easel w={CANVAS.w} h={CANVAS.h} />
        </g>
        {glow > 0 && <circle cx={CANVAS.x} cy={CANVAS.y + 40} r={210} fill={C.yellow} opacity={0.13 * glow} filter="url(#glow)" />}
        {/* Santa: primero pintado en el lienzo, después cobra vida */}
        <Figure
          x={sx}
          ground={sg}
          lift={hop}
          scale={ss}
          pose={santaPose}
          squash={landSq + (hop > 0 ? -0.1 : 0)}
          suit={red >= 1 ? SUIT.red : SIN_COLOR}
          paint={red < 1 ? {from: SIN_COLOR, to: SUIT.red, p: red, dir: 'up'} : undefined}
          outline={outline}
          face={{
            mouth: t > tCalido ? 'grin' : 'smile',
            brow: t > tCalido ? 'up' : 'flat',
            look: t > tHumano - 0.1 && t < tBot - 0.35 ? [-0.9, 0.1] : [0, 0],
            blink: blinkAt(t, 5),
            wink: t > tHumano + 0.15 && t < tHumano + 0.45 ? 1 : 0,
          }}
          hatFlop={bounce(t, tBot + 0.2, 20, 1.6, 3) + (hop > 0 ? -16 : 0)}
          propR={t > tBot - 0.35 ? <Bottle s={1.1} fizz={t} /> : undefined}
          uprightR
        />
        {/* corazones de tiza: "cálido, humano" */}
        {[0, 1, 2].map((i) => {
          const k = t - (tCalido + i * 0.22);
          if (k < 0 || k > 1.3 || t > tBot) return null;
          const y = CANVAS.y - 60 - k * 140;
          const x = CANVAS.x + [-120, 130, -40][i] + Math.sin(k * 6 + i) * 14;
          return (
            <path
              key={i}
              transform={`translate(${x},${y}) scale(${0.9 * Math.min(1, k * 4)})`}
              d="M0,18 C-30,-6 -22,-30 0,-14 C22,-30 30,-6 0,18 Z"
              {...chalkStroke(6, C.chalk)}
              fill="none"
              opacity={1 - k / 1.3}
              filter="url(#chalk)"
            />
          );
        })}
        <Dust x={610} y={990} t={t} at={tBot + 0.2} r={200} n={9} />
        <Burst x={610} y={720} t={t} at={tBot + 0.2} r={240} n={10} color={C.red} />
        {/* pintor */}
        <Figure
          x={lerp(-160, 215, painterIn)}
          ground={990}
          kind="plain"
          pose={walkingIn ? wk.pose : pPose}
          lift={walkingIn ? wk.lift : 0}
          scale={0.9}
          beret
          mustache
          face={{
            look: t > tBot - 0.3 ? [0.6, -0.3] : [1, 0],
            mouth: t > tBot - 0.3 ? 'o' : t > tCalido ? 'smile' : 'flat',
            brow: t > tBot - 0.3 ? 'up' : 'flat',
            eyeScale: t > tBot - 0.3 ? 1.3 : 1,
            blink: blinkAt(t, 6),
            facing: 0.5,
          }}
          squash={bounce(t, tBot - 0.25, 0.12, 2.6, 5)}
          propR={<Brush s={0.9} />}
          propL={<Palette s={0.8} />}
        />
      </g>

      {/* 1931 (encima de todo) */}
      {yearIn > 0 && (
        <g transform={`translate(${yearX},${yearY}) scale(${yearS}) rotate(${-4 * (1 - toStudio)})`}>
          <ChalkText x={0} y={70} text="1931" size={210} color={C.yellow} />
        </g>
      )}
      <Dust x={480} y={340} t={t} at={tYear + 0.1} r={200} n={6} />
      {/* datos: nombre del ilustrador */}
      <ChalkText x={480} y={1320} text="HADDON SUNDBLOM" size={70} p={iv(t, [tHaddon - 0.05, tHaddon + 0.6], [0, 1])} color={C.yellow} />
      <ChalkText x={480} y={1398} text="ilustrador · 1931–1964" size={48} p={iv(t, [tHaddon + 0.4, tHaddon + 1], [0, 1])} />
    </Stage>
  );
};
