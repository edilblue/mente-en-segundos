// src/music.js : the chip score of "Mente y corazon enamorados". Speed 9 = 100 bpm, one bar = 2.4 s.
//
// THE SONG 'amor': 8 bars of 4/4 in G major, original, looping. Chords: G | Em | C | D | G | Bm | C D | G.
// The film plays it twice through bar 8 (0 to 19.2 s), the loop carries shot 09, then 'fin' (1 bar,
// no loop) closes the film on a rising G arpeggio that rings out by 24 s.
//
// ORIGINALITY RECORD (node tools/audio/melody.cjs amor): see the decoded bars pasted below.
//   bar 1: D5:2 G5:2 B5:4 A5:2 G5:2 E5:4
//   bar 2: G5:2 E5:2 B4:4 D5:2 E5:2 G5:4
//   bar 3: E5:3 G5 C6:4 B5:2 A5:2 G5:4
//   bar 4: F#5:2 E5:2 D5:2 E5:2 F#5:8
//   Known tunes in the same role (8-bit "love theme" jingles): none shares this opening — a rising
//   fifth-plus-third pickup (D-G-B) that falls back by step to E; the rhythm is 2-2-4 / 2-2-4.
FILM.chip.define({
  songs: {
    amor: {
      speed: 9,
      sections: { a: 0 },
      p1: '@lead | D5:2 G5:2 B5:4 A5:2 G5:2 E5:4 G5:2 E5:2 B4:4 D5:2 E5:2 G5:4 ' +
        'E5:3 G5 C6:4 B5:2 A5:2 G5:4 F#5:2 E5:2 D5:2 E5:2 F#5:8 ' +
        'B5:3 A5 G5:2 B5:2 D6:4 B5:4 A5:2 F#5:2 D5:2 F#5:2 B5:8 ' +
        'C6:2 B5:2 A5:2 G5:2 A5:2 B5:2 A5:4 G5:4 D5:4 G5:8',
      p2: '@harm | B4:8 D5:8 G4:8 B4:8 E4:8 G4:8 F#4:8 A4:8 ' +
        'D5:8 B4:8 F#4:8 D5:8 E4:8 F#4:8 B4:8 B4:8',
      t: '| G2:4 D3:4 G2:4 D3:4 E2:4 B2:4 E2:4 B2:4 C3:4 G2:4 C3:4 G2:4 D3:4 A2:4 D3:4 A2:4 ' +
        'G2:4 D3:4 G2:4 D3:4 B2:4 F#2:4 B2:4 F#2:4 C3:4 G2:4 D3:4 A2:4 G2:4 D3:4 G2:8',
      n: '| [h:2 h:2 s:2 h:2]16',
    },
    fin: {
      speed: 9,
      loop: false,
      sections: { a: 0 },
      p1: '@lead G5:2 B5:2 D6:2 G6:10',
      p2: '@harm D5:2 G5:2 B5:2 D6:10',
      t: 'G2:4 D3:4 G2:8',
      n: 's:2 r:14',
    },
  },
  sfx: {
    // beat: the heartbeat, a double triangle knock (lub-dub), loud on the cue frame
    beat: (ev, K) => ({ pri: 3, t: K.cat(K.tthud(98, 7, 0.9), K.gap(5), K.tthud(82, 9, 0.9)) }),
    // alert: two quick high blips, the "!" over the hero
    alert: (ev, K) => ({ pri: 3, p2: K.cat(K.pt(K.mhz('A6'), 3, { d: 2, v: [15, 15] }), K.gap(3), K.pt(K.mhz('A6'), 6, { d: 2, v: [14, 0] })) }),
    // pop: a heart appears, a rising square sweep
    pop: (ev, K) => ({ pri: 3, p2: K.pt(K.mhz('E5'), 14, { d: 2, v: [15, 3], bend: Math.pow(2, 1 / 9) }) }),
    // sparkle: a fast shimmer of two high notes, fading
    sparkle: (ev, K) => ({ pri: 2, p2: K.trill(K.mhz('B6'), K.mhz('E7'), 30, { v: [13, 0], d: 1 }) }),
    // flutter: wings, short noise ticks
    flutter: (ev, K) => ({ pri: 2, n: K.nz([[3, 9], [3, 0], [3, 7], [3, 0], [3, 8], [3, 0], [3, 6], [3, 0], [3, 5], [3, 0], [3, 3]]) }),
    // off: the judgement switch, a falling sweep into a click
    off: (ev, K) => ({ pri: 4, p1: K.pt(K.mhz('C6'), 24, { d: 2, v: [15, 0], bend: 0.94 }), n: K.nz([[8, 12], [9, 6], [10, 2]]) }),
    // chime: the hearts lock in step, a bright two-note bell
    chime: (ev, K) => ({ pri: 3, p2: K.cat(K.pt(K.mhz('G6'), 4, { d: 1, v: [15, 15] }), K.pt(K.mhz('D7'), 20, { d: 1, v: [13, 0] })) }),
  },
});
