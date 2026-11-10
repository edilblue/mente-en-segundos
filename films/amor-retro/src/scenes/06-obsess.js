// Shot 'obsess' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.night);
    A.stars(g, F, 6, P.violet);
    R.sprite(g, 'brain', 50, 178, { scale: 2 });
    // thought bubbles, one more every 18 frames, each holding the same person
    const spots = [[44, 116], [136, 112], [90, 98], [30, 152], [150, 150], [90, 138]];
    const n = Math.min(spots.length, 1 + Math.floor(f / 18));
    for (let i = 0; i < n; i++) {
      const [x, y] = spots[i];
      const pop = f - i * 18 < 4 ? 2 : 0;
      const bob = nes.step(F + i * 7, 18, 2);
      A.disc(g, 90 + Math.round((x - 90) * 0.5), 176, 2, P.hudWhite);
      A.disc(g, x, y + bob, 15 - pop, P.ink);
      A.disc(g, x, y + bob, 14 - pop, P.hudWhite);
      if (i % 2 === 0) R.sprite(g, 'amor_idle', x - 8, y + bob - 12);
      else R.pxtext(g, '♥', x - 6, y + bob - 6, { scale: 2, color: P.love });
    }
    A.say(g, [{ s: 'OBSESION', scale: 2, color: P.gold }], 34);
    if (f >= 12) A.say(g, [{ s: 'SOLO PIENSAS EN', color: P.petal }, { s: 'ESA PERSONA', color: P.petal }], 58);
    // the serotonin meter drains
    const lvl = Math.round(120 - Math.min(f, 108) * 70 / 108);
    R.pxtext(g, 'SEROTONINA', 24, 244, { color: P.hudWhite, shadow: P.ink });
    R.pxtext(g, 'BAJA', 156, 244, { color: P.violet, shadow: P.ink, align: 'right' });
    R.px(g, 23, 253, 134, 9, P.hudWhite);
    R.px(g, 25, 255, 130, 5, P.ink);
    R.px(g, 25, 255, lvl, 5, P.violet);
  }
  FILM.scene({
    id: 'obsess',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
