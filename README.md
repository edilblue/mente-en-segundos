# ¿Qué pasa en tu cuerpo cuando dejas de respirar?

Video de divulgación científica vertical (1080x1920, 9:16, 30 fps, ~51 s) generado
**100 % con Python**: modelos anatómicos 3D procedurales, render, textos, música,
efectos de sonido y narración. No usa Blender, After Effects ni imágenes externas.

Resultado: `output/que_pasa_si_dejas_de_respirar.mp4`

## Cómo ejecutarlo

```bash
pip install -r requirements.txt
./download_models.sh          # voz Kokoro TTS (ONNX, se ejecuta en local)
python main.py                # video final en output/
python main.py --preview      # render interno a menor resolución (más rápido)
python main.py --frames 9.5 26 34   # sólo fotogramas PNG de prueba en build/
```

Requiere `ffmpeg` en el PATH. Con 4 núcleos el render final tarda unos 15 minutos.

## Escenas

| # | Tiempo | Contenido |
|---|--------|-----------|
| 1 | 0–5 s | Cuerpo de vidrio con órganos visibles; los pulmones respiran y brillan; la cámara se acerca al torso. Título "¿QUÉ PASA SI DEJAS DE RESPIRAR?". |
| 2 | 5–12 s | Última inspiración y retención: los pulmones se detienen, el O₂ deja de entrar (flecha bloqueada), aparecen moléculas de CO₂ y espasmos del diafragma. |
| 3 | 12–22 s | Transición con zoom al interior de un vaso: glóbulos rojos bicóncavos 3D fluyen con el pulso y van perdiendo O₂ y color. |
| 4 | 22–31 s | La cámara sube por la carótida al cerebro 3D con circunvoluciones; la actividad eléctrica neuronal disminuye y el tejido se apaga. |
| 5 | 31–41 s | Corazón latiendo en primer plano (sístole/diástole, giro, aurículas), ECG en vivo: primero taquicardia y después ritmo lento e irregular. |
| 6 | 41–51 s | Cuerpo completo: los órganos se iluminan en secuencia (pérdida de conciencia, daño cerebral, muerte), acercamiento final al cerebro y texto "TU CEREBRO NECESITA OXÍGENO CADA SEGUNDO." |

## Estructura

```
main.py                 orquestación: voz → línea de tiempo → audio → render paralelo → ffmpeg
src/config.py           resolución, fps, rutas
src/timeline.py         escenas derivadas de la narración + fisiología simulada (O₂, CO₂, respiración, latidos)
src/director.py         elección de escena, transiciones (zoom blur, destellos, motion blur), post y capas 2D
src/engine/
  blobs.py              renderizador de superficies implícitas (metaballs gaussianas → altura → normales,
                        Phong, fresnel, subsurface, oclusión ambiental, texturas 3D pegadas al objeto)
  camera.py             cámara de perspectiva
  noise.py              ruido Perlin 3D vectorizado y ruido de ondas
  sprites.py            esferas sombreadas, brillos y moléculas O₂/CO₂
  post.py               bloom, tonemapping ACES, gradación teal/naranja, viñeta, aberración cromática, grano
src/anatomy/            cuerpo, esqueleto, vasos, pulmones + árbol bronquial, corazón, cerebro, texturas
src/scenes/
  body_world.py         mundo anatómico (escenas 1, 2, 4, 5 y 6 con cámara continua)
  vessel.py             túnel del vaso sanguíneo + glóbulos rojos (forma de Evans-Fung)
src/overlay/text.py     subtítulos dinámicos palabra por palabra, títulos, etiquetas, HUD O₂/CO₂, ECG
src/audio/
  narration.py          voz en español latino (Kokoro TTS, voz em_alex, es-419) con tiempos por palabra
  soundtrack.py         música procedural, latidos, respiración, whooshes, impactos, mezcla con ducking
assets/fonts/           tipografía Inter (licencia SIL OFL)
```

## Notas

- La animación es ilustrativa: los porcentajes de O₂ y los tiempos están comprimidos con fines
  divulgativos y no son valores clínicos.
- Para cambiar la voz: `TTS_VOICE=em_santa python main.py` (también `ef_dora`, voz femenina);
  para cambiar la velocidad: `TTS_SPEED=1.1`.

---

## Stickman Pro — Parte 2 (Remotion)

Short animado estilo stickman "¿Y si los animales también saltaran?" hecho con Remotion (React + TypeScript)
en [`stickman-remotion/`](stickman-remotion/README.md). Narración con Gemini TTS (`GEMINI_API_KEY` desde el entorno).
