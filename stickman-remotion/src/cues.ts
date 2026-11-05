// Puntos exactos para música y efectos de sonido. Se calculan a partir de la
// narración real, así que siempre coinciden con la animación. Se usan para:
//  1) reproducir public/audio/sfx/<sfx>.mp3 si existe (ver Parte2.tsx)
//  2) generar public/audio/README (npm run readme-audio)
import {FPS} from './lib';
import {SCENES, scene} from './timeline';
import {beats1} from './scenes/S1';
import {beats2} from './scenes/S2';
import {beats3} from './scenes/S3';
import {beats4} from './scenes/S4';
import {beats5} from './scenes/S5';
import {beats6} from './scenes/S6';
import {beats7} from './scenes/S7';
import {beats8} from './scenes/S8';
import {beats9} from './scenes/S9';

export type Cue = {frame: number; t: number; sfx: string; desc: string; escena: number; vol?: number};

const raw: [number, number, string, string, number?][] = [];
const add = (esc: number, at: number, sfx: string, desc: string, vol?: number) => raw.push([esc, at, sfx, desc, vol]);
const B = <T,>(id: number, f: (d: number, w: (typeof SCENES)[number]['words']) => T) => f(scene(id).dur, scene(id).words);

const b1 = B(1, beats1);
add(1, b1.pum, 'pum', 'Stickman Pro aterriza (¡PUM!)');
add(1, b1.antIn, 'pasitos', 'Entra la hormiga caminando', 0.3);
add(1, b1.look, 'hmm', 'Stickman Pro mira a la hormiga 🤔', 0.35);
const b2 = B(2, beats2);
add(2, 0.2, 'hormigas', 'Hormigas correteando (loop suave hasta el final de la escena)', 0.25);
add(2, b2.counterIn, 'tragamonedas', 'Palanca + rodillos del contador girando');
add(2, b2.landing, 'ding', 'El contador se detiene: 20.000.000.000.000.000');
add(2, b2.scared, 'grito', 'Stickman Pro levanta los pies asustado 😱', 0.35);
const b3 = B(3, beats3);
add(3, b3.enter, 'swoosh', 'Entra la balanza', 0.35);
b3.drops.forEach((d, i) => add(3, d + 0.35, 'pum', `Cae animal ${i + 1} en la balanza`, 0.25));
add(3, b3.tilt, 'pum', 'La balanza se inclina hacia la granja (golpe fuerte)', 0.6);
add(3, b3.muu, 'muu', 'La vaca hace ¡MUU! 😂');
const b4 = B(4, beats4);
add(4, b4.launch, 'boing', 'Despega la pulga');
add(4, b4.whip, 'swoosh', 'Barrido hacia el canguro', 0.35);
add(4, b4.jump, 'boing', 'El canguro salta sobre Stickman Pro');
add(4, b4.land, 'pum', 'Aterriza el canguro', 0.4);
const b5 = B(5, beats5);
add(5, b5.strain, 'esfuerzo', 'El elefante hace fuerza para saltar', 0.35);
add(5, b5.stamp, 'sello', 'Sello rojo "NO PUEDE SALTAR"', 0.5);
add(5, b5.eh, 'eh', '"¿EH?" / grillos', 0.4);
const b6 = B(6, beats6);
add(6, b6.enter, 'aleteo', 'Pasa el pájaro volando', 0.35);
add(6, b6.cool, 'brillo', 'Destello de los lentes 😎', 0.3);
const b7 = B(7, beats7);
add(7, b7.n3, 'conteo', 'Cuenta regresiva: 3', 0.5);
add(7, b7.n2, 'conteo', 'Cuenta regresiva: 2', 0.5);
add(7, b7.n1, 'conteo', 'Cuenta regresiva: 1', 0.5);
add(7, b7.go, 'multitud', '¡SALTEN! — grito de multitud + whoosh', 0.45);
add(7, b7.go, 'whoosh', 'Despegue de todos (whoosh ascendente)', 0.5);
add(7, b7.apex, 'slowmo', 'Cámara lenta: zumbido grave', 0.55);
add(7, b7.apex, 'boing', 'Impact frame y cámara lenta (¡BOING!)', 0.5);
add(7, b7.land, 'splash', 'Cae la ballena (¡SPLASH!)', 0.55);
add(7, b7.land, 'pum', 'Aterrizaje masivo + temblor', 0.6);
const b8 = B(8, beats8);
add(8, b8.nada, 'bostezo', 'La Tierra bosteza', 0.45);
add(8, b8.sad, 'grillos', 'Animales decepcionados 😐', 0.25);
const b9 = B(9, beats9);
add(9, b9.hop, 'boing', 'El elefante intenta saltar (boing mini)', 0.3);
add(9, b9.fall, 'pum', 'El elefante se cae', 0.45);
add(9, b9.fall + 0.2, 'risa', 'Stickman Pro se ríe 😂', 0.35);
// Barridos de tinta entre escenas
SCENES.slice(1).forEach((s) => raw.push([s.id, -0.3, 'swoosh', `Barrido de tinta hacia la escena ${s.id}`, 0.35]));

export const CUES: Cue[] = raw
  .map(([esc, at, sfx, desc, vol]) => {
    const s = scene(esc);
    const t = s.from / FPS + at;
    return {frame: Math.max(0, Math.round(t * FPS)), t, sfx, desc, escena: esc, vol};
  })
  .sort((a, b) => a.t - b.t);
