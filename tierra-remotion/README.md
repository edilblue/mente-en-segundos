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

python3 scripts/narracion.py   # voz (Kokoro TTS, em_alex, es) → public/audio/narracion.wav + src/data/narracion.json
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
Se pidió Gemini TTS, pero en esta sesión no había `GEMINI_API_KEY` y el TTS de ElevenLabs no tenía créditos;
se usó **Kokoro TTS** local (voz masculina `em_alex`, español). Para cambiarla basta con reemplazar
`public/audio/narracion.wav` y regenerar `narracion.json` con los tiempos reales.

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
