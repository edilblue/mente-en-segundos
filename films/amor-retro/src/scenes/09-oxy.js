// Shot 'oxy' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.plum);
    A.stars(g, F, 9, P.blush);
    A.disc(g, 90, 170, 46, P.wine);
    A.disc(g, 90, 170, 40, P.love);
    R.px(g, 0, 249, 180, 71, P.ink);
    R.px(g, 0, 249, 180, 2, P.blush);
    const u = Math.min(f, 72);
    const yx = Math.round(-4 + u * (60 - -4) / 72);
    const ax = Math.round(152 - u * (152 - 89) / 72);
    A.person(g, 'yo', yx, 203, F, f < 72, false, 2);
    A.person(g, 'amor', ax, 203, F, f < 72, true, 2);
    if (f >= 72) {
      // the hug: arms across, and oxytocin hearts rising
      R.px(g, 82, 228, 16, 3, P.skin);
      const k = f - 72;
      R.pxtext(g, '♥', 82, 182 - Math.min(k, 8), { scale: 2, color: P.blush, shadow: P.ink });
      for (let i = 0; i < 7; i++) {
        const r = (k * 1.5 + i * 14) % 90;
        const x = 90 + Math.round(Math.sin(i * 2.1 + k * 0.08) * (14 + i * 4));
        R.pxtext(g, '♥', x - 3, Math.round(200 - r), { color: i % 2 ? P.petal : P.blush });
      }
    }
    A.say(g, [{ s: 'OXITOCINA', scale: 2, color: P.petal }], 34);
    if (f >= 12) A.say(g, [{ s: 'LA HORMONA DEL APEGO', color: P.hudWhite }, { s: 'Y LA CONFIANZA', color: P.hudWhite }], 58);
  }
  FILM.scene({
    id: 'oxy',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
