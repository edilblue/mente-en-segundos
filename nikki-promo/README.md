# Nikki Accesorios — promo vertical 15 s

Composición HTML/CSS + GSAP renderizada cuadro a cuadro con Chromium (Playwright) y codificada con ffmpeg.
Salida: `output/nikki_promo_15s.mp4` (1080×1920, 30 fps, 15 s, H.264 + AAC estéreo, −14 LUFS).

## Archivos
- `index.html`, `timeline.js` — escenas y línea de tiempo (determinista: `renderAt(t)` hace `tl.seek(t)`).
- `assets.js` — rutas de las fotos y el logo (por defecto `assets/nikki/`).
- `audio/narracion_leda.wav` — narración Gemini TTS (`gemini-2.5-flash-preview-tts`, voz **Leda**), pausas recortadas y +4 % de velocidad → 13.8 s, entra en 0.5 s.
- `audio/musica.wav` — música ambient oscura generada con `audio/music.py` (sin derechos de terceros), mezclada a −20 dB bajo la voz con ducking.
- `audio/tts.py` — regenera la voz: `GEMINI_API_KEY=… python3 audio/tts.py Leda salida.wav audio/narracion.txt` (la clave sólo por variable de entorno).

## Render
```bash
node nikki-promo/render.mjs                          # video final
node nikki-promo/render.mjs --stills 1,3.5,7,10.5,14  # cuadros PNG de revisión
```

## Sincronía (tiempos del video)
| Tiempo | Voz | Visual |
|---|---|---|
| 0–2.4 | "Hay piezas que cuentan quién eres." | ✦ se expande → logo con glow, "Nikki Accesorios" |
| 2.4–5.4 | "En Nikki Accesorios creamos bisutería hecha a mano…" | collar con zoom/parallax, telarañas plateadas, "Hecho a mano" |
| 5.4–9.4 | "…que se roba todas las miradas. Collares, anillos, stickers…" | wipes + glitch: pulsera "Bisutería" → anillos "Anillos" → stickers "Stickers" |
| 9.4–11.45 | "…y más. Encuentra tu estilo…" | collage con pop y destellos, "Encuentra tu estilo" |
| 11.45–15 | "…en @nikkii.accesorios. ¡Pedidos al DM!" | logo, @nikkii.accesorios, "Pedidos al DM 💌" + flecha, ✦ final, fade |
