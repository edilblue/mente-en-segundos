// Escena 4 — Campeones del salto: la pulga y su regla gigante; el canguro salta sobre Stickman Pro.
import React from 'react';
import {Flea, Kangaroo} from '../animals';
import {ComicText, Dust, EmojiFloat, Ground, Onomatopeya, SpeedLines, Stage} from '../components/fx';
import {POSES, Stickman, blinkAt, poseAt} from '../components/Stickman';
import {C, ease, iv, shake, sp} from '../lib';
import {Word, wt} from '../timeline';
import {GROUND, SceneProps, ordered, useT} from './common';

export const beats4 = (dur: number, w: Word[]) => {
  const [ruler, crouch, launch, apex, whip, jump, measure] = ordered(
    [wt(w, 'pulga', 2.75) - 0.6, wt(w, 'pulga', 2.75) - 0.1, wt(w, 'saltar', 3.45), wt(w, 'cien', 4.28) + 0.15, wt(w, 'canguro', 6.1) - 0.55, wt(w, 'avanzar', 7.0), wt(w, 'ocho', 7.8)],
    0.3,
  );
  const land = Math.min(dur - 1.4, Math.max(jump + 1.1, wt(w, 'metros', 8.1) + 0.35));
  return {ruler, crouch, launch, apex, whip, hopIn: whip + 0.3, jump, measure: Math.min(measure, land - 0.2), land};
};

const RULER_X = 860;
const R_TOP = 330;
const R_BOT = GROUND;
const FLEA_X = 640;

export const S4: React.FC<SceneProps> = ({dur, words}) => {
  const t = useT();
  const b = beats4(dur, words);

  // ---------------- Parte A: la pulga
  const rulerK = sp(t, b.ruler, {damping: 10});
  const rise = iv(t, [b.launch, b.apex], [0, 1], ease.out);
  const fleaLift = (t < b.crouch - 0.15 ? Math.abs(Math.sin(t * 7)) * 30 : 0) + rise * (R_BOT - R_TOP - 120) + (t > b.apex ? Math.sin((t - b.apex) * 3) * 12 : 0);
  const fleaSquash = t > b.crouch && t < b.launch ? 0.3 : t > b.launch && t < b.apex ? -0.3 * (1 - rise) : 0;
  const whipX = iv(t, [b.whip, b.whip + 0.35], [0, -1180], ease.in);
  const inB = iv(t, [b.whip, b.whip + 0.35], [1180, 0], ease.out);
  const markerY = R_BOT - fleaLift - 40;

  // ---------------- Parte B: el canguro
  const hopPhase = (t - b.hopIn) / 0.42;
  const hopping = t > b.hopIn && t < b.jump;
  const kxHop = iv(t, [b.hopIn, b.jump], [-40, 170]);
  const jumpU = iv(t, [b.jump, b.land], [0, 1]);
  const kx = t < b.jump ? kxHop : 170 + (900 - 170) * ease.inOut(jumpU);
  const kLift = hopping ? Math.abs(Math.sin(hopPhase * Math.PI)) * 70 : t < b.land ? Math.sin(jumpU * Math.PI) * 560 : 0;
  const kSquash = t > b.land ? 0.3 * Math.exp(-(t - b.land) * 7) : t > b.jump - 0.18 && t < b.jump ? 0.25 : t > b.jump && t < b.land ? -0.15 : 0;
  const kRot = t > b.jump && t < b.land ? -18 + 36 * jumpU : 0;
  const ducking = t > b.jump - 0.3 && t < b.land + 0.25;
  const proPose = poseAt(t, [
    [0, POSES.stand],
    [b.jump - 0.3, POSES.duck],
    [b.land + 0.25, POSES.stand],
    [b.land + 0.55, POSES.point],
  ]);
  const arrowW = iv(t, [b.measure, b.measure + 0.5], [0, 1], ease.out);

  return (
    <Stage shake={shake(t, b.land, 0.45, 16)}>
      <Ground y={GROUND} />
      {/* ======================= PULGA ======================= */}
      {t < b.whip + 0.4 && (
        <g transform={`translate(${whipX},0)`}>
          <g transform={`translate(${RULER_X},${R_BOT}) scale(1,${rulerK}) translate(${-RULER_X},${-R_BOT})`}>
            <rect x={RULER_X - 55} y={R_TOP} width={110} height={R_BOT - R_TOP} rx={10} fill={C.yellow} stroke={C.ink} strokeWidth={9} />
            {Array.from({length: 41}, (_, i) => {
              const y = R_BOT - 10 - ((R_BOT - R_TOP - 20) * i) / 40;
              const big = i % 10 === 0;
              return <path key={i} d={`M${RULER_X - 55},${y} l${big ? 50 : i % 5 === 0 ? 34 : 20},0`} stroke={C.ink} strokeWidth={big ? 7 : 4} />;
            })}
            {[25, 50, 75, 100].map((v, i) => (
              <ComicText key={v} x={RULER_X + 22} y={R_BOT - 10 - ((R_BOT - R_TOP - 20) * (i + 1)) / 4 + 30} size={40} fill="#fff" sw={6}>
                {`×${v}`}
              </ComicText>
            ))}
          </g>
          {/* marcador rojo que sigue a la pulga */}
          {t > b.launch && <path d={`M${RULER_X - 75},${markerY} l-40,-24 l0,48 z`} fill={C.red} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />}
          <SpeedLines t={t} x={FLEA_X - 10} y={R_BOT - fleaLift + 20} w={90} h={260} n={8} seed={4} opacity={t > b.launch && t < b.apex + 0.2 ? 1 - rise * 0.6 : 0} />
          <Flea x={FLEA_X} y={R_BOT - fleaLift} s={1.25} ext={t > b.launch ? 1 - Math.max(0, rise - 0.7) * 2 : 0} squash={fleaSquash} rot={t > b.launch ? -10 : 0} look={t > b.launch ? [0.6, -0.6] : [0.5, 0]} blink={blinkAt(t, 3)} />
          {t < b.launch && t > b.ruler + 0.3 && (
            <ComicText x={FLEA_X - 10} y={R_BOT - 150} size={44} fill="#fff" sw={6}>
              1×
            </ComicText>
          )}
          {t > b.apex && (
            <g transform={`translate(${FLEA_X - 150},${R_TOP + 60}) scale(${sp(t, b.apex)}) rotate(-8)`}>
              <rect x={-170} y={-55} width={340} height={110} rx={20} fill={C.red} stroke={C.ink} strokeWidth={8} />
              <ComicText x={0} y={4} size={60} fill="#fff">
                ¡+100 VECES!
              </ComicText>
            </g>
          )}
          <Stickman
            x={250}
            ground={GROUND}
            scale={0.8}
            pose={t > b.apex ? POSES.pointUp : t > 0.4 ? POSES.point : POSES.stand}
            cap
            face={{look: t > b.launch ? [0.5, -1] : [0.8, 0.5], blink: blinkAt(t), mouth: t > b.launch ? 'o' : 'smile', eyeScale: t > b.launch ? 1.25 : 1, brow: t > b.launch ? 'up' : 'none'}}
          />
          {/* SFX: boing — despega la pulga */}
          <Onomatopeya t={t} at={b.launch} text="¡BOING!" x={420} y={760} burst={C.yellow} color="#fff" size={120} rot={-12} dur={1.2} />
        </g>
      )}
      {/* ======================= CANGURO ======================= */}
      {t > b.whip && (
        <g transform={`translate(${inB},0)`}>
          {/* medida del salto */}
          {t > b.measure && (
            <g>
              <path d={`M170,600 L170,${GROUND - 20} M900,600 L900,${GROUND - 20}`} stroke={C.ink} strokeWidth={5} strokeDasharray="14 14" opacity={0.5 * arrowW} />
              <path d={`M175,600 L${175 + 720 * arrowW},600`} stroke={C.red} strokeWidth={10} strokeLinecap="round" />
              <path d="M175,600 l30,-20 l0,40 z" fill={C.red} />
              {arrowW > 0.95 && <path d="M895,600 l-30,-20 l0,40 z" fill={C.red} />}
              <g transform={`translate(535,520) scale(${sp(t, b.measure + 0.2)})`}>
                <ComicText x={0} y={0} size={86} fill={C.yellow}>
                  ¡8 METROS!
                </ComicText>
              </g>
            </g>
          )}
          <SpeedLines t={t} x={kx - 120} y={GROUND - kLift - 180} w={160} h={220} angle={90 - 30 * (1 - 2 * jumpU)} n={8} seed={11} opacity={t > b.jump && t < b.land ? 1 : 0} />
          <Stickman
            x={540}
            ground={GROUND}
            pose={proPose}
            squash={ducking ? 0.12 : 0}
            cap
            face={{
              look: ducking ? [-0.4, -0.8] : t > b.land ? [0.9, 0] : [-0.7, 0],
              blink: ducking ? 0.8 : blinkAt(t),
              mouth: ducking ? 'wavy' : t > b.land ? 'open' : 'smile',
              brow: ducking ? 'worried' : t > b.land ? 'up' : 'none',
              eyeScale: t > b.land ? 1.2 : 1,
            }}
          />
          <Kangaroo x={kx} y={GROUND} s={0.95} lift={kLift} squash={kSquash} rot={kRot} ext={t > b.jump && t < b.land ? 1 : hopping ? Math.abs(Math.sin(hopPhase * Math.PI)) : 0} look={[0.6, 0.2]} blink={blinkAt(t, 5)} mouth={t > b.jump ? 'grin' : 'smile'} />
          <Dust t={t} at={b.jump} x={170} y={GROUND} size={0.9} />
          <Dust t={t} at={b.land} x={900} y={GROUND} size={1.2} />
          {/* SFX: boing — salto del canguro */}
          <Onomatopeya t={t} at={b.jump} text="¡BOING!" x={300} y={880} burst={C.yellow} color="#fff" size={120} rot={-10} dur={1.1} />
          {/* SFX: pum — aterriza el canguro */}
          <Onomatopeya t={t} at={b.land} text="¡PUM!" x={820} y={900} burst={null} color={C.yellow} size={120} rot={8} dur={1} />
          <EmojiFloat t={t} at={b.jump - 0.1} e="😱" x={380} y={900} dur={1.6} />
        </g>
      )}
    </Stage>
  );
};
