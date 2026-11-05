# Stickman Short — ¿Qué pasaría si todas las personas del mundo saltaran al mismo tiempo?

YouTube Short animado estilo stickman hecho **100 % con código** (React + TypeScript + SVG en
[Remotion](https://www.remotion.dev/)). Sin imágenes externas: personajes, emojis, Tierra, Luna,
mapa, ciudad, lápiz y efectos se dibujan con SVG.

**Video final:** [`out/short.mp4`](out/short.mp4) — 1080×1920, 30 fps, 80 s exactos (2400 frames), sin audio.

## Comandos

```bash
npm install
npm run studio                 # previsualizar en el navegador
npm run render                 # → out/short.mp4
node scripts/stills.mjs 3 12 22 35 44 60 72 --out=out/frames   # fotogramas de revisión
```

`remotion.config.ts` usa el Chromium headless instalado en `/opt/pw-browsers`; en otra máquina,
cambia la ruta o define `REMOTION_CHROME`.

## Estructura

```
src/
  Root.tsx            composición "Short" (1080x1920, 30 fps, 2400 frames) + fuentes Inter
  Short.tsx           línea de tiempo: escenas, barridos de tinta, impact frame, subtítulos, lápiz
  script.ts           guion + tiempos de cada subtítulo (= marcas de la voz en off)
  lib/anim.ts         springs/keyframes encadenados, boiling line, temblor de cámara, curvas a mano
  components/
    Stickman.tsx      rig con articulaciones (cabeza, torso, codos, rodillas), poses, ojos/boca/cejas
                      con parpadeo, gorra roja, casco; muñeco ligero para multitudes
    Paper.tsx         hoja de cuaderno que "hierve", cámara (zoom/paneo/rotación/temblor), suelo
    Effects.tsx       líneas de velocidad y de enfoque, polvo, onomatopeyas, emojis SVG,
                      barrido de tinta, destellos, la Tierra con cara, etiquetas, flechas
    Overlay.tsx       subtítulos palabra por palabra con pop + barra de progreso con forma de lápiz
  scenes/Scene1-9.tsx las 9 escenas del guion
public/audio/README.md  segundos exactos de música, voz en off y efectos
public/fonts/           Inter (SIL Open Font License)
out/frames/             fotogramas de revisión (s 3, 12, 22, 35, 44, 60, 72)
```

## Zona segura

- Arriba: 150 px libres (la barra-lápiz está en y=178).
- Abajo: 250 px libres (los subtítulos terminan en y≈1634).
