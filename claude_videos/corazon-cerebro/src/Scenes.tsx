import React from 'react';
import {W, H, clamp, ramp, inv, easeIn, easeOut, easeInOut, lerp, window4, rgba, rng, smoothPath, noise1} from './lib';
import {Atmos, Dust, Bokeh, Label, Title, PAL} from './fx';
import {Brain, regionXY} from './Brain';
import {Heart, ECG} from './Heart';
import {Person} from './People';
import {Eye, NeuralField, Synapse, Oxytocin} from './Micro';
import {Body, ORG, SweatyHand, Butterflies} from './Body';
import {cue, heartPhase, TIMELINE} from './timeline';
import {FONT_SANS} from './fonts';

export interface SP {
  t: number; // segundos locales
  d: number; // duración de la escena
  tg: number; // segundos globales
}

const Layer: React.FC<{o: number; z?: number; ox?: number; oy?: number; blur?: number; children: React.ReactNode}> = ({o, z = 1, ox = W / 2, oy = H / 2, blur = 0, children}) =>
  o <= 0.002 ? null : (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: clamp(o),
        transform: z !== 1 ? `scale(${z})` : undefined,
        transformOrigin: `${ox}px ${oy}px`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </div>
  );

const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0, ...style}}>
    {children}
  </svg>
);

/** brillo radial (luz volumétrica simulada) */
const Glow: React.FC<{x: number; y: number; r: number; color: string; o: number}> = ({x, y, r, color, o}) =>
  o <= 0.002 ? null : (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${rgba(color, 0.55 * o)} 0%, ${rgba(color, 0.18 * o)} 35%, transparent 70%)`,
        mixBlendMode: 'screen',
      }}
    />
  );

function bpmAt(tg: number) {
  const b = TIMELINE.beats;
  let i = 0;
  while (i < b.length - 2 && b[i + 1].t <= tg) i++;
  return 60 / (b[i + 1].t - b[i].t);
}

// =====================================================================================
// ESCENA 1 — GANCHO: ojo → pareja en cámara lenta → a través del ojo → red neuronal
// =====================================================================================
export const S1: React.FC<SP> = ({t, d, tg}) => {
  const cC = cue(1, 'cerebro');
  const cP = cue(1, 'persona');
  const cM = cue(1, 'mundo');
  const thump = t > 0.12 ? Math.exp(-(t - 0.12) * 4) : 0;
  const thump2 = t > 1.15 ? Math.exp(-(t - 1.15) * 4) * 0.6 : 0;
  // A) ojo macro
  const eyeO = 1 - ramp(t, 1.55, 2.2);
  const pupil = 0.27 + 0.15 * easeOut(inv(0.12, 0.9, t));
  // B) pareja
  const coupleO = ramp(t, 1.55, 2.2) * (1 - ramp(t, cC + 0.35, cC + 0.8));
  const dive = easeIn(inv(cC - 0.5, cC + 0.7, t));
  const coupleZ = (1 + 0.06 * inv(1.6, cC, t)) * (1 + 7 * dive);
  // C) segundo ojo: atravesar la pupila
  const eye2O = ramp(t, cC + 0.3, cC + 0.6) * (1 - ramp(t, cC + 1.15, cC + 1.5));
  const eye2Z = 1 + 9 * easeIn(inv(cC + 0.35, cC + 1.45, t));
  // D) túnel neuronal
  const tunO = ramp(t, cC + 1.2, cC + 1.6);
  const tt = Math.max(0, t - (cC + 1.2));
  const camZ = 1800 * tt - 420 * tt * tt * 0.5 * inv(0, 2, tt) + 300;
  const focus = ramp(t, cP - 0.1, cP + 0.8);
  const flare = window4(t, cM - 0.3, cM + 0.2, d - 0.1, d + 0.3);
  const ph = heartPhase(tg);
  const p = ph - Math.floor(ph);
  const beatK = Math.exp(-Math.pow((p - 0.16) / 0.08, 2));
  const shake = (thump + thump2) * 10;
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translate(${noise1(t * 30) * shake}px, ${noise1(t * 30, 3) * shake}px)`}}>
      <Atmos t={t} hue="warm" rays={0.8} />
      <Layer o={eyeO} z={1.12 - 0.08 * inv(0, 1.8, t)}>
        <Eye t={t} pupil={pupil} reflect={1} />
      </Layer>
      <Layer o={coupleO} z={coupleZ} ox={350} oy={974}>
        <Atmos t={t} hue="warm" rays={1} />
        <Bokeh t={t} slow={0.15} />
        <Svg>
          <Person who="A" x={265} y={1100} scale={0.75} t={t * 0.3} smile={0.3 + 0.4 * ramp(t, 3, 4)} blink={window4(t, 2.9, 3.0, 3.05, 3.15)} rim={0.8 + 0.4 * beatK} />
          <Person who="B" x={820} y={1100} scale={0.72} flip t={t * 0.3} smile={ramp(t, 2.2, 3.4)} tilt={-3 * ramp(t, 2, 4)} rim={0.8 + 0.4 * beatK} />
        </Svg>
        <Dust t={t * 0.15} n={120} color={PAL.gold} size={1.4} />
        <Title text="CUANDO TE ENAMORAS…" p={inv(2.0, 3.1, t)} out={inv(cC - 0.6, cC - 0.1, t)} y={250} size={54} spacing={4} glow={PAL.rose} />
      </Layer>
      <Layer o={eye2O} z={eye2Z}>
        <Eye t={t} pupil={0.45} reflect={0.6} />
      </Layer>
      <Layer o={tunO}>
        <div style={{position: 'absolute', inset: 0, background: '#03020a'}} />
        <NeuralField t={t} cam={{x: 0, y: 0, z: camZ, yaw: 0, pitch: 0, roll: t * 0.15, f: 900}} n={70} depth={9000} spread={800} colors={[PAL.violet, PAL.rose, PAL.cyan]} fire={1} />
        <Glow x={540} y={960} r={140 + 360 * focus + 500 * flare} color={PAL.gold} o={focus} />
        <Svg>
          <circle cx={540} cy={960} r={(26 + 40 * focus) * (1 + 0.25 * beatK)} fill="#fff6dc" opacity={focus} />
          {Array.from({length: 12}, (_, i) => {
            const a = (i / 12) * Math.PI * 2 + t * 0.4;
            const L = (120 + 380 * flare) * focus;
            return <line key={i} x1={540 + Math.cos(a) * 60} y1={960 + Math.sin(a) * 60} x2={540 + Math.cos(a) * L} y2={960 + Math.sin(a) * L} stroke={PAL.gold} strokeWidth={4} opacity={0.6 * focus} />;
          })}
        </Svg>
      </Layer>
      {/* destello del primer latido */}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${rgba('#ff3a6a', 0.55 * thump)}, transparent 70%)`, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: '#fff3e0', opacity: 0.85 * ramp(t, d - 0.35, d)}} />
    </div>
  );
};

// =====================================================================================
// ESCENA 2 — EL CEREBRO SE ENCIENDE: circuitos de recompensa → sinapsis de dopamina
// =====================================================================================
export const S2: React.FC<SP> = ({t, d}) => {
  const cE = cue(2, 'encienden');
  const cA = cue(2, 'área');
  const cN = cue(2, 'núcleo');
  const cD = cue(2, 'dopamina');
  const cS = cue(2, 'sola');
  const cI = cue(2, 'impulsa');
  const cMo = cue(2, 'motivación');
  const cDe = cue(2, 'deseo');
  const cAn = cue(2, 'ansiedad');
  const yaw = -0.7 + 0.75 * easeInOut(inv(0, cA, t)) + 0.1 * Math.sin(t * 0.5);
  const push = easeInOut(inv(cA - 0.6, cA + 1.2, t));
  const scale = lerp(0.95, 1.35, push);
  const bx = lerp(540, 540 - 96 * 1.35 * 0.8, push);
  const by = lerp(900, 830, push);
  const bp = {x: bx, y: by, scale, yaw};
  const toSyn = easeIn(inv(cD - 0.3, cD + 0.6, t));
  const brainO = ramp(t, -0.2, 0.5) * (1 - ramp(t, cD + 0.2, cD + 0.7));
  const synO = ramp(t, cD + 0.05, cD + 0.6) * (1 - ramp(t, d - 0.4, d + 0.2));
  const [vx, vy] = regionXY('vta', bp);
  const [cx, cy] = regionXY('caudate', bp);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Atmos t={t + 20} hue="cool" rays={0.7} />
      <Dust t={t} cam={{z: t * 120, yaw: yaw * 0.2}} n={160} color={PAL.ice} />
      <Layer o={brainO} z={1 + 3.5 * toSyn} ox={vx} oy={vy}>
        <Svg>
          <Brain
            t={t}
            {...bp}
            activity={0.25 + 0.55 * ramp(t, cE - 0.2, cE + 0.6)}
            regions={{vta: ramp(t, cA - 0.1, cA + 0.4), caudate: ramp(t, cN - 0.1, cN + 0.4), accumbens: ramp(t, cN + 0.3, cN + 0.9)}}
            dopamine={ramp(t, cN + 0.2, cD)}
          />
        </Svg>
        <Label x={vx} y={vy} tx={vx + 60} ty={vy + 330} text="ÁREA TEGMENTAL" sub="VENTRAL · RECOMPENSA" color={PAL.gold} p={inv(cA - 0.05, cA + 0.7, t) * (1 - ramp(t, cD - 0.4, cD))} align="right" />
        <Label x={cx} y={cy} tx={cx - 40} ty={cy - 330} text="NÚCLEO CAUDADO" sub="MOTIVACIÓN" color={PAL.rose} p={inv(cN - 0.05, cN + 0.7, t) * (1 - ramp(t, cD - 0.4, cD))} align="left" />
      </Layer>
      <Layer o={synO} z={lerp(0.55, 1, easeOut(inv(cD, cD + 1.2, t))) * (1 + 0.04 * Math.sin(t))}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(80% 60% at 50% 45%, #1a0b3a, #05030c)'}} />
        <Synapse t={t} ap={inv(cD, cD + 1.1, t)} release={inv(cD + 0.7, cS + 0.8, t)} others={ramp(t, cS - 0.2, cS + 0.5)} bind={inv(cI - 0.2, cAn + 0.6, t)} />
      </Layer>
      <Title text="DOPAMINA" p={inv(cD, cD + 0.6, t)} out={inv(cS - 0.4, cS, t)} y={250} size={92} spacing={10} glow={PAL.gold} />
      <Title text="no actúa sola" p={inv(cS - 0.2, cS + 0.5, t)} out={inv(cI + 0.2, cI + 0.6, t)} y={270} size={70} serif glow={PAL.cyan} spacing={0} />
      <Title text="MOTIVACIÓN" p={inv(cMo, cMo + 0.5, t)} out={inv(d - 0.6, d - 0.2, t)} y={190} size={58} spacing={7} glow={PAL.gold} />
      <Title text="DESEO" p={inv(cDe, cDe + 0.4, t)} out={inv(d - 0.6, d - 0.2, t)} y={270} size={58} spacing={7} glow={PAL.rose} />
      <Title text="ANTICIPACIÓN" p={inv(cAn, cAn + 0.5, t)} out={inv(d - 0.6, d - 0.2, t)} y={350} size={58} spacing={7} glow={PAL.cyan} />
      <div style={{position: 'absolute', inset: 0, background: '#fff3e0', opacity: 0.85 * (1 - ramp(t, 0, 0.45))}} />
    </div>
  );
};

// =====================================================================================
// ESCENA 3 — EL CORAZÓN SE ACELERA: sistema simpático → corazón → manos → estómago
// =====================================================================================
export const S3: React.FC<SP> = ({t, d, tg}) => {
  const cSi = cue(3, 'simpático');
  const cAd = cue(3, 'adrenalina');
  const cPu = cue(3, 'pulso');
  const cMa = cue(3, 'manos');
  const cEs = cue(3, 'estómago');
  const cMp = cue(3, 'mariposas');
  const cCo = cue(3, 'corazón');
  const cSe = cue(3, 'señales');
  const ph = heartPhase(tg);
  const p = ph - Math.floor(ph);
  const beatK = Math.exp(-Math.pow((p - 0.16) / 0.07, 2));
  // cuerpo (inicio)
  const body1 = 1 - ramp(t, cPu, cPu + 0.4);
  const zHeart = 1 + 4 * easeIn(inv(cPu - 0.4, cPu + 0.4, t));
  const heartO = ramp(t, cPu - 0.05, cPu + 0.35) * (1 - ramp(t, cMa - 0.2, cMa + 0.15));
  const handO = ramp(t, cMa - 0.2, cMa + 0.15) * (1 - ramp(t, cEs - 0.25, cEs + 0.1));
  const stoO = ramp(t, cEs - 0.25, cEs + 0.1) * (1 - ramp(t, cCo - 0.35, cCo));
  const body2 = ramp(t, cCo - 0.35, cCo);
  const bpm = bpmAt(tg);
  const bodyProps = {
    t,
    phase: ph,
    spine: inv(cSi - 0.3, cSi + 1.0, t),
    chain: ramp(t, cSi + 0.2, cSi + 1.0),
    adrenal: ramp(t, cAd - 0.1, cAd + 0.5),
    blood: ramp(t, cAd + 0.3, cAd + 1.4),
    heartGlow: 0.5 + 0.5 * ramp(t, cAd, cPu),
    stomach: 0.3,
    hands: 0,
    brainGlow: 0.5 + 0.5 * ramp(t, 0.5, 1.5),
  };
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Atmos t={t + 40} hue="cool" rays={0.5} />
      <Layer o={body1} z={zHeart * (1 + 0.04 * inv(0, cPu, t))} ox={ORG.heart[0]} oy={ORG.heart[1]}>
        <Dust t={t} n={90} color={PAL.cyan} />
        <Body {...bodyProps} reveal={inv(0.1, 1.6, t)} />
        <Label x={500} y={760} tx={60} ty={640} text="SISTEMA NERVIOSO" sub="SIMPÁTICO" color={PAL.gold} p={inv(cSi - 0.1, cSi + 0.7, t) * (1 - ramp(t, cAd - 0.3, cAd))} />
        <Label x={ORG.adrenalR[0]} y={ORG.adrenalR[1]} tx={1030} ty={1290} text="SUPRARRENALES" sub="ADRENALINA · NORADRENALINA" color={PAL.coral} p={inv(cAd - 0.1, cAd + 0.6, t)} align="right" />
      </Layer>
      <Layer o={heartO} z={lerp(1.25, 1, easeOut(inv(cPu - 0.1, cPu + 0.8, t)))}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(70% 55% at 50% 45%, #3a0618, #070208)'}} />
        <Glow x={540} y={880} r={620} color="#ff2850" o={0.5 + 0.5 * beatK} />
        <Svg>
          <Heart t={t} phase={ph} x={540 + noise1(t * 20) * 6 * beatK} y={880} scale={1.12} rot={-14} glow={1} />
          <ECG t={t} phase={ph} x={100} y={1520} w={880} h={150} color="#7dffb8" history={3} />
        </Svg>
        <div style={{position: 'absolute', top: 210, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_SANS, color: '#fff'}}>
          <div style={{fontSize: 150, fontWeight: 900, lineHeight: 1, textShadow: `0 0 40px ${rgba('#ff3a5a', 0.9)}`, transform: `scale(${1 + 0.06 * beatK})`}}>{Math.round(bpm)}</div>
          <div style={{fontSize: 30, fontWeight: 800, letterSpacing: 8, opacity: 0.8, marginTop: 6}}>LATIDOS POR MINUTO</div>
        </div>
        <div style={{position: 'absolute', top: 1600, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_SANS, fontSize: 24, letterSpacing: 4, color: rgba('#ffffff', 0.55)}}>VALORES ILUSTRATIVOS</div>
      </Layer>
      <Layer o={handO} z={lerp(1.2, 1, easeOut(inv(cMa - 0.2, cMa + 1.5, t)))}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(70% 60% at 50% 50%, #3a1a2a, #07040a)'}} />
        <Glow x={540} y={950} r={700} color={PAL.coral} o={0.6} />
        <SweatyHand t={t} sweat={inv(cMa, cEs - 0.2, t)} x={540} y={1020} scale={1.15} />
      </Layer>
      <Layer o={stoO} z={lerp(1.3, 1, easeOut(inv(cEs - 0.25, cEs + 1.2, t)))}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(70% 60% at 50% 50%, #0a2a2a, #030608)'}} />
        <Svg>
          <defs>
            <radialGradient id="stoG" cx="0.45" cy="0.55" r="0.7">
              <stop offset="0%" stopColor={PAL.teal} stopOpacity={0.45} />
              <stop offset="100%" stopColor={PAL.teal} stopOpacity={0.08} />
            </radialGradient>
            <clipPath id="stoClip">
              <path d={STOMACH} />
            </clipPath>
          </defs>
          <path d={STOMACH} fill="url(#stoG)" stroke={PAL.teal} strokeWidth={5} />
          <path d={STOMACH} fill="none" stroke={rgba(PAL.teal, 0.25)} strokeWidth={26} />
          <g clipPath="url(#stoClip)">
            {Array.from({length: 11}, (_, i) => (
              <path key={i} d={`M${300 + i * 55},${720 + i * 30} C${330 + i * 50 + Math.sin(t * 2 + i) * 20},${900 + i * 20} ${360 + i * 45},${1050 + i * 10} ${420 + i * 40},${1250 - i * 5}`} stroke={rgba(PAL.teal, 0.4)} strokeWidth={6} fill="none" />
            ))}
          </g>
          <text x={760} y={1380} fill={rgba('#ffffff', 0.6)} fontFamily="Montserrat" fontWeight={800} fontSize={30} letterSpacing={6} textAnchor="middle">ESTÓMAGO</text>
        </Svg>
        <Butterflies t={t} amount={ramp(t, cEs + 0.2, cMp + 0.2)} cx={600} cy={1000} radius={360} n={34} />
        <Title text="mariposas" p={inv(cMp, cMp + 0.6, t)} y={330} size={78} serif glow={PAL.teal} spacing={0} />
      </Layer>
      <Layer o={body2} z={lerp(1.15, 1, easeOut(inv(cCo - 0.3, cCo + 1.5, t)))}>
        <Dust t={t} n={90} color={PAL.cyan} />
        <Body {...bodyProps} reveal={1} heartGlow={1} stomach={0.6} hands={0.4} link={ramp(t, cCo + 0.2, cCo + 1)} brainGlow={1} />
        <Title text="EL CORAZÓN RESPONDE" p={inv(cSe - 0.6, cSe + 0.2, t)} out={inv(d - 0.4, d, t)} y={1560} size={52} spacing={4} glow={PAL.rose} />
      </Layer>
    </div>
  );
};

// =====================================================================================
// ESCENA 4 — NO PUEDES DEJAR DE PENSAR: atención selectiva, memoria y anticipación
// =====================================================================================
const STOMACH = 'M430,520 L452,690 C330,676 250,800 270,960 C292,1140 440,1300 620,1310 C770,1318 870,1240 910,1160 L1000,1150 L1000,1060 L890,1070 C850,1130 770,1160 690,1140 C570,1110 528,1000 548,880 C560,800 548,720 520,690 L500,520 Z';
const THOUGHTS = ['TAREAS', 'TRABAJO', 'CORREOS', 'COMPRAS', 'CLASE', 'SERIE', 'GIMNASIO', 'FACTURAS'];

const Card: React.FC<{x: number; y: number; z: number; ry: number; rx?: number; w?: number; h?: number; glow: number; o: number; blur?: number; children: React.ReactNode}> = ({
  x,
  y,
  z,
  ry,
  rx = 0,
  w = 300,
  h = 200,
  glow,
  o,
  blur = 0,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      transform: `translateZ(${z}px) rotateY(${ry}deg) rotateX(${rx}deg)`,
      opacity: o,
      filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      borderRadius: 28,
      background: `linear-gradient(135deg, ${rgba('#ffffff', 0.16 + 0.1 * glow)}, ${rgba('#ffffff', 0.04)})`,
      border: `2px solid ${rgba(glow > 0.1 ? PAL.gold : '#ffffff', 0.35 + 0.5 * glow)}`,
      boxShadow: `0 0 ${20 + 80 * glow}px ${rgba(PAL.gold, 0.6 * glow)}, inset 0 0 40px ${rgba('#ffffff', 0.05)}`,
      overflow: 'hidden',
      fontFamily: FONT_SANS,
      color: '#fff',
    }}
  >
    {children}
  </div>
);

export const S4: React.FC<SP> = ({t, d}) => {
  const cAt = cue(4, 'atención');
  const cRe = cue(4, 'recompensa');
  const cEm = cue(4, 'emoción');
  const cMe = cue(4, 'memoria');
  const cRc = cue(4, 'recuerdo');
  const cMs = cue(4, 'mensaje');
  const cPo = cue(4, 'posible');
  const cBr = cue(4, 'brilla');
  const sel = ramp(t, cAt - 0.2, cAt + 0.8);
  const partA = 1 - ramp(t, cRe - 0.5, cRe - 0.1);
  const brainO = ramp(t, cRe - 0.5, cRe - 0.1) * (1 - ramp(t, cRc - 0.5, cRc - 0.1));
  const cardsO = ramp(t, cRc - 0.5, cRc - 0.1);
  const bp = {x: 540, y: 960, scale: 0.98, yaw: 0.15 + 0.1 * Math.sin(t * 0.5)};
  const [ax, ay] = regionXY('accumbens', bp);
  const [mx, my] = regionXY('amygdala', bp);
  const [hx, hy] = regionXY('hippo', bp);
  const bright = ramp(t, cBr - 0.1, cBr + 0.6);
  const orbit = t * 0.5;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Atmos t={t + 60} hue="cool" rays={0.5} />
      <Layer o={partA} z={1 + 0.05 * t}>
        <Dust t={t} n={110} color={PAL.violet} />
        <Svg>
          <Person who="A" x={330} y={1240} scale={0.82} t={t} rim={0.9} smile={0.35 * sel} rimColor={PAL.ice} shade={0.3} />
        </Svg>
        {/* pensamientos orbitando en 3D (perspectiva CSS real) */}
        <div style={{position: 'absolute', inset: 0, perspective: 1400, transformStyle: 'preserve-3d'}}>
          {THOUGHTS.map((name, i) => {
            const a = orbit + (i / THOUGHTS.length) * Math.PI * 2;
            const x = 560 + Math.cos(a) * 360;
            const z = Math.sin(a) * 420;
            const y = 520 + ((i * 97) % 300) + Math.sin(t + i) * 20;
            return (
              <Card key={i} x={x} y={y} z={z} ry={-Math.cos(a) * 35} w={250} h={120} glow={0} o={(0.75 - 0.6 * sel) * (0.6 + 0.4 * clamp((z + 420) / 840))} blur={sel * 7}>
                <div style={{padding: '40px 0', textAlign: 'center', fontWeight: 800, letterSpacing: 4, fontSize: 28, opacity: 0.8}}>{name}</div>
              </Card>
            );
          })}
          <Card x={600} y={lerp(700, 640, sel)} z={lerp(-300, 260, easeInOut(sel))} ry={lerp(25, -6, sel)} w={340} h={420} glow={sel} o={0.4 + 0.6 * sel}>
            <svg width={340} height={420}>
              <defs>
                <radialGradient id="cardBg" cx="0.5" cy="0.35">
                  <stop offset="0%" stopColor="#ff9a6a" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#2a0f30" stopOpacity={0.9} />
                </radialGradient>
              </defs>
              <rect width={340} height={420} fill="url(#cardBg)" />
              <Person who="B" x={150} y={340} scale={0.5} flip t={t} smile={0.9} rim={1.2} />
            </svg>
          </Card>
        </div>
        {/* cono de atención */}
        <div
          style={{
            position: 'absolute',
            left: 260,
            top: 0,
            width: 700,
            height: 1100,
            opacity: 0.45 * sel,
            background: `linear-gradient(180deg, ${rgba(PAL.gold, 0.0)} 0%, ${rgba(PAL.gold, 0.35)} 100%)`,
            clipPath: 'polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)',
            filter: 'blur(18px)',
            mixBlendMode: 'screen',
          }}
        />
        <Title text="ATENCIÓN SELECTIVA" p={inv(cAt, cAt + 0.7, t)} out={inv(cRe - 0.6, cRe - 0.2, t)} y={1520} size={56} spacing={5} glow={PAL.gold} />
      </Layer>
      <Layer o={brainO} z={1 + 0.05 * inv(cRe, cRc, t)}>
        <Dust t={t} n={110} color={PAL.ice} />
        <Svg>
          <Brain t={t} {...bp} activity={0.5} glass={0.7} regions={{accumbens: ramp(t, cRe - 0.1, cRe + 0.4), vta: ramp(t, cRe, cRe + 0.5), amygdala: ramp(t, cEm - 0.1, cEm + 0.4), hippo: ramp(t, cMe - 0.1, cMe + 0.4)}} />
        </Svg>
        <Label x={ax} y={ay} tx={150} ty={560} text="RECOMPENSA" color={PAL.gold} p={inv(cRe - 0.1, cRe + 0.6, t)} />
        <Label x={mx} y={my} tx={160} ty={1400} text="EMOCIÓN" color={PAL.rose} p={inv(cEm - 0.1, cEm + 0.6, t)} />
        <Label x={hx} y={hy} tx={930} ty={1300} text="MEMORIA" color={PAL.cyan} p={inv(cMe - 0.1, cMe + 0.6, t)} align="right" />
      </Layer>
      <Layer o={cardsO}>
        <Dust t={t} n={140} color={PAL.gold} />
        <Glow x={540} y={900} r={600 + 300 * bright} color={PAL.gold} o={0.3 + 0.7 * bright} />
        <div style={{position: 'absolute', inset: 0, perspective: 1300}}>
          {[
            {c: cRc, x: 330, y: 620, ry: 18, rx: 4, kind: 0},
            {c: cMs, x: 720, y: 900, ry: -18, rx: -3, kind: 1},
            {c: cPo, x: 380, y: 1220, ry: 14, rx: -4, kind: 2},
          ].map((k, i) => {
            const pop = easeOut(inv(k.c - 0.1, k.c + 0.5, t));
            const fl = Math.sin(t * 1.2 + i * 2) * 14;
            return (
              <Card key={i} x={k.x} y={k.y + fl} z={lerp(-600, 0, pop) + 120 * bright} ry={k.ry * (1 - 0.4 * bright)} rx={k.rx} w={420} h={300} glow={0.3 + 0.7 * bright} o={pop}>
                {k.kind === 0 && (
                  <svg width={420} height={300}>
                    <defs>
                      <radialGradient id="mem0" cx="0.6" cy="0.4">
                        <stop offset="0%" stopColor="#ffb36b" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#3a1030" stopOpacity={0.95} />
                      </radialGradient>
                    </defs>
                    <rect width={420} height={300} fill="url(#mem0)" />
                    {[0, 1, 2, 3, 4, 5].map((j) => (
                      <circle key={j} cx={40 + j * 70} cy={60 + (j % 2) * 50} r={22 + (j % 3) * 8} fill="#ffe0b0" opacity={0.25} />
                    ))}
                    <Person who="B" x={250} y={280} scale={0.36} flip t={t} smile={1} rim={1.3} />
                    <Person who="A" x={80} y={290} scale={0.36} t={t} smile={1} rim={1.3} />
                  </svg>
                )}
                {k.kind === 1 && (
                  <div style={{padding: 34}}>
                    <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 4, opacity: 0.6}}>NUEVO MENSAJE</div>
                    <div style={{marginTop: 22, display: 'inline-block', padding: '18px 26px', borderRadius: 26, background: rgba(PAL.rose, 0.85), fontSize: 36, fontWeight: 800}}>¿Nos vemos mañana?</div>
                    <div style={{marginTop: 22, display: 'flex', gap: 12}}>
                      {[0, 1, 2].map((j) => (
                        <div key={j} style={{width: 18, height: 18, borderRadius: 9, background: '#fff', opacity: 0.3 + 0.7 * clamp(Math.sin(t * 6 - j)) }} />
                      ))}
                    </div>
                  </div>
                )}
                {k.kind === 2 && (
                  <div style={{padding: 34, textAlign: 'center'}}>
                    <div style={{fontSize: 24, fontWeight: 800, letterSpacing: 6, opacity: 0.65}}>EL PRÓXIMO ENCUENTRO</div>
                    <div style={{fontSize: 70, fontWeight: 900, marginTop: 18, textShadow: `0 0 30px ${PAL.gold}`}}>SÁBADO</div>
                    <div style={{fontSize: 40, fontWeight: 800, letterSpacing: 6, color: PAL.gold}}>7:00 PM</div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Layer>
    </div>
  );
};

// =====================================================================================
// ESCENA 5 — EL ABRAZO: contacto afectivo, hipotálamo y oxitocina
// =====================================================================================
const Arm: React.FC<{d: string; skin: string; sleeve: string; rim: string; hand: [number, number]; rot: number; o?: number}> = ({d, skin, sleeve, rim, hand, rot, o = 1}) => (
  <g opacity={o}>
    <path d={d} stroke={sleeve} strokeWidth={96} fill="none" strokeLinecap="round" />
    <path d={d} stroke={rim} strokeWidth={100} fill="none" strokeLinecap="round" opacity={0.18} />
    <g transform={`translate(${hand[0]},${hand[1]}) rotate(${rot}) scale(0.8)`}>
      <path d="M-46,30 C-60,-10 -50,-40 -30,-52 L36,-52 C52,-40 58,-6 46,32 C30,52 -30,52 -46,30 Z" fill={skin} />
      {[-30, -10, 10, 30].map((fx, i) => (
        <path key={i} d={`M${fx},-46 C${fx + 2},${-90 - (i === 1 || i === 2 ? 14 : 0)} ${fx + 10},${-120 - (i === 1 || i === 2 ? 14 : 0)} ${fx + 18},${-128 - (i === 1 || i === 2 ? 12 : 0)}`} stroke={skin} strokeWidth={21} strokeLinecap="round" fill="none" />
      ))}
      <path d="M-44,10 C-80,-10 -96,-40 -92,-62" stroke={skin} strokeWidth={22} strokeLinecap="round" fill="none" />
      <path d="M-46,30 C-60,-10 -50,-40 -30,-52" stroke={rim} strokeWidth={4} fill="none" opacity={0.7} />
      {[-30, -10, 10, 30].map((fx, i) => (
        <path key={'r' + i} d={`M${fx - 8},-60 C${fx - 6},-96 ${fx + 2},-120 ${fx + 10},-130`} stroke={rim} strokeWidth={3} fill="none" opacity={0.55} />
      ))}
    </g>
  </g>
);

const Couple: React.FC<{t: number; close: number; eyes: number; smile: number; rimA?: string; rimB?: string; apart?: number; turn?: number; armsO?: number; y?: number; headDown?: number}> = ({
  t,
  close,
  eyes,
  smile,
  rimA,
  rimB,
  apart = 0,
  turn = 0,
  armsO,
  y = 1150,
  headDown = 0,
}) => {
  const ax = lerp(230, 392, close) - 60 * apart;
  const bx = lerp(860, 700, close) + 330 * apart;
  const ar = armsO ?? clamp(close * 2 - 1) * (1 - apart * 2);
  // giro de B: escala horizontal pasa por 0 y cambia de lado
  const bFlip = turn < 0.5;
  return (
    <Svg>
      <Person who="B" x={bx} y={y} scale={0.72} flip={bFlip} t={t} tilt={6 * close * (1 - apart)} blink={eyes} smile={smile} rimColor={rimB} />
      <Arm d={`M${bx - 120},${y + 620} C${bx - 160},${y + 470} ${ax + 40},${y + 420} ${ax - 110},${y + 380}`} skin="#a86a52" sleeve="#24142e" rim={rimB ?? PAL.rose} hand={[ax - 128, y + 372]} rot={-100} o={ar} />
      <Person who="A" x={ax} y={y} scale={0.75} t={t} tilt={6 * close * (1 - apart) + 12 * headDown} blink={eyes} smile={smile} rimColor={rimA} />
      <Arm d={`M${ax + 120},${y + 640} C${ax + 170},${y + 470} ${bx - 20},${y + 440} ${bx + 120},${y + 400}`} skin="#9a6048" sleeve="#1b1530" rim={rimA ?? PAL.gold} hand={[bx + 138, y + 392]} rot={100} o={ar} />
    </Svg>
  );
};

export const S5: React.FC<SP> = ({t, d, tg}) => {
  const cAb = cue(5, 'abraza');
  const cCt = cue(5, 'contacto');
  const cOx = cue(5, 'oxitocina');
  const cCf = cue(5, 'confianza');
  const cPc = cue(5, 'poción');
  const cCe = cue(5, 'cerebro');
  const cCa = cue(5, 'calma');
  const close = easeInOut(inv(0.1, cAb + 0.5, t));
  const hug1 = 1 - ramp(t, cCt + 0.1, cCt + 0.6);
  const brainO = ramp(t, cCt + 0.1, cCt + 0.6) * (1 - ramp(t, cOx - 0.3, cOx + 0.1));
  const oxyO = ramp(t, cOx - 0.3, cOx + 0.1) * (1 - ramp(t, cCe - 0.5, cCe - 0.1));
  const hug2 = ramp(t, cCe - 0.5, cCe - 0.1);
  const ph = heartPhase(tg);
  const p = ph - Math.floor(ph);
  const beatK = Math.exp(-Math.pow((p - 0.16) / 0.09, 2));
  const bp = {x: 600, y: 880, scale: 1.45, yaw: 0.1};
  const [hx, hy] = regionXY('hypothal', bp);
  const shrink = easeInOut(inv(cPc - 0.1, cPc + 0.8, t));
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Atmos t={t + 80} hue="warm" rays={1} />
      <Layer o={hug1} z={1 + 0.08 * inv(0, cCt + 0.6, t)} oy={1000}>
        <Bokeh t={t} seed={8} slow={0.5} />
        <Glow x={545} y={1020} r={380 + 300 * close} color={PAL.gold} o={close * (0.7 + 0.3 * beatK)} />
        <Couple t={t} close={close} eyes={ramp(t, cAb + 0.2, cAb + 0.6)} smile={0.4 + 0.6 * close} />
        <Dust t={t * 0.4} n={120} color={PAL.gold} size={1.3} />
      </Layer>
      <Layer o={brainO} z={lerp(1.2, 1, easeOut(inv(cCt, cCt + 1.5, t)))}>
        <Dust t={t} n={110} color={PAL.gold} />
        <Svg>
          <Brain t={t} {...bp} tint="#ffb3a0" rim={PAL.gold} activity={0.35} glass={0.8} regions={{hypothal: ramp(t, cCt + 0.4, cCt + 0.9), pituitary: ramp(t, cCt + 0.8, cCt + 1.3)}} />
        </Svg>
        <Label x={hx} y={hy} tx={hx - 100} ty={hy + 420} text="HIPOTÁLAMO" sub="PRODUCE OXITOCINA" color={PAL.gold} p={inv(cCt + 0.4, cCt + 1.1, t)} align="left" />
      </Layer>
      <Layer o={oxyO}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(70% 55% at 50% 47%, #3a2010, #08040a)'}} />
        <Dust t={t} n={140} color={PAL.gold} />
        {/* otras señales: la oxitocina es una pieza más */}
        <Svg>
          {Array.from({length: 46}, (_, i) => {
            const r = rng(i + 3);
            const a = r() * 6.28 + t * 0.2 * (r() - 0.5);
            const rad = 260 + r() * 420;
            const o = shrink * (0.4 + 0.6 * r());
            const col = [PAL.cyan, PAL.rose, PAL.violet, PAL.teal][i % 4];
            return <circle key={i} cx={540 + Math.cos(a) * rad} cy={900 + Math.sin(a) * rad * 1.2} r={8 + r() * 14} fill={col} opacity={o * 0.8} />;
          })}
        </Svg>
        <Oxytocin t={t} x={540} y={900} scale={lerp(1.35, 0.6, shrink)} labels={1 - shrink} />
        <Title text="OXITOCINA" p={inv(cOx, cOx + 0.6, t)} out={inv(cCe - 0.6, cCe - 0.2, t)} y={230} size={96} spacing={10} glow={PAL.gold} />
        <Title text="CONFIANZA · VÍNCULOS" p={inv(cCf, cCf + 0.6, t)} out={inv(cPc - 0.6, cPc - 0.2, t)} y={1450} size={46} spacing={5} glow={PAL.rose} />
        <Title text="no es una poción mágica" p={inv(cPc, cPc + 0.6, t)} out={inv(cCe - 0.6, cCe - 0.2, t)} y={1440} size={62} serif glow={PAL.cyan} spacing={0} />
      </Layer>
      <Layer o={hug2} z={1.06 + 0.04 * inv(cCe, d, t)} oy={1000}>
        <Bokeh t={t} seed={8} slow={0.3} />
        <Glow x={545} y={1020} r={700} color={PAL.gold} o={0.8 + 0.2 * beatK} />
        <Couple t={t} close={1} eyes={1} smile={1} />
        <Dust t={t * 0.3} n={140} color={PAL.gold} size={1.4} />
        <Title text="calma y seguridad" p={inv(cCa, cCa + 0.6, t)} out={inv(d - 0.3, d, t)} y={300} size={70} serif glow={PAL.gold} spacing={0} />
      </Layer>
    </div>
  );
};

// =====================================================================================
// ESCENA 6 — EL AMOR TAMBIÉN DUELE: incertidumbre, estrés y rechazo
// =====================================================================================
const Crack: React.FC<{p: number; x: number; y: number; seed?: number}> = ({p, x, y, seed = 4}) => {
  const lines = React.useMemo(() => {
    const r = rng(seed);
    return Array.from({length: 9}, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + r() * 0.5;
      const pts: [number, number][] = [[x, y]];
      let px = x;
      let py = y;
      for (let k = 0; k < 6; k++) {
        const aa = a + (r() - 0.5) * 0.7;
        px += Math.cos(aa) * (25 + r() * 35);
        py += Math.sin(aa) * (25 + r() * 35);
        pts.push([px, py]);
      }
      return pts;
    });
  }, [x, y, seed]);
  if (p <= 0) return null;
  return (
    <Svg>
      {lines.map((pts, i) => {
        const n = Math.max(2, Math.ceil(pts.length * clamp(p * 1.3 - i * 0.03)));
        const d = pts.slice(0, n).map((q, k) => `${k ? 'L' : 'M'}${q[0]},${q[1]}`).join('');
        return (
          <g key={i}>
            <path d={d} stroke={rgba('#cfe6ff', 0.25)} strokeWidth={9} fill="none" />
            <path d={d} stroke="#eef6ff" strokeWidth={2.5} fill="none" />
          </g>
        );
      })}
    </Svg>
  );
};

export const S6: React.FC<SP> = ({t, d, tg}) => {
  const cDo = cue(6, 'doler');
  const cIn = cue(6, 'incertidumbre');
  const cEt = cue(6, 'estrés');
  const cRz = cue(6, 'rechazo');
  const cDe = cue(6, 'deseo');
  const cAn = cue(6, 'ansiedad');
  const cMa = cue(6, 'malestar');
  const cEn = cue(6, 'entonces');
  const cPq = cue(6, 'por');
  const apart = easeInOut(inv(0.4, cDo + 0.6, t));
  const turn = ramp(t, cDo - 0.4, cDo + 0.2);
  const cold = ramp(t, 0.2, cDo + 0.5);
  const coupleO = 1 - ramp(t, cRz - 0.4, cRz);
  const brainO = ramp(t, cRz - 0.4, cRz) * (1 - ramp(t, cEn - 0.4, cEn));
  const endO = ramp(t, cEn - 0.4, cEn);
  const ph = heartPhase(tg);
  const p = ph - Math.floor(ph);
  const beatK = Math.exp(-Math.pow((p - 0.16) / 0.08, 2));
  const stress = ramp(t, cEt - 0.2, cEt + 0.6);
  const bp = {x: 560, y: 930, scale: 1.0, yaw: -0.1 + 0.08 * Math.sin(t * 0.7)};
  const [dx, dy] = regionXY('accumbens', bp);
  const [ix, iy] = regionXY('insula', bp);
  const [gx, gy] = regionXY('acc', bp);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Atmos t={t + 100} hue="warm" rays={0.6 * (1 - cold)} />
      <div style={{position: 'absolute', inset: 0, opacity: cold}}>
        <Atmos t={t + 100} hue="cold" rays={0.5} />
      </div>
      <Layer o={coupleO} z={1 + 0.06 * inv(0, cRz, t)}>
        <Bokeh t={t} seed={8} slow={0.4} opacity={1 - 0.7 * cold} colors={[PAL.ice, '#6a8cff', '#9ab0ff', PAL.violet, '#ffffff']} />
        <Couple t={t} close={1} apart={apart} turn={turn} eyes={1 - ramp(t, 0.4, 1.0)} smile={lerp(0.9, 0, cold)} rimA={cold > 0.5 ? '#9fc4ff' : PAL.gold} rimB={cold > 0.5 ? '#9fc4ff' : PAL.rose} armsO={1 - ramp(t, 0.2, 0.9)} headDown={ramp(t, cIn, cIn + 1.2)} />
        {/* ondas de estrés alrededor de la cabeza */}
        <Svg>
          {[0, 1, 2, 3].map((k) => {
            const u = ((t * 0.9 + k / 4) % 1 + 1) % 1;
            return <circle key={k} cx={340} cy={1030} r={140 + u * 380} fill="none" stroke="#ff4d5e" strokeWidth={5} opacity={stress * (1 - u) * 0.8} />;
          })}
        </Svg>
        {/* mensaje sin respuesta: incertidumbre */}
        <div style={{position: 'absolute', left: 520, top: 520, opacity: window4(t, cIn - 0.2, cIn + 0.4, cRz - 0.6, cRz - 0.2), fontFamily: FONT_SANS, color: '#fff', transform: `translateY(${Math.sin(t * 1.5) * 10}px)`}}>
          <div style={{padding: '22px 30px', borderRadius: 28, background: rgba('#6a8cff', 0.85), fontSize: 42, fontWeight: 800, boxShadow: '0 0 40px rgba(106,140,255,0.6)'}}>¿Hablamos?</div>
          <div style={{marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: 3, opacity: 0.7, textAlign: 'right'}}>VISTO</div>
          <div style={{marginTop: 26, display: 'flex', gap: 12, opacity: window4(t, cIn + 0.6, cIn + 0.9, cEt + 0.6, cEt + 1.0)}}>
            {[0, 1, 2].map((j) => (
              <div key={j} style={{width: 20, height: 20, borderRadius: 10, background: '#fff', opacity: 0.3 + 0.7 * clamp(Math.sin(t * 6 - j))}} />
            ))}
          </div>
        </div>
        <Title text="ESTRÉS" p={inv(cEt, cEt + 0.5, t)} out={inv(cRz - 0.7, cRz - 0.3, t)} y={300} size={86} spacing={14} glow="#ff4d5e" />
      </Layer>
      <Layer o={brainO} z={lerp(1.15, 1, easeOut(inv(cRz - 0.4, cRz + 1.5, t)))}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(70% 55% at 50% 47%, #0c1430, #020308)'}} />
        <Dust t={t} n={110} color="#9fc4ff" />
        <Svg>
          <Brain t={t} {...bp} tint="#8fa8ff" rim="#ff5d6c" pain={1} activity={0.55} glass={0.7} regions={{accumbens: ramp(t, cDe - 0.1, cDe + 0.4), vta: ramp(t, cDe, cDe + 0.5), insula: ramp(t, cAn - 0.1, cAn + 0.4), acc: ramp(t, cMa - 0.1, cMa + 0.4)}} />
        </Svg>
        <Crack p={inv(cRz, cRz + 0.5, t)} x={560} y={700} />
        <Label x={dx} y={dy} tx={150} ty={1420} text="DESEO" color="#ffb36b" p={inv(cDe - 0.1, cDe + 0.6, t)} />
        <Label x={ix} y={iy} tx={930} ty={1330} text="ANSIEDAD" color="#ff5d6c" p={inv(cAn - 0.1, cAn + 0.6, t)} align="right" />
        <Label x={gx} y={gy} tx={150} ty={480} text="MALESTAR" sub="EMOCIONAL" color="#ff8fa0" p={inv(cMa - 0.1, cMa + 0.6, t)} />
      </Layer>
      <Layer o={endO}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(60% 45% at 50% 40%, #121a3a, #020206)'}} />
        <Glow x={540} y={720} r={300 + 60 * beatK} color={PAL.rose} o={0.5 + 0.3 * Math.sin(t * 2)} />
        <Dust t={t} n={150} color="#c8d8ff" />
        <Svg>
          <Person who="A" x={420} y={1450} scale={0.62} t={t} tilt={-6} rimColor={PAL.rose} rim={0.7 + 0.5 * ramp(t, cPq, cPq + 1)} shade={0.5} />
        </Svg>
        <Title text="¿Por qué seguimos buscándolo?" p={inv(cPq - 0.1, cPq + 0.9, t)} y={280} size={78} serif glow={PAL.rose} spacing={0} />
      </Layer>
      <Grade0 o={cold * 0.35} />
    </div>
  );
};
const Grade0: React.FC<{o: number}> = ({o}) => <div style={{position: 'absolute', inset: 0, background: '#1a3a8a', mixBlendMode: 'color', opacity: o}} />;

// =====================================================================================
// ESCENA 7 — EL AMOR CAMBIA: de la euforia a un vínculo estable
// =====================================================================================
const Bond: React.FC<{t: number; grow: number; o: number}> = ({t, grow, o}) => {
  const fibers = React.useMemo(() => {
    const r = rng(19);
    return Array.from({length: 34}, (_, i) => ({c1: [(r() - 0.5) * 300, (r() - 0.5) * 520] as [number, number], c2: [(r() - 0.5) * 300, (r() - 0.5) * 520] as [number, number], ph: r(), d: i / 34}));
  }, []);
  const L: [number, number] = [230, 960];
  const R: [number, number] = [850, 960];
  return (
    <Svg style={{opacity: o}}>
      <defs>
        <radialGradient id="bondSoma">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="40%" stopColor={PAL.gold} stopOpacity={0.8} />
          <stop offset="100%" stopColor={PAL.gold} stopOpacity={0} />
        </radialGradient>
      </defs>
      {fibers.map((f, i) => {
        const g = clamp(grow * 1.4 - f.d * 0.5);
        if (g <= 0) return null;
        const pts: [number, number][] = [];
        for (let k = 0; k <= 24; k++) {
          const u = (k / 24) * g;
          const x = (1 - u) ** 3 * L[0] + 3 * (1 - u) ** 2 * u * (L[0] + 200 + f.c1[0]) + 3 * (1 - u) * u * u * (R[0] - 200 + f.c2[0]) + u ** 3 * R[0];
          const y = (1 - u) ** 3 * L[1] + 3 * (1 - u) ** 2 * u * (L[1] + f.c1[1]) + 3 * (1 - u) * u * u * (R[1] + f.c2[1]) + u ** 3 * R[1];
          pts.push([x, y]);
        }
        const d = smoothPath(pts);
        const u = ((t * 0.25 + f.ph) % 1) * g;
        const idx = Math.floor(u * 24);
        const q = pts[Math.min(idx, pts.length - 1)];
        return (
          <g key={i}>
            <path d={d} stroke={rgba(i % 2 ? PAL.gold : PAL.teal, 0.25)} strokeWidth={9} fill="none" />
            <path d={d} stroke={i % 2 ? PAL.gold : PAL.teal} strokeWidth={2.5} fill="none" opacity={0.9} />
            {g > 0.95 && <circle cx={q[0]} cy={q[1]} r={7} fill="#fff" opacity={0.8} />}
          </g>
        );
      })}
      {[L, R].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={170 + 10 * Math.sin(t * 1.2 + i)} fill="url(#bondSoma)" />
          <circle cx={x} cy={y} r={40} fill="#fff" />
        </g>
      ))}
    </Svg>
  );
};

const Hill: React.FC<{t: number; p: number}> = ({t, p}) => {
  // ciclo de cielo en time-lapse: atardecer → noche → amanecer
  const k = p * 2;
  const sky = k < 1 ? [lerpC('#ffa065', '#c0507a', k), lerpC('#6a3a8a', '#1a1450', k)] : [lerpC('#c0507a', '#ff9a6a', k - 1), lerpC('#1a1450', '#4a3a8a', k - 1)];
  const night = 0.7 * (1 - Math.abs(k - 1));
  const stars = React.useMemo(() => {
    const r = rng(99);
    return Array.from({length: 160}, () => ({a: r() * 6.28, d: 80 + r() * 1300, s: 1 + r() * 2.5}));
  }, []);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${sky[1]} 0%, ${sky[0]} 75%)`}} />
      <Svg>
        {stars.map((s, i) => {
          const a = s.a + t * 0.12;
          return <circle key={i} cx={540 + Math.cos(a) * s.d} cy={300 + Math.sin(a) * s.d * 0.8} r={s.s} fill="#fff" opacity={night * (0.5 + 0.5 * Math.sin(t * 3 + i))} />;
        })}
        <circle cx={lerp(200, 900, p)} cy={1250 - Math.sin(p * Math.PI) * 300 + (k > 0.5 && k < 1.5 ? 600 : 0)} r={60} fill={k < 1 ? '#ffd9a0' : '#fff2d0'} opacity={1 - night} />
        <path d="M-50,1520 C200,1420 500,1400 700,1430 C900,1460 1050,1490 1150,1480 L1150,2000 L-50,2000 Z" fill="#0a0612" />
        <circle cx={540} cy={1050} r={520} fill={rgba('#ffb36b', 0.18 * (1 - night))} />
        {/* pareja de espaldas */}
        <g transform="translate(540,1300) scale(1.9)">
          <ellipse cx={-70} cy={60} rx={110} ry={120} fill="#0b0814" />
          <circle cx={-70} cy={-70} r={62} fill="#0b0814" />
          <path d="M-130,-90 C-120,-150 -20,-150 -10,-90" fill="#140c18" />
          <ellipse cx={70} cy={70} rx={100} ry={112} fill="#0b0814" />
          <g transform="rotate(-18 70 -40)">
            <circle cx={60} cy={-55} r={58} fill="#0b0814" />
            <path d="M0,-70 C10,-140 120,-140 120,-60 C130,0 120,60 100,90 L20,40 Z" fill="#160a12" />
          </g>
          <path d="M-130,-70 C-130,-140 -10,-140 -10,-70" fill="none" stroke={rgba('#ffc27a', 0.5 * (1 - night) + 0.2)} strokeWidth={4} />
          <path d="M5,-60 C10,-130 120,-140 120,-60" fill="none" stroke={rgba('#ff9ab8', 0.5 * (1 - night) + 0.2)} strokeWidth={4} transform="rotate(-18 70 -40)" />
        </g>
      </Svg>
    </>
  );
};
function lerpC(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp(t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export const S7: React.FC<SP> = ({t, d}) => {
  const cEu = cue(7, 'euforia');
  const cCl = cue(7, 'calmarse');
  const cCr = cue(7, 'crecer');
  const cAp = cue(7, 'apego');
  const cCf = cue(7, 'confianza');
  const cTr = cue(7, 'tranquilidad');
  const calm = ramp(t, cCl - 0.2, cCl + 1.4);
  const netO = 1 - ramp(t, cCr - 0.4, cCr);
  const bondO = ramp(t, cCr - 0.4, cCr) * (1 - ramp(t, cTr - 0.4, cTr));
  const hillO = ramp(t, cTr - 0.4, cTr);
  const camZ = 900 * t - 500 * Math.max(0, t - cCl) ** 1.2 * 0.6;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Atmos t={t + 120} hue="dawn" rays={0.6} />
      <Layer o={netO}>
        <div style={{position: 'absolute', inset: 0, background: '#05030c', opacity: 0.6}} />
        <NeuralField t={t} cam={{x: 0, y: 0, z: camZ, yaw: 0, pitch: 0, roll: t * 0.3 * (1 - calm), f: 900}} n={70} seed={33} depth={9000} spread={760} colors={calm > 0.5 ? [PAL.teal, PAL.gold, PAL.ice] : [PAL.rose, PAL.gold, PAL.coral]} fire={1} calm={calm} />
        <Title text="EUFORIA" p={inv(cEu, cEu + 0.5, t)} out={inv(cCl, cCl + 0.6, t)} y={300} size={90} spacing={12} glow={PAL.rose} />
      </Layer>
      <Layer o={bondO} z={1 + 0.06 * inv(cCr, cTr, t)}>
        <Dust t={t} n={120} color={PAL.gold} />
        <Bond t={t} grow={inv(cCr - 0.2, cTr - 0.2, t)} o={1} />
        <Title text="APEGO" p={inv(cAp, cAp + 0.5, t)} y={420} size={74} spacing={10} glow={PAL.gold} />
        <Title text="CONFIANZA" p={inv(cCf, cCf + 0.5, t)} y={1380} size={74} spacing={10} glow={PAL.teal} />
      </Layer>
      <Layer o={hillO} z={1.04 - 0.04 * inv(cTr, d, t)}>
        <Hill t={t} p={inv(cTr - 0.4, d + 0.4, t)} />
        <Title text="sentirte en casa" p={inv(cTr + 0.8, cTr + 1.6, t)} out={inv(d - 0.3, d, t)} y={360} size={74} serif glow={PAL.gold} spacing={0} />
      </Layer>
    </div>
  );
};

// =====================================================================================
// ESCENA 8 — FINAL: del cerebro al corazón y de vuelta a la pareja
// =====================================================================================
export const S8: React.FC<SP> = ({t, d, tg}) => {
  const cCo = cue(8, 'corazón');
  const cTo = cue(8, 'todo');
  const cHi = cue(8, 'historia');
  const cQu = cue(8, 'quién');
  const ph = heartPhase(tg);
  const p = ph - Math.floor(ph);
  const beatK = Math.exp(-Math.pow((p - 0.16) / 0.08, 2));
  const pull = easeInOut(inv(0, cCo + 0.4, t));
  const xray = 1 - ramp(t, cHi - 0.2, cHi + 0.6);
  const net = ramp(t, cTo - 0.2, cTo + 0.6) * xray;
  const y = 1000;
  // cabeza de A: centro aproximado; corazón en el pecho
  const aHead: [number, number] = [404, 896];
  const bHead: [number, number] = [684, 900];
  const aHeart: [number, number] = [420, 1420];
  const bHeart: [number, number] = [680, 1420];
  const endCard = ramp(t, d - 1.6, d - 0.9);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Atmos t={t + 140} hue="warm" rays={1} />
      <Layer o={1} z={lerp(4.2, 1, pull)} ox={aHead[0]} oy={aHead[1]}>
        <Bokeh t={t} seed={12} slow={0.4} opacity={0.6 + 0.4 * (1 - xray)} />
        <Glow x={545} y={960} r={760} color={PAL.gold} o={0.5 + 0.3 * beatK} />
        <Couple t={t} close={1} eyes={1} smile={1} y={y} />
        {/* rayos X: cerebro y corazón dentro de los cuerpos */}
        <div style={{position: 'absolute', inset: 0, opacity: xray}}>
          <Svg>
            <Brain t={t} x={aHead[0]} y={aHead[1]} scale={0.27} yaw={0} activity={0.8} glass={0.7} regions={{vta: 1, caudate: 0.8}} tint="#ffc8e0" rim={PAL.gold} />
            <Brain t={t + 3} x={bHead[0]} y={bHead[1]} scale={0.26} yaw={0} activity={0.8} glass={0.7} regions={{vta: 1, hypothal: 0.8}} tint="#ffc8e0" rim={PAL.rose} />
            {[aHeart, bHeart].map(([hx, hy], i) => (
              <g key={i} opacity={ramp(t, cCo - 0.5, cCo + 0.2)}>
                <circle cx={hx} cy={hy} r={110 + 30 * beatK} fill={rgba('#ff3a6a', 0.18 + 0.2 * beatK)} />
                <Heart t={t} phase={ph + i * 0.03} x={hx} y={hy} scale={0.24} rot={-14} hue="holo" glow={1} />
              </g>
            ))}
            {/* el cuerpo entero participa: red brillante cerebro ↔ corazón ↔ vientre */}
            {net > 0.01 &&
              [
                [aHead, aHeart],
                [bHead, bHeart],
                [aHeart, [430, 1640] as [number, number]],
                [bHeart, [670, 1640] as [number, number]],
                [aHeart, bHeart],
              ].map(([a, b], i) => {
                const pts: [number, number][] = [a, [(a[0] + b[0]) / 2 + (i === 4 ? 0 : 30), (a[1] + b[1]) / 2 + (i === 4 ? -60 : 0)], b];
                return (
                  <g key={i}>
                    <path d={smoothPath(pts)} stroke={rgba(PAL.gold, 0.6 * net)} strokeWidth={5} fill="none" />
                    {[0, 1, 2].map((k) => {
                      const u = ((t * 0.7 + k / 3 + i * 0.1) % 1 + 1) % 1;
                      const x = (1 - u) * (1 - u) * pts[0][0] + 2 * (1 - u) * u * pts[1][0] + u * u * pts[2][0];
                      const yy = (1 - u) * (1 - u) * pts[0][1] + 2 * (1 - u) * u * pts[1][1] + u * u * pts[2][1];
                      return <circle key={k} cx={x} cy={yy} r={9} fill="#fff" opacity={net} />;
                    })}
                  </g>
                );
              })}
          </Svg>
        </div>
        <Dust t={t * 0.4} n={140} color={PAL.gold} size={1.3} />
      </Layer>
      <Title text="No amas solo con el corazón" p={inv(cCo - 1.4, cCo + 0.2, t)} out={inv(cHi - 0.3, cHi + 0.2, t)} y={250} size={70} serif glow={PAL.rose} spacing={0} />
      <Title text="TODO TU CUERPO PARTICIPA" p={inv(cTo, cTo + 0.7, t)} out={inv(cQu - 0.4, cQu, t)} y={1560} size={46} spacing={5} glow={PAL.gold} />
      <Title text="¿Quién hizo latir así el tuyo?" p={inv(cQu - 0.1, cQu + 0.9, t)} y={250} size={80} serif glow={PAL.rose} spacing={0} />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 0.55 * endCard}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1480, textAlign: 'center', opacity: endCard, fontFamily: FONT_SANS, color: '#fff'}}>
        <div style={{fontSize: 52, fontWeight: 900, letterSpacing: 12, textShadow: `0 0 30px ${PAL.rose}`}}>MENTE EN SEGUNDOS</div>
        <div style={{marginTop: 18, fontSize: 30, fontWeight: 500, letterSpacing: 4, opacity: 0.8}}>Cuéntalo en los comentarios</div>
      </div>
    </div>
  );
};
