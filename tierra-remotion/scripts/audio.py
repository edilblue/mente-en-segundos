#!/usr/bin/env python3
"""Música de suspenso procedural + efectos de sonido sintetizados + mezcla con ducking.

Lee src/data/narracion.json y public/audio/narracion.wav y escribe public/audio/mix.wav.
Los instantes de los efectos se calculan con las mismas referencias (frases/palabras)
que usan las escenas de Remotion, así que quedan sincronizados con la animación.
"""
import json, os, re
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
N = json.load(open(os.path.join(ROOT, "src/data/narracion.json"), encoding="utf8"))
TOTAL = N["total"]
L = int(TOTAL * SR) + SR
rs = np.random.RandomState(7)

# ------------------------------------------------------------------ tiempos (igual que lib/timing.ts)
E = {e["id"]: e for e in N["escenas"]}
def S(i): return E[i]["inicio"]
def fs(i, k): return E[i]["frases"][k - 1]["start"]
def fe(i, k): return E[i]["frases"][k - 1]["end"]
def ws(i, w):
    for f in E[i]["frases"]:
        for p in f["palabras"]:
            if re.sub(r"[^\w]", "", p["w"].lower()).startswith(w.lower()):
                return p["start"]
    return 0.0

# ------------------------------------------------------------------ utilidades
def t_(d): return np.arange(int(d * SR)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], "band", fs=SR, output="sos"), x)
def noise(d): return rs.randn(int(d * SR))
def env(d, a=0.01, r=0.3, curve=3.0):
    n = int(d * SR); x = np.ones(n)
    na = max(1, int(a * SR)); x[:na] = np.linspace(0, 1, na)
    nr = min(n, int(r * SR)); x[n - nr:] *= np.linspace(1, 0, nr) ** curve
    return x
def note(m): return 440 * 2 ** ((m - 69) / 12)

def put(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.41
    buf[i:i + len(x), 1] += x * gain * r * 1.41

# ------------------------------------------------------------------ efectos
def whoosh(d=0.7, f0=300, f1=3000, rev=False):
    n = noise(d); tt = t_(d)
    a, b = sorted((f0, f1))
    lo = bp(n, a * 0.7, a * 2.2)
    hi = bp(n, b * 0.5, min(b * 1.5, 16000))
    p = tt / d
    if rev or f0 > f1: p = 1 - p
    out = lo * (1 - p) + hi * p * 0.8
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    return out * e * 0.7

def pop(f=900):
    d = 0.12; tt = t_(d)
    fr = f * (1 + 1.2 * np.exp(-tt * 40))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 30) * 0.5

def boom(d=2.2, f=48):
    tt = t_(d)
    fr = f + 70 * np.exp(-tt * 9)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 2.2)
    crack = lp(noise(d), 2500) * np.exp(-tt * 9) * 0.6
    sub = np.sin(2 * np.pi * 32 * tt) * np.exp(-tt * 1.4) * 0.5
    return np.tanh((body + crack + sub) * 1.6) * 0.8

def screech(d=1.0):
    tt = t_(d)
    fr = 2400 - 900 * tt / d + 60 * np.sin(2 * np.pi * 23 * tt)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(fr * 1.51) / SR)
    s += bp(noise(d), 1500, 5000) * 0.6
    e = np.clip(tt / 0.08, 0, 1) * np.clip((d - tt) / 0.1, 0, 1)
    return s * e * 0.28

def thud():
    d = 0.35; tt = t_(d)
    return (np.sin(2 * np.pi * (90 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) + lp(noise(d), 900) * np.exp(-tt * 30) * 0.5) * 0.6

def chime(base=72, d=2.5):
    tt = t_(d); s = np.zeros_like(tt)
    for k, m in enumerate([0, 7, 12, 16, 19]):
        f = note(base + m)
        s += np.sin(2 * np.pi * f * tt) * np.exp(-tt * (1.6 + k * 0.5)) * (0.5 if k else 0.7)
        s += 0.2 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 6)
    d2 = int(0.09 * SR) * np.arange(len(s))  # micro arpegio
    return s * 0.22

def ticks(t0, t1, buf):
    # tic-tac que acelera (año en cámara rápida)
    t = t0; k = 0
    while t < t1:
        d = 0.05; tt = t_(d)
        x = bp(noise(d), 2500, 7000) * np.exp(-tt * 120)
        put(buf, x, t, 0.35, -0.3 if k % 2 else 0.3)
        p = (t - t0) / (t1 - t0)
        t += 0.32 - 0.26 * np.sin(np.pi * p); k += 1

def wind(d, strength=1.0, seed=1):
    r = np.random.RandomState(seed)
    n = r.randn(int(d * SR))
    tt = t_(d)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.35 * tt + 1) * np.sin(2 * np.pi * 0.13 * tt)
    low = lp(n, 500) * 1.6
    howl = bp(n, 380, 900, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * tt))
    hiss = bp(n, 2000, 7000) * 0.25
    return (low + howl * 1.4 + hiss) * gust * strength * 0.35

def ocean(d, strength=1.0):
    n = noise(d); tt = t_(d)
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * 0.18 * tt) ** 2
    return (lp(n, 900) * 0.8 + bp(n, 1500, 5000) * 0.15) * swell * strength * 0.4

def rumble(d):
    tt = t_(d)
    return lp(noise(d), 160, 4) * 2.5 * (tt / d) ** 1.5 * 0.6

def splash(d=2.5):
    tt = t_(d)
    return (lp(noise(d), 4000) * np.exp(-tt * 1.8) * 0.8 + boom(d, 40) * 0.6)

def rewind(d):
    tt = t_(d)
    fr = 300 + 900 * (tt / d) + 120 * np.sin(2 * np.pi * 14 * tt)
    tape = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * 0.15
    chirps = np.sin(2 * np.pi * np.cumsum(1800 + 1500 * ((tt * 9) % 1)) / SR) * 0.12
    return lp(tape + chirps + bp(noise(d), 800, 4000) * 0.15, 5000) * env(d, 0.05, 0.2)

def shimmer(d):
    tt = t_(d); s = np.zeros_like(tt)
    for m in [76, 79, 83, 88, 91]:
        s += np.sin(2 * np.pi * note(m) * tt + m) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.3 + m * 0.01) * tt))
    return s * env(d, 0.6, 1.0, 1.5) * 0.04

def riser(d):
    tt = t_(d)
    fr = 200 * (8 ** (tt / d))
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.15 + bp(noise(d), 1000, 8000) * 0.12 * (tt / d)
    return s * (tt / d) ** 2

# ------------------------------------------------------------------ música
BPM = 96
BEAT = 60 / BPM

def pad(chord, d, bright=900, vol=0.06):
    tt = t_(d); s = np.zeros_like(tt)
    for m in chord:
        for det in (-0.09, 0.0, 0.08):
            f = note(m + det)
            ph = rs.rand() * 6
            # diente de sierra suave con 6 armónicos
            for h in range(1, 7):
                s += np.sin(2 * np.pi * f * h * tt + ph * h) / h * 0.35
    s = lp(s, bright)
    return s * env(d, 0.35, 0.6, 1.5) * vol

def pluck(m, d=0.6, vol=0.08):
    tt = t_(d); f = note(m)
    s = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt) + 0.1 * np.sin(2 * np.pi * 3 * f * tt)) * np.exp(-tt * 6)
    return s * vol

def bass(m, d, vol=0.16):
    tt = t_(d); f = note(m)
    s = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)
    return s * np.exp(-tt * 3) * env(d, 0.005, 0.05) * vol

def kick():
    d = 0.4; tt = t_(d)
    return np.sin(2 * np.pi * np.cumsum(50 + 120 * np.exp(-tt * 35)) / SR) * np.exp(-tt * 9) * 0.35

def hat():
    d = 0.06; tt = t_(d)
    return hp(noise(d), 7000) * np.exp(-tt * 70) * 0.06

def music(buf):
    PROG_MIN = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]   # Am F Dm E
    PROG_SPACE = [[57, 60, 64, 67], [53, 57, 60, 64]]                      # Am7 Fmaj7
    PROG_HOPE = [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]]  # C G Am F
    stop = S(1) + fe(1, 2) + 0.12
    bar = BEAT * 4

    def section(t0, t1, prog, drums=0, arp=True, bassOn=True, bright=900, vol=0.06, hats=False):
        t = t0; i = 0
        while t < t1 - 0.05:
            d = min(bar, t1 - t)
            ch = prog[i % len(prog)]
            put(buf, pad(ch, d + 0.4, bright, vol), t, 1.0, 0)
            for b in range(4):
                tb = t + b * BEAT
                if tb >= t1: break
                if bassOn:
                    put(buf, bass(ch[0] - 12, BEAT * 0.9), tb, 1.0)
                    put(buf, bass(ch[0] - 12, BEAT * 0.45, 0.09), tb + BEAT / 2, 1.0)
                if drums and (b % 2 == 0 or drums > 1): put(buf, kick(), tb, drums * 0.8)
                if hats:
                    put(buf, hat(), tb + BEAT / 2, 1.0, 0.3)
                if arp:
                    for s in range(2):
                        ts_ = tb + s * BEAT / 2
                        if ts_ < t1:
                            m = ch[(b * 2 + s) % len(ch)] + 12
                            put(buf, pluck(m, 0.5, 0.05), ts_, 1.0, -0.4 if s else 0.4)
            t += bar; i += 1

    section(0.0, stop, PROG_MIN, drums=0, arp=True, bright=700, vol=0.05, hats=True)
    put(buf, riser(1.1), S(2) - 1.1, 0.8)
    section(S(2), S(3), PROG_MIN, drums=1, bright=900, hats=True)
    section(S(3), S(5), PROG_MIN, drums=1.2, bright=1100, vol=0.045, hats=True)
    section(S(5), S(6), PROG_SPACE, drums=0, arp=True, bassOn=False, bright=1400, vol=0.06)
    end_hit = S(6) + fs(6, 5) + 1.4
    section(S(6), end_hit, PROG_HOPE, drums=1, bright=1300, vol=0.06)
    # acorde final sostenido
    put(buf, pad([48, 55, 60, 64, 67], TOTAL - end_hit + 0.5, 1600, 0.07), end_hit, 1.0)
    for k, m in enumerate([72, 76, 79, 84]):
        put(buf, pluck(m, 1.5, 0.07), end_hit + k * 0.09, 1.0, (k - 1.5) * 0.3)

# ------------------------------------------------------------------ efectos sincronizados
def sfx(buf):
    # Escena 1
    s1 = S(1); stop = s1 + fe(1, 2) + 0.12
    put(buf, pop(700), s1 + 0.15, 0.5)
    put(buf, whoosh(1.4, 200, 2500), s1 + 0.5, 0.9)
    put(buf, screech(0.95), stop - 0.92, 0.85, 0.2)
    put(buf, boom(2.4), stop, 1.0)
    put(buf, whoosh(0.6, 500, 4000), stop + 0.05, 0.5, 0.5)
    # Escena 2
    s2 = S(2)
    for tt in (1.3, fs(2, 3) + 0.2, fs(2, 3) + 0.6, fs(2, 3) + 1.0):
        put(buf, pop(1000), s2 + tt, 0.45, 0.2)
    put(buf, pop(600), s2 + ws(2, "mil") - 0.1, 0.6)
    cut2 = s2 + fs(2, 4) - 0.15
    put(buf, whoosh(0.55, 400, 6000), cut2 - 0.3, 0.8)
    stop2 = s2 + ws(2, "golpe") + 0.15
    put(buf, screech(0.5), stop2 - 0.45, 0.6, -0.2)
    put(buf, boom(1.8, 55), stop2, 0.8)
    for k in range(6):
        put(buf, thud(), stop2 + 0.35 + k * 0.42, 0.6 * (0.85 ** k), 0.3)
    put(buf, whoosh(1.2, 300, 3000), stop2 + 0.1, 0.5, 0.6)
    put(buf, pop(1300), s2 + ws(2, "inercia") - 0.05, 0.6)
    put(buf, chime(79, 1.5), s2 + ws(2, "inercia") - 0.05, 0.6)
    # Escena 3
    s3 = S(3); cut3 = s3 + fs(3, 2) - 0.25
    put(buf, wind(cut3 - s3, 0.35, 2), s3, 1.0)
    put(buf, whoosh(0.5, 400, 6000), cut3 - 0.25, 0.8)
    put(buf, wind(S(4) - cut3 + 0.3, 0.35, 3) * env(S(4) - cut3 + 0.3, 0.6, 0.5, 1), cut3, 1.0)
    put(buf, pop(800), s3 + ws(3, "vientos") - 0.05, 0.5)
    tD = s3 + ws(3, "destruir")
    put(buf, boom(1.6, 60) + 0, tD, 0.6)
    for k in range(5):
        put(buf, thud(), tD + 0.2 + k * 0.25, 0.4, -0.5 + k * 0.25)
    # Escena 4
    s4 = S(4); cut4 = s4 + fs(4, 2) - 0.3; crash = s4 + ws(4, "inundaciones") + 0.05
    put(buf, ocean(S(5) - s4, 0.3), s4, 1.0)
    put(buf, whoosh(0.5, 400, 6000), cut4 - 0.25, 0.7)
    put(buf, rumble(crash - cut4), cut4, 1.0)
    put(buf, pop(700), s4 + ws(4, "océanos") - 0.05, 0.5)
    put(buf, splash(2.8), crash, 0.95)
    put(buf, ocean(S(5) - crash, 0.5), crash, 0.8)
    # Escena 5
    s5 = S(5)
    put(buf, shimmer(fs(5, 4)), s5, 1.0)
    ticks(s5 + fs(5, 3), s5 + fs(5, 3) + 2.7, buf)
    put(buf, pop(900), s5 + fs(5, 3) - 0.05, 0.5)
    put(buf, whoosh(0.5, 400, 6000), s5 + fs(5, 4) - 0.45, 0.7)
    tN = s5 + fs(5, 5) - 0.1
    put(buf, whoosh(1.0, 2000, 200), tN - 0.4, 0.6)
    put(buf, wind(S(6) - tN, 0.25, 9), tN, 1.0)
    # Escena 6
    s6 = S(6)
    put(buf, rewind(1.55), s6 + 0.45, 0.8)
    put(buf, chime(76, 2.0), s6 + 2.0, 0.6)
    put(buf, whoosh(0.5, 400, 6000), s6 + fs(6, 2) - 0.45, 0.6)
    put(buf, whoosh(0.5, 400, 6000), s6 + fs(6, 3) - 0.45, 0.6)
    put(buf, shimmer(3.0), s6 + ws(6, "viajando"), 1.4)
    tLo = s6 + fs(6, 5) + 1.4
    put(buf, boom(1.5, 70), tLo, 0.45)
    put(buf, chime(84, 2.6), tLo, 0.8)
    put(buf, pop(1200), tLo, 0.5)

# ------------------------------------------------------------------ mezcla
def main():
    voz, vsr = sf.read(os.path.join(ROOT, "public/audio/narracion.wav"), dtype="float32")
    if voz.ndim > 1: voz = voz.mean(1)
    voz = resample_poly(voz, SR, vsr).astype(np.float64)
    voz = hp(voz, 70)
    mus = np.zeros((L, 2)); fx = np.zeros((L, 2))
    music(mus); sfx(fx)
    # silencio momentáneo tras el frenazo (escena 1)
    stop = S(1) + fe(1, 2) + 0.12
    g = np.ones(L)
    a, b = int(stop * SR), int((S(2) - 0.9) * SR)
    g[a:b] = 0.0
    g[b:int(S(2) * SR)] = np.linspace(0, 1, int(S(2) * SR) - b)
    mus *= g[:, None]
    # ducking por la voz
    v = np.zeros(L); v[: len(voz)] = np.abs(voz[:L])
    k = int(0.25 * SR)
    envv = np.convolve(v, np.ones(k) / k, mode="same")
    duck = 1 - 0.6 * np.clip(envv / 0.05, 0, 1)
    mus *= duck[:, None]
    duckfx = 1 - 0.4 * np.clip(envv / 0.05, 0, 1)
    out = mus * 0.55 + fx * 0.55 * duckfx[:, None]
    out[: len(voz), 0] += voz[:L] * 1.0
    out[: len(voz), 1] += voz[:L] * 1.0
    out = out[: int(TOTAL * SR)]
    # fade de salida
    nf = int(0.8 * SR); out[-nf:] *= np.linspace(1, 0, nf)[:, None]
    out = np.tanh(out * 1.1) / np.tanh(1.1)
    out = out / np.abs(out).max() * 0.95
    sf.write(os.path.join(ROOT, "public/audio/mix_raw.wav"), out.astype(np.float32), SR)
    print(f"mix_raw.wav {len(out)/SR:.2f} s")

main()
