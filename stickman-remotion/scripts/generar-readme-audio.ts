// Genera public/audio/README con los segundos exactos para música y efectos.
// Uso: npm run readme-audio  (se recalcula con la narración real)
import fs from 'node:fs';
import path from 'node:path';
import {CUES} from '../src/cues';
import {SCENES, TOTAL_FRAMES, CON_VOZ} from '../src/timeline';
import {FPS} from '../src/lib';

const mmss = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};
const total = TOTAL_FRAMES / FPS;
const L: string[] = [];
L.push('AUDIO — PARTE 2: ¿Y si los animales también saltaran?');
L.push('=======================================================');
L.push('');
L.push(`Duración total: ${total.toFixed(2)} s (${TOTAL_FRAMES} frames a ${FPS} fps)`);
L.push(`Tiempos calculados a partir de: ${CON_VOZ ? 'la narración real de Gemini' : 'tiempos ESTIMADOS (sin voz todavía)'}.`);
L.push('Si regeneras la narración, vuelve a ejecutar `npm run readme-audio` para actualizar estos segundos.');
L.push('');
L.push('PRIORIDAD DE VOLUMEN: la narración siempre manda.');
L.push('  - Narración (public/audio/narracion/escenaN.wav): volumen 1.0 (0 dB)');
L.push('  - Música de fondo: volumen 0.12 (≈ -18 dB); bájala aún más durante la voz si la editas aparte');
L.push('  - Efectos: 0.25–0.6 según la tabla (siempre por debajo de la voz)');
L.push('');
L.push('CÓMO AGREGARLOS SIN TOCAR CÓDIGO');
L.push('  - Música: guarda public/audio/musica/fondo.mp3 → suena en loop desde 0:00.00 hasta el final.');
L.push('  - Efectos: guarda public/audio/sfx/<nombre>.mp3 (o .wav) con el nombre de la columna "sfx";');
L.push('    Parte2.tsx lo reproduce automáticamente en cada segundo de la tabla. Luego `npm run render`.');
L.push('');
L.push('MÚSICA DE FONDO');
L.push(`  0:00.00 → ${mmss(total)}  música alegre/curiosa (ukelele, pizzicato o chiptune suave)`);
const s7 = SCENES.find((s) => s.id === 7)!;
L.push(`  ${mmss(s7.from / FPS)} → ${mmss((s7.from + s7.frames) / FPS)}  escena del gran salto: sube la tensión (redoble) y corta la música en el impacto`);
L.push('');
L.push('ESCENAS');
for (const s of SCENES) L.push(`  Escena ${s.id} (${s.nombre}): ${mmss(s.from / FPS)} → ${mmss((s.from + s.frames) / FPS)}`);
L.push('');
L.push('EFECTOS DE SONIDO (segundo exacto en el video final)');
L.push('  tiempo    | seg     | sfx           | vol  | qué pasa');
L.push('  ----------+---------+---------------+------+-----------------------------------------');
for (const c of CUES)
  L.push(`  ${mmss(c.t).padEnd(9)} | ${c.t.toFixed(2).padStart(7)} | ${c.sfx.padEnd(13)} | ${(c.vol ?? 0.45).toFixed(2)} | Escena ${c.escena}: ${c.desc}`);
L.push('');
L.push('Nombres de archivo sugeridos: ' + [...new Set(CUES.map((c) => c.sfx))].sort().map((n) => `${n}.mp3`).join(', '));
fs.writeFileSync(path.resolve('public/audio/README'), L.join('\n') + '\n');
console.log(`✔ public/audio/README (${CUES.length} efectos)`);
