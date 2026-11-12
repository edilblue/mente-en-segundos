# Flujo: imitar mi estilo con yt-dlp + Whisper + HyperFrames

## Requisitos
- Python 3, Node 22+, ffmpeg
- `pip install yt-dlp openai-whisper`
- `npm install -g hyperframes`

## 1. Analizar videos de referencia
```bash
python3 flujo/referencias.py "https://youtube.com/shorts/AAA" "https://youtube.com/shorts/BBB" --modelo small --idioma es
```
Por cada video crea `referencias/<id>/` con:
- `video.mp4` (yt-dlp)
- `transcripcion.json/.srt/.txt` con tiempos por palabra (Whisper)
- `cortes.json`, `look.json` (`hyperframes measure`): tomas, cortes, brillo, contraste, saturación, temperatura
- `frames/` hojas de fotogramas para ver tipografía, subtítulos y composición
- `resumen.json`: cortes/min, duración media de toma, palabras/min, gancho de los primeros 3 s

Y combina todo en `referencias/perfil_estilo.json`.

## 2. Crear un video nuevo con ese estilo
```bash
hyperframes init mi-video --audio voz.mp3 --language es --resolution portrait --non-interactive
```
(`init` transcribe la voz con Whisper y deja las palabras con tiempos listas para subtítulos.)
Luego Claude lee `perfil_estilo.json` + los fotogramas y edita `index.html` imitando:
ritmo de cortes, estilo de subtítulos, paleta/look y estructura del gancho.

```bash
cd mi-video && npx hyperframes check && npx hyperframes render -o renders/final.mp4
```

## Nota sobre el entorno en la nube
Con red limitada, YouTube (`www.youtube.com`, `*.googlevideo.com`), los modelos de Whisper
(`openaipublic.azureedge.net`) y el CDN de GSAP (`cdn.jsdelivr.net`) están bloqueados.
Alternativas: subir los videos al repo/sesión, o usar GSAP local (`npm i gsap` y
`<script src="node_modules/gsap/dist/gsap.min.js">`).
