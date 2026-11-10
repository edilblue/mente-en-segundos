// Shot 'end' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.night);
    A.stars(g, F, 10, P.petal);
    R.sprite(g, 'brain', 50, 96, { scale: 2 });
    // the wire from the brain stem down to the heart, a spark running along it
    R.px(g, 97, 154, 2, 26, P.gold);
    const s = (F * 2) % 26;
    R.px(g, 96, 154 + s, 4, 3, P.amber);
    const big = A.beat(f, 36, 0);
    A.heartAt(g, 90, 206, big, 2);
    if (f >= 36) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = 30 + ((f - 36) % 30);
        R.sprite(g, 'spark', Math.round(90 + Math.cos(a) * r) - 2, Math.round(206 + Math.sin(a) * r) - 2);
      }
    }
    A.say(g, [{ s: 'EL AMOR ES', scale: 2 }, { s: 'QUIMICA', scale: 2, color: P.gold }], 30);
    if (f >= 18) A.say(g, [{ s: 'Y TU CORAZON LO SABE', color: P.petal }], 72);
    if (f >= 36) R.pxtext(g, 'MENTE EN SEGUNDOS', 90, 248, { color: P.blush, shadow: P.ink, align: 'center' });
  }
  FILM.scene({
    id: 'end',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
