import React from 'react';
import {C, clamp, lerp} from '../lib';
import {chalkStroke} from './Chalk';

/** Sello "MITO": tinta roja con bordes gastados. */
export const Stamp: React.FC<{x: number; y: number; scale: number; rot: number; opacity?: number; text?: string}> = ({x, y, scale, rot, opacity = 1, text = 'MITO'}) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${scale})`} opacity={opacity}>
    <g filter="url(#chalkFill)">
      <rect x={-250} y={-105} width={500} height={210} rx={26} fill="none" stroke={C.red} strokeWidth={22} />
      <rect x={-222} y={-78} width={444} height={156} rx={14} fill="none" stroke={C.red} strokeWidth={7} />
      <text x={0} y={52} textAnchor="middle" fontFamily="Black Ops One" fontSize={150} fill={C.red} letterSpacing={10}>
        {text}
      </text>
    </g>
  </g>
);

/** Botella de refresco GENÉRICA (recta, sin logo ni silueta registrada). Vertical; origen = punto de agarre. */
export const Bottle: React.FC<{s?: number; fizz?: number}> = ({s = 1, fizz = 0}) => (
  <g transform={`scale(${s})`}>
    <g transform="translate(0,-10)">
      <path d="M-20,60 L-20,-30 Q-20,-48 -9,-60 L-9,-88 L9,-88 L9,-60 Q20,-48 20,-30 L20,60 Q20,70 10,70 L-10,70 Q-20,70 -20,60 Z" {...chalkStroke(6)} fill="#3a2a22" />
      <rect x={-12} y={-98} width={24} height={12} rx={3} fill={C.chalk} />
      {/* etiqueta en blanco: solo una estrella genérica */}
      <rect x={-20} y={-8} width={40} height={34} fill={C.chalk} opacity={0.9} />
      <path d="M0,-2 L3,6 L11,6 L5,11 L7,19 L0,14 L-7,19 L-5,11 L-11,6 L-3,6 Z" fill={C.board} />
      <path d="M-11,-34 L-11,48" {...chalkStroke(4)} opacity={0.6} />
      {fizz > 0 &&
        [0, 1, 2, 3].map((i) => {
          const k = (fizz * 1.6 + i * 0.25) % 1;
          return <circle key={i} cx={(i % 2 ? 8 : -6) + Math.sin(k * 9) * 4} cy={-100 - k * 70} r={4 + i} {...chalkStroke(3)} fill="none" opacity={1 - k} />;
        })}
    </g>
  </g>
);

/** Banderita en un palo. `kind` dibuja una versión simplificada de la bandera. */
export const Flag: React.FC<{kind: 'uk' | 'ru' | 'de' | 'nl'; wave: number; s?: number}> = ({kind, wave, s = 1}) => {
  const w = 120;
  const h = 78;
  const id = React.useId().replace(/:/g, '');
  const d = `M0,0 Q${w * 0.25},${-8 + wave * 8} ${w * 0.5},0 T${w},0 L${w},${h} Q${w * 0.75},${h + 8 - wave * 8} ${w * 0.5},${h} T0,${h} Z`;
  const muted = (c: string) => c; // colores de tiza (pastel)
  let body: React.ReactNode = null;
  if (kind === 'ru')
    body = (
      <>
        <rect width={w} height={h / 3} fill="#f1efe8" />
        <rect y={h / 3} width={w} height={h / 3} fill={muted('#4f74c8')} />
        <rect y={(2 * h) / 3} width={w} height={h / 3} fill={muted('#d0473f')} />
      </>
    );
  if (kind === 'de')
    body = (
      <>
        <rect width={w} height={h / 3} fill="#2b2b2b" />
        <rect y={h / 3} width={w} height={h / 3} fill={muted('#d0473f')} />
        <rect y={(2 * h) / 3} width={w} height={h / 3} fill={muted('#e7c240')} />
      </>
    );
  if (kind === 'nl')
    body = (
      <>
        <rect width={w} height={h / 3} fill={muted('#d0473f')} />
        <rect y={h / 3} width={w} height={h / 3} fill="#f1efe8" />
        <rect y={(2 * h) / 3} width={w} height={h / 3} fill={muted('#4f74c8')} />
      </>
    );
  if (kind === 'uk')
    body = (
      <>
        <rect width={w} height={h} fill={muted('#36508f')} />
        <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke="#f1efe8" strokeWidth={16} />
        <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke={muted('#d0473f')} strokeWidth={5} />
        <path d={`M${w / 2},0 V${h} M0,${h / 2} H${w}`} stroke="#f1efe8" strokeWidth={24} />
        <path d={`M${w / 2},0 V${h} M0,${h / 2} H${w}`} stroke={muted('#d0473f')} strokeWidth={13} />
      </>
    );
  return (
    <g transform={`scale(${s})`}>
      <path d="M0,0 L0,-230" {...chalkStroke(8)} />
      <g transform="translate(4,-226)">
        <clipPath id={`fl${id}`}>
          <path d={d} />
        </clipPath>
        <g clipPath={`url(#fl${id})`} filter="url(#chalkFill)" transform={`skewY(${wave * 3})`}>
          {body}
        </g>
        <path d={d} {...chalkStroke(5)} opacity={0.8} />
      </g>
    </g>
  );
};

/** Lápiz grande de dibujante (origen en la mano, punta en la dirección del brazo). */
export const Pencil: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s})`}>
    <path d="M-14,-40 L14,-40 L14,90 L0,122 L-14,90 Z" {...chalkStroke(6)} fill={C.board} />
    <path d="M-14,90 L14,90" {...chalkStroke(5)} />
    <path d="M-5,112 L0,122 L5,112 Z" fill={C.chalk} />
    <rect x={-14} y={-58} width={28} height={18} rx={4} fill={C.chalk} opacity={0.8} />
  </g>
);

/** Pincel (origen en la mano, punta en la dirección del brazo). */
export const Brush: React.FC<{s?: number; color?: string}> = ({s = 1, color = C.red}) => (
  <g transform={`scale(${s})`}>
    <path d="M-6,-50 L6,-50 L5,70 L-5,70 Z" {...chalkStroke(5)} fill={C.board} />
    <path d="M-9,70 L9,70 L8,92 L-8,92 Z" fill={C.chalk} />
    <path d="M-9,92 Q0,140 9,92 Z" {...chalkStroke(4)} fill={color} />
  </g>
);

/** Paleta de pintor (en la mano izquierda). */
export const Palette: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s}) rotate(80)`}>
    <path d="M-60,0 C-60,-50 40,-60 60,-20 C75,10 40,20 20,10 C5,5 0,30 -20,35 C-50,45 -60,25 -60,0 Z" {...chalkStroke(6)} fill={C.board} />
    <circle cx={-30} cy={-10} r={10} fill={C.red} />
    <circle cx={0} cy={-28} r={9} fill={C.chalk} />
    <circle cx={30} cy={-24} r={9} fill={C.red} opacity={0.7} />
    <circle cx={-35} cy={20} r={8} fill={C.chalk} opacity={0.6} />
  </g>
);

/** Revista antigua abierta con cabecera genérica. Origen = centro. */
export const Magazine: React.FC<{w: number; h: number; p?: number; year?: string}> = ({w, h, p = 1, year = '1863'}) => {
  const e = clamp(p);
  return (
    <g opacity={e} transform={`scale(${lerp(0.85, 1, e)})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} {...chalkStroke(8)} fill="#22272c" />
      <rect x={-w / 2 + 22} y={-h / 2 + 22} width={w - 44} height={h - 44} {...chalkStroke(3)} fill="none" opacity={0.5} />
      <text x={0} y={-h / 2 + 92} textAnchor="middle" fontFamily="Cabin Sketch" fontWeight={700} fontSize={58} fill={C.chalk} letterSpacing={6}>
        LA REVISTA
      </text>
      <path d={`M${-w / 2 + 40},${-h / 2 + 116} H${w / 2 - 40}`} {...chalkStroke(5)} />
      <text x={-w / 2 + 44} y={-h / 2 + 150} fontFamily="Cabin Sketch" fontWeight={700} fontSize={30} fill={C.chalkDim}>
        Navidad · {year}
      </text>
      <text x={w / 2 - 44} y={-h / 2 + 150} textAnchor="end" fontFamily="Cabin Sketch" fontWeight={700} fontSize={30} fill={C.chalkDim}>
        10 ¢
      </text>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${w / 2 - 170},${h / 2 - 120 + i * 30} H${w / 2 - 50}`} {...chalkStroke(4)} opacity={0.4} />
      ))}
    </g>
  );
};

/** Caballete con lienzo. Origen = centro del lienzo. */
export const Easel: React.FC<{w: number; h: number}> = ({w, h}) => (
  <g>
    <path d={`M${-w * 0.3},${h / 2 + 200} L0,${-h / 2 - 40} L${w * 0.3},${h / 2 + 200} M0,${-h / 2 - 40} L0,${h / 2 + 180}`} {...chalkStroke(10)} />
    <path d={`M${-w / 2 - 20},${h / 2 + 18} H${w / 2 + 20}`} {...chalkStroke(14)} />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} {...chalkStroke(9)} fill="#20252a" />
  </g>
);

/** Contrato con firma garabateada. */
export const Contract: React.FC<{sign: number}> = ({sign}) => (
  <g>
    <path d="M-80,-105 L80,-105 L80,105 L-80,105 Z" {...chalkStroke(6)} fill="#22272c" />
    <text x={0} y={-62} textAnchor="middle" fontFamily="Cabin Sketch" fontWeight={700} fontSize={30} fill={C.chalk}>
      CONTRATO
    </text>
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M-55,${-30 + i * 22} H${i === 3 ? 20 : 55}`} {...chalkStroke(4)} opacity={0.55} />
    ))}
    <path
      d="M-55,72 c10,-30 20,20 30,-6 s14,-20 22,4 s12,10 22,-12 s10,14 26,4"
      {...chalkStroke(5, C.yellow)}
      strokeDasharray={200}
      strokeDashoffset={200 * (1 - clamp(sign))}
    />
  </g>
);

/** Cartel publicitario genérico: mini Santa rojo con botella. Origen = centro. */
export const Poster: React.FC<{s?: number; year?: number; tint?: number}> = ({s = 1, year, tint = 0}) => (
  <g transform={`scale(${s})`}>
    <rect x={-95} y={-130} width={190} height={260} rx={8} {...chalkStroke(6)} fill="#262b30" />
    <rect x={-80} y={-115} width={160} height={175} fill="#1d2125" stroke={C.chalkDim} strokeWidth={2} />
    {/* mini santa */}
    <g transform="translate(-6,40) scale(0.62)">
      <path d="M-50,-120 Q0,-135 50,-120 L70,40 Q0,55 -70,40 Z" fill={C.red} />
      <path d="M0,-125 V45" {...chalkStroke(12)} />
      <rect x={-66} y={-30} width={132} height={18} fill={C.ink} />
      <circle cx={0} cy={-175} r={48} {...chalkStroke(7)} fill="#5d636b" />
      <path d="M-46,-160 Q-50,-110 0,-100 Q50,-110 46,-160 Q0,-140 -46,-160 Z" fill={C.chalk} />
      <path d="M-46,-205 C-30,-260 20,-270 70,-245 C40,-235 45,-215 46,-205 Z" fill={C.red} />
      <rect x={-50} y={-215} width={100} height={18} rx={9} fill={C.chalk} />
      <circle cx={70} cy={-245} r={12} fill={C.chalk} />
      <circle cx={-15} cy={-180} r={7} fill={C.ink} />
      <circle cx={15} cy={-180} r={7} fill={C.ink} />
      <path d="M70,-60 L112,-110" {...chalkStroke(18, C.red)} />
      <rect x={100} y={-170} width={26} height={70} rx={8} {...chalkStroke(4)} fill="#3a2a22" />
    </g>
    {tint > 0 && <rect x={-80} y={-115} width={160} height={175} fill={C.red} opacity={0.15 * tint} />}
    <path d="M-70,82 H70 M-50,104 H50" {...chalkStroke(5)} opacity={0.6} />
    {year !== undefined && (
      <text x={70} y={-90} textAnchor="end" fontFamily="Cabin Sketch" fontWeight={700} fontSize={26} fill={C.yellow}>
        {year}
      </text>
    )}
  </g>
);

/** Globo terráqueo de tiza. */
export const Globe: React.FC<{r: number; spin: number}> = ({r, spin}) => {
  const id = React.useId().replace(/:/g, '');
  const off = ((spin % 1) + 1) % 1;
  return (
    <g>
      <clipPath id={`gl${id}`}>
        <circle r={r} />
      </clipPath>
      <circle r={r} {...chalkStroke(9)} fill="#22282d" />
      <g clipPath={`url(#gl${id})`} opacity={0.85}>
        {[-1, 0, 1].map((k) => (
          <g key={k} transform={`translate(${(k - off) * r * 2.4},0)`} fill={C.chalkDim}>
            <ellipse cx={-r * 0.45} cy={-r * 0.35} rx={r * 0.32} ry={r * 0.2} transform={`rotate(-20 ${-r * 0.45} ${-r * 0.35})`} />
            <ellipse cx={-r * 0.3} cy={r * 0.25} rx={r * 0.16} ry={r * 0.34} transform={`rotate(15 ${-r * 0.3} ${r * 0.25})`} />
            <ellipse cx={r * 0.35} cy={-r * 0.3} rx={r * 0.38} ry={r * 0.18} />
            <ellipse cx={r * 0.3} cy={r * 0.15} rx={r * 0.17} ry={r * 0.28} />
            <ellipse cx={r * 0.75} cy={r * 0.5} rx={r * 0.17} ry={r * 0.1} />
          </g>
        ))}
        <ellipse rx={r} ry={r * 0.3} {...chalkStroke(3)} fill="none" opacity={0.5} />
        <ellipse rx={r * 0.45} ry={r} {...chalkStroke(3)} fill="none" opacity={0.5} />
      </g>
    </g>
  );
};
