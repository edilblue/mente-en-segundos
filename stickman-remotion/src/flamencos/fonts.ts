import {continueRender, delayRender} from 'remotion';
import luckiest from '@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff2';
import cabin from '@fontsource/cabin-sketch/files/cabin-sketch-latin-700-normal.woff2';

// Fuentes empaquetadas desde npm (licencia SIL OFL), sin descargas en el render.
const handle = delayRender('Fuentes flamencos');
Promise.all([
  new FontFace('Luckiest Guy', `url(${luckiest}) format('woff2')`).load(),
  new FontFace('Cabin Sketch', `url(${cabin}) format('woff2')`, {weight: '700'}).load(),
])
  .then((faces) => {
    faces.forEach((f) => document.fonts.add(f));
    continueRender(handle);
  })
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
