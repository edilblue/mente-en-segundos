/**
 * Voz en off (segundos del video). Cada petición a Gemini TTS lleva una o varias
 * frases; scripts/narrate.mjs corta el audio por las pausas más largas y coloca
 * cada parte en su `start`. Si una parte dura más que (end - start) se acelera
 * (atempo) para que no pise la siguiente. Agrupar frases ahorra cuota: la capa
 * gratuita permite 10 peticiones por día y modelo.
 * Los tiempos coinciden con los subtítulos de src/script.ts y con public/audio/README.md.
 */
export type VoicePart = {start: number; end: number};
export type VoiceLine = {id: string; text: string; parts: VoicePart[]};

export const VOICE_LINES: VoiceLine[] = [
  {
    id: '01',
    text: '¿Qué pasaría si todas las personas del mundo saltaran al mismo tiempo? … Somos más de ocho mil millones de personas.',
    parts: [{start: 0.25, end: 4.95}, {start: 5.2, end: 8.6}],
  },
  {
    id: '02',
    text: 'Parece mucho peso… … pero la Tierra es billones de veces más pesada.',
    parts: [{start: 8.7, end: 11.3}, {start: 11.4, end: 14.9}],
  },
  {
    id: '03',
    text: 'Primero tendríamos que juntarnos en un solo lugar. … Y aunque no lo creas, todos apretados cabríamos en el espacio de una sola ciudad grande.',
    parts: [{start: 15.25, end: 18.95}, {start: 19.1, end: 26.9}],
  },
  {
    id: '04',
    text: '¡Tres! … ¡Dos! … ¡Uno! … ¡Salten!',
    parts: [{start: 27.3, end: 28.55}, {start: 28.6, end: 29.85}, {start: 29.9, end: 31.15}, {start: 31.2, end: 33.0}],
  },
  {
    id: '05',
    text: 'Al caer, el ruido sería ensordecedor… … pero en pocos segundos se apagaría.',
    parts: [{start: 40.2, end: 44.1}, {start: 44.2, end: 47.9}],
  },
  {id: '06', text: '¿Y la Tierra? Se movería menos que el ancho de un átomo.', parts: [{start: 48.2, end: 54.9}]},
  {
    id: '07',
    text: 'El verdadero problema sería regresar a casa. … Sería el mayor caos de la historia.',
    parts: [{start: 55.2, end: 61.6}, {start: 63.0, end: 67.9}],
  },
  {id: '08', text: 'Dato extra: en la Luna podrías saltar unas seis veces más alto.', parts: [{start: 68.3, end: 74.9}]},
  {id: '09', text: '¿Tú saltarías?', parts: [{start: 75.3, end: 79.5}]},
];
