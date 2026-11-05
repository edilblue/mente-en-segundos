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
L.push('TODO EL AUDIO ESTÁ INCLUIDO Y SINTETIZADO CON CÓDIGO (npm run audio → scripts/generar-audio-fx.py)');
L.push('  - Narración: public/audio/narracion/escenaN.wav (Gemini TTS) — volumen 1.0, siempre por encima de todo');
L.push('  - Música:    public/audio/musica/fondo.wav — 0.34 sin voz, baja a 0.10 (≈ -10 dB) mientras habla el narrador');
L.push('  - Efectos:   public/audio/sfx/<nombre>.wav — 0.25–0.6 según la tabla; ×0.6 si coinciden con la voz');
L.push('  La mezcla está en src/mezcla.ts y los puntos de cada efecto en src/cues.ts.');
L.push('  Para usar tus propios sonidos: reemplaza el archivo con el mismo nombre (.wav o .mp3) y `npm run render`.');
L.push('');
L.push('MÚSICA DE FONDO');
L.push(`  0:00.00 → ${mmss(total)}  música original en Do mayor a 116 BPM (ukelele, bajo, batería suave y glockenspiel)`);
const s7 = SCENES.find((s) => s.id === 7)!;
L.push(`  ${mmss(s7.from / FPS)} → ${mmss((s7.from + s7.frames) / FPS)}  escena del gran salto: pedal grave + redoble desde el "3", golpe en ¡SALTEN!, acorde suave en cámara lenta y vuelve el ritmo tras el aterrizaje`);
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
