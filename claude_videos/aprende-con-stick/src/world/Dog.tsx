import React from 'react';
import {C} from '../lib/theme';

const OL = {stroke: C.ink, strokeWidth: 9, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

/**
 * Perro enorme (mira a la izquierda). Origen = base del cuello, a la altura del borde de la cerca.
 * bark 0..1 abre la mandíbula; anger 0..1 frunce las cejas.
 */
export const Dog: React.FC<{x: number; y: number; s?: number; bark?: number; anger?: number; t?: number; look?: number}> = ({
  x,
  y,
  s = 1,
  bark = 0,
  anger = 1,
  t = 0,
  look = 0,
}) => {
  const jaw = bark * 70;
  const tilt = -bark * 6 + Math.sin(t * 3) * 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* cuerpo (queda casi todo detrás de la cerca) */}
      <ellipse cx={60} cy={110} rx={210} ry={140} fill="#E3A05A" {...OL} />
      <g transform={`rotate(${tilt} 0 -40) translate(${-bark * 14} ${-bark * 10})`}>
        {/* orejas */}
        <path d="M 70 -270 C 150 -300 200 -230 175 -120 C 160 -70 110 -110 110 -170 Z" fill="#9B5E2E" {...OL}
          transform={`rotate(${Math.sin(t * 7) * 4 * bark} 90 -260)`} />
        {/* cabeza */}
        <path d="M -150 -170 C -150 -300 -40 -330 40 -310 C 140 -290 170 -200 150 -110 C 135 -40 70 -10 -10 -15 C -100 -20 -150 -80 -150 -170 Z" fill="#EDAE68" {...OL} />
        <path d="M -60 -300 C -110 -330 -180 -300 -175 -200 C -172 -160 -130 -150 -110 -190 Z" fill="#9B5E2E" {...OL} />
        {/* mancha */}
        <ellipse cx={70} cy={-230} rx={46} ry={38} fill="#D48C45" />
        {/* hocico */}
        <path d="M -95 -165 C -170 -175 -250 -150 -250 -95 C -250 -60 -200 -45 -150 -50 C -110 -55 -80 -80 -75 -110 Z" fill="#FFF1DC" {...OL} />
        {/* mandíbula + boca */}
        <g transform={`translate(0 ${jaw * 0.25})`}>
          <path
            d={`M -235 -85 C -230 ${-60 + jaw} -150 ${-30 + jaw} -95 ${-60 + jaw * 0.6} L -95 -80 Z`}
            fill="#7A1F2B"
            {...OL}
          />
          {bark > 0.15 && (
            <>
              <path d={`M -220 -84 L -210 -66 L -200 -84 M -130 -82 L -120 -64 L -110 -82`} fill={C.white} stroke={C.ink} strokeWidth={4} />
              <ellipse cx={-160} cy={-62 + jaw * 0.7} rx={34} ry={14 * bark} fill="#F2727F" />
            </>
          )}
        </g>
        {/* nariz */}
        <ellipse cx={-238} cy={-140} rx={30} ry={22} fill={C.ink} />
        <ellipse cx={-246} cy={-148} rx={9} ry={5} fill="#7D8597" />
        {/* ojos */}
        {[
          [-120, -215],
          [-35, -225],
        ].map(([ex, ey], i) => (
          <g key={i}>
            <ellipse cx={ex + look * 6} cy={ey} rx={17} ry={22} fill={C.ink} />
            <circle cx={ex + look * 6 - 5} cy={ey - 8} r={5} fill={C.white} />
            <path
              d={`M ${ex - 30} ${ey - 40 + (i === 0 ? anger * 14 : -anger * 4)} L ${ex + 28} ${ey - 40 + (i === 0 ? -anger * 4 : anger * 14)}`}
              {...OL}
              strokeWidth={13}
              fill="none"
            />
          </g>
        ))}
      </g>
      {/* collar */}
      <path d="M -110 -20 C -40 10 60 10 130 -30" fill="none" stroke={C.ink} strokeWidth={34} strokeLinecap="round" />
      <path d="M -110 -20 C -40 10 60 10 130 -30" fill="none" stroke={C.red} strokeWidth={20} strokeLinecap="round" />
      <circle cx={10} cy={16} r={18} fill={C.yellow} {...OL} strokeWidth={6} />
      {/* patas sobre la cerca */}
      {[-150, 120].map((px, i) => (
        <g key={i} transform={`translate(${px} ${30 + Math.sin(t * 16 + i * 2) * 6 * bark})`}>
          <ellipse cx={0} cy={0} rx={52} ry={34} fill="#F6D2A4" {...OL} />
          <line x1={-14} y1={8} x2={-14} y2={30} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
          <line x1={14} y1={8} x2={14} y2={30} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
};
