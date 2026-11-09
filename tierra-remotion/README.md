# ¿Qué pasaría si la Tierra dejara de girar? — Mente en Segundos

YouTube Short / Reel vertical (1080×1920, 30 fps, 73 s, H.264) animado en 3D con **Remotion + React Three Fiber (Three.js)**.
Todo es procedural: planeta low-poly, personaje "Mini", ciudad, océano, Sol y Luna se construyen con código; no hay imágenes ni modelos externos.

Composición: **`Tierra`** (`src/Video.tsx`). Resultado: `~/claude_videos/tierra_deja_de_girar_mente_en_segundos.mp4`.

## Cómo generarlo

```bash
cd tierra-remotion
npm install
pip install kokoro-onnx soundfile scipy        # voz local + audio
(cd .. && ./download_models.sh)                # modelo Kokoro en ../models

export GEMINI_API_KEY=...       # solo como variable de entorno; nunca en el código
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview python3 scripts/narracion_gemini.py
                               # Gemini TTS (voz Puck), una petición por escena; transcribe cada escena
                               # con Gemini para verificar que dice exactamente el guion
# alternativa sin clave: python3 scripts/narracion.py  (Kokoro TTS local, voz em_alex)
python3 scripts/audio.py       # música + efectos + mezcla con ducking → public/audio/mix_raw.wav
ffmpeg -y -i public/audio/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 public/audio/mix.wav
npx remotion render Tierra out/tierra_deja_de_girar_mente_en_segundos.mp4 --concurrency=4 --gl=swangle
node scripts/stills.mjs 3 9.5 25 39   # fotogramas de revisión → out/frames/
```

Sin GPU, WebGL funciona con `--gl=swangle` (SwiftShader vía ANGLE). El navegador está configurado en `remotion.config.ts`.

### Sincronización
La narración se sintetiza frase por frase; `src/data/narracion.json` guarda el inicio de cada escena, frase y palabra.
Las escenas (`src/scenes/S1..S6.tsx`) y los efectos de sonido (`scripts/audio.py`) usan las mismas referencias
(`fs(escena, frase)`, `ws(escena, 'palabra')`), así que la animación, los subtítulos y los efectos caen en la palabra exacta.

### Voz
**Gemini TTS** (`gemini-3.1-flash-tts-preview`, voz masculina *Puck*, ritmo ×1.12 con `atempo`).
Notas aprendidas: los modelos TTS leen en voz alta cualquier indicación de estilo que vaya en el texto
y no aceptan `systemInstruction`, así que solo se envía el guion. La cuota gratuita es de pocas peticiones
diarias por modelo; el audio se guarda en `.tts-cache/` para no repetir peticiones.
Los tiempos de cada frase salen de las pausas reales del audio (la más cercana a la posición esperada por sílabas).

## Escenas
| # | Tiempo | Acción |
|---|--------|--------|
| 1 | 0–6 s | Mini camina sobre un planeta; la cámara se aleja girando; frenazo, onda expansiva y Mini sale disparado. Silencio. |
| 2 | 6–21 s | Globo con flechas de velocidad por latitud (1,670 / 1,280 / 630 / ≈0 km/h); en el suelo, el terreno se detiene y Mini, cajas, cono y balón siguen por **inercia**. |
| 3 | 21–32 s | La capa de aire sigue girando sobre un planeta detenido; ciudad con vientos extremos: árboles doblados, coches arrastrados, techos arrancados. |
| 4 | 32–43 s | El agua sigue fluyendo; ola gigante llega a la costa e inunda casas y palmeras. |
| 5 | 43–57 s | La Tierra orbita el Sol sin girar: un año en cámara rápida = 1 día solar; meses de luz y meses de oscuridad. |
| 6 | 57–73 s | Rebobinado al presente, Mini mira la Tierra desde la Luna, y viaja sentado en un banco a ≈1,670 km/h. "¿LO SABÍAS?" |

## Precisión científica
- Velocidad de rotación = 40 075 km / 23,93 h ≈ 1 674 km/h en el ecuador; × cos(latitud) en otras latitudes (≈1 280 a 40°, ≈630 a 68°, ≈0 en los polos).
- Sin rotación, el día solar dura un año (la Tierra sigue orbitando el Sol).
- En pantalla: "Escenario hipotético · simulación ilustrativa / no a escala", "Detención instantánea (hipotética)",
  "Los efectos dependerían de cómo se detuviera" y "Menos velocidad lejos del ecuador".
