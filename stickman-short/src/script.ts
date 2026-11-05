/**
 * Guion y tiempos de subtítulos (en segundos del video completo).
 * Las palabras entre *asteriscos* se resaltan en amarillo.
 * `:down:` dibuja el emoji 👇 en SVG.
 * `times` (opcional) fija el segundo exacto de aparición de cada palabra.
 *
 * Estos mismos tiempos son las marcas para la VOZ EN OFF (ver public/audio/README.md).
 */
export type Chunk = {start: number; end: number; text: string; times?: number[]};

export const SCRIPT: Chunk[] = [
  // Escena 1 — Gancho (0-5 s)
  {start: 0.25, end: 2.45, text: '¿Qué pasaría si *todas* las personas'},
  {start: 2.45, end: 4.85, text: 'del mundo *saltaran* al *mismo* *tiempo?*'},
  // Escena 2 — Cuántos somos (5-15 s)
  {start: 5.2, end: 8.5, text: 'Somos más de *8* *mil* *millones* de personas.'},
  {start: 8.7, end: 11.3, text: 'Parece *mucho* *peso*…'},
  {start: 11.4, end: 13.1, text: 'pero la *Tierra* es *billones*'},
  {start: 13.1, end: 14.85, text: 'de veces *más* *pesada.*'},
  // Escena 3 — Dónde nos juntamos (15-27 s)
  {start: 15.25, end: 16.95, text: 'Primero tendríamos que *juntarnos*'},
  {start: 16.95, end: 18.9, text: 'en un *solo* *lugar.*'},
  {start: 19.1, end: 20.95, text: 'Y aunque no lo creas,'},
  {start: 20.95, end: 23.55, text: 'todos *apretados* *cabríamos*'},
  {start: 23.55, end: 26.85, text: 'en el espacio de *una* *sola* *ciudad* grande.'},
  // Escena 4 — El salto (27-40 s)
  {start: 27.3, end: 33.9, text: '3… 2… 1… *¡SALTEN!*', times: [27.3, 28.6, 29.9, 31.2]},
  // Escena 5 — El ruido (40-48 s)
  {start: 40.2, end: 41.8, text: 'Al caer, el *ruido*'},
  {start: 41.8, end: 44.0, text: 'sería *ensordecedor*…'},
  {start: 44.2, end: 46.0, text: '…pero en *pocos* *segundos*'},
  {start: 46.0, end: 47.85, text: 'se *apagaría.*'},
  // Escena 6 — ¿Y la Tierra? (48-55 s)
  {start: 48.2, end: 49.6, text: '¿Y la *Tierra?*'},
  {start: 49.6, end: 51.4, text: 'Se movería *menos* que'},
  {start: 51.4, end: 54.85, text: 'el ancho de *un* *átomo.*'},
  // Escena 7 — El verdadero problema (55-68 s)
  {start: 55.2, end: 57.0, text: 'El *verdadero* *problema*'},
  {start: 57.0, end: 61.6, text: 'sería *regresar* *a* *casa.*'},
  {start: 63.0, end: 65.2, text: 'Sería el *mayor* *caos*'},
  {start: 65.2, end: 67.85, text: 'de la *historia.*'},
  // Escena 8 — Bonus (68-75 s)
  {start: 68.3, end: 69.6, text: '*Dato* *extra:*'},
  {start: 69.6, end: 71.8, text: 'en la *Luna* podrías saltar'},
  {start: 71.8, end: 74.85, text: 'unas *6* *veces* *más* *alto.*'},
  // Escena 9 — Cierre (75-80 s)
  {start: 75.3, end: 79.95, text: '¿Tú *saltarías?* :down:'},
];
