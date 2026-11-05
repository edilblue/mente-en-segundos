import {continueRender, delayRender} from 'remotion';
import bangers from '@fontsource/bangers/files/bangers-latin-400-normal.woff2';
import luckiest from '@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff2';

// Fuentes empaquetadas desde npm (sin descargas en el render).
const handle = delayRender('Cargando fuentes');
Promise.all([
  new FontFace('Bangers', `url(${bangers}) format('woff2')`).load(),
  new FontFace('Luckiest Guy', `url(${luckiest}) format('woff2')`).load(),
])
  .then((faces) => {
    faces.forEach((f) => document.fonts.add(f));
    continueRender(handle);
  })
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
