import React from 'react';
import {C, SUIT, bounce, iv, sp, ease} from '../lib';
import {cue} from '../timeline';
import {Burst, ChalkText, chalkStroke} from '../components/Chalk';
import {Figure, POSES, blinkAt, poseAt} from '../components/Figure';
import {Magazine, Pencil} from '../components/Props';
import {Ground, SceneProps, Stage} from './common';

const SIN_COLOR = {main: C.board, dark: C.board};

/**
 * Escena 3 — "Y en el siglo XIX, el dibujante Thomas Nast ya lo pintaba de rojo en revistas."
 * Un stickman dibujante (bigote y perilla) traza a Santa en una revista antigua con un lápiz enorme;
 * en "rojo" el traje se rellena de rojo de arriba abajo.
 */
export const S3: React.FC<SceneProps> = ({t}) => {
  const tDib = cue(3, 'dibujante', 1.5);
  const tNast = cue(3, 'thomas', 2.1);
  const tRojo = cue(3, 'rojo', 3.7);
  const tRev = cue(3, 'revistas', 4.2);

  const magP = sp(t, 0.0, {damping: 12});
  const outline = iv(t, [0.25, tNast + 0.2], [0, 1], ease.inOut);
  const red = iv(t, [tRojo - 0.2, tRojo + 0.45], [0, 1], ease.inOut);
  const drawing = t > 0.2 && t < tRojo + 0.5;

  // brazo del dibujante: trazos rápidos (va y viene)
  const pose = poseAt(t, [
    [0, POSES.draw],
    [tRojo + 0.55, POSES.point],
    [tRev + 0.1, {...POSES.cheer, armR: [120, 20]}],
  ]);
  if (drawing) {
    pose.armR = [70 + Math.sin(t * 19) * 9, 40 + Math.cos(t * 13) * 12];
    pose.head = 16 + Math.sin(t * 6) * 3;
  }
  // el Santa dibujado reacciona al terminar de pintarse
  const santaHop = t > tRojo + 0.45 ? Math.max(0, Math.sin((t - tRojo - 0.45) * Math.PI * 2.2)) * 26 * Math.exp(-(t - tRojo - 0.45) * 2) : 0;
  const zoom = 1 + iv(t, [0, 4.8], [0, 0.07]) + bounce(t, tRojo + 0.2, 0.02, 2, 5);
  const nameP = iv(t, [tNast - 0.05, tNast + 0.5], [0, 1]);
  const sigloP = sp(t, cue(3, 'siglo', 0.4) - 0.05);

  return (
    <Stage zoom={zoom} cx={520} cy={640}>
      {/* revista */}
      <g transform={`translate(590,625) rotate(${-3 + (1 - magP) * 8})`}>
        <Magazine w={560} h={660} p={magP} year="1881" />
      </g>
      {/* Santa dibujado dentro de la revista */}
      <g transform="rotate(-3 590 625)">
        <Figure
          x={600}
          ground={905}
          pose={t > tRojo + 0.45 ? POSES.wave : POSES.stand}
          scale={0.78}
          lift={santaHop}
          suit={SIN_COLOR}
          paint={{from: SIN_COLOR, to: SUIT.red, p: red, dir: 'down'}}
          outline={outline}
          face={{mouth: red > 0.9 ? 'grin' : 'smile', blink: blinkAt(t, 2), brow: red > 0.9 ? 'up' : 'flat'}}
          hatFlop={bounce(t, tRojo + 0.45, 14, 1.6, 3)}
        />
      </g>
      {/* trazos de lápiz rojo sobre el traje mientras se colorea */}
      {red > 0 && red < 1 && (
        <g filter="url(#chalk)" opacity={0.9}>
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${540 + i * 18},${560 + red * 300 + i * 6} l60,-30`} {...chalkStroke(9, C.red)} />
          ))}
        </g>
      )}
      <Burst x={600} y={720} t={t} at={tRojo + 0.45} r={210} n={9} color={C.red} />
      {/* dibujante */}
      <Ground y={985} x0={40} x1={360} />
      <Figure
        x={165}
        ground={985}
        kind="plain"
        pose={pose}
        scale={1}
        mustache
        goatee
        face={{look: t < tRojo + 0.55 ? [1, 0.3] : [0, 0], mouth: t > tRojo + 0.5 ? 'grin' : 'flat', brow: t > tRojo + 0.5 ? 'up' : 'angry', blink: blinkAt(t, 4), facing: 0.5}}
        squash={bounce(t, tRev + 0.1, 0.1, 2.6, 5)}
        propR={<Pencil s={0.9} />}
      />
      {/* datos */}
      <g transform={`translate(250,215) scale(${sigloP}) rotate(-5)`}>
        <ChalkText x={0} y={0} text="SIGLO XIX" size={70} color={C.yellow} />
      </g>
      <ChalkText x={480} y={1320} text="THOMAS NAST" size={78} p={nameP} color={C.yellow} />
      <ChalkText x={480} y={1400} text="dibujante · revistas" size={50} p={iv(t, [tNast + 0.3, tNast + 0.9], [0, 1])} />
    </Stage>
  );
};
