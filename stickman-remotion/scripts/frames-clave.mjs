// Renderiza fotogramas clave para revisión: node scripts/frames-clave.mjs [seg1 seg2 ...]
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const secs = process.argv.slice(2).map(Number);
const lista = secs.length ? secs : [3, 12, 22, 32, 42, 58, 70];
const out = path.resolve('out/frames');
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_CHROME || null;
const composition = await selectComposition({serveUrl, id: 'Parte2', browserExecutable});
for (const s of lista) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(out, `t${String(s).replace('.', '_')}.png`);
  await renderStill({composition, serveUrl, frame, output, browserExecutable});
  console.log('✔', output);
}
