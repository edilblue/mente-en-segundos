import {continueRender, delayRender} from 'remotion';
import luckiest from '@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff2';
import sketch from '@fontsource/cabin-sketch/files/cabin-sketch-latin-700-normal.woff2';
import stamp from '@fontsource/black-ops-one/files/black-ops-one-latin-400-normal.woff2';

// Fuentes empaquetadas desde npm (licencia SIL OFL): nada se descarga durante el render.
const handle = delayRender('Cargando fuentes');
Promise.all([
  new FontFace('Luckiest Guy', `url(${luckiest}) format('woff2')`).load(),
  new FontFace('Cabin Sketch', `url(${sketch}) format('woff2')`, {weight: '700'}).load(),
  new FontFace('Black Ops One', `url(${stamp}) format('woff2')`).load(),
])
  .then((faces) => {
    faces.forEach((f) => document.fonts.add(f));
    continueRender(handle);
  })
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
