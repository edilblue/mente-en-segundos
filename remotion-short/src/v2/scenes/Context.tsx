import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AMBER, CYAN, PINK} from '../../theme';
import {Chip} from '../../components/Chip';
import {CaptionTrack} from '../components/CaptionTrack';
import {Person} from '../components/Person';
import {wordAt} from '../timeline';

export const Context: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = (at: number) => spring({frame: frame - at, fps, config: {damping: 9, stiffness: 200}});
  const enter = p(0);
  const name = p(wordAt('c1', 'Randy'));
  const age = p(wordAt('c1', '17'));
  const fair = p(wordAt('c1', 'feria'));
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${0.6 + 0.4 * enter})`}}>
        <Person width={440} />
      </div>
      <div style={{position: 'absolute', top: 390, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${name})`}}>
        <Chip color={CYAN} style={{fontSize: 52}}>RANDY GARDNER</Chip>
      </div>
      <div style={{position: 'absolute', top: 760, left: 80, transform: `scale(${age}) rotate(-6deg)`}}>
        <Chip color={PINK}>17 AÑOS</Chip>
      </div>
      <div style={{position: 'absolute', top: 900, right: 70, transform: `scale(${fair}) rotate(5deg)`}}>
        <Chip color={AMBER}>🔬 FERIA DE CIENCIAS</Chip>
      </div>
      <div style={{position: 'absolute', top: 1010, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${fair})`}}>
        <Chip color={CYAN} style={{fontSize: 32}}>SAN DIEGO · 1963–1964</Chip>
      </div>
      <CaptionTrack sceneId="context" />
    </AbsoluteFill>
  );
};
