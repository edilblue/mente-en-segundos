// Shot 'sync' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.night);
    A.stars(g, F, 8, P.petal);
    const lock = f >= 72;
    const shift = lock ? 0 : Math.round(17 * (1 - f / 72));
    const bigL = A.beat(f, 36, 0);
    const bigR = A.beat(f, 36, shift);
    A.heartAt(g, 48, 150, bigL, 2);
    R.sprite(g, bigR ? 'heart28' : 'heart24', 132 - 28, 150 - 26, { scale: 2 });
    R.pxtext(g, 'TU', 48, 186, { color: P.sky, shadow: P.ink, align: 'center' });
    R.pxtext(g, 'AMOR', 132, 186, { color: P.blush, shadow: P.ink, align: 'center' });
    // two traces that lock together
    R.px(g, 8, 200, 164, 40, P.ink);
    A.ecg(g, 8, 214, 164, f, 36, P.sky, 8);
    A.ecg(g, 8, lock ? 214 : 228, 164, f + shift, 36, P.blush, 8);
    if (lock) R.pxtext(g, '♥ = ♥', 90, 104 - (f < 78 ? 78 - f : 0), { scale: 2, color: P.gold, shadow: P.ink, align: 'center' });
    A.say(g, [{ s: 'SINCRONIA', scale: 2, color: P.gold }], 34);
    if (f >= 12) A.say(g, [{ s: 'SUS PULSOS Y', color: P.petal }, { s: 'RESPIRACION SE', color: P.petal }, { s: 'ACOMPASAN', color: P.petal }], 56);
  }
  FILM.scene({
    id: 'sync',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
