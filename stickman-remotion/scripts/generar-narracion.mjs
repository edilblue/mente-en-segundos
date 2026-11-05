#!/usr/bin/env node
// Genera la narración de la Parte 2 con el TTS de Gemini (un WAV por escena)
// y escribe src/data/narracion.json con la duración real de cada escena y los
// tiempos de cada palabra para sincronizar los subtítulos.
//
// Uso:
//   GEMINI_API_KEY=... node scripts/generar-narracion.mjs      → voz real
//   node scripts/generar-narracion.mjs --sin-voz               → tiempos estimados, sin audio
//
// La clave SOLO se lee de la variable de entorno GEMINI_API_KEY; nunca se guarda.
// Variables opcionales: GEMINI_TTS_MODEL (forzar modelo), GEMINI_TTS_VOICE (voz, por defecto "Puck").

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUION = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/guion.json'), 'utf8'));
const OUT_JSON = path.join(ROOT, 'src/data/narracion.json');
const AUDIO_DIR = path.join(ROOT, 'public/audio/narracion');
const TXT = path.join(ROOT, 'narracion.txt');
const API = 'https://generativelanguage.googleapis.com/v1beta';

// Orden de preferencia (el primero que exista en la cuenta gana). Se consulta
// /models en tiempo de ejecución, así que también detecta modelos TTS nuevos.
const MODELOS_PREFERIDOS = [
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-pro-tts',
  'gemini-2.5-flash-tts',
  'gemini-2.5-pro-preview-tts',
  'gemini-2.5-flash-preview-tts',
];
const VOZ = process.env.GEMINI_TTS_VOICE || 'Puck'; // "Upbeat": joven y enérgica

const sinVoz = process.argv.includes('--sin-voz');

// ---------------------------------------------------------------- narracion.txt
function escribirTxt() {
  const lineas = [
    '¿Qué pasaría si todas las personas del mundo saltaran al mismo tiempo? — PARTE 2',
    '¿Y si los animales también saltaran junto a las personas?',
    '',
    `Estilo de voz: ${GUION.estiloVoz}`,
    '',
    ...GUION.escenas.map((e) => `Escena ${e.id} — ${e.nombre}:\n${e.texto}\n`),
  ];
  fs.writeFileSync(TXT, lineas.join('\n'));
}

// ---------------------------------------------------------------- tiempos de palabras
const PAUSA = (w) => (/[…]$|\.\.\.$/.test(w) ? 3 : /[.!?:]$/.test(w) ? 2 : /[,;]$/.test(w) ? 1 : 0);
const peso = (w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length + (/\d/.test(w) ? 4 : 0)) + 1.2;

function repartir(words, t0, t1) {
  const total = words.reduce((s, w) => s + peso(w), 0);
  let t = t0;
  return words.map((w) => {
    const d = ((t1 - t0) * peso(w)) / total;
    const r = {w, start: +t.toFixed(3), end: +(t + d).toFixed(3)};
    t += d;
    return r;
  });
}

// Divide el texto en frases (cortes en puntuación) y reparte las palabras entre
// los tramos con voz detectados en el audio.
function alinear(texto, inicio, fin, silencios) {
  const words = texto.split(/\s+/).filter(Boolean);
  const cortes = []; // índice de palabra tras la cual hay pausa
  words.forEach((w, i) => i < words.length - 1 && PAUSA(w) > 0 && cortes.push(i));
  let elegidos = cortes;
  let sil = silencios.filter((s) => s.start > inicio + 0.05 && s.end < fin - 0.05);
  if (sil.length > cortes.length) {
    sil = [...sil].sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, cortes.length);
    sil.sort((a, b) => a.start - b.start);
  } else if (sil.length < cortes.length) {
    elegidos = [...cortes]
      .sort((a, b) => PAUSA(words[b]) - PAUSA(words[a]) || a - b)
      .slice(0, sil.length)
      .sort((a, b) => a - b);
  }
  const res = [];
  let desde = 0;
  let t = inicio;
  elegidos.forEach((c, k) => {
    res.push(...repartir(words.slice(desde, c + 1), t, sil[k].start));
    desde = c + 1;
    t = sil[k].end;
  });
  res.push(...repartir(words.slice(desde), t, fin));
  return res;
}

function estimarSinAudio(escena) {
  // ~2.9 palabras/s con pausas en la puntuación; se encaja dentro de la duración objetivo.
  const words = escena.texto.split(/\s+/);
  const habla = words.reduce((s, w) => s + 0.3 + PAUSA(w) * 0.18, 0);
  const inicio = 0.35;
  const fin = Math.min(escena.objetivo - 0.75, inicio + habla);
  const silencios = [];
  let t = inicio;
  words.forEach((w, i) => {
    t += ((fin - inicio) * (0.3 + PAUSA(w) * 0.18)) / habla;
    if (PAUSA(w) && i < words.length - 1) {
      const d = ((fin - inicio) * PAUSA(w) * 0.18) / habla;
      silencios.push({start: t - d, end: t});
    }
  });
  return alinear(escena.texto, inicio, fin, silencios);
}

// ---------------------------------------------------------------- audio
function wav(pcm, rate, canales = 1) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(canales, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * canales * 2, 28);
  h.writeUInt16LE(canales * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function duracion(file) {
  return parseFloat(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString(),
  );
}

function detectarSilencios(file) {
  let txt = '';
  try {
    const r = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=-38dB:d=0.16 -f null - 2>&1`]);
    txt = r.toString();
  } catch (e) {
    txt = String(e.stdout || '');
  }
  const out = [];
  let s = null;
  for (const line of txt.split('\n')) {
    const a = line.match(/silence_start: ([\d.]+)/);
    const b = line.match(/silence_end: ([\d.]+)/);
    if (a) s = parseFloat(a[1]);
    if (b && s !== null) {
      out.push({start: s, end: parseFloat(b[1])});
      s = null;
    }
  }
  return out;
}

async function pedir(url, body, intentos = 4) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY},
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status} ${j?.error?.message || ''}`);
      return j;
    } catch (e) {
      ultimo = e;
      if (/\b(400|401|403|404)\b/.test(String(e.message))) break;
      await new Promise((res) => setTimeout(res, 2000 * 2 ** i));
    }
  }
  throw ultimo;
}

async function elegirModelo() {
  if (process.env.GEMINI_TTS_MODEL) return process.env.GEMINI_TTS_MODEL;
  const disponibles = [];
  let token = '';
  do {
    const j = await pedir(`${API}/models?pageSize=1000${token ? `&pageToken=${token}` : ''}`);
    for (const m of j.models || []) disponibles.push(m.name.replace(/^models\//, ''));
    token = j.nextPageToken || '';
  } while (token);
  for (const m of MODELOS_PREFERIDOS) if (disponibles.includes(m)) return m;
  const tts = disponibles.filter((m) => /tts/i.test(m)).sort().reverse();
  if (tts.length) return tts[0];
  throw new Error('La cuenta no expone ningún modelo de TTS');
}

async function sintetizar(modelo, texto) {
  const prompt = `${GUION.estiloVoz}. Lee en voz alta exactamente este texto, sin añadir nada:\n\n${texto}`;
  const j = await pedir(`${API}/models/${modelo}:generateContent`, {
    contents: [{parts: [{text: prompt}]}],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: VOZ}}},
    },
  });
  const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('Respuesta sin audio');
  const mime = part.inlineData.mimeType || '';
  const rate = parseInt((mime.match(/rate=(\d+)/) || [])[1] || '24000', 10);
  const pcm = Buffer.from(part.inlineData.data, 'base64');
  if (/wav/i.test(mime)) return pcm;
  return wav(pcm, rate);
}

// ---------------------------------------------------------------- main
function guardar(escenas, extra) {
  const data = {generadoCon: extra.generadoCon, modelo: extra.modelo || null, voz: extra.voz || null, nota: extra.nota || null, escenas};
  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2) + '\n');
  const total = escenas.reduce((s, e) => s + e.duracion, 0);
  console.log(`✔ ${path.relative(ROOT, OUT_JSON)} — ${escenas.length} escenas, ${total.toFixed(2)} s en total (${extra.generadoCon})`);
}

function sinAudio(nota) {
  const escenas = GUION.escenas.map((e) => ({
    id: e.id,
    texto: e.texto,
    audio: null,
    duracionAudio: null,
    duracion: e.objetivo,
    palabras: estimarSinAudio(e),
  }));
  guardar(escenas, {generadoCon: 'estimado', nota});
}

async function main() {
  escribirTxt();
  console.log(`✔ narracion.txt escrito`);
  if (sinVoz) return sinAudio('Render sin voz: tiempos estimados.');

  if (!process.env.GEMINI_API_KEY) {
    console.error(
      '✖ Falta GEMINI_API_KEY. Agrégala como variable de entorno (no la pongas en el código) y vuelve a ejecutar.\n' +
        '  Para continuar sin voz: npm run narracion:sin-voz',
    );
    process.exit(2);
  }

  let modelo;
  try {
    modelo = await elegirModelo();
    console.log(`→ Modelo TTS: ${modelo} · voz: ${VOZ}`);
    fs.mkdirSync(AUDIO_DIR, {recursive: true});
    const escenas = [];
    for (const e of GUION.escenas) {
      const file = path.join(AUDIO_DIR, `escena${e.id}.wav`);
      fs.writeFileSync(file, await sintetizar(modelo, e.texto));
      const dur = duracion(file);
      const sil = detectarSilencios(file);
      // Voz real: desde el fin del silencio inicial hasta el inicio del silencio final.
      const inicio = sil.length && sil[0].start < 0.05 ? sil[0].end : 0;
      const ultimo = sil[sil.length - 1];
      const fin = ultimo && ultimo.end > dur - 0.05 ? ultimo.start : dur;
      const palabras = alinear(e.texto, inicio, fin, sil);
      const duracionEscena = +Math.max(e.minimo, dur + GUION.margenSegundos).toFixed(3);
      escenas.push({id: e.id, texto: e.texto, audio: `audio/narracion/escena${e.id}.wav`, duracionAudio: +dur.toFixed(3), duracion: duracionEscena, palabras});
      console.log(`  escena ${e.id}: audio ${dur.toFixed(2)} s → escena ${duracionEscena.toFixed(2)} s`);
    }
    guardar(escenas, {generadoCon: 'gemini', modelo, voz: VOZ});
  } catch (err) {
    console.error(`✖ Falló la API de Gemini (${err.message}). Se usa narracion.txt y se renderiza SIN voz.`);
    sinAudio(`Gemini falló: ${err.message}`);
    process.exitCode = 3;
  }
}

main();
