#!/usr/bin/env node
// Narración con Gemini TTS → audio por segmento, medición real, ajuste de ritmo
// para que el video dure EXACTAMENTE 35 s, y tiempos palabra por palabra.
//
//   GEMINI_API_KEY=... node scripts/narracion.mjs
//
// La clave SOLO se lee de la variable de entorno GEMINI_API_KEY (nunca se guarda).
// Opcionales: GEMINI_TTS_MODEL, GEMINI_TTS_VOICE (por defecto la del guion: "Puck").
//
// Salidas:
//   build/voz.wav                 pista de voz completa (35,000 s, 48 kHz) para la mezcla final
//   src/data/narracion.json       inicio/fin de cada escena + palabras con tiempos globales

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUION = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/guion.json'), 'utf8'));
const API = 'https://generativelanguage.googleapis.com/v1beta';
const VOZ = process.env.GEMINI_TTS_VOICE || GUION.voz || 'Puck';
const CACHE = path.join(ROOT, '.tts-cache');
const BUILD = path.join(ROOT, 'build');
const TOTAL = GUION.duracionTotal; // 35 s

// Plan temporal: la voz arranca casi en el frame 0 (gancho) y termina dejando
// ~0,6 s para el guiño final que cierra el loop.
const INICIO_VOZ = 0.12;
const FIN_VOZ = TOTAL - 0.62;
const PAUSAS = [0.32, 0.2, 0.2, 0.2, 0.26]; // silencio entre segmentos (tras el 1: golpe de "¡Mentira!")

const MODELOS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];

const sh = (cmd, args) => execFileSync(cmd, args, {stdio: ['ignore', 'pipe', 'pipe']}).toString();
const dur = (f) => parseFloat(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
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

async function pedir(url, body) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY},
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    const msg = j?.error?.message || r.statusText;
    if (r.status === 429 || r.status >= 500) {
      const retry = parseFloat((msg.match(/retry in ([\d.]+)s/) || [])[1] || String(5 * 2 ** i));
      if (retry > 120) throw Object.assign(new Error(`429: ${msg.split('\n')[0]}`), {cuota: true});
      console.log(`    … ${r.status}, reintento en ${Math.ceil(retry)} s`);
      await new Promise((res) => setTimeout(res, (retry + 1) * 1000));
      continue;
    }
    throw new Error(`${r.status} ${msg}`);
  }
  throw new Error('Demasiados reintentos');
}

async function elegirModelo() {
  if (process.env.GEMINI_TTS_MODEL) return [process.env.GEMINI_TTS_MODEL];
  const j = await pedir(`${API}/models?pageSize=1000`);
  const tts = (j.models || []).map((m) => m.name.replace('models/', '')).filter((m) => /tts/.test(m));
  const orden = [...MODELOS.filter((m) => tts.includes(m)), ...tts.filter((m) => !MODELOS.includes(m))];
  if (!orden.length) throw new Error('La cuenta no expone modelos TTS');
  return orden;
}

export const construirPrompt = (texto) =>
  [
    '# AUDIO PROFILE: Narrador de datos curiosos',
    'Latin American Spanish YouTube Shorts narrator.',
    '',
    "### DIRECTOR'S NOTES",
    GUION.estiloVoz,
    'Only speak the transcript below. Never read these notes.',
    '',
    '#### TRANSCRIPT',
    texto,
  ].join('\n');

async function sintetizar(modelo, texto) {
    // Estructura recomendada para Gemini TTS: notas de dirección separadas de la transcripción.
  const prompt = construirPrompt(texto);
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

function parseSil(txt) {
  const out = [];
  let s = null;
  for (const line of txt.split('\n')) {
    const a = line.match(/silence_start: (-?[\d.]+)/);
    const b = line.match(/silence_end: ([\d.]+)/);
    if (a) s = Math.max(0, parseFloat(a[1]));
    if (b && s !== null) out.push({start: s, end: parseFloat(b[1])}), (s = null);
  }
  return out;
}
function detectarSilencios(file) {
  // silencedetect escribe en stderr
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-36dB:d=0.09', '-f', 'null', '-']);
  return r.stderr.toString();
}

// ------------------------------------------------------------ alineación de palabras
// Peso de cada palabra ≈ sílabas habladas (los números se leen largos).
const silabas = (s) => (s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[aeiouy]+/g) || []).length || 1;
const PAUSA = (w) => (/[…]$/.test(w) ? 3 : /[.!?]$/.test(w) ? 2 : /[,;:]$/.test(w) ? 1 : 0);

/** Palabras mostradas (con dígitos) emparejadas con su forma hablada para el peso. */
function tokens(seg) {
  const vis = seg.texto.split(/\s+/).filter(Boolean);
  const hab = seg.tts.split(/\s+/).filter(Boolean);
  // Alinear por índice: los números del texto visible equivalen a varias palabras habladas.
  const res = [];
  let j = 0;
  for (const w of vis) {
    const limpio = w.replace(/[^\p{L}\p{N}]/gu, '');
    if (/^\d+$/.test(limpio) || /^[XIV]+$/.test(limpio)) {
      // consumir palabras habladas hasta la siguiente palabra visible
      const siguiente = vis[vis.indexOf(w) + 1];
      const k0 = j;
      while (j < hab.length && (siguiente === undefined || hab[j] !== siguiente)) j++;
      const spoken = hab.slice(k0, j).join(' ');
      res.push({w, peso: silabas(spoken) + 0.6});
    } else {
      res.push({w, peso: silabas(w) + 0.6});
      j++;
    }
  }
  return res;
}

/** Reparte palabras sobre los tramos con voz, emparejando puntuación con pausas reales. */
function alinear(seg, voz0, voz1, sil) {
  const toks = tokens(seg);
  const pausas = sil.filter((s) => s.start > voz0 + 0.05 && s.end < voz1 - 0.05);
  // tramos con voz
  const tramos = [];
  let t = voz0;
  for (const s of pausas) {
    if (s.start > t) tramos.push([t, s.start]);
    t = s.end;
  }
  tramos.push([t, voz1]);
  // Emparejar: cortes de puntuación ↔ pausas largas (en orden, las más largas primero)
  const cortes = toks.map((x, i) => i).filter((i) => i < toks.length - 1 && PAUSA(toks[i].w));
  const totalPeso = toks.reduce((a, x) => a + x.peso, 0);
  const vozTotal = tramos.reduce((a, [x, y]) => a + y - x, 0);
  // Posición "esperada" de cada corte en tiempo de voz → elegir la pausa más cercana
  const cum = [0];
  toks.forEach((x) => cum.push(cum[cum.length - 1] + x.peso));
  const vozHasta = (tt) => tramos.reduce((a, [x, y]) => a + Math.max(0, Math.min(y, tt) - x), 0);
  const usadas = new Set();
  const asign = [];
  for (const c of cortes) {
    const esperado = (cum[c + 1] / totalPeso) * vozTotal;
    let mejor = -1;
    let dmin = Infinity;
    pausas.forEach((p, k) => {
      if (usadas.has(k)) return;
      const d = Math.abs(vozHasta(p.start) - esperado) - 2.0 * (p.end - p.start) * PAUSA(toks[c].w);
      if (d < dmin) (dmin = d), (mejor = k);
    });
    if (mejor >= 0 && Math.abs(vozHasta(pausas[mejor].start) - esperado) < 0.9) {
      usadas.add(mejor);
      asign.push([c, pausas[mejor]]);
    }
  }
  asign.sort((a, b) => a[0] - b[0]);
  // limpiar asignaciones que no estén en orden
  const ok = [];
  for (const a of asign) if (!ok.length || a[1].start > ok[ok.length - 1][1].start) ok.push(a);
  // repartir por bloques
  const out = [];
  let i0 = 0;
  let t0 = voz0;
  const bloques = [...ok.map(([c, p]) => [c, p.start, p.end]), [toks.length - 1, voz1, voz1]];
  for (const [c, fin, sig] of bloques) {
    const bloque = toks.slice(i0, c + 1);
    const segs = tramos.map(([x, y]) => [Math.max(x, t0), Math.min(y, fin)]).filter(([x, y]) => y - x > 0.001);
    const vt = segs.reduce((a, [x, y]) => a + y - x, 0);
    const pt = bloque.reduce((a, x) => a + x.peso, 0);
    // inicio = true: una palabra que empezaría en los últimos 0,07 s de un tramo empieza tras la pausa
    const aReal = (v, inicio = false) => {
      for (let k = 0; k < segs.length; k++) {
        const [x, y] = segs[k];
        const margen = inicio && k < segs.length - 1 ? 0.07 : 0;
        if (v <= y - x - margen + 1e-6) return x + v;
        v = Math.max(0, v - (y - x));
      }
      return fin;
    };
    let acc = 0;
    for (const x of bloque) {
      const s = aReal((acc / pt) * vt, true);
      acc += x.peso;
      const e = aReal((acc / pt) * vt);
      out.push({w: x.w, start: s, end: e});
    }
    i0 = c + 1;
    t0 = sig;
  }
  return out;
}

// ------------------------------------------------------------ main
async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('✖ Falta GEMINI_API_KEY (variable de entorno).');
    process.exit(2);
  }
  fs.mkdirSync(CACHE, {recursive: true});
  fs.mkdirSync(BUILD, {recursive: true});
  const modelos = await elegirModelo();
  let modelo = null;
  const crudos = [];
  for (const m of modelos) {
    try {
      crudos.length = 0;
      for (const seg of GUION.segmentos) {
        const key = crypto.createHash('sha1').update(`${m}|${VOZ}|${construirPrompt(seg.tts)}`).digest('hex').slice(0, 16);
        const f = path.join(CACHE, `${key}.wav`);
        // Duración esperada ≈ sílabas / 5,5 por segundo. Si el audio dura mucho más,
        // el modelo leyó también la indicación de estilo → se vuelve a pedir.
        const sil = seg.tts.split(/\s+/).reduce((a, w) => a + silabas(w), 0);
        const maxDur = (sil / 5.5) * 1.7 + 1;
        for (let intento = 0; intento < 4; intento++) {
          if (!fs.existsSync(f)) {
            console.log(`  → TTS segmento ${seg.id} (${m}, ${VOZ})`);
            fs.writeFileSync(f, await sintetizar(m, seg.tts));
          }
          const d = dur(f);
          if (d <= maxDur) break;
          console.warn(`    ⚠ segmento ${seg.id}: ${d.toFixed(1)} s (máx. esperado ${maxDur.toFixed(1)} s) → se regenera`);
          fs.unlinkSync(f);
        }
        if (!fs.existsSync(f)) throw new Error(`El segmento ${seg.id} sale demasiado largo una y otra vez`);
        crudos.push(f);
      }
      modelo = m;
      break;
    } catch (e) {
      if (!e.cuota) throw e;
      console.warn(`  ⚠ ${m} sin cuota → siguiente modelo`);
    }
  }
  if (!modelo) throw new Error('Ningún modelo TTS con cuota');

  // 1) Recortar silencios de los extremos y medir la duración natural
  const recortados = crudos.map((f, i) => {
    const out = path.join(BUILD, `seg${i + 1}_natural.wav`);
    const trim = 'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.02';
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', f, '-af', `${trim},areverse,${trim},areverse`, '-ar', '48000', '-ac', '1', out]);
    return out;
  });
  const naturales = recortados.map(dur);
  const disponible = FIN_VOZ - INICIO_VOZ - PAUSAS.reduce((a, b) => a + b, 0);
  const sumNat = naturales.reduce((a, b) => a + b, 0);
  const tempo = sumNat / disponible;
  console.log(`  duración natural de la voz: ${sumNat.toFixed(2)} s · disponible: ${disponible.toFixed(2)} s → atempo ${tempo.toFixed(3)}`);
  if (tempo > 1.3 || tempo < 0.85) console.warn('  ⚠ El ritmo necesario se aleja mucho del natural: conviene ajustar palabras del guion.');

  // 2) Aplicar el mismo ritmo a todos los segmentos (voz consistente, sin cambiar el tono)
  const finales = recortados.map((f, i) => {
    const out = path.join(BUILD, `seg${i + 1}.wav`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', f, '-af', `atempo=${tempo.toFixed(5)}`, '-ar', '48000', '-ac', '1', out]);
    return out;
  });
  const durs = finales.map(dur);
  // 3) Colocar segmentos; repartir el error residual en las pausas para clavar FIN_VOZ
  const residuo = FIN_VOZ - INICIO_VOZ - durs.reduce((a, b) => a + b, 0) - PAUSAS.reduce((a, b) => a + b, 0);
  const pausas = PAUSAS.map((p) => Math.max(0.08, p + residuo / PAUSAS.length));
  let t = INICIO_VOZ;
  const escenas = [];
  const offsets = [];
  GUION.segmentos.forEach((seg, i) => {
    offsets.push(t);
    const sil = parseSil(detectarSilencios(finales[i]));
    const palabras = alinear(seg, 0, durs[i], sil).map((p) => ({w: p.w, start: +(p.start + t).toFixed(3), end: +(p.end + t).toFixed(3)}));
    escenas.push({id: seg.id, vozInicio: +t.toFixed(3), vozFin: +(t + durs[i]).toFixed(3), palabras});
    t += durs[i] + (pausas[i] ?? 0);
  });
  // Cortes de escena: en mitad de cada pausa (la última escena termina en 35 s)
  escenas.forEach((e, i) => {
    e.inicio = i === 0 ? 0 : +((escenas[i - 1].vozFin + e.vozInicio) / 2).toFixed(3);
  });
  escenas.forEach((e, i) => (e.fin = i === escenas.length - 1 ? TOTAL : escenas[i + 1].inicio));

  // 4) Pista de voz completa de exactamente 35 s
  const voz = path.join(BUILD, 'voz.wav');
  const inputs = finales.flatMap((f) => ['-i', f]);
  const filtros = finales.map((_, i) => `[${i}]adelay=${Math.round(offsets[i] * 1000)}|${Math.round(offsets[i] * 1000)}[a${i}]`).join(';');
  const mix = `${filtros};${finales.map((_, i) => `[a${i}]`).join('')}amix=inputs=${finales.length}:normalize=0,apad,atrim=0:${TOTAL}`;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', mix, '-ar', '48000', '-ac', '1', voz]);

  const data = {modelo, voz: VOZ, tempo: +tempo.toFixed(4), total: TOTAL, duracionVoz: +dur(voz).toFixed(3), escenas};
  fs.writeFileSync(path.join(ROOT, 'src/data/narracion.json'), JSON.stringify(data, null, 2) + '\n');
  for (const e of escenas) console.log(`  escena ${e.id}: ${e.inicio.toFixed(2)}–${e.fin.toFixed(2)} s · voz ${e.vozInicio.toFixed(2)}–${e.vozFin.toFixed(2)} s`);
  console.log(`✔ build/voz.wav (${data.duracionVoz} s) y src/data/narracion.json · modelo ${modelo} · voz ${VOZ}`);
}

main().catch((e) => {
  console.error('✖', e.message);
  process.exit(1);
});
