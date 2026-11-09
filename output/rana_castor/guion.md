# Rana de madera y castor: dos formas de pasar el invierno

Voz: ElevenLabs "Nicole – Español Neutro – Narrativa" (eleven_multilingual_v2).
Estilo: diorama hiperrealista en corte transversal, bruma verde azulada, roble a la izquierda,
casita blanca lejana a la derecha, estanque con refugio de castor.

| # | Narración | Visual |
|---|---|---|
| 1 | Cuando llega el otoño, la rana de madera no busca un lago. Se esconde bajo la hojarasca del bosque, casi en la superficie. | Otoño; rana bajo las hojas junto a las raíces del roble. Zoom lento. |
| 2 | Con las primeras heladas, empieza a congelarse. Hasta dos tercios del agua de su cuerpo se convierten en hielo. | Escarcha; cristales de hielo sobre la rana. Paneo abajo. |
| 3 | Su corazón se detiene. Deja de respirar. Pero su hígado llena sus células de glucosa, que actúa como anticongelante y las protege. | Nieve; rana congelada con un leve brillo cálido interior. Zoom lento. |
| 4 | En Alaska, algunas pasan así más de siete meses, soportando hasta dieciocho grados bajo cero. | Plano general nevado. Zoom out. |
| 5 | En primavera, se descongela y su corazón vuelve a latir. Pronto, los machos cantan en las charcas con un sonido parecido al de un pato. | Primavera; rana cantando, huevos en la charca. Paneo lateral. |
| 6 | En cambio, el castor no hiberna. En otoño, clava ramas en el fondo del estanque, junto a su refugio: es su despensa de invierno. | Corte bajo el agua; castor clavando ramas en el lodo. Zoom lento. |
| 7 | Cubre el refugio con barro. Con el frío, el barro se congela y se vuelve duro como la piedra, una muralla contra los depredadores. | Primera nevada; castor con barro, zorro afuera. Paneo arriba. |
| 8 | Cuando el estanque se cubre de hielo, sale por una entrada sumergida, nada hasta sus ramas y puede aguantar la respiración unos quince minutos. | Bajo el hielo; castor nadando hacia la despensa. Paneo lateral. |
| 9 | Dentro, la familia se mantiene unida y el refugio se conserva por encima de cero grados. Su cola, además, guarda grasa de reserva. | Interior del refugio; familia acurrucada, cola visible. Zoom lento. |
| 10 | En primavera nacen las crías. Y un dato curioso: los dientes del castor son anaranjados, porque su esmalte contiene hierro. | Primavera; crías y adulto con dientes naranjas. Zoom out. |

Fuentes: Storey & Storey (criobiología de Rana sylvatica); Larson et al. 2014, J. Exp. Biol.
(218 días congelada, −18 °C en Alaska); literatura general sobre Castor canadensis
(despensa sumergida, refugio de barro congelado, apnea ~15 min, grasa en la cola, esmalte con hierro).

## Estado
- Narración: 10/10 con Gemini TTS (`gemini-2.5-flash-preview-tts`, voz "Vindemiatrix"), en `audio/sNN.wav`.
  Se monta acelerada ×1,2 sin cambiar el tono. Las tomas antiguas de ElevenLabs están en `audio_elevenlabs/`.
- Imágenes: solo `img/s01.png` (ElevenLabs, gpt-image-2.5). Las escenas 2–10 no se pudieron generar:
  ElevenLabs llegó al límite diario del plan gratuito y se quedó sin créditos, y los modelos de imagen de Gemini
  tienen cuota 0 en el plan gratuito.
- `rana_castor_provisional.mp4`: 1080x1920, H.264 + AAC, 80 s. Usa `img_provisional/` (la imagen 1 con
  encuadres y color por estación, creados con `provisional.sh`).
- Versión final: generar img/s02–s10 con `GEMINI_API_KEY=... python3 gen_gemini.py img 2 3 4 5 6 7 8 9 10`
  (necesita facturación activa en Google AI Studio) y luego ejecutar `./montar.sh`.
