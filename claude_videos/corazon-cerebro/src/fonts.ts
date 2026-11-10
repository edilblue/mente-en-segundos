import {continueRender, delayRender} from 'remotion';
import m500 from '@fontsource/montserrat/files/montserrat-latin-500-normal.woff2';
import m800 from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff2';
import m900 from '@fontsource/montserrat/files/montserrat-latin-900-normal.woff2';
import p700i from '@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2';

export const FONT_SANS = 'Montserrat, sans-serif';
export const FONT_SERIF = '"Playfair Display", serif';

// Fuentes empaquetadas desde npm (licencia SIL OFL), sin descargas durante el render.
const handle = delayRender('Cargando fuentes');
Promise.all([
  new FontFace('Montserrat', `url(${m500}) format('woff2')`, {weight: '500'}).load(),
  new FontFace('Montserrat', `url(${m800}) format('woff2')`, {weight: '800'}).load(),
  new FontFace('Montserrat', `url(${m900}) format('woff2')`, {weight: '900'}).load(),
  new FontFace('Playfair Display', `url(${p700i}) format('woff2')`, {weight: '700', style: 'italic'}).load(),
])
  .then((faces) => {
    faces.forEach((f) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(f));
    continueRender(handle);
  })
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
