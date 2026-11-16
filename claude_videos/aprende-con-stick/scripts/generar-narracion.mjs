#!/usr/bin/env node
// Narración del episodio con Gemini TTS: un WAV por escena + src/episodes/<ep>/narracion.json
// con la duración REAL de cada escena y tiempos aproximados por palabra (para sincronizar
// las animaciones con lo que se dice).
//
//   node scripts/generar-narracion.mjs              → voz real (Gemini)
//   node scripts/generar-narracion.mjs --estimada   → sin voz: tiempos estimados (solo para previsualizar)
//
// Autenticación (la clave NUNCA se escribe en archivos ni se imprime):
//   - variable de entorno GEMINI_API_KEY, o
//   - secreto de red del entorno para generativelanguage.googleapis.com (el proxy inyecta la cabecera).
// Opcionales: EPISODIO=ep01  GEMINI_TTS_VOICE=Charon  GEMINI_TTS_MODEL=<modelo>  NARRACION_VELOCIDAD=1.0

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {alinearAudio, alinear, PAUSA} from './alinear.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EP = process.env.EPISODIO || 'ep01';
const EP_DIR = path.join(ROOT, 'src/episodes', EP);
const GUION = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'guion.json'), 'utf8'));
const OUT_JSON = path.join(EP_DIR, 'narracion.json');
const AUDIO_DIR = path.join(ROOT, 'public/audio/narracion', EP);
const CACHE = path.join(ROOT, '.tts-cache');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const VOZ = process.env.GEMINI_TTS_VOICE || 'Charon';
const VELOCIDAD = parseFloat(process.env.NARRACION_VELOCIDAD || '1.0');
const MODELOS_PREFERIDOS = [
  'gemini-2.5-pro-tts',
  'gemini-2.5-pro-preview-tts',
  'gemini-2.5-flash-tts',
  'gemini-2.5-flash-preview-tts',
];

const estimada = process.argv.includes('--estimada');
// Con secreto de red, el proxy sustituye este valor por la clave real.
const clave = () => process.env.GEMINI_API_KEY || 'inyectada-por-el-proxy';

async function pedir(url, body) {
  for (let intento = 0, esperas = 0; intento < 4; intento++) {
    let r;
    try {
      r = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': clave()},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** intento));
      continue;
    }
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    const msg = String(j?.error?.message || r.statusText).split('\n')[0];
    if (r.status === 429) {
      const retry = (j?.error?.details || []).find((d) => d.retryDelay)?.retryDelay;
      const seg = parseFloat(retry || (msg.match(/retry in ([\d.]+)s/) || [])[1] || '30');
      if (seg > 150 || ++esperas > 15) throw Object.assign(new Error(`429 sin cuota: ${msg.slice(0, 160)}`), {cuota: true});
      console.log(`    … límite por minuto, espero ${Math.ceil(seg + 2)} s`);
      await new Promise((ok) => setTimeout(ok, (seg + 2) * 1000));
      intento--;
      continue;
    }
    if (r.status >= 500) {
      await new Promise((ok) => setTimeout(ok, 3000 * 2 ** intento));
      continue;
    }
    throw Object.assign(new Error(`${r.status}: ${msg.slice(0, 200)}`), {status: r.status});
  }
  throw new Error('La API no respondió tras varios intentos');
}

async function modelos() {
  if (process.env.GEMINI_TTS_MODEL) return [process.env.GEMINI_TTS_MODEL];
  const j = await pedir(`${API}/models?pageSize=1000`);
  const tts = (j.models || []).map((m) => m.name.replace(/^models\//, '')).filter((m) => /tts/i.test(m));
  const orden = [...MODELOS_PREFERIDOS.filter((m) => tts.includes(m)), ...tts.filter((m) => !MODELOS_PREFERIDOS.includes(m)).sort().reverse()];
  if (!orden.length) throw new Error('La cuenta no expone modelos TTS');
  return orden;
}

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function sintetizar(modelo, texto) {
  const prompt = `${GUION.estiloVoz}. Lee en voz alta exactamente el siguiente texto, sin añadir ni omitir palabras:\n\n${texto}`;
  const j = await pedir(`${API}/models/${modelo}:generateContent`, {
    contents: [{parts: [{text: prompt}]}],
    generationConfig: {responseModalities: ['AUDIO'], speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: VOZ}}}},
  });
  const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('Respuesta sin audio');
  const mime = part.inlineData.mimeType || '';
  const pcm = Buffer.from(part.inlineData.data, 'base64');
  return /wav/i.test(mime) ? pcm : wav(pcm, parseInt((mime.match(/rate=(\d+)/) || [])[1] || '24000', 10));
}

const ffprobeDur = (f) =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

function silencios(file) {
  const txt = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=-38dB:d=0.14 -f null - 2>&1`]).toString();
  const out = [];
  let s = null;
  for (const l of txt.split('\n')) {
    const a = l.match(/silence_start: ([\d.]+)/);
    const b = l.match(/silence_end: ([\d.]+)/);
    if (a) s = parseFloat(a[1]);
    if (b && s !== null) out.push({start: s, end: parseFloat(b[1])}), (s = null);
  }
  return out;
}

function escenaDesdeAudio(e, file) {
  const dur = ffprobeDur(file);
  const sil = silencios(file);
  const ultimo = sil[sil.length - 1];
  const fin = ultimo && ultimo.end > dur - 0.05 ? ultimo.start : dur;
  const inicio = sil.length && sil[0].start < 0.03 ? sil[0].end : 0;
  const palabras = alinearAudio(e.texto, inicio, fin, sil);
  return {dur, palabras};
}

function escenaEstimada(e) {
  const words = e.texto.split(/\s+/).filter(Boolean);
  const peso = (w) => 0.33 + PAUSA(w) * 0.17;
  const habla = words.reduce((s, w) => s + peso(w), 0);
  const sil = [];
  let t = 0;
  words.forEach((w, i) => {
    t += peso(w);
    if (PAUSA(w) && i < words.length - 1) sil.push({start: t - PAUSA(w) * 0.17, end: t});
  });
  return {dur: habla, palabras: alinear(e.texto, 0, habla, sil)};
}

function guardar(escenas, meta) {
  let t = 0;
  const out = escenas.map(({e, dur, palabras, audio}) => {
    const duracion = +Math.max(e.minimo, e.pre + dur + e.post).toFixed(3);
    const r = {
      id: e.id,
      nombre: e.nombre,
      inicio: +t.toFixed(3),
      duracion,
      voz: {audio, inicio: e.pre, duracion: +dur.toFixed(3)},
      palabras: palabras.map((p) => ({w: p.w, start: +(p.start + e.pre).toFixed(3), end: +(p.end + e.pre).toFixed(3)})),
    };
    t += duracion;
    return r;
  });
  const data = {...meta, total: +t.toFixed(3), escenas: out};
  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2) + '\n');
  console.log(`✔ ${path.relative(ROOT, OUT_JSON)}: ${out.length} escenas, ${t.toFixed(2)} s (${meta.generadoCon})`);
  out.forEach((s) => console.log(`   escena ${s.id}: voz ${s.voz.duracion.toFixed(2)} s → escena ${s.duracion.toFixed(2)} s`));
  const [lo, hi] = GUION.duracionObjetivo;
  if (t < lo || t > hi) console.warn(`⚠ Duración ${t.toFixed(1)} s fuera del objetivo ${lo}–${hi} s: ajusta NARRACION_VELOCIDAD o los mínimos del guion.`);
}

async function main() {
  if (estimada) {
    guardar(GUION.escenas.map((e) => ({e, audio: null, ...escenaEstimada(e)})), {generadoCon: 'estimado', modelo: null, voz: null});
    return;
  }
  let lista;
  try {
    lista = await modelos();
  } catch (err) {
    console.error(`✖ No hay acceso a Gemini (${err.message}).`);
    console.error('  Define GEMINI_API_KEY o un secreto de red para generativelanguage.googleapis.com y vuelve a ejecutar.');
    process.exit(2);
  }
  fs.mkdirSync(AUDIO_DIR, {recursive: true});
  fs.mkdirSync(CACHE, {recursive: true});
  for (const modelo of lista) {
    try {
      console.log(`→ Modelo: ${modelo} · voz: ${VOZ} · velocidad ${VELOCIDAD}x`);
      const escenas = [];
      for (const e of GUION.escenas) {
        const key = crypto.createHash('sha1').update(`${modelo}|${VOZ}|${GUION.estiloVoz}|${e.texto}`).digest('hex').slice(0, 16);
        const crudo = path.join(CACHE, `${key}.wav`);
        if (!fs.existsSync(crudo)) {
          fs.writeFileSync(crudo, await sintetizar(modelo, e.texto));
          console.log(`  escena ${e.id}: sintetizada`);
        } else console.log(`  escena ${e.id}: desde caché`);
        const rel = `audio/narracion/${EP}/escena${e.id}.wav`;
        const file = path.join(ROOT, 'public', rel);
        // Recorta silencios de los extremos, normaliza el ritmo opcionalmente y deja 48 kHz mono.
        const filtros = [
          'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03',
          'areverse',
          'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.08',
          'areverse',
          ...(VELOCIDAD !== 1 ? [`atempo=${VELOCIDAD}`] : []),
          'highpass=f=70',
        ].join(',');
        execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', crudo, '-af', filtros, '-ar', '48000', '-ac', '1', file]);
        const {dur, palabras} = escenaDesdeAudio(e, file);
        const esperado = e.texto.split(/\s+/).length / 2.6;
        if (dur > esperado * 1.8) console.warn(`  ⚠ escena ${e.id}: ${dur.toFixed(1)} s, mucho más de lo esperado (${esperado.toFixed(1)} s). Revisa el audio.`);
        escenas.push({e, audio: rel, dur, palabras});
      }
      guardar(escenas, {generadoCon: 'gemini', modelo, voz: VOZ, velocidad: VELOCIDAD});
      return;
    } catch (err) {
      if (err.cuota || err.status === 404 || err.status === 400) {
        console.warn(`  ⚠ ${modelo}: ${err.message} → pruebo el siguiente modelo`);
        continue;
      }
      throw err;
    }
  }
  console.error('✖ Ningún modelo TTS respondió con audio.');
  process.exit(3);
}

main().catch((e) => {
  console.error(`✖ ${e.message}`);
  process.exit(1);
});
