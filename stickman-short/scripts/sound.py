#!/usr/bin/env python3
"""
Música de fondo + efectos de sonido sintetizados 100 % por código (numpy/scipy).

  python3 scripts/sound.py            → public/audio/fondo.wav (80 s, 48 kHz, estéreo)

- La música (caricatura alegre, 120 BPM) sigue las indicaciones de public/audio/README.md:
  tensión en la cuenta regresiva, filtro de cámara lenta, casi muda bajo el ¡BOOOM!,
  silencio para el grillo, pad espacial en la Luna y corte seco al final para el loop.
- Se agacha automáticamente (ducking) cuando habla la voz: lee src/narration.generated.ts
  y public/audio/voz/*.wav.
- Los efectos se colocan en los segundos exactos de las marcas "SFX:" del código.
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 80.0
N = int(SR * DUR)
ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)


# ----------------------------------------------------------------- utilidades
def t_(d):
    return np.arange(int(d * SR)) / SR


def env_adsr(n, a=0.005, d=0.1, s=0.0, r=0.05):
    t = np.arange(n) / SR
    e = np.ones(n)
    e = np.where(t < a, t / max(a, 1e-6), e)
    dec = (t >= a) & (t < a + d)
    e[dec] = 1 - (1 - s) * (t[dec] - a) / d
    e[t >= a + d] = s
    if r > 0:
        rel = int(r * SR)
        if rel < n:
            e[-rel:] *= np.linspace(1, 0, rel)
    return e


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def sweep_sine(f0, f1, d, curve='exp'):
    t = t_(d)
    if curve == 'exp':
        f = f0 * (f1 / f0) ** (t / d)
    else:
        f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def add(buf, at, sig, gain=1.0, pan=0.0):
    """Suma `sig` (mono) a `buf` (estéreo) en el segundo `at`."""
    i = int(at * SR)
    if i >= buf.shape[1] or len(sig) == 0:
        return
    j = min(buf.shape[1], i + len(sig))
    s = sig[: j - i] * gain
    lg = np.cos((pan + 1) * np.pi / 4)
    rg = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += s * lg * 1.414
    buf[1, i:j] += s * rg * 1.414


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ----------------------------------------------------------------- efectos
def sfx_whoosh(d=0.45, up=True, bright=1.0):
    n = noise(d)
    k = t_(d) / d
    low = bp(n, 150 * bright, 900 * bright)
    mid = bp(n, 900 * bright, min(2800 * bright, 20000))
    high = bp(n, min(2800 * bright, 18000), min(8000 * bright, 22000))
    c = k if up else 1 - k
    out = low * (1 - c) ** 2 + mid * 2 * c * (1 - c) * 1.4 + high * c ** 2 * 0.8
    return norm(out * np.sin(np.pi * k) ** 1.5, 0.8)


def sfx_thump(d=0.5, f0=140, f1=38, punch=1.0):
    t = t_(d)
    body = sweep_sine(f0, f1, d) * np.exp(-t / (d * 0.35))
    click = lp(noise(d), 3000) * np.exp(-t / 0.012) * 0.6
    grit = lp(noise(d), 600) * np.exp(-t / 0.08) * 0.5 * punch
    return norm(np.tanh(2.2 * (body + click + grit)), 0.95)


def sfx_boing(d=0.7, f0=180, f1=420, vib=16):
    t = t_(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.08))
    f = f * (1 + 0.18 * np.exp(-t / 0.25) * np.sin(2 * np.pi * vib * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return norm(s * np.exp(-t / (d * 0.45)) * np.minimum(1, t / 0.004), 0.85)


def sfx_boom(d=4.5):
    t = t_(d)
    brown = np.cumsum(noise(d))
    brown = hp(brown, 20)
    brown = lp(brown / (np.max(np.abs(brown)) + 1e-9), 180, 4)
    sub = sweep_sine(70, 28, d) * np.exp(-t / 1.6)
    hit = lp(noise(d), 1200) * np.exp(-t / 0.06)
    x = 1.4 * sub + 2.0 * brown * np.exp(-t / 1.3) + 0.8 * hit
    return norm(np.tanh(2.5 * x), 0.98)


def sfx_click(f=2500, d=0.03):
    t = t_(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + 0.3 * hp(noise(d), 3000) * np.exp(-t / 0.004)


def sfx_ding(f=1318.5, d=1.4):
    t = t_(d)
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * dec))
            for m, a, dec in [(1, 1, 0.5), (2.76, 0.45, 0.25), (5.4, 0.25, 0.12), (2.0, 0.3, 0.35)])
    return norm(s * np.minimum(1, t / 0.002), 0.8)


def sfx_slide(f0, f1, d, wobble=0.0):
    t = t_(d)
    f = f0 * (f1 / f0) ** (t / d) * (1 + wobble * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.08 * hp(noise(d), 2000)
    return norm(s * np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05), 0.7)


def sfx_crowd(d, energy=0.5, seed=1):
    r = np.random.default_rng(seed)
    t = t_(d)
    out = np.zeros(len(t))
    for v in range(14):
        f0 = r.uniform(110, 260)
        rate = r.uniform(3, 6)
        am = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t + r.uniform(0, 6))
        am = am ** (3 - 2 * energy)
        vib = f0 * (1 + 0.04 * np.sin(2 * np.pi * r.uniform(4, 7) * t))
        ph = 2 * np.pi * np.cumsum(vib) / SR
        voiced = np.sign(np.sin(ph)) * 0.3 + np.sin(ph)
        form = bp(voiced, r.uniform(400, 700), r.uniform(1100, 2600 + 1500 * energy))
        out += form * am
    out += 0.25 * bp(r.standard_normal(len(t)), 300, 4000)
    return norm(out, 0.8)


def sfx_laugh(d=1.6):
    t = t_(d)
    f = 240 * (1 - 0.15 * t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    v = bp(saw, 600, 1500) + 0.5 * bp(saw, 2200, 3200)
    pulses = np.clip(np.sin(2 * np.pi * 5.2 * t), 0, 1) ** 2
    breath = bp(noise(d), 1500, 5000) * 0.15
    return norm((v + breath) * pulses * np.exp(-t / (d * 0.8)), 0.6)


def sfx_cricket(d=2.2):
    t = t_(d)
    out = np.zeros(len(t))
    for start in np.arange(0, d - 0.3, 0.75):
        for k in range(3):
            s = start + k * 0.06
            seg = (t >= s) & (t < s + 0.045)
            out[seg] += np.sin(2 * np.pi * 4400 * t[seg]) * np.sin(np.pi * (t[seg] - s) / 0.045)
    return out * 0.7


def sfx_horn(d=0.35, f=392):
    t = t_(d)
    sq = np.sign(np.sin(2 * np.pi * f * t)) + np.sign(np.sin(2 * np.pi * f * 1.26 * t))
    return norm(bp(sq, 300, 2500) * env_adsr(len(t), 0.01, 0.05, 0.85, 0.05), 0.6)


def sfx_pop(d=0.12):
    t = t_(d)
    return norm(sweep_sine(900, 180, d) * np.exp(-t / 0.03) + 0.4 * hp(noise(d), 2000) * np.exp(-t / 0.005), 0.8)


def sfx_scratch(d=0.8):
    t = t_(d)
    return norm(bp(noise(d), 2500, 7000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t))) * np.sin(np.pi * t / d), 0.4)


def sfx_paper(d=0.9):
    t = t_(d)
    flutter = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 14 * t + 3 * np.sin(2 * np.pi * 2 * t)))
    return norm(bp(noise(d), 1200, 6000) * flutter * np.sin(np.pi * t / d), 0.5)


def sfx_tom(f=110, d=0.6):
    t = t_(d)
    return norm(sweep_sine(f * 1.6, f, d) * np.exp(-t / 0.18) + 0.3 * lp(noise(d), 2000) * np.exp(-t / 0.02), 0.95)


def sfx_alarm(d=1.0):
    t = t_(d)
    f = np.where((t * 4).astype(int) % 2 == 0, 880, 660)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm(np.sign(np.sin(ph)) * 0.5 + np.sin(ph), 0.4) * np.minimum(1, (d - t) / 0.05)


def sfx_rise(d=1.1):
    t = t_(d)
    s = sweep_sine(220, 880, d) + 0.5 * sweep_sine(330, 1320, d)
    return norm(s * (t / d) ** 1.5, 0.5)


def sfx_reverse_hit(d=0.5):
    x = sfx_thump(d, 200, 60)[::-1] * 0.6 + hp(noise(d), 4000) * np.linspace(0, 1, int(d * SR)) ** 3 * 0.5
    return norm(x, 0.7)


def echo(x, delay=0.22, fb=0.45, n=5):
    out = np.concatenate([x, np.zeros(int(delay * SR * n))])
    for k in range(1, n + 1):
        i = int(delay * SR * k)
        out[i: i + len(x)] += x * fb ** k
    return out


# ----------------------------------------------------------------- música
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
# progresión I - vi - IV - V (Do mayor)
CHORDS = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]]
SCALE = [60, 62, 64, 67, 69, 72, 74, 76]


def pluck(f, d, bright=1.0):
    t = t_(d)
    s = np.sin(2 * np.pi * f * t) + 0.5 * bright * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.08) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.04)
    return s * np.exp(-t / (0.18 + 0.1 * bright)) * np.minimum(1, t / 0.003)


def marimba(f, d=0.35):
    t = t_(d)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)
    return s * np.exp(-t / 0.14) * np.minimum(1, t / 0.002)


def bass_note(f, d):
    t = t_(d)
    ph = 2 * np.pi * f * t
    s = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sign(np.sin(ph))
    return lp(s, 900) * env_adsr(len(t), 0.005, 0.15, 0.6, 0.06)


def kick():
    d = 0.35
    t = t_(d)
    return np.tanh(3 * sweep_sine(150, 45, d) * np.exp(-t / 0.12))


def snare():
    d = 0.22
    t = t_(d)
    return 0.6 * bp(noise(d), 1500, 7000) * np.exp(-t / 0.07) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)


def hat(open_=False):
    d = 0.2 if open_ else 0.05
    t = t_(d)
    return hp(noise(d), 7000) * np.exp(-t / (0.06 if open_ else 0.012))


def pad(freqs, d, cutoff=1800, lfo=0.2):
    t = t_(d)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.004, 0.0, 0.005):
            ph = 2 * np.pi * f * (1 + det) * t
            s += 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = lp(s, cutoff, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * lfo * t))
    a = min(0.8, d / 3)
    return s * np.minimum(1, t / a) * np.minimum(1, (d - t) / a)


def build_music():
    drums = np.zeros((2, N))
    inst = np.zeros((2, N))
    nbars = int(DUR / BAR) + 1
    for b in range(nbars):
        t0 = b * BAR
        ch = CHORDS[b % 4]
        # batería
        for k in range(4):
            tb = t0 + k * BEAT
            add(drums, tb, kick() if k % 2 == 0 else snare() * 0.9, 0.55 if k % 2 == 0 else 0.35)
        for k in range(8):
            add(drums, t0 + k * BEAT / 2, hat(k % 4 == 3), 0.12 if k % 2 else 0.18, pan=0.3)
        # bajo saltarín (fundamental y quinta)
        root = midi(ch[0] - 12)
        for k, (mul, dd) in enumerate([(1, 0.45), (1, 0.2), (1.5, 0.45), (1, 0.2), (1, 0.45), (2, 0.2), (1.5, 0.45), (1.335, 0.2)]):
            add(inst, t0 + k * BEAT / 2, bass_note(root * mul, dd), 0.28)
        # acordes de ukelele en contratiempo
        for k in range(4):
            stab = sum(pluck(midi(n + 12), 0.3, 0.6) for n in ch)
            add(inst, t0 + k * BEAT + BEAT / 2, stab, 0.07, pan=-0.35)
        # melodía de marimba (determinista)
        r = np.random.default_rng(100 + b % 8)
        steps = [0, 1, 2, 3, 4, 6] if b % 2 == 0 else [0, 2, 3, 5, 6, 7]
        for st in steps:
            note = ch[r.integers(0, 3)] + 24 if r.random() < 0.6 else SCALE[r.integers(0, len(SCALE))]
            add(inst, t0 + st * BEAT / 2, marimba(midi(note)), 0.16, pan=0.25)
    return drums, inst


def envelope_points(points):
    """Curva de ganancia (lineal) a partir de [(segundo, dB), ...]."""
    ts = np.array([p[0] for p in points])
    db = np.array([p[1] for p in points])
    g = np.interp(np.arange(N) / SR, ts, db)
    return 10 ** (g / 20)


def load_voice_timeline():
    src = (ROOT / 'src/narration.generated.ts').read_text()
    m = re.search(r'=\s*(\[.*\]);', src, re.S)
    clips = json.loads(m.group(1)) if m else []
    v = np.zeros(N)
    for c in clips:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'public' / c['file']), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        i = int(round(c['start'] * 30)) * SR // 30
        j = min(N, i + len(x))
        v[i:j] += x[: j - i]
    return v


def ducking(voice, depth_db=-11.0):
    blk = SR // 100
    nb = N // blk
    rms = np.sqrt(np.mean(voice[: nb * blk].reshape(nb, blk) ** 2, axis=1))
    active = (20 * np.log10(rms + 1e-9) > -42).astype(float)
    # mantener 250 ms tras la voz y suavizar (ataque ~60 ms, liberación ~350 ms)
    g = np.zeros(nb)
    level = 0.0
    hold = 0
    for k in range(nb):
        if active[k]:
            hold = 25
        target = 1.0 if hold > 0 else 0.0
        hold -= 1
        level += (target - level) * (0.25 if target > level else 0.03)
        g[k] = level
    g_full = np.repeat(10 ** (depth_db * g / 20), blk)
    return np.concatenate([g_full, np.ones(max(0, N - len(g_full)))])[:N]


def main():
    drums, inst = build_music()

    # --- indicaciones de música (README) ---
    # tensión 27.0-31.2: sin batería normal, redoble creciente + cuerda que sube
    tension = np.zeros((2, N))
    roll_t = 27.0
    while roll_t < 31.15:
        k = (roll_t - 27.0) / 4.2
        add(tension, roll_t, snare(), 0.08 + 0.35 * k ** 2, pan=-0.1)
        roll_t += 0.25 - 0.18 * k
    add(tension, 27.0, pad([midi(43), midi(50), midi(55)], 4.3, cutoff=900) * np.linspace(0.3, 1.0, int(4.3 * SR)), 0.09)
    add(tension, 27.0, sweep_sine(110, 220, 4.2) * np.linspace(0, 1, int(4.2 * SR)) ** 2, 0.08)
    # cámara lenta 32.6-35.5: pad grave filtrado
    slow = np.zeros((2, N))
    add(slow, 32.6, pad([midi(36), midi(43), midi(48), midi(52)], 3.1, cutoff=500, lfo=0.5), 0.13)
    # Luna 68.0-75.0: pad espacial + arpegio brillante con eco
    space = np.zeros((2, N))
    add(space, 68.0, pad([midi(48), midi(55), midi(59), midi(64)], 7.0, cutoff=2500, lfo=0.3), 0.08, pan=-0.2)
    add(space, 68.0, pad([midi(52), midi(59), midi(67)], 7.0, cutoff=3000, lfo=0.23), 0.06, pan=0.2)
    for k, n in enumerate([72, 76, 79, 83, 84, 83, 79, 76] * 3):
        tt = 68.2 + k * 0.28
        if tt < 74.8:
            add(space, tt, echo(marimba(midi(n), 0.5), 0.21, 0.4, 4), 0.07, pan=np.sin(k) * 0.6)

    # Curvas de volumen de cada capa (dB)
    main_env = envelope_points([
        (0, -2), (26.6, -2), (27.0, -60), (31.15, -60), (31.2, 0), (32.55, 0), (32.6, -60), (35.45, -60), (35.6, -4),
        (40.05, -4), (40.13, -30), (44.0, -34), (44.5, -80), (47.5, -80), (48.4, -3),
        (67.8, -3), (68.0, -80), (75.0, -80), (75.1, -1), (79.45, -1), (79.5, -90), (80, -90),
    ])
    tension_env = envelope_points([(0, 0), (31.25, 0), (31.4, -80), (80, -80)])
    duck = ducking(load_voice_timeline())
    music = (drums * 0.9 + inst) * main_env + tension * tension_env + slow + space
    music = music * duck * 0.55

    # --- efectos de sonido (segundos exactos; ver public/audio/README.md) ---
    fx = np.zeros((2, N))
    A = lambda at, s, g=1.0, p=0.0: add(fx, at, s, g, p)
    A(0.00, sfx_whoosh(0.45, up=False), 0.45)              # caída
    A(0.43, sfx_thump(0.6, 150, 40), 0.95)                 # ¡PUM! aterriza
    A(1.70, sfx_scratch(0.9), 0.35, 0.2)                   # se rasca la cabeza
    A(3.33, sfx_whoosh(0.4, up=True, bright=1.3), 0.5)     # zoom a la cara
    A(4.80, sfx_whoosh(0.5), 0.45, -0.4)                   # barrido de tinta 5.0
    spin_t = 5.25
    while spin_t < 7.83:                                    # tragamonedas girando
        A(spin_t, sfx_click(1800 + 400 * ((spin_t * 20) % 2), 0.02), 0.10, 0.3)
        spin_t += 0.055
    for k in range(10):                                     # cada dígito se detiene
        A(6.333 + k * 0.1667, sfx_click(2600, 0.04), 0.30, 0.3)
    A(8.07, sfx_ding(1568), 0.45, 0.2)                      # ding
    A(5.20, sfx_crowd(3.3, 0.35, 1) * np.linspace(0.2, 1, int(3.3 * SR)), 0.20)  # multitud creciente
    A(8.45, sfx_whoosh(0.35), 0.4)                          # corte a la balanza
    for i in range(16):                                     # saltan al platillo
        A(8.73 + i * 0.1167, sfx_boing(0.35, 300 + 15 * i, 520 + 15 * i, 20), 0.12, -0.6)
    A(11.53, sfx_slide(1800, 350, 0.47), 0.35, 0.4)         # la Tierra cae (silbido)
    A(12.00, sfx_thump(0.9, 120, 30, 1.5), 0.75, 0.3)        # ¡PUM! la balanza
    A(12.00, sfx_whoosh(0.6, up=True), 0.45, -0.5)          # salen volando
    A(12.27, sfx_laugh(1.8), 0.35, 0.0)                     # risa
    A(14.80, sfx_whoosh(0.5), 0.45, 0.4)                    # tinta 15.0
    A(15.33, sfx_paper(0.9), 0.5, -0.3)                     # mapa desenrollándose
    A(17.93, sfx_thump(0.3, 400, 120, 0.3), 0.45, 0.3)      # pin rojo
    A(18.47, sfx_whoosh(0.7, up=True, bright=1.2), 0.5)     # zoom al pin
    A(19.17, sfx_whoosh(0.3, up=False), 0.35)               # corte a la ciudad
    A(20.83, sfx_crowd(2.6, 0.4, 2) * np.linspace(0.3, 1, int(2.6 * SR)), 0.22)  # multitud
    A(23.73, sfx_thump(0.6, 300, 60, 0.8) + 0.5 * np.pad(sfx_whoosh(0.5, up=False), (0, int(0.1 * SR))), 0.55, 0.5)  # 🤯
    A(26.80, sfx_whoosh(0.5), 0.45, -0.4)                   # tinta 27.0
    for at in (27.3, 28.6, 29.9):                           # conteo 3, 2, 1
        A(at, sfx_tom(98), 0.75)
    A(31.20, sfx_tom(70, 0.9) + sfx_thump(0.9, 90, 35), 0.8)  # ¡SALTEN!
    A(31.20, sfx_crowd(0.9, 1.0, 3), 0.5)                   # multitud gritando
    A(31.87, sfx_boing(1.1, 140, 520, 13), 0.9)             # ¡BOING!
    A(32.35, sfx_reverse_hit(0.25), 0.5)                    # impact frame
    A(32.60, lp(sfx_whoosh(2.9, up=False, bright=0.4), 700), 0.45)  # viento en cámara lenta
    A(35.50, sfx_whoosh(0.7, up=False, bright=0.8), 0.55)   # empiezan a caer
    A(36.23, sfx_thump(1.0, 110, 28, 2.0), 1.0)             # aterrizaje
    A(37.57, sfx_crowd(2.2, 0.9, 4), 0.35)                  # celebran
    A(40.13, sfx_boom(4.3), 0.6)                            # ¡BOOOM!
    A(45.73, sfx_cricket(2.2), 0.22, 0.6)                   # grillo
    A(47.80, sfx_whoosh(0.5), 0.45, -0.4)                   # tinta 48.0
    A(48.40, sfx_whoosh(0.35, up=True), 0.45, -0.3)         # saca la lupa
    A(49.93, sfx_whoosh(0.8, up=True, bright=1.2), 0.5)     # zoom en la lupa
    A(51.27, sfx_click(3500, 0.05), 0.4)                    # flechita
    A(53.20, sfx_slide(260, 520, 0.35, 0.03), 0.45)         # ¿EH?
    A(54.80, sfx_whoosh(0.5), 0.45, 0.4)                    # tinta 55.0
    A(55.00, sfx_crowd(8.0, 0.75, 5), 0.25)                 # multitud del atasco
    for k in range(16):                                     # bocinas
        at = 55.2 + k * 0.5 + rng.uniform(-0.15, 0.15)
        A(at, sfx_horn(rng.uniform(0.18, 0.4), rng.choice([330, 392, 440, 349])), 0.18, rng.uniform(-0.8, 0.8))
    A(56.20, sfx_whoosh(1.2, up=True), 0.55, 0.6)           # paneo rápido
    A(59.27, sfx_whoosh(0.7, up=False), 0.5, -0.6)          # paneo de regreso
    A(62.60, sfx_alarm(1.0), 0.3)                           # ¡CAOS!
    A(62.60, sfx_crowd(5.0, 0.9, 6), 0.25)
    A(64.40, sfx_whoosh(0.5, up=True), 0.4, -0.3)           # otro salta
    A(65.07, sfx_thump(0.4, 220, 80, 0.6), 0.75)            # pisotón
    A(65.12, sfx_slide(700, 380, 0.3, 0.05), 0.3, 0.2)      # ¡ay!
    A(67.80, sfx_whoosh(0.5), 0.45, -0.4)                   # tinta 68.0
    A(69.27, echo(sfx_boing(0.9, 120, 360, 9), 0.25, 0.5, 5), 0.6)  # boing espacial
    A(71.20, sfx_whoosh(1.4, up=True, bright=0.9), 0.4, 0.3)  # pirueta
    A(71.73, sfx_ding(2093, 1.6), 0.4, -0.2)                # ¡x6!
    A(74.80, sfx_whoosh(0.5), 0.45, 0.4)                    # tinta 75.0
    A(75.27, sfx_pop(), 0.7, 0.3)                           # ¡POP! casco
    A(75.80, sfx_click(1500, 0.08) + 0.5 * sfx_click(2200, 0.08), 0.45)  # señala abajo
    A(78.47, sfx_rise(1.06), 0.35)                          # tensión antes del salto
    A(79.53, np.concatenate([sfx_boing(0.45, 200, 600, 22), np.zeros(1)])[: int(0.46 * SR)], 0.6)  # sale disparado

    mix = music + fx * 0.6
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.8  # nivel pensado para sumarse a la voz tal cual; la normalización final la hace ffmpeg
    mix[:, -int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    out = ROOT / 'public/audio/fondo.wav'
    pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', str(out)], input=pcm, check=True)
    print('ok', out, f'{N / SR:.2f} s')


if __name__ == '__main__':
    main()
