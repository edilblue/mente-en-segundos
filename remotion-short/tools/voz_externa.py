"""Coloca una narración externa (p. ej. generada en ElevenLabs) en el Short.

El audio debe contener las 5 frases del guion en orden, separadas por pausas.
El script detecta las pausas, corta las 5 frases y coloca cada una al inicio
de su escena (acelerándola sin cambiar el tono si no cabe).

Uso (desde remotion-short/):
    python tools/voz_externa.py ruta/al/audio.mp3
    python tools/sonido.py        # rehace el ducking de la música
    npm run render
"""
import itertools
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
FPS = 30
TOTAL = 30.0

# (escena, texto, inicio en s, duración máxima en s)
LINES = [
    ("hook", "¿Qué pasaría si dejaras de dormir?", 0.15, 2.6),
    ("step1", "Después de veinticuatro horas despierto, tus reflejos se parecen a los de alguien que bebió alcohol.", 3.35, 7.3),
    ("step2", "Mientras duermes, tu cerebro limpia desechos que se acumulan durante el día. Sin dormir, esa limpieza no ocurre.", 11.35, 7.3),
    ("step3", "El récord registrado es de Randy Gardner: once días sin dormir, en mil novecientos sesenta y cuatro.", 19.35, 7.3),
    ("outro", "¿Cuántas horas duermes tú?", 27.2, 2.4),
]


def load(path):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def silences(a, min_len=0.2):
    hop = int(0.01 * SR)
    n = len(a) // hop
    rms = np.sqrt((a[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    thr = max(0.06 * np.percentile(rms, 95), 1e-4)
    sil = rms < thr
    out, i = [], 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if (j - i) * 0.01 >= min_len and i > 0 and j < n:
                out.append(((i + j) / 2 * 0.01, (j - i) * 0.01))
            i = j
        else:
            i += 1
    return out


def trim(a, thr=0.004):
    idx = np.nonzero(np.abs(a) > thr)[0]
    if not len(idx):
        return a
    return a[max(idx[0] - int(0.02 * SR), 0): min(idx[-1] + int(0.12 * SR), len(a))]


def atempo(a, factor):
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-i", "-",
                        "-filter:a", f"atempo={factor:.4f}", "-f", "f32le", "-"],
                       input=a.tobytes(), check=True, capture_output=True).stdout
    return np.frombuffer(p, dtype=np.float32).copy()


def main(path):
    a = trim(load(path))
    total = len(a) / SR
    cands = silences(a)
    lens = np.array([len(t) for _, t, _, _ in LINES], float)
    expected = np.cumsum(lens)[:-1] / lens.sum() * total
    best, best_score = None, None
    for combo in itertools.combinations(cands, len(LINES) - 1):
        pos = np.array([c[0] for c in combo])
        score = np.abs(pos - expected).sum() - 3 * sum(c[1] for c in combo)
        if best_score is None or score < best_score:
            best, best_score = pos, score
    if best is None:
        sys.exit("No se encontraron suficientes pausas entre frases.")
    cuts = [0, *[int(p * SR) for p in best], len(a)]

    track = np.zeros(int(TOTAL * SR), dtype=np.float32)
    timing = {}
    for (key, _, start, max_dur), s, e in zip(LINES, cuts[:-1], cuts[1:]):
        seg = trim(a[s:e])
        dur = len(seg) / SR
        if dur > max_dur:
            seg = trim(atempo(seg, min(1.35, dur / max_dur)))
            dur = len(seg) / SR
        print(f"{key}: {dur:.2f}s", file=sys.stderr)
        i0 = int(start * SR)
        i1 = min(i0 + len(seg), len(track))
        track[i0:i1] += seg[: i1 - i0]
        timing[key] = {"start": round(start * FPS), "end": round((start + dur) * FPS)}

    track = track / (np.max(np.abs(track)) or 1) * 0.89
    sf.write(os.path.join(ROOT, "public", "audio", "voz.wav"), track, SR, subtype="PCM_16")
    with open(os.path.join(ROOT, "src", "narration.json"), "w") as f:
        json.dump(timing, f, indent=2)
    print(json.dumps(timing, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])
