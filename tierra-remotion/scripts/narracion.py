#!/usr/bin/env python3
"""Narración local con Kokoro TTS (es-419). Sintetiza frase por frase y escribe:
  public/audio/narracion.wav   pista completa (24 kHz mono)
  src/data/narracion.json      inicio/duración de cada escena, frases y palabras con tiempos
"""
import json, os, re, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.environ.get("KOKORO_DIR", os.path.join(ROOT, "..", "models"))
G = json.load(open(os.path.join(ROOT, "scripts", "guion.json"), encoding="utf8"))
SR = 24000
k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))

def trim(a, thr=0.01):
    idx = np.nonzero(np.abs(a) > thr)[0]
    if not len(idx): return a
    return a[max(idx[0] - int(.015 * SR), 0): min(idx[-1] + int(.05 * SR), len(a))]

def syl(w):
    return max(1, len(re.findall(r"[aeiouáéíóúü]+", w.lower())))

def words_in(text, t0, t1):
    ws = text.split()
    wt = [syl(w) + 0.6 + (0.8 if re.search(r"[,.:?!]$", w) else 0) for w in ws]
    tot = sum(wt); t = t0; out = []
    for w, p in zip(ws, wt):
        d = (t1 - t0) * p / tot
        out.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)}); t += d
    return out

track = []; t = 0.0; escenas = []
for e in G["escenas"]:
    start = t
    parts = [np.zeros(int(e["entrada"] * SR), np.float32)]; t += e["entrada"]
    frases = []
    for f in e["frases"]:
        a, sr = k.create(f, voice=G["voz"], speed=G["velocidad"], lang="es")
        assert sr == SR
        a = trim(a.astype(np.float32))
        d = len(a) / SR
        frases.append({"texto": f, "start": round(t - start, 3), "end": round(t - start + d, 3),
                       "palabras": words_in(f, t - start, t - start + d)})
        parts.append(a); t += d
        gap = 0.34 if re.search(r"[.?!:]$", f) else 0.16
        parts.append(np.zeros(int(gap * SR), np.float32)); t += gap
    t += e["salida"]
    dur = max(e["minimo"], t - start)
    pad = dur - (sum(len(p) for p in parts) / SR)
    parts.append(np.zeros(int(round(pad * SR)), np.float32))
    t = start + dur
    track.extend(parts)
    escenas.append({"id": e["id"], "nombre": e["nombre"], "inicio": round(start, 3), "duracion": round(dur, 3), "frases": frases})
    print(f"escena {e['id']}: {start:6.2f} → {start+dur:6.2f}  ({dur:.2f} s)")

audio = np.concatenate(track)
audio = audio / max(1e-6, np.abs(audio).max()) * 0.92
sf.write(os.path.join(ROOT, "public", "audio", "narracion.wav"), audio, SR)
json.dump({"generadoCon": "kokoro-onnx", "voz": G["voz"], "total": round(len(audio) / SR, 3), "escenas": escenas},
          open(os.path.join(ROOT, "src", "data", "narracion.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(f"total {len(audio)/SR:.2f} s")
