# Aprende con Stick — serie de Shorts animados (Remotion + React + TypeScript + SVG)

Episodio 1: **¿Qué pasaría si tu cerebro dejara de sentir miedo?** → `../aprende_con_stick_ep01_miedo.mp4`
(1080×1920, 30 fps, H.264 + AAC, español latino).

Todo es animación programada: personaje, escenarios, efectos, música y efectos de sonido se generan con código
(sin imágenes, clips ni audio de terceros). Tipografía Fredoka (SIL OFL, vía `@fontsource/fredoka`).

## Producir el episodio

```bash
npm install
export GEMINI_API_KEY=...        # o un secreto de red del entorno para generativelanguage.googleapis.com
npm run narracion                # Gemini TTS → public/audio/narracion/ep01/*.wav + src/episodes/ep01/narracion.json
npm run render                   # música/SFX + Remotion + loudnorm (-14 LUFS) → ../aprende_con_stick_ep01_miedo.mp4
npm run verificar                # códecs, resolución, fps, duración, decodificación, sonoridad
```

- Voz: `GEMINI_TTS_VOICE` (por defecto `Charon`), `GEMINI_TTS_MODEL` (por defecto se elige el mejor modelo TTS
  disponible consultando `/models`), `NARRACION_VELOCIDAD` (1.0). La clave solo se lee del entorno; nunca se
  escribe en archivos. El audio crudo se guarda en `.tts-cache/` (ignorado por git) para no repetir peticiones.
- Sin clave: `npm run narracion:estimada` + `bash scripts/render.sh --borrador` → `out/borrador_ep01.mp4` (sin voz).
- Revisión visual: `npm run frames -- --escena 3 0.5 2 4` (PNG en `out/frames/`), `python3 scripts/montage.py`
  para hojas de contacto, `npm run studio` para la línea de tiempo interactiva.

## Sincronización

`narracion.json` contiene la duración REAL de cada audio y tiempos aproximados por palabra (pausas detectadas con
`silencedetect`). Cada escena dura `pre + voz + post` (con un mínimo) y todas las acciones se anclan a palabras:
`c.at('amígdala')`. Los efectos de sonido se declaran en cada escena (`cues`) usando los mismos anclajes, así que
voz, animación y sonido no se desfasan aunque cambie la narración. La música baja automáticamente (ducking) bajo la voz.

## Estructura

```
src/
  stick/            STICK, el protagonista (reutilizable en todos los episodios)
    Stick.tsx       rig: cuerpo de líneas, cabeza blanca, manos blancas, sombra, squash, salto
    Face.tsx        cabeza + rasgos (ojos ovalados, cejas, boca paramétrica, rubor, sudor, parpadeo)
    Hand.tsx        manos simplificadas: puño, abierta, señalar, pulgar arriba
    poses.ts        biblioteca de poses, IK de 2 huesos, ciclo de caminata, respiración/idle
    expressions.ts  biblioteca de expresiones mezclables + parpadeo natural
    ModelSheet.tsx  hoja de modelo (composición "Stick-HojaDeModelo")
  lib/              anim (easing, muelles, ruido), theme (paleta), timeline (anclajes por palabra), scene (cámara)
  fx/fx.tsx         señales/nervios con pulsos, sellos, titulares, rayos, líneas de velocidad, iris, congelado…
  world/            Street, Dog, Brain (+corazón, pulmones, intestino), Lab, Props (alarma, auto, colmena,
                    medidores), People (persona de estudio, serpiente, CO₂), Brand (logotipo)
  episodes/ep01/    guion.json, narracion.json, Episodio01.tsx, scenes/S1…S7.tsx
scripts/            generar-narracion.mjs, alinear.mjs, generar-audio.py, render.sh, verificar.sh, frames.mjs, montage.py
public/audio/       narración, efectos y música generados
```

## Nuevo episodio

Copia `src/episodes/ep01` a `ep02`, edita `guion.json`, crea las escenas reutilizando `stick/`, `world/` y `fx/`,
registra la composición en `src/Root.tsx` y ejecuta los scripts con `EPISODIO=ep02`.

## Rigor científico (ep. 1)

- La amígdala participa en la detección de amenazas y en la respuesta de miedo, pero no es un "interruptor" único:
  intervienen otras regiones (ínsula, corteza prefrontal, tronco encefálico, hipotálamo) y señales del cuerpo.
- Escena 5: Feinstein J. S. et al., "Fear and panic in humans with bilateral amygdala damage",
  *Nature Neuroscience* 16, 270–272 (2013). Pacientes con lesión bilateral de la amígdala mostraron poco miedo ante
  amenazas externas, pero experimentaron pánico al inhalar aire con 35 % de CO₂. Son muy pocos casos; el video lo indica
  y no lo generaliza. El experimento no se muestra: Stick solo observa ilustraciones.
