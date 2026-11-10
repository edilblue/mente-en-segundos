// src/sprites.js : the cast, palette and shared drawing helpers of "Mente y corazon enamorados".
// Vertical retro film: native buffer 180 x 320, presented x6 nearest to 1080 x 1920.
//
// THE CAST (section 10.3 of docs/art-bible.md)
//   yo_idle, yo_walk1..3      16x24  the hero: short hair, blue shirt   (slot 1 ink, 2 skin, 3 shirt)
//   amor_idle, amor_walk1..3  16x24  the loved one: long hair, pink shirt (same slots)
//   brain                     40x30  a brain in profile, facing left (a fill, b folds, k outline)
//   brainGrey                 40x30  the same map in greys (the "judgement off" lobe)
//   heart24, heart28          28x26  the heart, relaxed and full (beat = swap the two)
//   fly1, fly2                7x6    a butterfly, wings open / closed
//   spark                     5x5    a dopamine spark
//
// SHARED HELPERS on FILM.amor (all whole native pixels, NES colours only):
//   bg(g, col)                     paint the whole 180x320 buffer
//   stars(g, f, seed, col)         a twinkling star field
//   disc(g, cx, cy, r, col)        filled pixel circle;  ring(...) its 1 px outline
//   ellipse(g, cx, cy, rx, ry, col)
//   heartAt(g, cx, cy, big)        the heart sprite centred, scale 2
//   beat(f, period, phase)         true on the "full" frames of a heartbeat
//   say(g, lines, y)               centred caption lines [{ s, scale, color }], shadowed, returns next y
//   ecg(g, x0, y0, w, f, speed, col, amp)  a scrolling heartbeat trace
(function () {
  const R = FILM.retro;
  const C = R.C;
  Object.assign(R.RETRO_PAL, {
    ink: C(0x0f), // $0F #000000 outlines, night
    hudWhite: C(0x30), // $30 #FCFCFC captions
    night: C(0x01), // $01 #24188C deep night blue backdrop
    plum: C(0x04), // $04 #8C0074 love backdrop
    wine: C(0x05), // $05 #A80010 heart shade
    love: C(0x15), // $15 #E40058 heart fill
    blush: C(0x25), // $25 #FC74B4 highlight, oxytocin
    petal: C(0x35), // $35 #FCC4D8 soft pink text
    brain: C(0x36), // $36 #FCBCB0 brain fill
    fold: C(0x26), // $26 #FC7460 brain folds
    gold: C(0x28), // $28 #F0BC3C dopamine, keywords
    amber: C(0x38), // $38 #FCE4A0 spark core
    skin: C(0x37), // $37 #FCD8A8 skin
    blue: C(0x11), // $11 #0070EC hero shirt
    sky: C(0x21), // $21 #3CBCFC cool accent, ECG
    mint: C(0x2a), // $2A #4CDC48 ON
    red: C(0x16), // $16 #D82800 OFF
    steel: C(0x10), // $10 #BCBCBC grey lobe fill
    shadow: C(0x00), // $00 #747474 grey lobe folds, ground
    violet: C(0x13), // $13 #8000F0 serotonin
  });
  const P = R.RETRO_PAL;

  // ------------------------------------------------------------------ people (16x24)
  const head = [
    '.....111111.....',
    '....11111111....',
    '...1111111111...',
    '...1122222211...',
    '...1222222221...',
    '...1212222121...',
    '...1222222221...',
    '...1222112221...',
    '....12222221....',
    '.....111111.....',
    '......1221......',
  ];
  const longHead = head.map((row, i) => (i >= 3 && i <= 10 ? '..1' + row.slice(3, 13) + '1..' : row));
  const torso = [
    '....13333331....',
    '...1333333331...',
    '..133133331331..',
    '..131333333131..',
    '..121333333121..',
    '...1133333311...',
    '....13333331....',
    '....11111111....',
  ];
  const legs = {
    idle: ['....111..111....', '....11....11....', '....11....11....', '...111....111...', '................'],
    walk1: ['....111..111....', '...11......11...', '..11........11..', '.111........111.', '................'],
    walk2: ['.....111111.....', '......1111......', '......1111......', '.....111111.....', '................'],
    walk3: ['....111..111....', '....11...11.....', '...11.....11....', '..111.....111...', '................'],
  };
  R.SPAL.yo = Object.freeze([P.ink, P.skin, P.blue]);
  R.SPAL.amor = Object.freeze([P.ink, P.skin, P.blush]);
  for (const k of Object.keys(legs)) {
    R.SPRITES_DEF['yo_' + k] = { l: R.slots(R.SPAL.yo), r: head.concat(torso, legs[k]) };
    R.SPRITES_DEF['amor_' + k] = { l: R.slots(R.SPAL.amor), r: longHead.concat(torso, legs[k]) };
  }

  // ------------------------------------------------------------------ the brain (generated map, 40x30)
  function brainRows() {
    const W = 40, H = 30;
    const inside = (x, y) => {
      const lobe = ((x - 19.5) / 18.5) ** 2 + ((y - 11.5) / 11) ** 2 < 1; // cerebrum
      const cereb = ((x - 29) / 7) ** 2 + ((y - 21.5) / 4.5) ** 2 < 1; // cerebellum, back-low
      const stem = x >= 22 && x <= 26 && y >= 18 && y <= 28; // brain stem
      return lobe || cereb || stem;
    };
    const rows = [];
    for (let y = 0; y < H; y++) {
      let s = '';
      for (let x = 0; x < W; x++) {
        if (!inside(x, y)) { s += '.'; continue; }
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        if (edge) { s += 'k'; continue; }
        const lobe = ((x - 19.5) / 18.5) ** 2 + ((y - 11.5) / 11) ** 2 < 1;
        // the folds: wavy gyri on the cerebrum, horizontal bands on the cerebellum
        const gy = Math.abs(Math.sin(x * 0.55 + 2.2 * Math.sin(y * 0.6))) < 0.22 && y % 2 === 0;
        const band = !lobe && y % 2 === 1 && x > 22;
        const fissure = lobe && y === Math.round(15 + (x - 6) * 0.12) && x > 6 && x < 30; // lateral sulcus
        s += gy || band || fissure ? 'b' : 'a';
      }
      rows.push(s);
    }
    return rows;
  }
  const BR = brainRows();
  R.SPRITES_DEF.brain = { l: { a: P.brain, b: P.fold, k: P.ink }, r: BR };
  R.SPRITES_DEF.brainGrey = { l: { a: P.steel, b: P.shadow, k: P.ink }, r: BR };

  // ------------------------------------------------------------------ the heart (generated maps)
  function heartRows(w) {
    const W = 28, H = 26;
    const s = w / 2.4;
    const inside = (x, y) => {
      const u = (x - 13.5) / s, v = -(y - 11) / s;
      const q = u * u + v * v - 1;
      return q * q * q - u * u * v * v * v <= 0;
    };
    const rows = [];
    for (let y = 0; y < H; y++) {
      let r = '';
      for (let x = 0; x < W; x++) {
        if (!inside(x, y)) { r += '.'; continue; }
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const hi = ((x - 8) / 2.6) ** 2 + ((y - 6) / 2) ** 2 < 1; // the shine, upper left
        r += edge ? 'k' : hi ? 'c' : 'a';
      }
      rows.push(r);
    }
    return rows;
  }
  R.SPRITES_DEF.heart24 = { l: { a: P.love, c: P.blush, k: P.wine }, r: heartRows(22) };
  R.SPRITES_DEF.heart28 = { l: { a: P.love, c: P.blush, k: P.wine }, r: heartRows(26) };

  // ------------------------------------------------------------------ small props
  R.SPRITES_DEF.fly1 = {
    l: { a: P.gold, b: P.amber, k: P.ink },
    r: ['aa...aa', 'aba.aba', 'abbkbba', '.abkba.', '.aakaa.', '..a.a..'],
  };
  R.SPRITES_DEF.fly2 = {
    l: { a: P.gold, b: P.amber, k: P.ink },
    r: ['...k...', '..aka..', '.abkba.', '.abkba.', '..aka..', '...k...'],
  };
  R.SPRITES_DEF.spark = {
    l: { a: P.gold, b: P.amber },
    r: ['..a..', '.aba.', 'abbba', '.aba.', '..a..'],
  };

  // ------------------------------------------------------------------ helpers
  const W = 180, H = 320;
  const hash = (n) => {
    let x = (n | 0) * 374761393 + 668265263;
    x = (x ^ (x >>> 13)) * 1274126177;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };
  const A = {
    W, H, hash,
    bg(g, col) { R.px(g, 0, 0, W, H, col); },
    stars(g, f, seed, col) {
      for (let i = 0; i < 46; i++) {
        const x = Math.floor(hash(seed * 97 + i) * W);
        const y = Math.floor(hash(seed * 131 + i * 7 + 1) * H);
        const on = (Math.floor(f / 12) + i) % 7 !== 0;
        if (on) R.px(g, x, y, 1, 1, col);
        if (i % 9 === 0 && on) { R.px(g, x - 1, y, 3, 1, col); R.px(g, x, y - 1, 1, 3, col); }
      }
    },
    ellipse(g, cx, cy, rx, ry, col) {
      for (let dy = -ry; dy <= ry; dy++) {
        const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.0001);
        R.px(g, cx - hw, cy + dy, hw * 2 + 1, 1, col);
      }
    },
    disc(g, cx, cy, r, col) { A.ellipse(g, cx, cy, r, r, col); },
    ring(g, cx, cy, r, col) {
      for (let dy = -r; dy <= r; dy++) {
        const hw = Math.floor(r * Math.sqrt(Math.max(0, 1 - (dy * dy) / (r * r))) + 0.0001);
        R.px(g, cx - hw, cy + dy, 1, 1, col);
        R.px(g, cx + hw, cy + dy, 1, 1, col);
      }
      for (let dx = -r; dx <= r; dx++) {
        const hh = Math.floor(r * Math.sqrt(Math.max(0, 1 - (dx * dx) / (r * r))) + 0.0001);
        R.px(g, cx + dx, cy - hh, 1, 1, col);
        R.px(g, cx + dx, cy + hh, 1, 1, col);
      }
    },
    beat(f, period, phase) {
      const k = (((f + (phase || 0)) % period) + period) % period;
      return k < 6 || (k >= 12 && k < 16);
    },
    heartAt(g, cx, cy, big, scale) {
      const sc = scale || 2;
      R.sprite(g, big ? 'heart28' : 'heart24', cx - 14 * sc, cy - 13 * sc, { scale: sc });
    },
    say(g, lines, y) {
      let yy = y;
      for (const ln of lines) {
        const sc = ln.scale || 1;
        if (ln.s) R.pxtext(g, ln.s, 90, yy, { scale: sc, color: ln.color || P.hudWhite, shadow: P.ink, align: 'center' });
        yy += 7 * sc + (ln.gap != null ? ln.gap : 4 * sc);
      }
      return yy;
    },
    ecg(g, x0, y0, w, f, speed, col, amp) {
      // one beat every `speed` px of trace; the trace scrolls left 2 px a frame
      const a = amp || 10;
      let prev = null;
      for (let x = 0; x < w; x++) {
        const k = (((x + f * 2) % speed) + speed) % speed;
        const y = k === 10 ? -a : k === 11 ? a / 2 : k === 9 ? 2 : k === 12 ? -2 : 0;
        const yy = y0 + Math.round(y);
        if (prev != null && Math.abs(prev - yy) > 1) {
          const lo = Math.min(prev, yy), hi = Math.max(prev, yy);
          R.px(g, x0 + x, lo, 1, hi - lo + 1, col);
        } else R.px(g, x0 + x, yy, 1, 1, col);
        prev = yy;
      }
    },
    person(g, who, x, y, f, moving, flip, scale) {
      const pose = moving ? 'walk' + (1 + FILM.nes.step(f, 6, 3)) : 'idle';
      R.sprite(g, who + '_' + pose, x, y, { flip: !!flip, scale: scale || 1 });
    },
  };
  FILM.amor = A;
})();
