// Exporta fotogramas clave como PNG para revisión: node scripts/stills.mjs [seg1 seg2 ...] [--scale=0.5] [--out=out/frames]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const scale = Number((args.find((a) => a.startsWith('--scale=')) ?? '--scale=1').split('=')[1]);
const outDir = (args.find((a) => a.startsWith('--out=')) ?? '--out=out/frames').split('=')[1];
const secs = args.filter((a) => !a.startsWith('--')).map(Number);
const times = secs.length ? secs : [3, 12, 22, 35, 44, 60, 72];
const browserExecutable =
  process.env.REMOTION_CHROME ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Short', browserExecutable});
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
  const output = path.join(outDir, `t${String(t).replace('.', '_')}s.png`);
  await renderStill({serveUrl, composition, frame, output, scale, browserExecutable});
  console.log('ok', output);
}
