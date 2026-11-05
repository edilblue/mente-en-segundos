/**
 * Líneas de la voz en off (segundos del video). `slot` es el tiempo máximo que
 * puede durar cada línea: si la voz generada es más larga, scripts/narrate.mjs
 * la acelera (atempo) para que quepa sin pisar la siguiente.
 * Coinciden con los subtítulos de src/script.ts y con public/audio/README.md.
 */
export type VoiceLine = {id: string; start: number; slot: number; text: string; style?: string};

export const VOICE_LINES: VoiceLine[] = [
  {id: '01', start: 0.25, slot: 4.6, text: '¿Qué pasaría si todas las personas del mundo saltaran al mismo tiempo?', style: 'con intriga y mucha energía, como el gancho de un video viral'},
  {id: '02', start: 5.2, slot: 3.4, text: 'Somos más de ocho mil millones de personas.'},
  {id: '03', start: 8.7, slot: 2.6, text: 'Parece mucho peso…', style: 'con tono dudoso'},
  {id: '04', start: 11.4, slot: 3.5, text: 'pero la Tierra es billones de veces más pesada.', style: 'divertido, remarcando "billones"'},
  {id: '05', start: 15.25, slot: 3.7, text: 'Primero tendríamos que juntarnos en un solo lugar.'},
  {id: '06', start: 19.1, slot: 7.75, text: 'Y aunque no lo creas, todos apretados cabríamos en el espacio de una sola ciudad grande.', style: 'sorprendido'},
  {id: '07a', start: 27.3, slot: 1.2, text: '¡Tres!', style: 'gritando como cuenta regresiva épica'},
  {id: '07b', start: 28.6, slot: 1.2, text: '¡Dos!', style: 'gritando como cuenta regresiva épica'},
  {id: '07c', start: 29.9, slot: 1.2, text: '¡Uno!', style: 'gritando como cuenta regresiva épica'},
  {id: '07d', start: 31.2, slot: 1.6, text: '¡Salten!', style: 'gritando con mucha emoción'},
  {id: '08', start: 40.2, slot: 3.9, text: 'Al caer, el ruido sería ensordecedor…', style: 'dramático'},
  {id: '09', start: 44.2, slot: 3.7, text: '…pero en pocos segundos se apagaría.', style: 'bajando la voz, casi susurrando'},
  {id: '10', start: 48.2, slot: 6.6, text: '¿Y la Tierra? Se movería menos que el ancho de un átomo.', style: 'con humor seco'},
  {id: '11', start: 55.2, slot: 6.4, text: 'El verdadero problema sería regresar a casa.', style: 'con tono de suspenso cómico'},
  {id: '12', start: 63.0, slot: 4.85, text: 'Sería el mayor caos de la historia.', style: 'exagerado y alarmado'},
  {id: '13', start: 68.3, slot: 6.55, text: 'Dato extra: en la Luna podrías saltar unas seis veces más alto.', style: 'emocionado'},
  {id: '14', start: 75.3, slot: 4.2, text: '¿Tú saltarías?', style: 'cercano y animado, como una pregunta directa al espectador'},
];
