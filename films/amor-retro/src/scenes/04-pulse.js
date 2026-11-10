// Shot 'pulse' of "Mente y corazon enamorados" (retro, native 180x320). f = shot-local frame, F = global frame.
(function () {
  'use strict';
  const R = FILM.retro, P = R.RETRO_PAL, A = FILM.amor, nes = FILM.nes;
  function paint(g, f, F) {
    A.bg(g, P.ink);
    // beats: every 36 frames, then double time from frame 72
    const beats = [0, 36, 72, 90, 108, 126];
    let since = 999;
    for (const b of beats) if (f >= b) since = f - b;
    const big = since < 6 || (since >= 10 && since < 14);
    const bpm = f < 36 ? 72 : f < 72 ? 96 : Math.min(130, 112 + ((f - 72) >> 2));
    if (big) { A.ring(g, 90, 150, 62, P.wine); A.ring(g, 90, 150, 66, P.wine); }
    A.heartAt(g, 90, 150, big, 3);
    // speed lines when racing
    if (f >= 72) for (let i = 0; i < 6; i++) { const y = 100 + i * 20; const x = (F * 4 + i * 37) % 40; R.px(g, 4 + x % 12, y, 8, 1, P.blush); R.px(g, 168 - x % 12, y + 10, 8, 1, P.blush); }
    A.say(g, [{ s: 'ADRENALINA', scale: 2 }], 34);
    if (f >= 12) A.say(g, [{ s: 'EL PULSO SE DISPARA', color: P.petal }], 58);
    R.pxtext(g, '♥ ' + bpm + ' BPM', 90, 206, { scale: 2, color: P.gold, shadow: P.ink, align: 'center' });
    R.px(g, 8, 226, 164, 30, P.night);
    A.ecg(g, 8, 241, 164, Math.floor(f + (f * f) / 140), 40, P.mint, 11);
  }
  FILM.scene({
    id: 'pulse',
    draw(ctx, t, info) {
      const tt = Math.max(0, Math.min(t, info.dur || t));
      const nb = FILM.native();
      paint(nb.ctx, Math.min(nes.frameOf(tt), 143), info.frame);
      FILM.presentNearest(nb.canvas, ctx);
    },
  });
})();
