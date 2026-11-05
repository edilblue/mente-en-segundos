import React from 'react';
import {FONT} from '../theme';

export const Chip: React.FC<{color: string; children: React.ReactNode; style?: React.CSSProperties}> = ({color, children, style}) => (
  <div
    style={{
      fontFamily: FONT,
      fontSize: 40,
      letterSpacing: 3,
      color,
      padding: '12px 30px',
      borderRadius: 999,
      border: `4px solid ${color}`,
      background: 'rgba(8,6,30,0.75)',
      boxShadow: `0 0 24px ${color}, inset 0 0 18px ${color}55`,
      textShadow: `0 0 16px ${color}`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);
