// Fotogramas de revisión del Short de flamencos: node scripts/flamencos/frames.mjs 0.3 1.4 ...
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const secs = process.argv.slice(2).map(Number);
const out = path.resolve(process.env.FRAMES_DIR || 'out/frames-flamencos');
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_CHROME || null;
const composition = await selectComposition({serveUrl, id: 'Flamencos', browserExecutable});
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(out, `t${s.toFixed(2).replace('.', '_')}.png`);
  await renderStill({composition, serveUrl, frame, output, browserExecutable, scale: Number(process.env.SCALE || 0.5)});
  console.log('✔', output);
}
