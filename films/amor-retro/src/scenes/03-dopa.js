// Shot 'dopa' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.ink);
    A.stars(g, F, 3, P.night);
    const cx = 90, cy = 162;
    // rays from the reward centre
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + f * 0.01;
      for (let r = 20; r < 96; r += 6) {
        if ((r + f * 2 + i * 5) % 24 < 6) R.px(g, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), 2, 2, P.wine);
      }
    }
    R.sprite(g, 'brain', 30, 110, { scale: 3 });
    // the circuit: a gold path from the deep centre (VTA) forward (nucleus accumbens) and to the front
    const path = [[96, 176], [88, 168], [80, 160], [70, 150], [58, 142]];
    const lit = Math.min(path.length, 1 + Math.floor(f / 10));
    for (let i = 0; i < lit - 1; i++) {
      const [x0, y0] = path[i], [x1, y1] = path[i + 1];
      for (let s = 0; s <= 8; s++) R.px(g, Math.round(x0 + (x1 - x0) * s / 8) - 1, Math.round(y0 + (y1 - y0) * s / 8) - 1, 3, 3, P.gold);
    }
    const pr = 5 + (A.beat(F, 36, 0) ? 3 : 0);
    A.disc(g, 96, 176, pr, P.gold);
    A.disc(g, 96, 176, pr - 3, P.amber);
    // dopamine sparks spill out
    for (let i = 0; i < 18; i++) {
      const a = A.hash(i * 7 + 3) * Math.PI * 2;
      const r = ((f * 1.3 + i * 11) % 90);
      if (f * 1.3 < r) continue;
      R.sprite(g, 'spark', Math.round(96 + Math.cos(a) * r) - 2, Math.round(176 + Math.sin(a) * r * 0.85) - 2);
    }
    A.say(g, [{ s: 'DOPAMINA', scale: 2, color: P.gold }], 34);
    if (f >= 12) A.say(g, [{ s: 'SE ENCIENDE TU', color: P.petal }, { s: 'CIRCUITO DE', color: P.petal }, { s: 'RECOMPENSA', color: P.petal }], 58);
    if (f >= 48) A.say(g, [{ s: 'EL MISMO QUE', color: P.hudWhite }, { s: 'ACTIVA UNA ADICCION', color: P.hudWhite }], 226);
  }
  FILM.scene({
    id: 'dopa',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
