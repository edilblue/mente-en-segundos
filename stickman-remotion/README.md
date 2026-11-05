# Stickman Pro — Parte 2: ¿Y si los animales también saltaran?

YouTube Short vertical (1080×1920, 30 fps, ~80 s) animado al estilo stickman con **Remotion (React + TypeScript)**.
Todo está dibujado con código (SVG + animación): sin imágenes externas, emojis dibujados a mano en SVG y
fuentes empaquetadas desde npm (`@fontsource/bangers`, `@fontsource/luckiest-guy`).

Composición: **`Parte2`** (`src/Parte2.tsx`).

## Cómo generar el video

```bash
cd stickman-remotion
npm install

# 1) Narración con Gemini TTS (un WAV por escena en public/audio/narracion/)
#    La clave se lee SOLO de la variable de entorno; nunca se escribe en el código.
export GEMINI_API_KEY=...            # o agrégala en los secretos del entorno
npm run narracion                    # elige el modelo TTS vigente consultando /models
#    Opcionales: GEMINI_TTS_VOICE=Puck (por defecto)  GEMINI_TTS_MODEL=<forzar modelo>
#                NARRACION_VELOCIDAD=1.15 (ritmo de youtuber, sin cambiar el tono; 1 = original)
#    Cuota gratuita: ~10 peticiones/día por modelo y se necesitan 9. El audio se guarda en
#    .tts-cache/ para no gastar peticiones al volver a ejecutar; los 429 por minuto se esperan solos.

# 2) Música original y 23 efectos de sonido sintetizados con código, sincronizados con la
#    narración (+ public/audio/README con los segundos exactos). Requiere: pip install -r requirements-audio.txt
npm run audio

# 3) Render
npm run render                       # → out/parte2.mp4
#    Si no hay Chrome Headless Shell descargado, usa el Chromium del sistema:
#    REMOTION_CHROME=/ruta/a/chrome-headless-shell npx remotion render Parte2 out/parte2.mp4 --browser-executable="$REMOTION_CHROME"

# Fotogramas de revisión (por defecto 3, 12, 22, 32, 42, 58 y 70 s) → out/frames/
npm run frames
```

Sin clave o si la API falla, `npm run narracion` guarda el guion en `narracion.txt`; con
`npm run narracion:sin-voz` se generan tiempos estimados (80 s exactos) para renderizar sin voz.

### Sincronización

`scripts/generar-narracion.mjs` mide cada WAV con `ffprobe`, detecta las pausas con `silencedetect` y
reparte las palabras entre los tramos con voz (respetando la puntuación del guion). El resultado
(`src/data/narracion.json`) define:

- la duración de cada escena = audio real + 0,7 s de margen (con un mínimo por escena para que la animación respire;
  la escena 7 necesita ≥ 11 s para la cuenta regresiva y la cámara lenta),
- los subtítulos palabra por palabra,
- los momentos clave de cada animación (p. ej. el canguro salta en la palabra "avanzar", el impacto llega en "¡SALTEN!").

## Estructura

```
src/
  Parte2.tsx              composición: escenas, narración, música/SFX opcionales, impact frame
  timeline.ts             escenas y palabras a partir de src/data/narracion.json
  cues.ts                 puntos exactos de efectos de sonido (usados por Parte2 y por el README de audio)
  components/
    Stickman.tsx          rig de Stickman Pro: poses, ojos expresivos, bocas, cejas, gorra roja, squash & stretch
    fx.tsx                hoja de cuaderno, "boiling line", onomatopeyas, líneas de velocidad, polvo, emojis SVG
    overlays.tsx          subtítulos con "pop", barra de progreso-lápiz, etiqueta PARTE 2, barrido de tinta
  animals/index.tsx       hormiga, pulga, canguro, elefante, vaca, cerdo, ballena, pájaro y la Tierra
  scenes/S1..S9.tsx       una escena por bloque del guion
  data/guion.json         texto exacto de la narración, duración objetivo y palabras clave (amarillo)
scripts/
  generar-narracion.mjs   Gemini TTS → WAV + tiempos
  generar-readme-audio.ts public/audio/README
  frames-clave.mjs        render de fotogramas de revisión
```

## Audio

- **Narración** (Gemini TTS): volumen 1.0, siempre por encima de todo.
- **Música** (`public/audio/musica/fondo.wav`): Do mayor, 116 BPM, ukelele (Karplus-Strong), bajo, batería suave y
  glockenspiel; en la escena 7 cambia a redoble + golpe en "¡SALTEN!" + acorde de cámara lenta. Baja
  automáticamente a ≈ -10 dB mientras habla el narrador (`src/mezcla.ts`).
- **Efectos** (`public/audio/sfx/`): boing, pum, splash, swoosh, whoosh, muu, tragamonedas, ding, conteo, multitud,
  cámara lenta, bostezo, grillos, risa, ¿eh?, sello, esfuerzo, aleteo, brillo... en los segundos de `src/cues.ts`.

## Zona segura

Todo el contenido importante queda entre y = 150 y y = 1670 (150 px libres arriba, 250 px abajo):
la barra-lápiz empieza en y ≈ 168 y los subtítulos terminan en y ≈ 1646.
