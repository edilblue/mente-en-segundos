// Genera la voz en off con Gemini TTS y la deja lista para Remotion.
//
//   GEMINI_API_KEY=... node scripts/narrate.mjs
//
// Opcionales: GEMINI_TTS_MODEL (por defecto el primer modelo "*tts*" disponible, prefiriendo flash),
//             GEMINI_VOICE (por defecto "Puck").
// Salida: public/audio/voz/<id>.wav + src/narration.generated.ts (tiempos reales de cada clip).
import {execFileSync} from 'node:child_process';
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

const manifest = [];
for (const line of VOICE_LINES) {
  const prompt =
    `Narra en español latinoamericano, con voz de YouTuber de curiosidades: rápida, clara, divertida y con mucha energía` +
    (line.style ? `, ${line.style}` : '') +
    `. Lee exactamente este texto: ${line.text}`;
  const body = {
    contents: [{parts: [{text: prompt}]}],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: VOICE}}},
    },
  };
  let data;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${API}/models/${MODEL}:generateContent`, {method: 'POST', headers, body: JSON.stringify(body)});
    if (r.ok) {
      const j = await r.json();
      const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) {
        data = part.inlineData;
        break;
      }
      console.warn(`  ${line.id}: respuesta sin audio, reintento ${attempt}`);
    } else {
      console.warn(`  ${line.id}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      if (r.status === 400 || r.status === 403) process.exit(1);
    }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
  }
  if (!data) throw new Error(`No se pudo generar la línea ${line.id}`);

  // PCM 16 bits mono (normalmente 24 kHz) → WAV, recortando silencios de los extremos.
  const rate = Number(/rate=(\d+)/.exec(data.mimeType ?? '')?.[1] ?? 24000);
  const raw = path.join('out', `voz_${line.id}.pcm`);
  fs.writeFileSync(raw, Buffer.from(data.data, 'base64'));
  const trimmed = path.join('out', `voz_${line.id}_trim.wav`);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw, '-af', trim, '-ar', '48000', trimmed]);
  let d = dur(trimmed);
  const final = path.join(outDir, `${line.id}.wav`);
  const fit = line.slot - 0.1;
  if (d > fit) {
    const tempo = Math.min(1.6, d / fit);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', trimmed, '-af', `atempo=${tempo.toFixed(3)}`, final]);
    console.log(`  ${line.id}: ${d.toFixed(2)} s → acelerada x${tempo.toFixed(2)} para caber en ${line.slot} s`);
  } else {
    fs.copyFileSync(trimmed, final);
    console.log(`  ${line.id}: ${d.toFixed(2)} s (cabe en ${line.slot} s)`);
  }
  d = dur(final);
  manifest.push({id: line.id, file: `audio/voz/${line.id}.wav`, start: line.start, duration: Number(d.toFixed(3))});
}

fs.writeFileSync(
  'src/narration.generated.ts',
  `// Generado por scripts/narrate.mjs (Gemini TTS: ${MODEL}, voz ${VOICE}). No editar a mano.\n` +
    `export const NARRATION: {id: string; file: string; start: number; duration: number}[] = ${JSON.stringify(manifest, null, 2)};\n`,
);
console.log(`Listo: ${manifest.length} clips en ${outDir} y src/narration.generated.ts`);
