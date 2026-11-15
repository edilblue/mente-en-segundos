import React from 'react';
import {C, SuitColor, dir, lerp} from '../lib';
import {chalkStroke} from './Chalk';

/**
 * Rig de stickman en tiza. Ángulos en grados medidos desde "hacia abajo";
 * positivo = hacia la derecha de la pantalla. Extremidades = [superior, flexión].
 */
export type Limb = [number, number];
export type Pose = {torso: number; head: number; armL: Limb; armR: Limb; legL: Limb; legR: Limb};

export const POSES = {
  stand: {torso: 0, head: 0, armL: [-22, -10], armR: [22, 10], legL: [-8, 0], legR: [8, 0]},
  hips: {torso: 0, head: 4, armL: [-55, 110], armR: [55, -110], legL: [-10, 0], legR: [10, 0]},
  wave: {torso: -3, head: -6, armL: [-22, -10], armR: [140, 35], legL: [-9, 0], legR: [9, 0]},
  cheer: {torso: -4, head: -10, armL: [-150, -15], armR: [150, 15], legL: [-12, 0], legR: [12, 0]},
  hit: {torso: 6, head: 14, armL: [-70, -40], armR: [70, 40], legL: [-18, 10], legR: [18, -10]},
  shrug: {torso: 0, head: 10, armL: [-75, 80], armR: [75, -80], legL: [-10, 0], legR: [10, 0]},
  wag: {torso: -4, head: -8, armL: [-50, 110], armR: [150, -25], legL: [-10, 0], legR: [10, 0]},
  point: {torso: -2, head: 6, armL: [-20, -10], armR: [95, 0], legL: [-9, 0], legR: [10, 0]},
  hold: {torso: -2, head: 2, armL: [-22, -10], armR: [60, 75], legL: [-9, 0], legR: [9, 0]},
  toast: {torso: -6, head: -10, armL: [-50, 105], armR: [150, 15], legL: [-10, 0], legR: [10, 0]},
  draw: {torso: 8, head: 16, armL: [-30, 20], armR: [70, 40], legL: [-10, 0], legR: [12, 0]},
  paint: {torso: 6, head: 10, armL: [-50, 90], armR: [105, 10], legL: [-12, 0], legR: [12, 0]},
  surprised: {torso: -8, head: -12, armL: [-140, 40], armR: [140, -40], legL: [-14, 0], legR: [14, 0]},
  crouch: {torso: 10, head: -4, armL: [-45, -30], armR: [45, 30], legL: [35, -80], legR: [-35, 80]},
  jump: {torso: -4, head: -8, armL: [-155, 0], armR: [155, 0], legL: [-20, 30], legR: [20, -30]},
} satisfies Record<string, Pose>;

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (x: number, y: number) => lerp(x, y, t);
  const ml = (x: Limb, y: Limb): Limb => [m(x[0], y[0]), m(x[1], y[1])];
  return {torso: m(a.torso, b.torso), head: m(a.head, b.head), armL: ml(a.armL, b.armL), armR: ml(a.armR, b.armR), legL: ml(a.legL, b.legL), legR: ml(a.legR, b.legR)};
};

/** Encadena poses con transición elástica (anticipación implícita por el overshoot). */
export const poseAt = (t: number, keys: [number, Pose][], trans = 0.26): Pose => {
  let p = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [at, next] = keys[i];
    if (t < at) break;
    const u = Math.min(1, (t - at) / trans);
    const e = 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * 0.14;
    p = mixPose(p, next, e);
  }
  return p;
};

/** Ciclo de caminata con rebote. Devuelve pose y elevación. */
export const walk = (t: number, speed = 2.2, base: Pose = POSES.stand): {pose: Pose; lift: number; squash: number} => {
  const ph = t * speed * Math.PI * 2;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  return {
    pose: {
      ...base,
      torso: base.torso + 3 + c * 2,
      head: base.head - 2,
      legL: [s * 28, Math.max(0, -c) * -40],
      legR: [-s * 28, Math.max(0, c) * -40],
      armL: base === POSES.stand ? [-20 - s * 26, -12] : base.armL,
      armR: base === POSES.stand ? [20 - s * 26, 12] : base.armR,
    },
    lift: Math.abs(Math.sin(ph)) * 16,
    squash: -Math.abs(Math.sin(ph)) * 0.04 + 0.02,
  };
};

export type Mouth = 'smile' | 'grin' | 'open' | 'o' | 'flat' | 'frown' | 'smirk';
export type Brow = 'none' | 'up' | 'worried' | 'angry' | 'flat' | 'raise';
export type FaceProps = {look?: [number, number]; blink?: number; wink?: number; mouth?: Mouth; mouthOpen?: number; brow?: Brow; eyeScale?: number; facing?: number};

export const blinkAt = (t: number, seed = 0) => {
  const period = 2.7 + (seed % 3) * 0.6;
  const ph = (t + seed * 0.41) % period;
  return ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
};

const L = {thigh: 82, shin: 82, torso: 132, upper: 70, lower: 66, headR: 66};

export type Paint = {from: SuitColor; to: SuitColor; p: number; dir?: 'up' | 'down'};

export type FigureProps = {
  x: number;
  ground: number;
  pose: Pose;
  kind?: 'santa' | 'plain';
  suit?: SuitColor;
  paint?: Paint; // transición de color del traje
  robe?: number; // 0 = abrigo corto, 1 = túnica larga hasta los tobillos
  lift?: number;
  squash?: number; // >0 aplasta, <0 estira
  scale?: number;
  rot?: number;
  flip?: boolean;
  face?: FaceProps;
  hatFlop?: number; // grados extra de la punta del gorro (movimiento secundario)
  beret?: boolean;
  mustache?: boolean;
  goatee?: boolean;
  outline?: number; // 0..1 contorno dibujándose (stroke reveal)
  fillOpacity?: number;
  propR?: React.ReactNode; // objeto en la mano derecha (coords locales de la mano)
  propL?: React.ReactNode;
  uprightR?: boolean; // el objeto de la mano derecha se mantiene vertical en pantalla
};

const add = (p: [number, number], v: [number, number], k: number): [number, number] => [p[0] + v[0] * k, p[1] + v[1] * k];
const poly = (...pts: [number, number][]) => 'M' + pts.map((p) => p.join(',')).join(' L');

export const Figure: React.FC<FigureProps> = ({
  x,
  ground,
  pose,
  kind = 'santa',
  suit = {main: C.green, dark: C.greenDark},
  paint,
  robe = 0,
  lift = 0,
  squash = 0,
  scale = 1,
  rot = 0,
  flip = false,
  face = {},
  hatFlop = 0,
  beret,
  mustache,
  goatee,
  outline = 1,
  fillOpacity = 1,
  propR,
  propL,
  uprightR,
}) => {
  const uid = React.useId().replace(/:/g, '');
  const santa = kind === 'santa';
  const sw = 11;
  // --- esqueleto (cadera en el origen)
  const hip: [number, number] = [0, 0];
  const kneeL = add(hip, dir(pose.legL[0]), L.thigh);
  const footL = add(kneeL, dir(pose.legL[0] + pose.legL[1]), L.shin);
  const kneeR = add(hip, dir(pose.legR[0]), L.thigh);
  const footR = add(kneeR, dir(pose.legR[0] + pose.legR[1]), L.shin);
  const legDrop = Math.max(footL[1], footR[1], 40);
  const up: [number, number] = [Math.sin((pose.torso * Math.PI) / 180), -Math.cos((pose.torso * Math.PI) / 180)];
  const neck = add(hip, up, L.torso);
  const sh = add(neck, up, -16);
  const elbowL = add(sh, dir(pose.armL[0]), L.upper);
  const handL = add(elbowL, dir(pose.armL[0] + pose.armL[1]), L.lower);
  const elbowR = add(sh, dir(pose.armR[0]), L.upper);
  const handR = add(elbowR, dir(pose.armR[0] + pose.armR[1]), L.lower);
  const headA = pose.torso + pose.head;
  const hu: [number, number] = [Math.sin((headA * Math.PI) / 180), -Math.cos((headA * Math.PI) / 180)];
  const head = add(neck, hu, L.headR - 2);

  // --- color del traje (con transición de pintura)
  const fillId = `suit${uid}`;
  const darkId = `suitD${uid}`;
  const fill = paint ? `url(#${fillId})` : suit.main;
  const fillDark = paint ? `url(#${darkId})` : suit.dark;
  const grad = (id: string, key: 'main' | 'dark') => {
    if (!paint) return null;
    const pp = Math.min(1, Math.max(0, paint.p));
    const down = paint.dir === 'down';
    // de abajo hacia arriba (up) o de arriba hacia abajo (down), con borde de pincel corto
    const a = down ? paint.to[key] : paint.from[key];
    const b = down ? paint.from[key] : paint.to[key];
    const off = down ? pp : 1 - pp;
    return (
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} y1={-460} x2={0} y2={230}>
        <stop offset={Math.max(0, off - 0.015)} stopColor={a} />
        <stop offset={Math.min(1, off + 0.015)} stopColor={b} />
      </linearGradient>
    );
  };

  const st = chalkStroke(sw);
  const dash = (len: number) => (outline < 1 ? {strokeDasharray: len, strokeDashoffset: len * (1 - outline)} : {});

  // --- abrigo / túnica en coords del torso (y hacia arriba = negativo)
  const coatBottom = lerp(40, 150, robe);
  const coatHalf = lerp(70, 80, robe);
  const coat = `M-46,${-L.torso + 14} Q0,${-L.torso + 2} 46,${-L.torso + 14} Q${coatHalf * 0.95},${-L.torso * 0.45} ${coatHalf},${coatBottom} Q0,${coatBottom + 14} ${-coatHalf},${coatBottom} Q${-coatHalf * 0.95},${-L.torso * 0.45} -46,${-L.torso + 14} Z`;

  const sleeve = (a: [number, number], b: [number, number], c: [number, number]) => (
    <g>
      <path d={poly(a, b, c)} {...chalkStroke(36)} {...dash(200)} />
      <path d={poly(a, b, c)} {...chalkStroke(25, santa ? fill : C.board)} opacity={fillOpacity} />
    </g>
  );

  return (
    <g transform={`translate(${x},${ground - lift}) scale(${scale}) scale(${flip ? -1 : 1},1) rotate(${rot}) scale(${1 + squash * 0.6},${1 - squash}) translate(0,${-legDrop})`}>
      <defs>
        {grad(fillId, 'main')}
        {grad(darkId, 'dark')}
      </defs>
      <g filter="url(#chalk)">
        {/* piernas y botas */}
        <path d={poly(hip, kneeL, footL)} {...st} {...dash(200)} />
        <path d={poly(hip, kneeR, footR)} {...st} {...dash(200)} />
        {santa && robe < 0.9 && (
          <>
            <ellipse cx={footL[0] - 8} cy={footL[1] - 4} rx={22} ry={13} {...chalkStroke(7)} fill={C.ink} />
            <ellipse cx={footR[0] + 8} cy={footR[1] - 4} rx={22} ry={13} {...chalkStroke(7)} fill={C.ink} />
          </>
        )}
        {/* brazo izquierdo (detrás del cuerpo) */}
        {santa ? sleeve(sh, elbowL, handL) : <path d={poly(sh, elbowL, handL)} {...st} {...dash(200)} />}
        {propL && <g transform={`translate(${handL[0]},${handL[1]}) rotate(${-(pose.armL[0] + pose.armL[1])})`}>{propL}</g>}
        {/* torso */}
        {santa ? (
          <g transform={`rotate(${pose.torso})`}>
            <path d={coat} fill={fill} opacity={fillOpacity} stroke="none" filter="url(#chalkFill)" />
            {/* sombra lateral en tiza */}
            <path d={`M${coatHalf * 0.35},${-L.torso + 30} L${coatHalf * 0.85},${coatBottom - 6}`} {...chalkStroke(18, fillDark)} opacity={0.75 * fillOpacity} />
            <path d={coat} {...chalkStroke(9)} {...dash(900)} />
            {/* ribete blanco, franja central y cinturón */}
            <path d={`M${-coatHalf + 4},${coatBottom - 4} Q0,${coatBottom + 8} ${coatHalf - 4},${coatBottom - 4}`} {...chalkStroke(18)} opacity={outline} />
            <path d={`M0,${-L.torso + 8} L0,${coatBottom}`} {...chalkStroke(13)} opacity={outline} />
            <rect x={-coatHalf + 4} y={-34} width={coatHalf * 2 - 8} height={20} rx={6} {...chalkStroke(6)} fill={C.ink} opacity={outline} />
            <rect x={-15} y={-38} width={30} height={28} rx={4} {...chalkStroke(6, C.chalk)} fill="none" opacity={outline} />
          </g>
        ) : (
          <path d={`M0,0 L${neck[0]},${neck[1]}`} {...st} {...dash(200)} />
        )}
        {/* brazo derecho */}
        {santa ? sleeve(sh, elbowR, handR) : <path d={poly(sh, elbowR, handR)} {...st} {...dash(200)} />}
        {santa && (
          <>
            <circle cx={handL[0]} cy={handL[1]} r={13} fill={C.chalk} opacity={outline} />
            <circle cx={handR[0]} cy={handR[1]} r={13} fill={C.chalk} opacity={outline} />
          </>
        )}
        {propR && <g transform={`translate(${handR[0]},${handR[1]}) rotate(${uprightR ? -rot : -(pose.armR[0] + pose.armR[1])})`}>{propR}</g>}
        {/* cabeza */}
        <g transform={`translate(${head[0]},${head[1]}) rotate(${headA})`}>
          <circle r={L.headR} {...st} fill={santa ? '#585e66' : C.board} {...dash(400)} />
          {santa ? (
            <SantaHead r={L.headR} face={face} fill={fill} dark={fillDark} hatFlop={hatFlop} outline={outline} fillOpacity={fillOpacity} />
          ) : (
            <PlainHead r={L.headR} face={face} beret={beret} mustache={mustache} goatee={goatee} outline={outline} />
          )}
        </g>
      </g>
    </g>
  );
};

const DARK = C.boardDark;

const Eyes: React.FC<{r: number; face: FaceProps}> = ({r, face}) => {
  const {look = [0, 0], blink = 0, wink = 0, eyeScale = 1, facing = 0} = face;
  const fx = facing * r * 0.25;
  const ex = r * 0.34;
  const ey = -r * 0.16;
  const er = r * 0.19 * eyeScale;
  const eye = (cx: number, b: number, key: string) => {
    const ry = er * 1.25 * Math.max(0.08, 1 - b);
    if (b > 0.9) {
      // ojo cerrado / guiño: arco "^"
      return <path key={key} d={`M${cx - er},${ey + 2} Q${cx},${ey - er * 0.9} ${cx + er},${ey + 2}`} {...chalkStroke(7)} />;
    }
    return (
      <g key={key}>
        <ellipse cx={cx} cy={ey} rx={er} ry={ry} fill={C.chalk} />
        <circle cx={cx + look[0] * er * 0.45} cy={ey + look[1] * ry * 0.4} r={er * 0.5 * Math.min(1, ry / er)} fill={DARK} />
      </g>
    );
  };
  return (
    <>
      {eye(fx - ex, blink, 'l')}
      {eye(fx + ex, Math.max(blink, wink), 'r')}
    </>
  );
};

const Brows: React.FC<{r: number; brow: Brow; facing: number; w?: number; wink?: number}> = ({r, brow, facing, w = 9, wink = 0}) => {
  if (brow === 'none') return null;
  const fx = facing * r * 0.25;
  const ex = r * 0.34;
  const y = -r * 0.48;
  const tilt = {up: -4, worried: 12, angry: -14, flat: 0, raise: 0}[brow];
  const lift = {up: -10, worried: -4, angry: 4, flat: 0, raise: 0}[brow];
  const one = (side: -1 | 1) => {
    const cx = fx + side * ex;
    let l = lift;
    let tt = tilt;
    if (brow === 'raise') (l = side === -1 ? -14 : 2), (tt = side === -1 ? -8 : 0);
    if (side === 1 && wink > 0.5) l += 6;
    const inner = y + l + tt * 0.5;
    const outer = y + l - tt * 0.5;
    const xi = cx - side * r * 0.16;
    const xo = cx + side * r * 0.16;
    return <path key={side} d={`M${xi},${inner} L${xo},${outer}`} {...chalkStroke(w)} />;
  };
  return (
    <>
      {one(-1)}
      {one(1)}
    </>
  );
};

const MouthShape: React.FC<{x: number; y: number; w: number; type: Mouth; open?: number; color: string}> = ({x, y, w, type, open = 1, color}) => {
  const h = w * 0.5;
  const s = {fill: 'none', stroke: color, strokeWidth: 7, strokeLinecap: 'round' as const};
  switch (type) {
    case 'smile':
      return <path d={`M${x - w / 2},${y} Q${x},${y + h} ${x + w / 2},${y}`} {...s} />;
    case 'smirk':
      return <path d={`M${x - w / 2},${y + 4} Q${x + w * 0.1},${y + h * 0.6} ${x + w / 2},${y - h * 0.35}`} {...s} />;
    case 'grin':
      return <path d={`M${x - w / 2},${y - 2} Q${x},${y + h * 1.7 * open} ${x + w / 2},${y - 2} Z`} fill={color} stroke={color} strokeWidth={6} strokeLinejoin="round" />;
    case 'open':
      return <ellipse cx={x} cy={y + h * 0.4} rx={w * 0.3} ry={h * 0.8 * open + 3} fill={color} />;
    case 'o':
      return <circle cx={x} cy={y + h * 0.35} r={w * 0.17 * (0.6 + 0.4 * open)} fill={color} />;
    case 'flat':
      return <path d={`M${x - w * 0.36},${y + 6} L${x + w * 0.36},${y + 6}`} {...s} />;
    case 'frown':
      return <path d={`M${x - w / 2},${y + h * 0.6} Q${x},${y - h * 0.2} ${x + w / 2},${y + h * 0.6}`} {...s} />;
  }
};

/** Cabeza de Santa: barba de tiza, bigote, nariz, cejas pobladas y gorro del color del traje. */
const SantaHead: React.FC<{r: number; face: FaceProps; fill: string; dark: string; hatFlop: number; outline: number; fillOpacity: number}> = ({
  r,
  face,
  fill,
  dark,
  hatFlop,
  outline,
  fillOpacity,
}) => {
  const fx = (face.facing ?? 0) * r * 0.25;
  // barba: nube festoneada
  const beard = `M${-r * 0.96},${r * 0.02}
    C${-r * 1.04},${r * 0.6} ${-r * 0.78},${r * 0.98} ${-r * 0.48},${r * 1.08}
    Q${-r * 0.32},${r * 1.34} ${-r * 0.06},${r * 1.24}
    Q${r * 0.14},${r * 1.44} ${r * 0.34},${r * 1.2}
    Q${r * 0.6},${r * 1.2} ${r * 0.6},${r * 1.0}
    C${r * 0.9},${r * 0.86} ${r * 1.04},${r * 0.55} ${r * 0.96},${r * 0.02}
    L${r * 0.82},${r * 0.1} Q${r * 0.66},${r * 0.5} 0,${r * 0.46} Q${-r * 0.66},${r * 0.5} ${-r * 0.82},${r * 0.1} Z`;
  const tipX = r * 0.95 + hatFlop * 1.6;
  const tipY = -r * 1.95 + Math.abs(hatFlop) * 0.4;
  const hat = `M${-r * 0.92},${-r * 0.62} C${-r * 0.7},${-r * 1.7} ${r * 0.2},${-r * 2.0} ${tipX},${tipY} C${r * 0.7},${-r * 1.5} ${r * 0.9},${-r * 1.0} ${r * 0.92},${-r * 0.62} Z`;
  return (
    <g opacity={outline < 1 ? Math.min(1, outline * 1.3) : 1}>
      <Eyes r={r} face={face} />
      <Brows r={r} brow={face.brow ?? 'flat'} facing={face.facing ?? 0} w={12} wink={face.wink} />
      <path d={beard} fill={C.chalk} />
      {/* bigote */}
      <path
        d={`M${fx},${r * 0.3} Q${fx - r * 0.3},${r * 0.12} ${fx - r * 0.55},${r * 0.36} Q${fx - r * 0.28},${r * 0.52} ${fx},${r * 0.36} Q${fx + r * 0.28},${r * 0.52} ${fx + r * 0.55},${r * 0.36} Q${fx + r * 0.3},${r * 0.12} ${fx},${r * 0.3} Z`}
        fill={C.chalk}
        stroke={DARK}
        strokeWidth={3}
        opacity={0.95}
      />
      <MouthShape x={fx} y={r * 0.66} w={r * 0.5} type={face.mouth ?? 'smile'} open={face.mouthOpen} color={DARK} />
      {/* nariz */}
      <circle cx={fx} cy={r * 0.16} r={r * 0.15} {...chalkStroke(6)} fill={C.board} />
      {/* gorro */}
      <path d={hat} fill={fill} opacity={fillOpacity} filter="url(#chalkFill)" />
      <path d={`M${r * 0.15},${-r * 1.55} Q${r * 0.55},${-r * 1.5} ${tipX - 10},${tipY + 16}`} {...chalkStroke(12, dark)} opacity={0.7 * fillOpacity} />
      <path d={hat} {...chalkStroke(8)} />
      <rect x={-r * 1.04} y={-r * 0.82} width={r * 2.08} height={r * 0.36} rx={r * 0.18} fill={C.chalk} />
      <circle cx={tipX} cy={tipY} r={r * 0.24} fill={C.chalk} />
    </g>
  );
};

const PlainHead: React.FC<{r: number; face: FaceProps; beret?: boolean; mustache?: boolean; goatee?: boolean; outline: number}> = ({r, face, beret, mustache, goatee, outline}) => {
  const fx = (face.facing ?? 0) * r * 0.25;
  return (
    <g opacity={outline < 1 ? Math.min(1, outline * 1.3) : 1}>
      <Eyes r={r} face={face} />
      <Brows r={r} brow={face.brow ?? 'flat'} facing={face.facing ?? 0} />
      <MouthShape x={fx} y={r * 0.42} w={r * 0.5} type={face.mouth ?? 'smile'} open={face.mouthOpen} color={C.chalk} />
      {mustache && <path d={`M${fx - r * 0.42},${r * 0.36} Q${fx - r * 0.2},${r * 0.12} ${fx},${r * 0.26} Q${fx + r * 0.2},${r * 0.12} ${fx + r * 0.42},${r * 0.36}`} {...chalkStroke(11)} />}
      {goatee && <path d={`M${fx - r * 0.16},${r * 0.78} Q${fx},${r * 1.25} ${fx + r * 0.16},${r * 0.78}`} {...chalkStroke(6)} fill={C.chalk} />}
      {beret && (
        <g>
          <path d={`M${-r * 1.05},${-r * 0.5} C${-r * 1.2},${-r * 1.25} ${r * 0.9},${-r * 1.35} ${r * 1.15},${-r * 0.62} Q${0},${-r * 0.4} ${-r * 1.05},${-r * 0.5} Z`} {...chalkStroke(8)} fill={C.board} />
          <path d={`M${r * 0.05},${-r * 1.12} l4,-18`} {...chalkStroke(8)} />
        </g>
      )}
    </g>
  );
};
