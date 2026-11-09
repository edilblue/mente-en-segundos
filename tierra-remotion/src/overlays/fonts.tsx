import '@fontsource/luckiest-guy/400.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import React, {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

export const TITLE_FONT = '"Luckiest Guy", "Nunito", sans-serif';
export const BODY_FONT = '"Nunito", sans-serif';

/** No monta a los hijos hasta que las fuentes estén listas (las etiquetas 3D se dibujan en canvas). */
export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [handle] = useState(() => delayRender('fuentes'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      document.fonts.load('120px "Luckiest Guy"'),
      document.fonts.load('900 60px "Nunito"'),
      document.fonts.load('800 60px "Nunito"'),
    ])
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready ? <>{children}</> : null;
};
