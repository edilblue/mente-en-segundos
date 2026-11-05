<!--
  AUDIO DEL SHORT
    voz.wav     -> narración (npm run voz, Google Gemini TTS)  o  tools/voz_externa.py <audio>
    musica.wav  -> música de fondo sintetizada (tools/sonido.py)
    fx.wav      -> efectos de sonido sintetizados (tools/sonido.py)
  Para usar tu propia música: reemplaza musica.wav (o cambia la ruta en src/Short.tsx).
  Volúmenes de cada pista: src/Short.tsx (componentes <Audio>). Luego: npm run render
-->
# Carpeta de audio

- `voz.wav`: narración (Google Gemini TTS, voz Orus).
- `musica.wav`: música de fondo; reemplázala por tu propia música si quieres.
- `fx.wav`: efectos de sonido.

Los volúmenes se ajustan en `src/Short.tsx`. Después ejecuta `npm run render`.
