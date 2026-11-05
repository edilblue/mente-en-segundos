// Exporta los tiempos (escenas, efectos, narración y momentos de la escena 7) para
// que scripts/generar-audio-fx.py construya la música y los efectos sincronizados.
import fs from 'node:fs';
import {CUES} from '../src/cues';
import {SCENES, TOTAL_FRAMES, scene} from '../src/timeline';
import {FPS} from '../src/lib';
import {beats7} from '../src/scenes/S7';
import {narracionActiva} from '../src/mezcla';

const s7 = scene(7);
const b7 = beats7(s7.dur, s7.words);
const abs = (x: number) => s7.from / FPS + x;
const data = {
  total: TOTAL_FRAMES / FPS,
  escenas: SCENES.map((s) => ({id: s.id, inicio: s.from / FPS, dur: s.dur})),
  cues: CUES.map((c) => ({t: c.t, sfx: c.sfx})),
  narracion: narracionActiva,
  s7: {inicio: abs(0), n3: abs(b7.n3), n2: abs(b7.n2), n1: abs(b7.n1), go: abs(b7.go), apex: abs(b7.apex), slowEnd: abs(b7.slowEnd), land: abs(b7.land), fin: abs(s7.dur)},
};
fs.writeFileSync('src/data/tiempos-audio.json', JSON.stringify(data, null, 1) + '\n');
console.log(`✔ src/data/tiempos-audio.json (${data.cues.length} efectos, ${data.total.toFixed(2)} s)`);
