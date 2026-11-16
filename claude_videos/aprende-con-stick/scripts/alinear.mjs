// Alineación aproximada palabra→tiempo a partir de las pausas reales del audio
// (reutilizado del proyecto stickman-remotion del mismo repositorio).
export const PAUSA = (w) => (/[…]$|\.\.\.$/.test(w) ? 3 : /[.!?:]$/.test(w) ? 2 : /[,;]$/.test(w) ? 1 : 0);
export const peso = (w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length + (/\d/.test(w) ? 4 : 0)) + 1.2;

function repartir(words, t0, t1) {
  const total = words.reduce((s, w) => s + peso(w), 0);
  let t = t0;
  return words.map((w) => {
    const d = ((t1 - t0) * peso(w)) / total;
    const r = {w, start: +t.toFixed(3), end: +(t + d).toFixed(3)};
    t += d;
    return r;
  });
}

// Divide el texto en frases (cortes en puntuación) y reparte las palabras entre
// los tramos con voz detectados en el audio.
export function alinear(texto, inicio, fin, silencios) {
  const words = texto.split(/\s+/).filter(Boolean);
  const cortes = []; // índice de palabra tras la cual hay pausa
  words.forEach((w, i) => i < words.length - 1 && PAUSA(w) > 0 && cortes.push(i));
  let elegidos = cortes;
  let sil = silencios.filter((s) => s.start > inicio + 0.05 && s.end < fin - 0.05);
  if (sil.length > cortes.length) {
    sil = [...sil].sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, cortes.length);
    sil.sort((a, b) => a.start - b.start);
  } else if (sil.length < cortes.length) {
    elegidos = [...cortes]
      .sort((a, b) => PAUSA(words[b]) - PAUSA(words[a]) || a - b)
      .slice(0, sil.length)
      .sort((a, b) => a - b);
  }
  const res = [];
  let desde = 0;
  let t = inicio;
  elegidos.forEach((c, k) => {
    res.push(...repartir(words.slice(desde, c + 1), t, sil[k].start));
    desde = c + 1;
    t = sil[k].end;
  });
  res.push(...repartir(words.slice(desde), t, fin));
  return res;
}

// Con audio real: reparte las palabras (por longitud) solo sobre el tiempo con voz,
// saltando todas las pausas detectadas, estén o no en la puntuación.
function alinearVoz(texto, inicio, fin, silencios) {
  const words = texto.split(/\s+/).filter(Boolean);
  const segs = [];
  let t = inicio;
  for (const s of silencios.filter((x) => x.end > inicio && x.start < fin).sort((a, b) => a.start - b.start)) {
    if (s.start > t) segs.push([t, s.start]);
    t = Math.max(t, s.end);
  }
  if (fin > t) segs.push([t, fin]);
  const total = segs.reduce((a, [x, y]) => a + (y - x), 0);
  const aReal = (v, inicioDePalabra) => {
    for (let i = 0; i < segs.length; i++) {
      const [x, y] = segs[i];
      const len = y - x;
      // una palabra que empezaría en los últimos 0,12 s de un tramo, empieza tras la pausa
      if (v < len - (inicioDePalabra && i < segs.length - 1 ? 0.06 : 0) || i === segs.length - 1) return x + Math.min(v, len);
      v = Math.max(0, v - len);
    }
    return fin;
  };
  const pesos = words.map(peso);
  const sum = pesos.reduce((a, b) => a + b, 0);
  let acc = 0;
  return words.map((w, i) => {
    const v0 = (acc / sum) * total;
    acc += pesos[i];
    const v1 = (acc / sum) * total;
    return {w, start: +aReal(v0, true).toFixed(3), end: +aReal(v1, false).toFixed(3)};
  });
}

// Con audio: empareja (en orden) signos de puntuación con pausas reales eligiendo el
// emparejamiento cuyo ritmo de habla sea más constante (camino mínimo en un DAG), y
// dentro de cada tramo reparte las palabras por tiempo con voz.
export function alinearAudio(texto, inicio, fin, silencios) {
  const words = texto.split(/\s+/).filter(Boolean);
  const sil = silencios.filter((x) => x.start > inicio + 0.05 && x.end < fin - 0.05).sort((a, b) => a.start - b.start);
  const W = words.map(peso);
  const cum = [0];
  W.forEach((w) => cum.push(cum[cum.length - 1] + w));
  const voz = (t0, t1) => sil.reduce((a, x) => a - (x.start >= t0 && x.end <= t1 ? x.end - x.start : 0), t1 - t0);
  const ritmo = cum[words.length] / Math.max(0.1, voz(inicio, fin));
  const breaks = words.map((w, i) => i).filter((i) => i < words.length - 1 && PAUSA(words[i]));
  // nodos: inicio, (break, pausa), fin
  const nodos = [{w: -1, t0: inicio, t1: inicio, si: -1}];
  breaks.forEach((bi) => sil.forEach((x, si) => nodos.push({w: bi, t0: x.start, t1: x.end, si})));
  nodos.push({w: words.length - 1, t0: fin, t1: fin, si: sil.length});
  const costo = (a, b) => {
    if (b.w <= a.w || b.si <= a.si || b.t0 < a.t1) return Infinity;
    const n = b.w - a.w;
    const v = voz(a.t1, b.t0);
    if (v < 0.12 * n) return Infinity;
    const r = (cum[b.w + 1] - cum[a.w + 1]) / v;
    const sinUsar = breaks.filter((x) => x > a.w && x < b.w).reduce((acc, x) => acc + 0.4 * PAUSA(words[x]), 0);
    const pausasLibres = sil.filter((x) => x.start >= a.t1 && x.end <= b.t0).reduce((acc, x) => acc + 0.8 * Math.min(1, x.end - x.start), 0);
    return Math.log(r / ritmo) ** 2 * n + sinUsar + pausasLibres;
  };
  const best = nodos.map(() => Infinity);
  const prev = nodos.map(() => -1);
  best[0] = 0;
  const orden = nodos.map((_, i) => i).sort((x, y) => nodos[x].w - nodos[y].w || nodos[x].si - nodos[y].si);
  for (const j of orden)
    for (const i of orden) {
      if (best[i] === Infinity) continue;
      const c = best[i] + costo(nodos[i], nodos[j]);
      if (c < best[j]) {
        best[j] = c;
        prev[j] = i;
      }
    }
  const camino = [];
  for (let j = nodos.length - 1; j >= 0; j = prev[j]) camino.unshift(nodos[j]);
  if (camino[0] !== nodos[0]) return alinearVoz(texto, inicio, fin, sil);
  const res = [];
  for (let k = 1; k < camino.length; k++) {
    const a = camino[k - 1];
    const b = camino[k];
    res.push(...alinearVoz(words.slice(a.w + 1, b.w + 1).join(' '), a.t1, b.t0, sil.filter((x) => x.start >= a.t1 && x.end <= b.t0)));
  }
  return res;
}

