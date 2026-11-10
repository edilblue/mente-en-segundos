// Fotogramas de revisión: node scripts/frames.mjs 1.5 4 9.8 ...  (segundos) → out/frames/*.jpg + hoja de contacto
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const times = process.argv.slice(2).filter((x) => !x.startsWith('--')).map(Number);
const scale = Number((process.argv.find((x) => x.startsWith('--scale=')) || '--scale=0.4').split('=')[1]);
const CHROME = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Enamorado', browserExecutable: CHROME});
fs.mkdirSync(path.join(ROOT, 'out/frames'), {recursive: true});
for (const s of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * 30));
  const output = path.join(ROOT, `out/frames/f_${s.toFixed(2).padStart(6, '0')}.jpeg`);
  await renderStill({serveUrl, composition, frame, output, imageFormat: 'jpeg', jpegQuality: 85, scale, browserExecutable: CHROME});
  console.log('✔', s, 's');
}
