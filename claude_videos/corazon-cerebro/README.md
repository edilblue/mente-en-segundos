# Mente en Segundos — ¿Qué le pasa a tu corazón y a tu cerebro cuando te enamoras perdidamente?

YouTube Short vertical (1080×1920, 30 fps, H.264 + AAC, ~120 s) producido **íntegramente con código**:
animación en **Remotion (React + TypeScript + SVG)**, narración con **Gemini TTS** (voz *Charon*, español latino)
y banda sonora **procedural original** (Python/NumPy) mezclada y exportada con **FFmpeg**.

Resultado: [`../mente_en_segundos_corazon_cerebro_enamorado.mp4`](../mente_en_segundos_corazon_cerebro_enamorado.mp4)

## Producción

```bash
npm install
export GEMINI_API_KEY=...                 # solo variable de entorno, nunca en el código
npm run narracion                         # Gemini TTS → public/audio/voz/*.wav + data/narracion.json
python3 scripts/timeline.py               # línea de tiempo maestra → data/timeline.json
python3 scripts/audio.py                  # música + efectos + voz con ducking → out/mezcla.wav (-14 LUFS)
npm run render                            # video mudo → out/video_mudo.mp4
./scripts/final.sh                        # MP4 final + control de calidad (ffprobe, negros, congelados, silencios)
node scripts/frames.mjs 3 20 45 --scale=0.5   # fotogramas de revisión → out/frames/
```

Notas del TTS: los modelos `gemini-3.8-flash-tts` leen en voz alta cualquier instrucción de estilo escrita en texto
libre; por eso el estilo se envía con el formato estructurado `# AUDIO PROFILE / ### DIRECTOR'S NOTES / #### TRANSCRIPT`.
`scripts/transcribir.mjs` transcribe cada escena con un modelo Gemini de texto para verificar que la voz dice
exactamente el guion. El plan gratuito permite ~10 peticiones/día por modelo TTS; el audio queda en `.tts-cache/`.

## Sincronización

`data/timeline.json` es la única fuente de verdad: duración real de cada audio, inicio de cada palabra,
latidos (los mismos instantes mueven el corazón animado y suenan en la mezcla) y efectos de sonido.
Las pausas internas de la voz se limitan a 0,42 s y el tempo se ajusta solo un 3,5 % para encajar en 119,6 s.

## Escenas

| # | Tiempo | Contenido |
|---|--------|-----------|
| 1 | 0–10 s | Iris en macro con el reflejo de la persona amada y primer latido → pareja a contraluz en cámara lenta → la cámara atraviesa la pupila → túnel neuronal 3D hasta una neurona que brilla |
| 2 | 10–28 s | Cerebro de cristal: ATV y núcleo caudado se encienden, vías dopaminérgicas → sinapsis con vesículas, dopamina y otros neurotransmisores ("no actúa sola") → motivación, deseo, anticipación |
| 3 | 28–46 s | Holograma corporal: médula y cadena simpática, suprarrenales (adrenalina/noradrenalina) → corazón anatómico latiendo con ECG y pulso → manos que sudan → estómago con "mariposas" de luz → el corazón responde al cerebro |
| 4 | 46–60 s | Pensamientos orbitando en 3D, atención selectiva → recompensa, emoción y memoria → recuerdo, mensaje y próximo encuentro brillando |
| 5 | 60–77 s | Abrazo cálido → hipotálamo → molécula de oxitocina 3D (anillo disulfuro) → "no es una poción mágica" → calma y seguridad |
| 6 | 77–96 s | Separación y luz fría, mensaje sin respuesta, ondas de estrés → cerebro con deseo, ansiedad y malestar → "¿Por qué seguimos buscándolo?" |
| 7 | 96–109 s | Euforia neuronal que se calma → fibras de apego y confianza → pareja de espaldas en un atardecer en time-lapse |
| 8 | 109–120 s | Del cerebro a los corazones de la pareja en rayos X, todo el cuerpo conectado → "¿Quién hizo latir así el tuyo?" |

## Ciencia (resumen de fuentes)

- Aron et al. 2005 (J Neurophysiol) y Fisher, Aron & Brown 2005 (J Comp Neurol): activación de ATV y núcleo caudado en amor romántico intenso.
- Fisher et al. 2010 (J Neurophysiol): el rechazo implica regiones de recompensa/deseo (ATV, accumbens) e ínsula y cingulado anterior.
- Acevedo et al. 2012 (SCAN): en el amor de largo plazo persiste actividad de recompensa junto a sistemas de apego.
- Oxitocina: producida en el hipotálamo y liberada por la neurohipófisis; su efecto en humanos depende del contexto (se presenta con prudencia).

La "profundidad 3D" es una ilusión 2.5D: proyección en perspectiva real de partículas y neuronas, perspectiva CSS
para las tarjetas, y capas con paralaje, sombreado y luces para cerebro, corazón y personajes (no es 3D poligonal).
