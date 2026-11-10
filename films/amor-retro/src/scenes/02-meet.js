// Shot 'meet' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.night);
    A.stars(g, F, 2, P.petal);
    A.disc(g, 146, 118, 11, P.amber);
    A.disc(g, 151, 114, 9, P.night);
    // street: lamp post, kerb and pavement
    R.px(g, 0, 249, 180, 71, P.shadow);
    R.px(g, 0, 249, 180, 2, P.steel);
    for (let x = (-(F >> 2) % 24 + 24) % 24 - 24; x < 180; x += 24) R.px(g, x, 262, 12, 2, P.ink);
    R.px(g, 156, 160, 3, 89, P.ink);
    R.px(g, 150, 156, 15, 4, P.ink);
    R.px(g, 152, 160, 11, 3, P.amber);
    const walk = f < 72;
    const yx = Math.round(-32 + Math.min(f, 72) * 66 / 72);
    A.person(g, 'yo', yx, 203, F, walk, false, 2);
    A.person(g, 'amor', 108, 203, F, false, true, 2);
    A.say(g, [{ s: 'LA VES...', scale: 2 }], 34);
    if (f >= 36) A.say(g, [{ s: 'Y TODO TU CUERPO', color: P.petal }, { s: 'SE REVOLUCIONA', color: P.petal }], 58);
    if (f >= 72 && f < 108) R.pxtext(g, '!', yx + 9, 180 - (f < 76 ? 76 - f : 0), { scale: 2, color: P.gold, shadow: P.ink });
    if (f >= 108) {
      const k = f - 108;
      const bob = nes.step(F, 12, 2);
      R.pxtext(g, '♥', yx + 5, 176 - Math.min(k, 6) - bob, { scale: 3, color: P.love, shadow: P.ink });
      for (let i = 0; i < 4; i++) {
        const u = (k * 2 + i * 9) % 40;
        R.pxtext(g, '♥', yx + 30 + i * 10 - (i % 2) * 6, 196 - u, { color: P.blush });
      }
    }
  }
  FILM.scene({
    id: 'meet',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
