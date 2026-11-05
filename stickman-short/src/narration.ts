/**
 * Líneas de la voz en off (segundos del video). `slot` es el tiempo máximo que
 * puede durar cada línea: si la voz generada es más larga, scripts/narrate.mjs
 * la acelera (atempo) para que quepa sin pisar la siguiente.
 * Coinciden con los subtítulos de src/script.ts y con public/audio/README.md.
 */
export type VoiceLine = {id: string; start: number; slot: number; text: string; style?: string; split?: number[]};

export const VOICE_LINES: VoiceLine[] = [
  {id: '01', start: 0.25, slot: 4.6, text: '¿Qué pasaría si todas las personas del mundo saltaran al mismo tiempo?', style: 'intriguing and very energetic, like the hook of a viral video'},
  {id: '02', start: 5.2, slot: 3.4, text: 'Somos más de ocho mil millones de personas.'},
  {id: '03', start: 8.7, slot: 2.6, text: 'Parece mucho peso…', style: 'doubtful'},
  {id: '04', start: 11.4, slot: 3.5, text: 'pero la Tierra es billones de veces más pesada.', style: 'amused, stressing "billones"'},
  {id: '05', start: 15.25, slot: 3.7, text: 'Primero tendríamos que juntarnos en un solo lugar.'},
  {id: '06', start: 19.1, slot: 7.75, text: 'Y aunque no lo creas, todos apretados cabríamos en el espacio de una sola ciudad grande.', style: 'surprised'},
  // Cuenta regresiva: una sola petición; se corta por los silencios en 4 clips (27.3 / 28.6 / 29.9 / 31.2 s).
  {id: '07', start: 27.3, slot: 6.0, text: '¡Tres! … ¡Dos! … ¡Uno! … ¡Salten!', style: 'shouting an epic countdown, with a clear pause after each number', split: [27.3, 28.6, 29.9, 31.2]},
  {id: '08', start: 40.2, slot: 3.9, text: 'Al caer, el ruido sería ensordecedor…', style: 'dramatic'},
  {id: '09', start: 44.2, slot: 3.7, text: '…pero en pocos segundos se apagaría.', style: 'lowering the voice, almost whispering'},
  {id: '10', start: 48.2, slot: 6.6, text: '¿Y la Tierra? Se movería menos que el ancho de un átomo.', style: 'with dry humor'},
  {id: '11', start: 55.2, slot: 6.4, text: 'El verdadero problema sería regresar a casa.', style: 'with comic suspense'},
  {id: '12', start: 63.0, slot: 4.85, text: 'Sería el mayor caos de la historia.', style: 'exaggerated and alarmed'},
  {id: '13', start: 68.3, slot: 6.55, text: 'Dato extra: en la Luna podrías saltar unas seis veces más alto.', style: 'excited'},
  {id: '14', start: 75.3, slot: 4.2, text: '¿Tú saltarías?', style: 'friendly, asking the viewer directly'},
];
