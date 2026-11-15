# ¿Santa Claus era verde antes de Coca-Cola? — YouTube Short (35 s)

Short vertical (1080×1920, 30 fps, H.264 + AAC, **35,000 s**) que desmiente el mito del "Santa verde":
animación stickman 2D en estilo **pizarra y tiza**, con color **solo en el traje de Santa**.
Todo está dibujado por código (Remotion: React + SVG). No hay imágenes externas, logotipos ni marcas:
la botella es un refresco genérico, recto y sin logo.

- Video: `out/santa_verde_short.mp4`
- Título, descripción y hashtags: `out/santa_verde_short.txt`

## Cómo generarlo

```bash
cd santa-verde
npm install

# 1) Narración con Gemini TTS (voz "Puck", español latino). La clave SOLO se lee del entorno.
export GEMINI_API_KEY=...
node scripts/narracion.mjs
#    → un audio por frase (con caché en .tts-cache/), recorte de silencios, medición real,
#      un único ajuste de ritmo (atempo) para que la voz termine en 34,38 s, tiempos palabra por palabra
#      (src/data/narracion.json) y la pista build/voz.wav de 35 s exactos.
#    Opcionales: GEMINI_TTS_MODEL=<modelo>  GEMINI_TTS_VOICE=Charon

# 2) Música original + efectos + mezcla (ducking bajo la voz, -14 LUFS, true peak ≤ -1,5 dBTP)
python3 scripts/audio.py              # requiere numpy

# 3) Render final (video sin audio con Remotion + mezcla con ffmpeg)
node scripts/render.mjs               # → out/santa_verde_short.mp4

# Fotogramas de revisión → out/frames/
node scripts/frames.mjs 0 1 4 13 34.97
```

El navegador por defecto es el Chromium headless del sistema (`/opt/pw-browsers/...`); se puede cambiar con
`REMOTION_CHROME=/ruta/al/chrome-headless-shell`.

## Guion y escenas

| # | Tiempo | Narración | Animación |
|---|--------|-----------|-----------|
| 1 | 0–4,7 s | ¿Santa Claus era verde hasta que Coca-Cola lo vistió de rojo? ¡Mentira! | Frame 0: Santa verde mira a cámara. A los 0,55 s cae el sello rojo **MITO** y lo aplasta (squash & stretch, polvo de tiza, temblor). En "rojo" el traje se tiñe de rojo; en "¡Mentira!" el sello vuelve a golpear y la pregunta se tacha. |
| 2 | 4,7–11,7 s | Antes de 1900, Santa aparecía con túnicas verdes, azules o marrones. Cada país lo vestía distinto. | Desfile: Santas con túnica verde (Inglaterra), azul (Rusia) y marrón (Alemania) entran caminando con banderitas; saltan juntos y cada uno adopta una pose distinta. |
| 3 | 11,7–16,6 s | Y en el siglo XIX, el dibujante Thomas Nast ya lo pintaba de rojo en revistas. | El dibujante (bigote y perilla) traza a Santa en una revista antigua con un lápiz enorme; el traje se rellena de rojo. |
| 4 | 16,6–24,8 s | Pero en 1931, Coca-Cola contrató al ilustrador Haddon Sundblom, que lo pintó cálido, humano, y con una botella en la mano. | 1931 → botella genérica → contrato firmado → el pintor con boina pinta a Santa en el caballete → brillo cálido y corazones → el Santa del cuadro salta fuera con la botella. |
| 5 | 24,8–29,6 s | Esos anuncios se repitieron por más de treinta años y el mundo entero lo adoptó. | Contador 1931→1964 y línea de tiempo; los carteles se duplican hasta cubrir la pantalla; la cámara se aleja hasta un globo lleno de gorros rojos. |
| 6 | 29,6–35 s | Coca-Cola no inventó al Santa rojo… solo lo hizo imposible de olvidar. | "Lo popularizó, no lo inventó". Santa guiña a cámara; un borrador limpia la pizarra y el traje vuelve a verde, así que el último frame empalma con el primero (loop). |

**Nota de precisión:** el guion original decía "desde 1860, Thomas Nast ya lo pintaba de rojo". Nast dibujó a
Santa desde 1863, pero las versiones a color con traje rojo son posteriores (décadas de 1880 y 1890), así que se usa
"en el siglo XIX", que mantiene el ritmo y es exacto.

## Formato y zonas seguras

- Escenario (acción): y ≈ 190–990 · subtítulos en el **centro** (y ≈ 1030–1190) · datos y etiquetas: y ≈ 1250–1510.
- El 20 % inferior (y > 1536) y el borde derecho (x > 930 en la mitad baja) quedan libres de texto e información.
- Un cambio visual cada 1,5–2,5 s (cada escena tiene sus beats sincronizados con palabras clave de la voz).
- Transiciones: smear (1→2, 4→5), cortina con borrador (2→3) y zoom (3→4, 5→6).
- Loop: el encuadre, la pose, el zoom y el color del traje del último frame coinciden con el frame 0;
  la nieve de fondo da 1 o 2 vueltas completas en 35 s y la música es un loop de 16 compases cuya cola
  se suma al principio.

## Estructura

```
src/
  Video.tsx               composición: pizarra, escenas con transiciones, subtítulos
  timeline.ts             escenas y palabras a partir de src/data/narracion.json
  components/
    Chalk.tsx             filtros de tiza ("boiling line"), pizarra, nieve, texto que se escribe, polvo, destellos
    Figure.tsx            rig stickman: poses, caminata, squash & stretch, cara expresiva, Santa (barba, gorro, traje)
    Props.tsx             sello MITO, botella genérica, banderas, lápiz, pincel, paleta, revista, caballete, contrato, cartel, globo
    Subtitles.tsx         subtítulos palabra por palabra con "pop" y palabras clave en color
  scenes/S1..S6.tsx       una escena por bloque del guion
  data/guion.json         texto mostrado, texto hablado y palabras clave de cada frase
scripts/
  narracion.mjs           Gemini TTS → audio, medición, ajuste a 35 s y alineación de palabras
  audio.py                música navideña original + efectos (numpy) y mezcla a -14 LUFS
  render.mjs              render final
  frames.mjs              fotogramas de revisión
```

Fuentes: Luckiest Guy, Cabin Sketch y Black Ops One (SIL OFL, empaquetadas desde npm).
