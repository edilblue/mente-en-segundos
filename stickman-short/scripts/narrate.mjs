// Genera la voz en off con Gemini TTS y la deja lista para Remotion.
//
//   GEMINI_API_KEY=... node scripts/narrate.mjs
//
// Opcionales: GEMINI_TTS_MODEL (por defecto el primer modelo "*tts*" disponible, prefiriendo flash),
//             GEMINI_VOICE (por defecto "Puck").
// Salida: public/audio/voz/<id>.wav + src/narration.generated.ts (tiempos reales de cada clip).
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';

const KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
if (!KEY) {
  console.error('Falta GEMINI_API_KEY en el entorno.');
  process.exit(1);
}
const VOICE = process.env.GEMINI_VOICE ?? 'Puck';
const API = 'https://generativelanguage.googleapis.com/v1beta';
const headers = {'Content-Type': 'application/json', 'x-goog-api-key': KEY};

// Cargar las líneas desde src/narration.ts (una sola fuente de verdad).
const tmp = path.resolve('out/.narration.mjs');
fs.mkdirSync('out', {recursive: true});
await build({entryPoints: ['src/narration.ts'], outfile: tmp, format: 'esm', bundle: true, logLevel: 'silent'});
const {VOICE_LINES} = await import(tmp + '?t=' + Date.now());

async function pickModel() {
  if (process.env.GEMINI_TTS_MODEL) return process.env.GEMINI_TTS_MODEL;
  const r = await fetch(`${API}/models?pageSize=200`, {headers});
  if (!r.ok) throw new Error(`ListModels ${r.status}: ${await r.text()}`);
  const names = (await r.json()).models.map((m) => m.name.replace('models/', '')).filter((n) => n.includes('tts'));
  if (!names.length) throw new Error('No hay modelos TTS disponibles para esta clave.');
  names.sort((a, b) => (b.includes('flash') - a.includes('flash')) || b.localeCompare(a));
  return names[0];
}

const MODEL = await pickModel();
console.log(`Modelo: ${MODEL} · Voz: ${VOICE}`);

const outDir = 'public/audio/voz';
fs.mkdirSync(outDir, {recursive: true});
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TRIM =
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse';

/** Llama a Gemini TTS; respeta el retryDelay de los 429 y se detiene si la cuota diaria se agotó. */
async function tts(prompt) {
  const body = {
    contents: [{parts: [{text: prompt}]}],
    generationConfig: {responseModalities: ['AUDIO'], speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: VOICE}}}},
  };
  for (let attempt = 1; attempt <= 8; attempt++) {
    const r = await fetch(`${API}/models/${MODEL}:generateContent`, {method: 'POST', headers, body: JSON.stringify(body)});
    if (r.ok) {
      const part = (await r.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) return part.inlineData;
      console.warn('    respuesta sin audio, reintento');
      await sleep(3000);
      continue;
    }
    const txt = await r.text();
    if (r.status !== 429 && r.status < 500) throw new Error(`HTTP ${r.status}: ${txt.slice(0, 400)}`);
    let wait = 20;
    let quota = '';
    try {
      const det = JSON.parse(txt).error?.details ?? [];
      for (const d of det) {
        if (d.retryDelay) wait = parseFloat(d.retryDelay) + 2;
        for (const v of d.violations ?? []) quota += ` ${v.quotaId ?? ''}${v.quotaValue ? '=' + v.quotaValue : ''}`;
      }
    } catch {}
    if (/PerDay/i.test(quota)) throw new Error(`Cuota diaria agotada:${quota}`);
    console.warn(`    HTTP ${r.status}${quota ? ' [' + quota.trim() + ']' : ''}: espero ${wait.toFixed(0)} s`);
    await sleep(wait * 1000);
  }
  throw new Error('Demasiados reintentos');
}

function toWav(data, out) {
  const rate = Number(/rate=(\d+)/.exec(data.mimeType ?? '')?.[1] ?? 24000);
  const raw = out + '.pcm';
  fs.writeFileSync(raw, Buffer.from(data.data, 'base64'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw, '-af', TRIM, '-ar', '48000', out]);
  fs.rmSync(raw);
  return dur(out);
}

/**
 * Gemini TTS añade al final de cada clip ~0.1-0.2 s de ruido a volumen máximo
 * tras un silencio. Se recorta: desde el final, se salta el ruido fuerte y luego
 * el silencio, y se corta 120 ms después del último sonido de voz.
 */
function cleanTail(src, dst) {
  const sr = 48000;
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', src, '-f', 'f32le', '-ac', '1', '-ar', String(sr), '-'], {maxBuffer: 1 << 28});
  const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
  const win = sr / 100; // 10 ms
  const nf = Math.floor(x.length / win);
  const db = (i) => {
    let e = 0;
    for (let k = i * win; k < (i + 1) * win; k++) e += x[k] * x[k];
    return 10 * Math.log10(e / win + 1e-12);
  };
  let i = nf - 1;
  const limit = Math.max(0, nf - 60); // como mucho 0.6 s de cola
  while (i > limit && db(i) > -45) i--; // ruido final
  const noisy = nf - 1 - i;
  let j = i;
  while (j > 0 && db(j) < -50) j--; // silencio previo
  let end = x.length;
  if (noisy >= 3 && i - j >= 3) end = Math.min(x.length, (j + 1) * win + Math.round(0.12 * sr));
  const out = x.slice(0, end);
  const tmp = dst + '.f32';
  fs.writeFileSync(tmp, Buffer.from(out.buffer));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', tmp, '-c:a', 'pcm_s16le', dst]);
  fs.rmSync(tmp);
  return {cut: (x.length - end) / sr, noisy: noisy / 100};
}

const FADES = (d) => `afade=t=in:d=0.008,afade=t=out:st=${Math.max(0, d - 0.05).toFixed(3)}:d=0.05`;

/** Ajusta un clip a su hueco (acelera con atempo si hace falta). */
function fit(src, dst, slot, label) {
  const d = dur(src);
  const max = slot - 0.1;
  if (d > max) {
    const tempo = Math.min(1.5, d / max);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', `atempo=${tempo.toFixed(3)},${FADES(d / tempo)}`, dst]);
    console.log(`  ${label}: ${d.toFixed(2)} s → x${tempo.toFixed(2)} para caber en ${slot} s`);
  } else {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', FADES(d), dst]);
    console.log(`  ${label}: ${d.toFixed(2)} s (cabe en ${slot.toFixed(2)} s)`);
  }
  return Number(dur(dst).toFixed(3));
}

/** Silencios internos [inicio, fin] de un wav. */
function silenceList(f, minDur = 0.2) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', f, '-af', `silencedetect=n=-38dB:d=${minDur}`, '-f', 'null', '-'], {encoding: 'utf8'});
  const out = [];
  let st = null;
  for (const l of r.stderr.split('\n')) {
    const a = /silence_start: ([\d.]+)/.exec(l);
    const b = /silence_end: ([\d.]+)/.exec(l);
    if (a) st = Number(a[1]);
    if (b && st !== null) {
      out.push([st, Number(b[1])]);
      st = null;
    }
  }
  return out;
}

const manifest = [];
for (const line of VOICE_LINES) {
  const tag = JSON.stringify({t: line.text, v: VOICE, m: MODEL});
  const raw = path.join(outDir, `${line.id}_raw.wav`);
  const metaF = path.join(outDir, `${line.id}_raw.json`);
  if (fs.existsSync(raw) && fs.existsSync(metaF) && fs.readFileSync(metaF, 'utf8') === tag) {
    console.log(`  ${line.id}: en caché`);
  } else {
    // Solo el texto: con indicaciones de estilo el modelo a veces las lee en voz alta.
    const d = toWav(await tts(line.text), raw);
    const words = line.text.split(/\s+/).length;
    console.log(`  ${line.id}: generado ${d.toFixed(2)} s (${words} palabras)`);
    fs.writeFileSync(metaF, tag);
  }

  const cleanF = path.join(outDir, `${line.id}_clean.wav`);
  const c = cleanTail(raw, cleanF);
  if (c.cut > 0) console.log(`  ${line.id}: recortados ${c.cut.toFixed(2)} s de ruido final`);
  const n = line.parts.length;
  const total = dur(cleanF);
  let cuts = [0, total];
  if (n > 1) {
    const sil = silenceList(cleanF, 0.12).filter(([a, b]) => a > 0.15 && b < total - 0.15);
    const gaps = [...sil].sort((x, y) => y[1] - y[0] - (x[1] - x[0])).slice(0, n - 1).sort((x, y) => x[0] - y[0]);
    if (gaps.length === n - 1) cuts = [0, ...gaps.map(([a, b]) => (a + b) / 2), total];
    else console.warn(`  ${line.id}: no encontré ${n - 1} pausas; uso el clip entero en ${line.parts[0].start} s`);
  }
  const pieces = cuts.length - 1;
  for (let k = 0; k < pieces; k++) {
    const part = line.parts[k];
    const slot = (pieces === 1 ? line.parts[n - 1].end : part.end) - part.start;
    const seg = path.join(outDir, `${line.id}_${k}_seg.wav`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', cleanF, '-ss', cuts[k].toFixed(3), '-to', cuts[k + 1].toFixed(3), '-af', TRIM, seg]);
    const dst = path.join(outDir, `${line.id}_${k}.wav`);
    const d = fit(seg, dst, slot, `${line.id}.${k}`);
    fs.rmSync(seg);
    manifest.push({id: `${line.id}_${k}`, file: `audio/voz/${line.id}_${k}.wav`, start: part.start, duration: d});
  }
  fs.rmSync(cleanF);
}

fs.writeFileSync(
  'src/narration.generated.ts',
  `// Generado por scripts/narrate.mjs (Gemini TTS: ${MODEL}, voz ${VOICE}). No editar a mano.\n` +
    `export const NARRATION: {id: string; file: string; start: number; duration: number}[] = ${JSON.stringify(manifest, null, 2)};\n`,
);
console.log(`Listo: ${manifest.length} clips en ${outDir} y src/narration.generated.ts`);
