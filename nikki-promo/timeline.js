/* Nikki Accesorios — promo 15 s. Línea de tiempo GSAP determinista (se renderiza cuadro a cuadro con tl.seek). */
(() => {
  const A = window.ASSETS;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // Tiempos sincronizados con la narración (voz Leda, inicia en 0.5 s; ver README)
  const T = {
    s2: 2.4,      // "En Nikki Accesorios creamos bisutería…"
    hecho: 4.35,  // "…hecha a mano" (4.6–5.3)
    s3: 5.4,      // "…que se roba todas las miradas"
    anillos: 7.95,// "anillos" ~8.15
    stickers: 8.85,// "stickers" ~8.9
    s4: 9.4,      // "y más. Encuentra tu estilo…"
    estilo: 10.25,
    s5: 11.45,    // "…en @nikkii.accesorios"
    dm: 13.25,    // "Pedidos al DM" 13.36
    end: 15,
  };

  // PRNG determinista
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- assets ----------
  const one = (k) => Array.isArray(A[k]) ? A[k][0] : A[k];
  $$('img[data-asset]').forEach((im) => { im.src = one(im.dataset.asset); });

  function frameWithImg(src, cls = '') {
    const f = document.createElement('div'); f.className = 'frame ' + cls;
    const im = document.createElement('img'); im.src = src; f.appendChild(im); return f;
  }
  function fillFrame(f, srcs) {
    // varias fotos dentro de un mismo marco (p. ej. stickers de gatos + K-pop): se apilan
    f.innerHTML = '';
    srcs.forEach((s, i) => {
      const im = document.createElement('img'); im.src = s;
      const h = 100 / srcs.length;
      Object.assign(im.style, { top: (i * h) + '%', height: h + '%', bottom: 'auto' });
      f.appendChild(im);
      if (i > 0) { const d = document.createElement('div'); Object.assign(d.style, { position: 'absolute', left: '6%', right: '6%', top: (i * h) + '%', height: '2px', marginTop: '-1px', background: 'linear-gradient(90deg,transparent,#d9dbe3,transparent)' }); f.appendChild(d); }
    });
  }
  // diapositivas con capas de glitch (rojo / azul desplazados)
  $$('.slide').forEach((sl) => {
    const v = A[sl.dataset.asset]; const srcs = Array.isArray(v) ? v : [v];
    const base = document.createElement('div'); base.className = 'frame'; fillFrame(base, srcs);
    const r = document.createElement('div'); r.className = 'gl r'; const rf = document.createElement('div'); rf.className = 'frame'; fillFrame(rf, srcs); r.appendChild(rf);
    const b = document.createElement('div'); b.className = 'gl b'; const bf = document.createElement('div'); bf.className = 'frame'; fillFrame(bf, srcs); b.appendChild(bf);
    sl.append(base, r, b);
    for (let i = 0; i < 3; i++) { const s = document.createElement('div'); s.className = 'slab'; sl.appendChild(s); }
  });

  // collage
  const tiles = [
    ['collar'], ['pulsera'], ['anillos'], ['LOGO'], [one('stickers')], [Array.isArray(A.stickers) ? A.stickers[1] || A.stickers[0] : A.stickers],
  ];
  const grid = $('#grid');
  tiles.forEach(([k], i) => {
    const t = document.createElement('div'); t.className = 'tile' + (k === 'LOGO' ? ' logo' : '');
    t.style.left = (i % 2) * 416 + 'px'; t.style.top = Math.floor(i / 2) * 410 + 'px';
    const im = document.createElement('img'); im.src = k === 'LOGO' ? A.logo : (A[k] ? one(k) : k);
    t.appendChild(im); grid.appendChild(t);
  });

  // texto → letras
  function split(el) {
    const txt = el.textContent; el.textContent = '';
    // el degradado plateado (background-clip:text) debe ir en cada letra, si no desaparece al transformarlas
    const silver = el.classList.contains('silver'); el.classList.remove('silver');
    for (const c of txt) { const s = document.createElement('span'); s.className = 'ch' + (silver ? ' silver' : ''); s.textContent = c === ' ' ? ' ' : c; el.appendChild(s); }
    return el.querySelectorAll('.ch');
  }
  // ajustar títulos al ancho seguro (≤ 940 px), midiendo el texto y no el contenedor
  function fit(el, max = 940) {
    const m = document.createElement('span'); m.style.whiteSpace = 'nowrap';
    while (el.firstChild) m.appendChild(el.firstChild); el.appendChild(m);
    let fs = parseFloat(getComputedStyle(el).fontSize);
    while (m.getBoundingClientRect().width > max && fs > 30) { fs -= 2; el.style.fontSize = fs + 'px'; }
    el.textContent = m.textContent;
  }

  // ---------- telaraña / hilos plateados (escena 2) ----------
  const web = $('#web'); const NS = 'http://www.w3.org/2000/svg';
  const webPaths = [];
  function addPath(d, w, op) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.style.strokeWidth = w; p.style.opacity = op; web.appendChild(p); webPaths.push(p); return p; }
  function cornerWeb(cx, cy, a0, a1, rays, rings, R) {
    const angs = Array.from({ length: rays }, (_, i) => a0 + (a1 - a0) * i / (rays - 1));
    angs.forEach((a) => addPath(`M${cx},${cy} L${cx + Math.cos(a) * R},${cy + Math.sin(a) * R}`, 2, .75));
    for (let k = 1; k <= rings; k++) {
      const r = R * k / (rings + .4);
      let d = '';
      angs.forEach((a, i) => {
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) d = `M${x},${y}`; else {
          const am = (a + angs[i - 1]) / 2, rm = r * .9;
          d += ` Q${cx + Math.cos(am) * rm},${cy + Math.sin(am) * rm} ${x},${y}`;
        }
      });
      addPath(d, 1.4, .6);
    }
  }
  cornerWeb(60, 250, 0, Math.PI / 2, 7, 5, 330);
  cornerWeb(1020, 1450, Math.PI, Math.PI * 1.5, 7, 5, 330);
  // hilos colgantes
  [[860, 0, 330], [935, 0, 520], [150, 1380, 1460]].forEach(([x, y0, y1], i) => addPath(`M${x},${y0} C${x + 10},${(y0 + y1) / 2} ${x - 8},${(y0 + y1) / 2} ${x},${y1}`, 1.6, .7));
  // hilo que contornea el marco
  addPath('M110,1100 L110,750 A430,430 0 0 1 970,750 L970,1100', 1.6, .55);
  webPaths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.len = L; });

  // ---------- línea de tiempo ----------
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const sparks = $('#sparks');
  function spark(x, y, size, at, dur = .7, rot = 90) {
    const s = document.createElement('div'); s.className = 'star';
    s.innerHTML = '<svg><use href="#starShape"/></svg>';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.filter = 'drop-shadow(0 0 12px rgba(185,167,224,.95)) drop-shadow(0 0 30px rgba(185,167,224,.6))';
    sparks.appendChild(s);
    gsap.set(s, { scale: 0, opacity: 0 });
    tl.to(s, { scale: size, opacity: 1, rotation: rot * .5, duration: dur * .45, ease: 'back.out(2)' }, at)
      .to(s, { scale: 0, opacity: 0, rotation: rot, duration: dur * .55, ease: 'power2.in' }, at + dur * .45);
    return s;
  }
  const show = (el, at) => tl.set(el, { opacity: 1 }, at);
  const hide = (el, at) => tl.set(el, { opacity: 0 }, at);
  function kinetic(el, at, { stagger = .03, dur = .5, from = 90 } = {}) {
    fit(el); const ch = split(el);
    gsap.set(ch, { opacity: 0, y: from, rotationX: -80, transformPerspective: 600 });
    tl.to(ch, { opacity: 1, y: 0, rotationX: 0, duration: dur, stagger, ease: 'back.out(1.7)' }, at);
    return ch;
  }
  function kOut(el, at, d = .16) { tl.to(el, { opacity: 0, y: -30, filter: 'blur(8px)', duration: d, ease: 'power2.in' }, at); }

  // ===== 1 · intro (0 – 2.4) =====
  show('#s1', 0);
  const big = document.createElement('div'); big.className = 'star';
  big.innerHTML = '<svg><use href="#starShape"/></svg>';
  Object.assign(big.style, { left: '540px', top: '720px', filter: 'drop-shadow(0 0 16px rgba(185,167,224,1)) drop-shadow(0 0 50px rgba(185,167,224,.7))' });
  sparks.appendChild(big);
  gsap.set(big, { scale: 0, opacity: 0 });
  tl.to(big, { scale: 1.6, opacity: 1, rotation: 45, duration: .6, ease: 'back.out(1.6)' }, .05)
    .to(big, { scale: 14, opacity: 0, rotation: 90, duration: .55, ease: 'power2.in' }, .62)
    .fromTo('#flash', { opacity: 0, scale: .2 }, { opacity: 1, scale: 1, duration: .32, ease: 'power2.out' }, .78)
    .to('#flash', { opacity: 0, duration: .7, ease: 'power2.inOut' }, 1.1)
    .fromTo('#logo1', { opacity: 0, scale: .45, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: .8, ease: 'back.out(1.5)' }, .82)
    .to('#logo1', { scale: 1.05, duration: 1.4, ease: 'sine.inOut' }, 1.62);
  kinetic($('#t1a'), 1.05, { stagger: .05, dur: .55 });
  tl.fromTo('#t1b', { opacity: 0, letterSpacing: '.6em' }, { opacity: 1, letterSpacing: '.14em', duration: .8 }, 1.3)
    .fromTo('#k1', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .5 }, 1.55);
  spark(770, 520, .55, 1.15); spark(300, 960, .35, 1.4); spark(860, 1130, .3, 1.75);
  tl.to('#s1', { opacity: 0, scale: 1.08, filter: 'blur(10px)', duration: .3, ease: 'power2.in' }, T.s2 - .2);
  hide('#s1', T.s2 + .1);

  // ===== 2 · collar (2.4 – 5.4) =====
  show('#s2', T.s2 - .15);
  gsap.set('#s2', { opacity: 0 });
  tl.to('#s2', { opacity: 1, duration: .35, ease: 'power1.out' }, T.s2 - .15)
    .fromTo('#f2', { y: 140, scale: .9 }, { y: -30, scale: 1, duration: 3.1, ease: 'power2.out' }, T.s2 - .15)
    .fromTo('#img2', { scale: 1.32, y: -50 }, { scale: 1.08, y: 30, duration: 3.3, ease: 'sine.out' }, T.s2 - .15)
    .fromTo('#web', { y: 60 }, { y: -70, duration: 3.2, ease: 'sine.out' }, T.s2 - .15);
  webPaths.forEach((p, i) => tl.to(p, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, T.s2 + .15 + i * .045));
  tl.fromTo('#k2', { opacity: 0, letterSpacing: '.8em' }, { opacity: 1, letterSpacing: '.42em', duration: .6 }, T.hecho - .2);
  kinetic($('#t2'), T.hecho, { stagger: .035 });
  spark(160, 360, .5, 3.0); spark(930, 1330, .45, 3.6); spark(720, 330, .3, 4.5); spark(140, 1200, .3, 4.9);

  // ===== 3 · cortes rápidos (5.4 – 9.4) =====
  show('#s3', T.s3);
  const slides = ['#sl1', '#sl2', '#sl3'];
  const cuts = [T.s3, T.anillos, T.stickers];
  const R = rng(42);
  slides.forEach((id, i) => {
    const at = cuts[i], sl = $(id);
    const fr = sl.querySelector('.frame');
    const imgs = sl.querySelectorAll(':scope > .frame img');
    gsap.set(sl, { clipPath: 'polygon(0% 0%, 0% 0%, -30% 100%, -30% 100%)' });
    const dir = i % 2 ? -1 : 1;
    if (dir < 0) gsap.set(sl, { clipPath: 'polygon(130% 0%, 130% 0%, 100% 100%, 100% 100%)' });
    tl.to(sl, { clipPath: dir > 0 ? 'polygon(0% 0%, 130% 0%, 100% 100%, -30% 100%)' : 'polygon(-30% 0%, 130% 0%, 100% 100%, -30% 100%)', duration: .38, ease: 'power3.out' }, at - .08);
    const nxt = cuts[i + 1] ?? T.s4;
    tl.fromTo(imgs, { scale: 1.22 }, { scale: 1.06, duration: nxt - at + .3, ease: 'sine.out' }, at - .08)
      .fromTo(fr, { x: 60 * dir, rotation: 1.5 * dir }, { x: 0, rotation: 0, duration: .7, ease: 'back.out(1.4)' }, at - .08);
    // glitch suave
    const r = sl.querySelector('.gl.r'), b = sl.querySelector('.gl.b');
    const steps = 5;
    for (let k = 0; k < steps; k++) {
      const t0 = at - .06 + k * .045;
      tl.set(r, { opacity: .55, x: (R() * 2 - 1) * 26, y: (R() * 2 - 1) * 6 }, t0)
        .set(b, { opacity: .55, x: (R() * 2 - 1) * -26, y: (R() * 2 - 1) * 6 }, t0);
    }
    tl.set([r, b], { opacity: 0, x: 0, y: 0 }, at - .06 + steps * .045);
    sl.querySelectorAll('.slab').forEach((s, k) => {
      tl.set(s, { top: 290 + R() * 1100, opacity: .8, height: 2 + R() * 8 }, at - .04 + k * .05)
        .set(s, { opacity: 0 }, at + .02 + k * .05);
    });
    tl.to('#bg', { duration: 0 }, at);
  });
  // textos cinéticos
  kinetic($('#t3a'), T.s3 + .12, { stagger: .04 });
  $('#t3a').style.filter = 'drop-shadow(0 0 16px rgba(200,16,46,.95)) drop-shadow(0 0 40px rgba(200,16,46,.55))';
  kOut('#t3a', T.anillos - .16);
  kinetic($('#t3b'), T.anillos + .06, { stagger: .022, dur: .36 });
  kOut('#t3b', T.stickers - .14);
  kinetic($('#t3c'), T.stickers + .05, { stagger: .02, dur: .32 });
  kOut('#t3c', T.s4 - .1, .12);
  spark(900, 340, .45, 5.9); spark(170, 1340, .35, 6.6); spark(880, 1300, .4, 8.3); spark(200, 380, .4, 9.0);
  hide('#s2', T.s3 + .4);
  tl.to('#s3', { opacity: 0, scale: .94, duration: .22, ease: 'power2.in' }, T.s4 - .12);
  hide('#s3', T.s4 + .12);

  // ===== 4 · collage (9.4 – 11.45) =====
  show('#s4', T.s4 - .05);
  const tileEls = $$('#grid .tile');
  gsap.set(tileEls, { opacity: 0, scale: .3, rotation: (i) => (i % 2 ? 8 : -8) });
  tl.to(tileEls, { opacity: 1, scale: 1, rotation: 0, duration: .55, stagger: .1, ease: 'back.out(2.2)' }, T.s4)
    .fromTo('#grid', { scale: 1.0 }, { scale: 1.04, duration: 2.2, ease: 'sine.inOut' }, T.s4)
    .fromTo('#grid .tile img', { scale: 1.12 }, { scale: 1.0, duration: 2.2, ease: 'sine.out' }, T.s4);
  tileEls.forEach((t, i) => {
    const x = 136 + (i % 2) * 416 + (i % 2 ? 380 : 12), y = 290 + Math.floor(i / 2) * 410 + 14;
    spark(x, y, .32, T.s4 + .18 + i * .1, .6);
  });
  kinetic($('#t4'), T.estilo, { stagger: .028, dur: .45, from: 50 });
  // salida: las fichas se recogen hacia el centro
  tl.to(tileEls, { opacity: 0, scale: .2, x: (i) => (i % 2 ? -180 : 180), y: (i) => (1 - Math.floor(i / 2)) * 300, duration: .32, stagger: .025, ease: 'power3.in' }, T.s5 - .3)
    .to('#t4', { opacity: 0, duration: .2 }, T.s5 - .3);
  hide('#s4', T.s5 + .1);

  // ===== 5 · cierre (11.45 – 15) =====
  show('#s5', T.s5 - .1);
  const fin = spark(540, 610, 1.2, T.s5 - .12, .7, 120);
  tl.fromTo('#logo5', { opacity: 0, scale: .5 }, { opacity: 1, scale: 1, duration: .75, ease: 'back.out(1.6)' }, T.s5)
    .to('#logo5', { scale: 1.04, duration: 3, ease: 'sine.inOut' }, T.s5 + .75);
  kinetic($('#handleTxt'), T.s5 + .2, { stagger: .022, dur: .4, from: 40 });
  tl.fromTo('#handle .u', { scaleX: 0 }, { scaleX: 1, duration: .7, ease: 'power2.out' }, T.s5 + .5);
  tl.fromTo('#pill', { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: .5, ease: 'back.out(1.8)' }, T.dm - .1);
  kinetic($('#dmTxt'), T.dm, { stagger: .03, dur: .4, from: 50 });
  tl.fromTo('#dm .emo', { opacity: 0, scale: 0, rotation: -25 }, { opacity: 1, scale: 1, rotation: 0, duration: .5, ease: 'back.out(2.5)' }, T.dm + .35);
  const ap = $('#arrow path'); const al = ap.getTotalLength(); gsap.set(ap, { strokeDasharray: al, strokeDashoffset: al });
  tl.to(ap, { strokeDashoffset: 0, duration: .45, ease: 'power2.out' }, T.dm + .3)
    .to('#arrow', { y: 26, duration: .32, ease: 'sine.inOut', repeat: 3, yoyo: true }, T.dm + .75);
  spark(800, 420, .45, 12.2); spark(240, 900, .3, 12.8);
  spark(540, 1060, 1.0, 14.05, .8, 135);   // último destello ✦
  tl.to('#fade', { opacity: 1, duration: .55, ease: 'power1.in' }, T.end - .55);
  tl.set({}, {}, T.end);

  // ---------- partículas y grano (por cuadro) ----------
  const dctx = $('#dust').getContext('2d');
  const pr = rng(7); const P = Array.from({ length: 70 }, () => ({ x: pr() * 1080, y: pr() * 1920, r: .8 + pr() * 2.6, v: 10 + pr() * 35, ph: pr() * 6.28, c: pr() < .6 ? '217,219,227' : '185,167,224', z: .4 + pr() }));
  function drawDust(t) {
    dctx.clearRect(0, 0, 1080, 1920);
    for (const p of P) {
      const y = ((p.y - t * p.v * p.z) % 1920 + 1920) % 1920;
      const x = p.x + Math.sin(t * .6 + p.ph) * 18 * p.z;
      const a = .25 + .55 * (.5 + .5 * Math.sin(t * 2.2 + p.ph * 3));
      dctx.beginPath(); dctx.fillStyle = `rgba(${p.c},${a})`; dctx.shadowColor = `rgba(${p.c},.9)`; dctx.shadowBlur = 8;
      dctx.arc(x, y, p.r * p.z, 0, 6.283); dctx.fill();
    }
  }
  const gc = $('#grain'); const gctx = gc.getContext('2d'); const gimg = gctx.createImageData(540, 960);
  function drawGrain(f) {
    const r = rng(1000 + f); const d = gimg.data;
    for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    gctx.putImageData(gimg, 0, 0);
  }

  window.DURATION = T.end;
  window.renderAt = (t) => { tl.seek(Math.min(t, T.end - 1e-4), false); drawDust(t); drawGrain(Math.round(t * 30)); };
  window.READY = Promise.all([document.fonts.ready, ...$$('img').map((i) => i.decode().catch(() => console.warn('img fail', i.src)))]).then(() => { renderAt(0); return true; });
})();
