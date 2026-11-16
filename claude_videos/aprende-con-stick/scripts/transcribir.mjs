#!/usr/bin/env node
// Transcribe WAVs con Gemini para comprobar que la narración dice exactamente el guion.
//   node scripts/transcribir.mjs public/audio/narracion/ep01/escena1.wav [...]
import fs from 'node:fs';
const API = 'https://generativelanguage.googleapis.com/v1beta';
const modelo = process.env.GEMINI_STT_MODEL || 'gemini-3.5-flash';
for (const f of process.argv.slice(2)) {
  const data = fs.readFileSync(f).toString('base64');
  const r = await fetch(`${API}/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY || 'inyectada-por-el-proxy'},
    body: JSON.stringify({contents: [{parts: [{inline_data: {mime_type: 'audio/wav', data}}, {text: 'Transcribe literalmente este audio en español, sin comentarios.'}]}]}),
  });
  const j = await r.json();
  console.log(`--- ${f}\n${j?.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(j).slice(0, 300)}`);
}
