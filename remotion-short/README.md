# Short: ¿Qué pasaría si dejaras de dormir? (Remotion)

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
Ver `public/audio/LEEME.md`: agrega `musica.mp3` y `voz.mp3` y descomenta el bloque `AUDIO` de `src/Short.tsx`.

## Estructura
- `src/Short.tsx` – composición principal, icono persistente, transiciones
- `src/components/` – fondo (cuadrícula + partículas), barra de progreso, subtítulos pop, cama/luna, reloj, cerebro
- `src/scenes/` – escenas 1–5
