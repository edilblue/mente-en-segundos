# Audio — marcas de tiempo exactas

El video `out/short.mp4` se renderiza **sin audio**. Aquí están los segundos exactos
para montar música, voz en off y efectos (30 fps → frame = segundo × 30).
Los mismos puntos están marcados con comentarios `SFX:` en `src/scenes/*.tsx` y en `src/Short.tsx`.

Para añadir los archivos a Remotion: copia los audios en esta carpeta y usa
`<Audio src={staticFile('audio/boing.mp3')} />` dentro de una `<Sequence from={frame}>`.

## 1. Música de fondo

| Desde | Hasta | Indicación |
|------:|------:|-----------|
| 0.0 s | 80.0 s | Música alegre tipo caricatura (≈120 BPM), a −18 dB bajo la voz |
| 27.0 s | 31.2 s | Subir tensión (redoble / cuerdas) durante la cuenta regresiva |
| 32.6 s | 35.5 s | Cámara lenta: filtro pasa-bajos + bajar velocidad (efecto "slow-mo") |
| 40.1 s | 44.3 s | Bajar a −30 dB: manda el ¡BOOOM! |
| 44.5 s | 47.5 s | **Silencio total** (solo el grillo) |
| 68.0 s | 75.0 s | Cambiar a pad espacial / sintetizador suave |
| 79.5 s | 80.0 s | Cortar en seco para que el loop con el inicio sea limpio |

## 2. Voz en off (coincide con los subtítulos de `src/script.ts`)

| Inicio | Fin | Texto |
|------:|----:|-------|
| 0.25 | 4.85 | ¿Qué pasaría si todas las personas del mundo saltaran al mismo tiempo? |
| 5.20 | 8.50 | Somos más de 8 mil millones de personas. |
| 8.70 | 11.30 | Parece mucho peso… |
| 11.40 | 14.85 | pero la Tierra es billones de veces más pesada. |
| 15.25 | 18.90 | Primero tendríamos que juntarnos en un solo lugar. |
| 19.10 | 26.85 | Y aunque no lo creas, todos apretados cabríamos en el espacio de una sola ciudad grande. |
| 27.30 | 33.90 | 3… (27.3) 2… (28.6) 1… (29.9) ¡SALTEN! (31.2) |
| 40.20 | 44.00 | Al caer, el ruido sería ensordecedor… |
| 44.20 | 47.85 | …pero en pocos segundos se apagaría. |
| 48.20 | 54.85 | ¿Y la Tierra? Se movería menos que el ancho de un átomo. |
| 55.20 | 61.60 | El verdadero problema sería regresar a casa. |
| 63.00 | 67.85 | Sería el mayor caos de la historia. |
| 68.30 | 74.85 | Dato extra: en la Luna podrías saltar unas 6 veces más alto. |
| 75.30 | 79.95 | ¿Tú saltarías? |

## 3. Efectos de sonido

| Segundo | Efecto | Qué pasa en pantalla |
|-------:|--------|----------------------|
| 0.00 | swoosh (caída) | Stickman Pro cae desde arriba |
| 0.43 | **golpe** | Aterriza: "¡PUM!" + polvo + temblor |
| 1.70 | rascado / "hmm" | Se rasca la cabeza 🤔 |
| 3.33 | swoosh | Zoom rápido a la cara |
| 5.00 | swoosh de tinta | Barrido de tinta → escena 2 |
| 5.20 → 7.83 | **conteo** (tragamonedas girando) | Contador sube a 8,000,000,000 |
| 6.33, 6.50, 6.67, 6.83, 7.00, 7.17, 7.33, 7.50, 7.67, 7.83 | clic de conteo | Cada dígito se detiene |
| 8.07 | ding | El contador rebota |
| 5.20 → 8.50 | **multitud** (murmullo creciente) | Cientos de stickmen se multiplican |
| 8.50 | swoosh | Corte a la balanza |
| 8.73 → 10.50 | boing pequeños | Los stickmen saltan al platillo |
| 11.53 | silbido de caída | La Tierra cae |
| 12.00 | **golpe** fuerte | "¡PUM!": la balanza se inclina |
| 12.00 | swoosh múltiple | Los stickmen salen volando |
| 12.27 → 14.50 | risa | Stickman Pro se ríe 😂 ("¡JA JA!") |
| 15.00 | swoosh de tinta | Barrido de tinta → escena 3 |
| 15.33 | papel desenrollándose | El mapa se despliega |
| 17.93 | golpe pequeño | Cae el pin rojo |
| 18.47 | swoosh | Zoom al pin |
| 19.17 | swoosh / flash | Corte a la ciudad |
| 20.83 → 23.33 | **multitud** | La mancha de stickmen llena la ciudad |
| 23.73 | "¡boom!" mental / sorpresa | Stickman Pro 🤯 |
| 27.00 | swoosh de tinta | Barrido de tinta → escena 4 |
| 27.30 | **conteo** "3" (golpe de tambor) | Número gigante 3 |
| 28.60 | **conteo** "2" | Número gigante 2 |
| 29.90 | **conteo** "1" | Número gigante 1 |
| 31.20 | **multitud** gritando "¡SALTEN!" | Todos se agachan (squash) |
| 31.87 | **boing** enorme | "¡BOING!": todos saltan (stretch) |
| 32.60 | golpe seco + silencio | Impact frame (colores invertidos, 2 frames) |
| 32.60 → 35.50 | viento grave en cámara lenta | Todos flotan en el aire |
| 35.50 | swoosh descendente | Empiezan a caer |
| 36.23 | **golpe** + polvo | Aterrizaje: "¡PUM!" + nubes de polvo |
| 37.57 | **multitud** celebrando | Todos levantan los brazos |
| 40.13 | **boom** gigante | "¡BOOOM!": ondas de sonido, pantalla vibra |
| 40.13 → 44.30 | retumbe grave que se apaga | Medidor de dB en rojo |
| 45.73 → 47.90 | **grillo** ("cri cri") | Aparece el grillo en la esquina |
| 48.00 | swoosh de tinta | Barrido de tinta → escena 6 |
| 48.40 | swoosh | Stickman Pro saca la lupa |
| 49.93 | swoosh de zoom | Zoom dentro de la lupa |
| 51.27 | "plink" diminuto | Aparece la flechita |
| 53.20 | "¿eh?" (bocina de payaso suave) | "¿EH?" 😐 |
| 55.00 | swoosh de tinta | Barrido de tinta → escena 7 |
| 55.00 → 63.00 | **bocinas** + multitud | Embotellamiento, "¡PIII!" |
| 56.20 | swoosh largo | Paneo lateral rápido |
| 59.27 | swoosh | Paneo de regreso |
| 62.60 | alarma corta | Borde rojo "¡CAOS!" |
| 64.40 | swoosh | Otro stickman salta |
| 65.07 | golpe cómico + "¡ay!" | Le pasa por encima a Stickman Pro |
| 68.00 | swoosh de tinta | Barrido de tinta → escena 8 |
| 68.00 → 75.00 | **sonido espacial** (ambiente) | Stickman Pro en la Luna |
| 69.27 | boing espacial (con eco) | Salta en cámara lenta |
| 71.20 → 72.67 | whoosh giratorio | Pirueta en el aire |
| 71.73 | ding brillante | "¡x6!" |
| 75.00 | swoosh de tinta | Barrido de tinta → escena 9 |
| 75.27 | pop | El casco sale volando |
| 75.80 | blip | Señala hacia los comentarios 👇 |
| 78.47 | tensión (sube el tono) | Se agacha para saltar |
| 79.53 | boing corto / swoosh | Sale disparado hacia arriba (enlaza con la caída del segundo 0) |
