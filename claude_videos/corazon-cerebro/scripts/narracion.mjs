#!/usr/bin/env node
// Narración con Gemini TTS: un WAV por escena + data/narracion.json con duraciones reales
// y tiempos aproximados de cada palabra (repartidos sobre los tramos con voz).
// La clave se lee SOLO de GEMINI_API_KEY; nunca se escribe en disco ni en el log.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/guion.json'), 'utf8'));
const API = 'https://generativelanguage.googleapis.com/v1beta';
const VOZ = process.env.GEMINI_TTS_VOICE || G.voz;
const PREFERIDOS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];
const AUDIO = path.join(ROOT, 'public/audio/voz');
const SOLO = process.argv.slice(2).map(Number).filter(Boolean);

if (!process.env.GEMINI_API_KEY) {
  console.error('Falta GEMINI_API_KEY');
  process.exit(2);
}

async function pedir(url, body) {
  for (let i = 0; i < 10; i++) {
    const r = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY},
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    const msg = j?.error?.message || r.statusText;
    if (r.status === 429 || r.status >= 500) {
      const seg = r.status === 429 ? 65 : 5 * 2 ** i;
      console.log(`  … ${r.status}, reintento en ${Math.ceil(seg)} s`);
      await new Promise((res) => setTimeout(res, (seg + 1) * 1000));
      continue;
    }
    throw new Error(`${r.status} ${msg.slice(0, 200)}`);
  }
  throw new Error('demasiados reintentos');
}

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function sintetizar(modelo, texto) {
  const j = await pedir(`${API}/models/${modelo}:generateContent`, {
    contents: [{parts: [{text: `${G.estilo}\n${texto}`}]}],
    generationConfig: {responseModalities: ['AUDIO'], speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: VOZ}}}},
  });
  const p = j?.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
  if (!p) throw new Error('respuesta sin audio');
  const rate = parseInt((p.inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || '24000', 10);
  const pcm = Buffer.from(p.inlineData.data, 'base64');
  return /wav/i.test(p.inlineData.mimeType) ? pcm : wav(pcm, rate);
}

const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
function silencios(f) {
  let t = '';
  try { t = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${f}" -af silencedetect=noise=-40dB:d=0.18 -f null - 2>&1`]).toString(); } catch (e) { t = String(e.stdout); }
  const out = []; let s = null;
  for (const l of t.split('\n')) {
    const a = l.match(/silence_start: ([\d.]+)/); const b = l.match(/silence_end: ([\d.]+)/);
    if (a) s = parseFloat(a[1]);
    if (b && s !== null) { out.push({start: s, end: parseFloat(b[1])}); s = null; }
  }
  return out;
}

function palabras(texto, d, sil) {
  const ws = texto.split(/\s+/).filter(Boolean);
  const segs = []; let t = 0;
  for (const s of sil) { if (s.start > t) segs.push([t, s.start]); t = Math.max(t, s.end); }
  if (d > t) segs.push([t, d]);
  const total = segs.reduce((a, [x, y]) => a + y - x, 0);
  const peso = (w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.5;
  const sum = ws.reduce((a, w) => a + peso(w), 0);
  const real = (v) => { for (const [x, y] of segs) { if (v <= y - x) return x + v; v -= y - x; } return d; };
  let acc = 0;
  return ws.map((w) => { const a = real((acc / sum) * total); acc += peso(w); return {w, t: +a.toFixed(3)}; });
}

async function main() {
  const modelos = [];
  const j = await pedir(`${API}/models?pageSize=1000`);
  const disp = (j.models || []).map((m) => m.name.replace('models/', ''));
  for (const m of PREFERIDOS) if (disp.includes(m)) modelos.push(m);
  const modelo = process.env.GEMINI_TTS_MODEL || modelos[0];
  console.log(`Modelo: ${modelo} · voz: ${VOZ}`);
  fs.mkdirSync(AUDIO, {recursive: true});
  const res = [];
  for (const e of G.escenas) {
    const key = crypto.createHash('sha1').update(`${modelo}|${VOZ}|${G.estilo}|${e.texto}`).digest('hex').slice(0, 16);
    const cache = path.join(ROOT, '.tts-cache', `${key}.wav`);
    if (!fs.existsSync(cache) || SOLO.includes(e.id)) {
      fs.mkdirSync(path.dirname(cache), {recursive: true});
      console.log(`  sintetizando escena ${e.id}…`);
      fs.writeFileSync(cache, await sintetizar(modelo, e.texto));
    }
    const out = path.join(AUDIO, `escena${e.id}.wav`);
    // recorta silencios de los extremos y normaliza a 48 kHz mono
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', cache, '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,silenceremove=stop_periods=-1:stop_duration=0.42:stop_threshold=-40dB',
      '-ar', '48000', '-ac', '1', out]);
    const d = dur(out);
    const sil = silencios(out);
    const n = e.texto.split(/\s+/).length;
    console.log(`  escena ${e.id}: ${d.toFixed(2)} s · ${n} palabras · ${(n / d).toFixed(2)} pal/s`);
    res.push({id: e.id, texto: e.texto, audio: `audio/voz/escena${e.id}.wav`, duracion: +d.toFixed(3), silencios: sil, palabras: palabras(e.texto, d, sil)});
  }
  fs.writeFileSync(path.join(ROOT, 'data/narracion.json'), JSON.stringify({modelo, voz: VOZ, escenas: res}, null, 1));
  console.log('Total voz:', res.reduce((a, e) => a + e.duracion, 0).toFixed(2), 's');
}
main().catch((e) => { console.error('✖', e.message); process.exit(1); });
