# Short: ¿Qué pasaría si dejaras de dormir? (Remotion)

## ⭐ Versión 2 (67 s, optimizada para retención) → [`out/short_v2.mp4`](out/short_v2.mp4)
Historia real de Randy Gardner (11 días sin dormir, 1963–64) contada **día por día**:
gancho con el dato fuerte en el primer frame, contador "DÍA X / 11" siempre visible, un cambio visual por
escena, "golpe" de zoom en cada frase, destello en cada cambio de día, desenlace al final
(durmió casi 15 h y se recuperó; Guinness ya no acepta el récord) y loop con el inicio.

- Guion: `src/v2/script.json` (texto hablado y texto en pantalla por frase).
- Voz: `npm run voz:v2` (Google Gemini TTS, necesita `GEMINI_API_KEY`) → genera la voz, la línea de tiempo
  `src/v2/timeline.json` (la duración de cada escena sale de la propia voz) y la música/FX.
- Render: `npm run render:v2`.

## Versión 1 (30 s) → [`out/short.mp4`](out/short.mp4)

YouTube Short vertical 1080x1920, 30 fps, 30 s, hecho al 100 % con código (React + TypeScript + SVG, sin imágenes externas).

**Video renderizado:** [`out/short.mp4`](out/short.mp4)

## Uso
```bash
npm install
npm run studio   # previsualizar
npm run render   # genera out/short.mp4
```

## Escenas
| Tiempo | Escena | Visual |
|---|---|---|
| 0–3 s | Gancho | Zoom rápido de entrada, cama + luna grandes, "?" neón animado |
| 3–11 s | 24 horas | Reloj neón que avanza hasta 24h y se tambalea (visión doble) |
| 11–19 s | Limpieza cerebral | Cerebro SVG: primero los desechos salen, luego se acumulan |
| 19–27 s | Récord | Conteo 1→11 con "pop" y anillo de 11 segmentos |
| 27–30 s | Cierre | Mismo diseño que el gancho para que el loop se sienta natural |

La luna se va apagando (y la batería bajo la cama se vacía) a lo largo del video; en el cierre se recarga para que el último frame coincida con el primero.
Zona segura: 150 px arriba (ahí empieza la barra de progreso) y 250 px libres abajo.

## Audio
- **Voz:** Google Gemini TTS (modelo `gemini-3.8-flash-tts`, voz `Orus`), capa gratuita de Google AI Studio.
  ```bash
  export GEMINI_API_KEY=...        # https://aistudio.google.com/apikey  (no la subas al repo)
  npm run voz                      # voz -> public/audio/voz.wav + src/narration.json, y rehace la música
  npm run render
  ```
  Cambia la voz con `GEMINI_VOICE=Charon` (otras: Fenrir, Puck, Kore, Aoede…).
  `tools/voz_externa.py audio.mp3` sirve para usar cualquier otra narración (ElevenLabs, tu propia voz…):
  detecta las pausas, corta las 5 frases y coloca cada una en su escena.
- **Música y FX:** `tools/sonido.py` los sintetiza con código (música ambiental con ducking bajo la voz y
  filtro que se "apaga" con la luna; whooshes, tic-tac del reloj, campanita, apagado del cerebro, blips del conteo, brillo final).
- `npm run render` normaliza el audio a -15 LUFS (volumen estándar de YouTube).

## Estructura
- `src/Short.tsx` – composición principal, icono persistente, transiciones
- `src/components/` – fondo (cuadrícula + partículas), barra de progreso, subtítulos pop, cama/luna, reloj, cerebro
- `src/scenes/` – escenas 1–5
