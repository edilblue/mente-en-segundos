// Render final: video (Remotion, sin audio) + mezcla (build/mezcla.wav) → out/santa_verde_short.mp4
// (el MP4 final se recodifica a yuv420p de rango TV / BT.709, el estándar que espera YouTube)
//   node scripts/render.mjs        (requiere haber ejecutado scripts/narracion.mjs y scripts/audio.py)
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const browserExecutable = process.env.REMOTION_CHROME || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const mezcla = path.resolve('build/mezcla.wav');
if (!fs.existsSync(mezcla)) throw new Error('Falta build/mezcla.wav → python3 scripts/audio.py');
fs.mkdirSync('out', {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'SantaVerde', browserExecutable});
const video = path.resolve('build/video.mp4');
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: video,
  browserExecutable,
  muted: true,
  crf: 17,
  imageFormat: 'jpeg',
  jpegQuality: 95,
  pixelFormat: 'yuv420p',
  concurrency: Math.max(1, os.cpus().length),
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 20);
    if (p !== last) (last = p), process.stdout.write(`\r  render ${Math.round(progress * 100)}%`);
  },
});
console.log('');
const out = path.resolve('out/santa_verde_short.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', mezcla, '-map', '0:v:0', '-map', '1:a:0', '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '35', '-movflags', '+faststart', out]);
console.log('✔', path.relative(process.cwd(), out));
