// Fotogramas de revisión: node scripts/stills.mjs 1.0 3.2 ...  (segundos) → out/frames/
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const times = process.argv.slice(2).map(Number);
const scale = parseFloat(process.env.SCALE || '0.5');
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const chromiumOptions = {gl: 'swangle'};
const composition = await selectComposition({serveUrl, id: 'Tierra', browserExecutable, chromiumOptions});
fs.mkdirSync('out/frames', {recursive: true});
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * 30));
  const output = `out/frames/f_${t.toFixed(2)}.jpg`;
  await renderStill({composition, serveUrl, output, frame, scale, imageFormat: 'jpeg', jpegQuality: 85, browserExecutable, chromiumOptions});
  console.log(output);
}
