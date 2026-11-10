// Shot 'flies' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.night);
    A.stars(g, F, 5, P.blue);
    // the body: neck and torso in the hero's blue, the stomach glowing inside
    A.ellipse(g, 90, 108, 14, 10, P.skin);
    A.ellipse(g, 90, 186, 62, 72, P.ink);
    A.ellipse(g, 90, 186, 60, 70, P.blue);
    const glow = A.beat(F, 18, 0) ? 1 : 0;
    A.ellipse(g, 96, 192, 33 + glow, 24 + glow, P.ink);
    A.ellipse(g, 96, 192, 31 + glow, 22 + glow, P.petal);
    A.ellipse(g, 100, 198, 18, 10, P.brain);
    // butterflies on Lissajous paths, wings beating every 4 frames
    for (let i = 0; i < 9; i++) {
      const ph = A.hash(i + 50) * 6.28;
      const x = 96 + Math.round(Math.sin(F * 0.05 * (1 + (i % 3) * 0.3) + ph) * (24 + (i % 2) * 4));
      const y = 192 + Math.round(Math.sin(F * 0.07 * (1 + (i % 2) * 0.4) + ph * 1.7) * 15);
      const wing = nes.step(F + i, 4, 2) ? 'fly2' : 'fly1';
      if (f >= i * 4) R.sprite(g, wing, x - 7, y - 6, { scale: 2 });
    }
    A.say(g, [{ s: 'MARIPOSAS', scale: 2, color: P.gold }], 34);
    if (f >= 12) A.say(g, [{ s: 'ES TU ALARMA INTERNA', color: P.petal }, { s: '(NORADRENALINA)', color: P.sky }], 58);
  }
  FILM.scene({
    id: 'flies',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
