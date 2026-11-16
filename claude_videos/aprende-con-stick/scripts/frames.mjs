#!/usr/bin/env node
// Renderiza fotogramas de revisión (PNG) en out/frames/ sin re-empaquetar por cada uno.
//   node scripts/frames.mjs 1.2 3.5 10        → segundos absolutos
//   node scripts/frames.mjs --escena 2 0.5 3  → segundos relativos a la escena 2
//   node scripts/frames.mjs --hoja            → contacto: una imagen cada 2 s
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/episodes/ep01/narracion.json'), 'utf8'));
const args = process.argv.slice(2);
let base = 0;
let tiempos = [];
if (args[0] === '--escena') {
  base = N.escenas.find((e) => e.id === Number(args[1])).inicio;
  tiempos = args.slice(2).map(Number);
} else if (args[0] === '--hoja') {
  for (let s = 0.5; s < N.total; s += 2) tiempos.push(+s.toFixed(2));
} else tiempos = args.map(Number);
const sistema = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = process.env.REMOTION_CHROME || (fs.existsSync(sistema) ? sistema : null);
const out = path.join(ROOT, 'out/frames');
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'AprendeConStick-Ep01', browserExecutable});
for (const s of tiempos) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round((base + s) * 30));
  const file = path.join(out, `f_${String(frame).padStart(5, '0')}.png`);
  await renderStill({composition, serveUrl, output: file, frame, browserExecutable, scale: 0.5});
  console.log(file);
}
