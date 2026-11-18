#!/usr/bin/env python3
"""Banda sonora del Short de flamencos: voz + música original + efectos, normalizada a -14 LUFS.

Todo se sintetiza aquí (sin samples ni música con copyright):
- Música juguetona a 96 BPM, 14 compases = 35 s exactos. Las colas que pasan del segundo 35
  se suman al principio, así el audio también hace loop sin corte.
- Efectos (whoosh, golpe, pop, burbujas, ñam, escáner, destellos, "wah wah"…) en los mismos
  tiempos que usa la animación (src/flamencos/data/narracion.json).
- Ducking: la música baja automáticamente cuando habla el narrador.
Salida: out/flamencos-audio.wav (48 kHz estéreo, -14 LUFS integrados, pico real ≤ -2 dBTP).
"""
import json
import re
import subprocess
import unicodedata
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
N = json.loads((ROOT / "src/flamencos/data/narracion.json").read_text())
SR = 48000
DUR = N["duracion"]
LEN = int(round(DUR * SR))
OUT = ROOT / "out/flamencos-audio.wav"
rng = np.random.default_rng(7)


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))


def wt(esc, key, nth=0):
    e = next(x for x in N["escenas"] if x["id"] == esc)
    hits = [p for p in e["palabras"] if norm(p["w"]) == norm(key)]
    return e["vozInicio"] + (hits[nth] if nth < len(hits) else hits[0])["start"]


def leer(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        assert w.getframerate() == SR, path
        return x


def buf(extra=4.0):
    return np.zeros(int((DUR + extra) * SR), np.float32)


def add(dst, sig, t, gain=1.0):
    i = int(round(t * SR))
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), len(dst) - i)
    if n > 0:
        dst[i : i + n] += sig[:n] * gain


def wrap(x):
    """Suma la cola que pasa de 35 s al principio (loop perfecto)."""
    y = x[:LEN].copy()
    tail = x[LEN:]
    y[: len(tail)] += tail[: len(y)]
    return y


def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, fc):
    """Paso bajo de 1 polo (fc puede ser un array)."""
    a = np.exp(-2 * np.pi * np.asarray(fc) / SR) * np.ones_like(x)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def hp(x, fc):
    return x - lp(x, fc)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- instrumentos
def marimba(f, d=0.45, vel=1.0):
    t = tt(d)
    env = np.exp(-t * 9) * (1 - np.exp(-t * 900))
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 30) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 60)
    return (s * env * vel).astype(np.float32)


def glock(f, d=0.9, vel=1.0):
    t = tt(d)
    env = np.exp(-t * 4.5) * (1 - np.exp(-t * 2000))
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 9) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 16)
    return (s * env * vel).astype(np.float32)


def pluck(f, d=0.5, vel=1.0):
    """Bajo pizzicato (Karplus-Strong)."""
    n = int(d * SR)
    p = max(2, int(SR / f))
    b = rng.uniform(-1, 1, p).astype(np.float32)
    out = np.zeros(n, np.float32)
    for i in range(n):
        out[i] = b[i % p]
        b[i % p] = 0.5 * (b[i % p] + b[(i + 1) % p]) * 0.996
    return lp(out, 1800) * vel * 1.6


def kick(vel=1.0):
    t = tt(0.3)
    f = 50 + 90 * np.exp(-t * 35)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * vel).astype(np.float32)


def shaker(vel=1.0):
    t = tt(0.07)
    return (hp(rng.standard_normal(len(t)).astype(np.float32), 5000) * np.exp(-t * 60) * vel * 0.5).astype(np.float32)


def snap(vel=1.0):
    t = tt(0.12)
    n = rng.standard_normal(len(t)).astype(np.float32)
    return (hp(lp(n, 3500), 900) * np.exp(-t * 45) * vel).astype(np.float32)


# ---------------------------------------------------------------- música
def musica():
    bpm = 96
    beat = 60 / bpm
    bars = int(round(DUR / (4 * beat)))  # 14
    m = buf()
    # C  Am  F  G (I–vi–IV–V), el último compás en G vuelve a C al reiniciar el loop
    prog = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [59, 62, 67])]
    escala = [60, 62, 64, 67, 69, 72, 74, 76]
    motivos = [
        [0, None, 2, 4, None, 3, 2, None],
        [4, None, 5, None, 4, 2, None, 1],
        [2, 3, None, 4, None, 6, 5, None],
        [7, None, 6, 4, None, 3, None, 2],
    ]
    for b in range(bars):
        t0 = b * 4 * beat
        root, acorde = prog[b % 4]
        # intensidad: más ligero en la escena triste (≈27–31 s)
        triste = 26.6 < t0 + 2 * beat < 31.0
        for k in range(4):
            tb = t0 + k * beat
            if k in (0, 2):
                add(m, pluck(midi(root - 12 + (7 if k == 2 else 0)), 0.55), tb, 0.55)
                if not triste:
                    add(m, kick(), tb, 0.35)
            elif not triste:
                add(m, snap(), tb, 0.12)
            for h in (0, 0.5):
                add(m, shaker(0.9 if h == 0 else 0.6), tb + h * beat, 0.25 if not triste else 0.1)
        # acordes cortos de marimba en contratiempo
        for k in (1, 3):
            for n_ in acorde:
                add(m, marimba(midi(n_), 0.3, 0.5), t0 + (k + 0.5) * beat, 0.18)
        # melodía
        mot = motivos[(b + (1 if b >= 8 else 0)) % 4]
        for i, g in enumerate(mot):
            if g is None or (triste and i % 2):
                continue
            f = midi(escala[g] + (12 if b % 8 >= 4 and not triste else 0))
            add(m, marimba(f, 0.4, 1.0), t0 + i * 0.5 * beat, 0.22 if not triste else 0.15)
    return wrap(m)


# ---------------------------------------------------------------- efectos
def whoosh(d=0.45, up=True, vel=1.0):
    t = tt(d)
    n = rng.standard_normal(len(t)).astype(np.float32)
    u = t / d
    fc = (300 + 4500 * u**1.5) if up else (4800 - 4300 * u**0.7)
    env = np.sin(np.pi * u) ** 1.5
    return (hp(lp(n, fc), 200) * env * vel * 1.6).astype(np.float32)


def thud(vel=1.0):
    t = tt(0.5)
    f = 45 + 70 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    c = lp(rng.standard_normal(len(t)).astype(np.float32), 900) * np.exp(-t * 40) * 1.4
    return ((s + c) * vel).astype(np.float32)


def boing(vel=1.0):
    t = tt(0.55)
    f = 210 * (1 + 0.35 * np.sin(2 * np.pi * 11 * t) * np.exp(-t * 4)) * (1 + 0.6 * np.exp(-t * 12))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * vel).astype(np.float32)


def pop(f=700, vel=1.0):
    t = tt(0.09)
    fr = f * (1 + 1.2 * np.exp(-t * 60))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 40) * vel).astype(np.float32)


def blip(f=500, vel=1.0):
    t = tt(0.12)
    fr = f * (1 + 2.0 * t / 0.12)
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * t / 0.12) * vel).astype(np.float32)


def gulp(vel=1.0):
    t = tt(0.35)
    fr = 420 * np.exp(-t * 6) + 90
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * np.minimum(1, t / 0.35)) * vel).astype(np.float32)


def sparkle(vel=1.0, base=84):
    s = np.zeros(int(0.9 * SR), np.float32)
    for i, n_ in enumerate([0, 4, 7, 12, 16]):
        g = glock(midi(base + n_), 0.6, 0.7)
        add(s, g, i * 0.06)
    return s * vel


def scanner(vel=1.0):
    t = tt(0.5)
    f = 900 + 900 * t / 0.5
    sq = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    return (lp(sq.astype(np.float32), 3000) * 0.3 * np.sin(np.pi * t / 0.5) * vel).astype(np.float32)


def flick(vel=1.0):
    t = tt(0.08)
    return (hp(rng.standard_normal(len(t)).astype(np.float32), 2500) * np.exp(-t * 50) * vel).astype(np.float32)


def wahwah(vel=1.0):
    """Trombón triste de dibujo animado (descendente)."""
    s = np.zeros(int(1.6 * SR), np.float32)
    for i, n_ in enumerate([55, 54, 53, 52]):
        d = 0.32 if i < 3 else 0.7
        t = tt(d)
        f = midi(n_) * (1 + (0.02 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0))
        saw = 2 * ((np.cumsum(f * np.ones_like(t)) / SR) % 1) - 1
        env = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.06)
        add(s, lp(saw.astype(np.float32), 900) * env, i * 0.3)
    return s * vel


def beep(vel=1.0):
    t = tt(0.1)
    return (np.sin(2 * np.pi * 1600 * t) * np.sin(np.pi * t / 0.1) * vel).astype(np.float32)


def efectos():
    fx = buf()
    cortes = [e["inicio"] for e in N["escenas"][1:]]
    for c in cortes:
        add(fx, whoosh(0.42, True), c - 0.24, 0.5)
    # escena 1
    t_hit = wt(1, "no") - 0.2 + 0.36
    add(fx, whoosh(0.4, False, 0.6), t_hit - 0.36, 0.5)
    add(fx, thud(), t_hit, 0.9)
    add(fx, boing(), t_hit + 0.05, 0.35)
    add(fx, pop(900), wt(1, "nacen", 1) + 0.05, 0.4)
    for w in ("tardan", "anos", "cambiar"):
        add(fx, flick(), wt(1, w) - 0.08, 0.5)
    add(fx, sparkle(), wt(1, "cambiar") + 0.32, 0.35)
    add(fx, thud(0.5), wt(1, "cambiar") + 0.3, 0.4)
    # escena 2
    add(fx, pop(500), wt(2, "viene"), 0.35)
    add(fx, whoosh(0.5, False, 0.7), wt(2, "comen") - 0.3, 0.4)
    add(fx, blip(300), wt(2, "comen") + 0.15, 0.4)
    t_alg = wt(2, "algas")
    for i in range(10):
        add(fx, blip(380 + 260 * rng.random()), t_alg + 0.2 + i * 0.42, 0.18)
    for i in range(4):
        add(fx, pop(1100 + i * 120), wt(2, "carotenoides") - 0.05 + i * 0.07, 0.22)
    add(fx, gulp(), wt(2, "carotenoides") + 1.05, 0.6)
    # escena 3
    add(fx, scanner(), N["escenas"][2]["inicio"] + 0.02, 0.5)
    add(fx, pop(650), wt(3, "higado") - 0.05, 0.35)
    for i in range(6):
        add(fx, pop(1200 + 90 * i), wt(3, "rosados") - 0.1 + i * 0.05, 0.12)
    add(fx, sparkle(base=88), wt(3, "plumas"), 0.4)
    # escena 4
    add(fx, whoosh(0.35), wt(4, "padres") - 0.35, 0.3)
    for i in range(3):
        add(fx, blip(1400 + 200 * i), wt(4, "crias") + i * 0.12, 0.12)
    add(fx, sparkle(base=86), wt(4, "por") + 0.25, 0.25)
    for i in range(2):
        add(fx, beep(), wt(4, "palidos") + 0.2 + i * 0.18, 0.18)
    # escena 5
    add(fx, whoosh(0.5, False, 0.5), wt(5, "sin") + 0.05, 0.3)
    add(fx, thud(0.6), wt(5, "dieta") - 0.03, 0.5)
    add(fx, wahwah(), wt(5, "blanco") - 0.1, 0.22)
    add(fx, pop(800), wt(5, "comes"), 0.35)
    add(fx, thud(0.5), wt(5, "literalmente"), 0.35)
    # zoom final al ojo → empalma con el inicio
    add(fx, whoosh(1.6, True, 0.8), DUR - 1.7, 0.35)
    return wrap(fx)


def voz():
    v = buf(0.5)
    for e in N["escenas"]:
        add(v, leer(ROOT / "public" / e["audio"]), e["vozInicio"])
    return v[:LEN]


def envolvente(x, ataque=0.03, suelta=0.35):
    a = np.abs(x)
    hop = SR // 100
    r = np.sqrt(np.convolve(a**2, np.ones(hop) / hop, "same")[::hop])
    e = np.zeros_like(r)
    acc = 0.0
    ka, kr = np.exp(-1 / (ataque * 100)), np.exp(-1 / (suelta * 100))
    for i, v in enumerate(r):
        k = ka if v > acc else kr
        acc = k * acc + (1 - k) * v
        e[i] = acc
    e = np.clip(e / (np.percentile(e, 95) + 1e-9), 0, 1)
    return np.interp(np.arange(len(x)) / hop, np.arange(len(e)), e).astype(np.float32)


def main():
    print("→ voz, música y efectos…")
    v = voz()
    m = musica()
    fx = efectos()
    duck = 1 - 0.6 * envolvente(v)
    mus = m * 0.16 * duck
    mix = v * 1.0 + mus + fx * 0.32
    # estéreo con un poco de anchura en la música y efectos (voz centrada)
    d = int(0.011 * SR)
    side = np.concatenate([np.zeros(d, np.float32), (mus + fx * 0.32)[:-d]]) * 0.25
    L = mix + side
    R = mix - side
    st = np.stack([L, R], 1)
    st /= max(1e-9, np.abs(st).max()) / 0.7
    tmp = OUT.with_name("flamencos-audio-pre.wav")
    OUT.parent.mkdir(exist_ok=True)
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())
    # loudnorm en dos pasadas → -14 LUFS, -1.5 dBTP
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(tmp), "-af", "loudnorm=I=-14:TP=-2:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex("{") :])
    af = (
        f"loudnorm=I=-14:TP=-2:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
        f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,"
        f"atrim=0:{DUR},apad=whole_dur={DUR}"
    )
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp), "-af", af, "-ar", str(SR), "-ac", "2", str(OUT)], check=True)
    tmp.unlink()
    print(f"✔ {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
