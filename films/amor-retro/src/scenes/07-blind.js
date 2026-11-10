// Shot 'blind' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.ink);
    A.stars(g, F, 7, P.night);
    const off = f >= 36;
    R.sprite(g, 'brain', 30, 104, { scale: 3 });
    // the front of the brain (prefrontal cortex, map x < 13) greys out when judgement switches off
    if (off) {
      g.save();
      g.beginPath();
      g.rect(30, 104, 39, 90);
      g.clip();
      R.sprite(g, 'brainGrey', 30, 104, { scale: 3 });
      g.restore();
      if (f < 56 && (f >> 2) % 2 === 0) A.ring(g, 50, 134, 26, P.red);
    } else {
      if ((F >> 3) % 2 === 0) A.ring(g, 50, 134, 26, P.mint);
    }
    R.pxtext(g, 'CORTEZA', 24, 196, { color: off ? P.steel : P.mint, shadow: P.ink });
    R.pxtext(g, 'FRONTAL', 24, 205, { color: off ? P.steel : P.mint, shadow: P.ink });
    if (off) R.pxtext(g, 'ZZZ', 52 + nes.step(F, 12, 2), 92, { color: P.steel });
    A.say(g, [{ s: 'AMOR CIEGO', scale: 2 }], 34);
    if (f >= 12) A.say(g, [{ s: 'LA ZONA QUE JUZGA', color: P.petal }, { s: 'Y CRITICA SE APAGA', color: P.petal }], 58);
    R.pxtext(g, 'JUICIO', 90, 222, { scale: 2, color: P.hudWhite, shadow: P.ink, align: 'center' });
    R.pxtext(g, off ? 'OFF' : 'ON', 90, 240, { scale: 2, color: off ? P.red : P.mint, shadow: P.ink, align: 'center' });
  }
  FILM.scene({
    id: 'blind',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
