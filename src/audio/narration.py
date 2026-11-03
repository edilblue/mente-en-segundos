"""Narración en español latinoamericano con Kokoro TTS (ONNX, 100% local).

Genera cada frase por separado (para controlar el ritmo y sincronizar
escenas) y estima el tiempo de cada palabra usando las pausas reales del
audio (alineadas con las comas) y el número de sílabas aproximado.
"""
import json
import os
import re

import numpy as np

from .. import config as C

VOICE = os.environ.get("TTS_VOICE", "em_alex")
SPEED = float(os.environ.get("TTS_SPEED", "1.07"))
LANG = "es-419"

# (texto, inicio deseado en segundos)
SCRIPT = [
    ("¿Qué pasa en tu cuerpo cuando dejas de respirar?", 0.35),
    ("Al principio, tus pulmones dejan de recibir aire fresco.", 5.4),
    ("Pero tu cuerpo todavía tiene oxígeno circulando en la sangre.", 12.5),
    ("Mientras pasan los segundos, el oxígeno disponible comienza a disminuir y el dióxido de carbono se acumula.", 16.2),
    ("Tu cerebro, uno de los órganos que más depende del oxígeno, empieza a sufrir.", 20.9),
    ("Si la falta de oxígeno continúa, puedes perder el conocimiento.", 26.0),
    ("Tu corazón y otros órganos también comienzan a verse afectados.", 31.0),
    ("Y si no se restablece la respiración, el daño puede volverse irreversible.", 36.2),
    ("Tu cuerpo necesita oxígeno para mantenerse vivo.", 43.6),
]
MIN_GAP = 0.35


def _syllables(word):
    w = word.lower()
    groups = re.findall(r"[aeiouáéíóúü]+", w)
    n = 0
    for g in groups:
        # diptongos cuentan como una sílaba; hiatos con tilde como dos
        n += 1 + sum(1 for ch in g[1:] if ch in "áéíóú" and len(g) > 1 and g[0] in "aeo")
    return max(n, 1)


def _trim(audio, sr, thr=0.012):
    a = np.abs(audio)
    idx = np.nonzero(a > thr)[0]
    if len(idx) == 0:
        return audio
    s = max(idx[0] - int(0.02 * sr), 0)
    e = min(idx[-1] + int(0.06 * sr), len(audio))
    return audio[s:e]


def _pauses(audio, sr, min_len=0.11):
    """Pausas internas (silencios) -> lista de (centro, duración) en segundos."""
    hop = int(0.01 * sr)
    n = len(audio) // hop
    rms = np.sqrt(np.mean(audio[:n * hop].reshape(n, hop) ** 2, 1) + 1e-12)
    thr = max(0.08 * np.percentile(rms, 90), 1e-3)
    sil = rms < thr
    out = []
    i = 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            dur = (j - i) * 0.01
            if dur >= min_len and i > 5 and j < n - 5:
                out.append(((i + j) / 2 * 0.01, dur))
            i = j
        else:
            i += 1
    return out


def _word_times(text, audio, sr):
    words = text.split()
    total = len(audio) / sr
    # Cláusulas separadas por comas
    clauses, cur = [], []
    for w in words:
        cur.append(w)
        if w.endswith(",") or w.endswith(";"):
            clauses.append(cur)
            cur = []
    if cur:
        clauses.append(cur)
    pauses = sorted(_pauses(audio, sr), key=lambda p: -p[1])[: len(clauses) - 1]
    pauses = sorted(pauses)
    if len(pauses) == len(clauses) - 1:
        bounds = [0.0] + [p[0] for p in pauses] + [total]
    else:
        # repartir por sílabas
        syl = [sum(_syllables(w) for w in c) for c in clauses]
        cs = np.concatenate([[0], np.cumsum(syl)]) / sum(syl) * total
        bounds = list(cs)
    out = []
    for ci, c in enumerate(clauses):
        t0, t1 = bounds[ci], bounds[ci + 1]
        if ci > 0:
            t0 += 0.06
        if ci < len(clauses) - 1:
            t1 -= 0.08
        syl = np.array([_syllables(w) + 0.6 for w in c], np.float32)
        cs = np.concatenate([[0], np.cumsum(syl)]) / syl.sum()
        for wi, w in enumerate(c):
            out.append({"w": w, "t0": float(t0 + (t1 - t0) * cs[wi]), "t1": float(t0 + (t1 - t0) * cs[wi + 1])})
    return out


def generate(cache_dir=None):
    """Genera (o recupera de caché) las frases. Devuelve lista de dicts y el audio de cada una."""
    import soundfile as sf
    cache_dir = cache_dir or os.path.join(C.BUILD, "voice")
    os.makedirs(cache_dir, exist_ok=True)
    meta_path = os.path.join(cache_dir, "lines.json")
    sig = {"voice": VOICE, "speed": SPEED, "script": [s for s, _ in SCRIPT]}
    lines = None
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            m = json.load(f)
        if m.get("sig") == sig:
            lines = m["lines"]
    if lines is None:
        from kokoro_onnx import Kokoro
        k = Kokoro(os.path.join(C.MODELS, "kokoro-v1.0.onnx"), os.path.join(C.MODELS, "voices-v1.0.bin"))
        lines = []
        for i, (text, _) in enumerate(SCRIPT):
            audio, sr = k.create(text, voice=VOICE, speed=SPEED, lang=LANG)
            audio = _trim(np.asarray(audio, np.float32), sr)
            path = os.path.join(cache_dir, f"line_{i:02d}.wav")
            sf.write(path, audio, sr)
            lines.append({"text": text, "path": path, "sr": sr, "dur": len(audio) / sr,
                          "words": _word_times(text, audio, sr)})
            print(f"  voz {i + 1}/{len(SCRIPT)}: {len(audio) / sr:.2f}s")
        with open(meta_path, "w") as f:
            json.dump({"sig": sig, "lines": lines}, f, ensure_ascii=False, indent=1)
    # Programar inicios
    t_prev_end = 0.0
    for (text, want), ln in zip(SCRIPT, lines):
        ln["start"] = max(want, t_prev_end + MIN_GAP)
        t_prev_end = ln["start"] + ln["dur"]
    return lines
