// Render cuadro a cuadro: Chromium (Playwright) → PNG → ffmpeg, y mezcla de audio.
// Uso: node render.mjs [--out ../output/nikki_promo_15s.mp4] [--stills 1,3.5,7,10.5,13.8] [--assets-json file.json]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = path.resolve(arg('out', path.join(here, '../output/nikki_promo_15s.mp4')));
const stills = arg('stills');
const assetsJson = arg('assets-json');
const FPS = 30;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() !== 'log') console.log('[page]', m.text()); });
if (assetsJson) {
  const A = JSON.parse(readFileSync(assetsJson, 'utf8'));
  await page.addInitScript((a) => { window.ASSETS = a; }, A);
}
await page.goto(pathToFileURL(path.join(here, 'index.html')).href);
await page.evaluate(() => window.READY);
const dur = await page.evaluate(() => window.DURATION);

if (stills) {
  mkdirSync(path.dirname(out), { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate((t) => renderAt(t), t);
    const f = out.replace(/\.mp4$/, '') + `_t${t.toFixed(2)}.png`;
    await page.screenshot({ path: f }); console.log(f);
  }
  await browser.close(); process.exit(0);
}

const silent = out.replace(/\.mp4$/, '.video.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const N = Math.round(dur * FPS);
for (let i = 0; i < N; i++) {
  await page.evaluate((t) => renderAt(t), i / FPS);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 30 === 0) process.stdout.write(`\rframe ${i}/${N}`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await browser.close();
console.log('\nvideo ok');

// Audio: narración (entra en 0.5 s) + música generada a −20 dB bajo la voz con ducking, normalizado a −14 LUFS.
const a = path.join(here, 'audio');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', path.join(a, 'narracion_leda.wav'), '-i', path.join(a, 'musica.wav'),
  '-filter_complex',
  '[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=500|500,apad,atrim=0:15,asplit=2[v][sc];' +
  '[2:a]aresample=48000,aformat=channel_layouts=stereo,volume=-19dB,atrim=0:15[m];' +
  '[m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=350[md];' +
  '[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9,afade=t=out:st=14.4:d=0.6,atrim=0:15,aresample=48000[aout]',
  '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', '15', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('listo:', out);
