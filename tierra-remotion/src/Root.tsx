import {Composition} from 'remotion';
import {Video} from './Video';
import {TOTAL_FRAMES} from './lib/timing';
export const RemotionRoot = () => (
  <Composition id="Tierra" component={Video} width={1080} height={1920} fps={30} durationInFrames={TOTAL_FRAMES} />
);
