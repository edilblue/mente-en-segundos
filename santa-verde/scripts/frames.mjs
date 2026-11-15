// Fotogramas de revisión: node scripts/frames.mjs 0 1 3.6 ...  → out/frames/tX.png
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const secs = process.argv.slice(2).map(Number);
const lista = secs.length ? secs : [0, 1, 4, 8, 13, 19, 23, 27, 31, 34.97];
const out = path.resolve('out/frames');
fs.mkdirSync(out, {recursive: true});
const browserExecutable = process.env.REMOTION_CHROME || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'SantaVerde', browserExecutable});
for (const s of lista) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(out, `f${String(frame).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, frame, output, browserExecutable, scale: Number(process.env.SCALE || 0.5)});
  console.log('✔', output);
}
