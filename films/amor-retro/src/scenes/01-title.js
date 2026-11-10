// Shot 'title' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.night);
    A.stars(g, F, 1, P.petal);
    const lines = [
      { s: 'ASI FUNCIONA TU', color: P.petal },
      { s: 'MENTE Y', scale: 2 },
      { s: 'CORAZON', scale: 2, color: P.gold },
      { s: 'CUANDO TE ENAMORAS', color: P.petal },
    ];
    A.say(g, lines.slice(0, 1 + Math.min(3, Math.floor(f / 6))), 30);
    // the brain, the wire, the heart: the whole film in one picture
    R.sprite(g, 'brain', 50, 104, { scale: 2 });
    const big = A.beat(f, 36, 0);
    R.px(g, 97, 162, 2, 22, P.gold);
    const sy = 162 + ((F * 1) % 22);
    R.px(g, 96, sy, 4, 3, P.amber);
    A.heartAt(g, 90, 214, big, 2);
    if (big) { R.px(g, 40, 212, 6, 2, P.blush); R.px(g, 134, 212, 6, 2, P.blush); R.px(g, 44, 196, 4, 2, P.blush); R.px(g, 132, 196, 4, 2, P.blush); }
  }
  FILM.scene({
    id: 'title',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
