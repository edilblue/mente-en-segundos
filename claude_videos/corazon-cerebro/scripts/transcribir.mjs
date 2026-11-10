// Transcribe un audio con un modelo Gemini de texto (QA de la narración). Uso: node transcribir.mjs archivo.wav [modelo]
import fs from 'node:fs';
const [f, modelo = 'gemini-2.5-flash'] = process.argv.slice(2);
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
  method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY},
  body: JSON.stringify({contents: [{parts: [{inlineData: {mimeType: 'audio/wav', data: fs.readFileSync(f).toString('base64')}},
    {text: 'Transcribe literalmente este audio en español, palabra por palabra, sin comentarios. Después, en una línea aparte que empiece con "ACENTO:", indica el acento (latino o España) y si la voz es masculina o femenina.'}]}]}),
});
const j = await r.json();
console.log(r.ok ? j.candidates[0].content.parts.map((p) => p.text).join('') : `${r.status} ${j.error?.message?.slice(0, 300)}`);
