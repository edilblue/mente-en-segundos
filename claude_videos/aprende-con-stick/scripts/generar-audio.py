#!/usr/bin/env python3
"""Música y efectos de sonido ORIGINALES, sintetizados con numpy (sin muestras externas).

  python3 scripts/generar-audio.py            → public/audio/sfx/*.wav y public/audio/musica/ep01_musica.wav

La duración de la música se toma de src/episodes/ep01/narracion.json.
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
RNG = np.random.default_rng(7)
SFX = os.path.join(ROOT, 'public/audio/sfx')
MUS = os.path.join(ROOT, 'public/audio/musica')
os.makedirs(SFX, exist_ok=True)
os.makedirs(MUS, exist_ok=True)


# ------------------------------------------------------------------ utilidades
def T(d):
    return np.arange(int(d * SR)) / SR


def save(name, x, peak=0.7, folder=SFX, rms_db=None):
    """Guarda WAV estéreo 48 kHz. Los efectos se igualan por SONORIDAD (RMS máximo en ventanas de
    400 ms = rms_db dBFS) y no por pico, para que ninguno suene desproporcionado; el pico se limita a -1 dBFS."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    if rms_db is None and folder == SFX:
        rms_db = -20.0
    if rms_db is not None:
        mono = x.mean(1)
        win = int(0.4 * SR)
        if len(mono) <= win:
            r = np.sqrt(np.mean(mono ** 2))
        else:
            c = np.cumsum(np.concatenate([[0], mono ** 2]))
            r = np.sqrt(np.max((c[win:] - c[:-win]) / win))
        x = x * (10 ** (rms_db / 20) / max(r, 1e-9))
        m = np.max(np.abs(x))
        if m > 0.89:
            x = x / m * 0.89
    else:
        m = np.max(np.abs(x)) or 1
        x = x / m * peak
    fade = min(len(x), int(0.004 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    data = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(folder, name + '.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def band(x, lo, hi):
    """Filtro pasabanda suave por FFT."""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(x)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, n)


def env(t, a, d, sus=0.0, curve=4.0):
    e = np.minimum(1, t / max(a, 1e-4))
    rel = np.exp(-np.maximum(0, t - a) / max(d, 1e-4) * curve / 4)
    return e * (sus + (1 - sus) * rel)


def noise(d):
    return RNG.standard_normal(int(d * SR))


def tone(freq, t, kind='sine'):
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(freq, t.shape)) / SR
    if kind == 'sine':
        return np.sin(ph)
    if kind == 'square':
        return np.tanh(np.sin(ph) * 4)
    if kind == 'saw':
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == 'tri':
        return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1


def sweep_noise(d, f0, f1, bands=10, width=1.6):
    """Ruido cuya banda se desplaza de f0 a f1 (whoosh)."""
    t = T(d)
    out = np.zeros_like(t)
    n = noise(d)
    centers = np.geomspace(f0, f1, bands)
    pos = np.linspace(0, bands - 1, len(t))
    for i, c in enumerate(centers):
        w = np.clip(1 - np.abs(pos - i), 0, 1)
        out += band(n, c / width, c * width) * w
    return out


def place(dst, src, at):
    i = int(at * SR)
    j = min(len(dst), i + len(src))
    if i < len(dst):
        dst[i:j] += src[: j - i]


# ------------------------------------------------------------------ efectos
def sfx():
    t = T(0.12)
    save('pop', tone(np.linspace(500, 1300, len(t)), t) * env(t, 0.004, 0.05), 0.6)

    t = T(0.5)
    w = sweep_noise(0.5, 300, 4000) * np.sin(np.pi * t / 0.5) ** 2
    save('whoosh', w, 0.6)
    t = T(1.0)
    w = sweep_noise(1.0, 200, 6000, 14) * (t / 1.0) ** 2 * np.exp(-np.maximum(0, t - 0.85) * 30)
    save('whoosh_largo', w + tone(np.linspace(80, 400, len(t)), t) * 0.3 * (t / 1.0) ** 2, 0.65)

    # ladridos: tono con glissando + formantes + aire
    for name, f0 in [('ladrido', 360), ('ladrido2', 300)]:
        t = T(0.26)
        f = f0 * (1.25 - 0.45 * t / 0.26)
        v = tone(f, t, 'saw') + 0.5 * tone(f * 2.02, t, 'saw')
        v = band(v, 350, 2600) + band(noise(0.26), 800, 3000) * 0.35
        e = np.minimum(1, t / 0.012) * np.exp(-t / 0.09)
        save(name, np.tanh(v * e * 3), 0.8)

    t = T(1.2)
    boom = tone(55 * np.exp(-t * 1.2) + 30, t) * np.exp(-t * 3.5)
    crack = band(noise(1.2), 200, 6000) * np.exp(-t * 30)
    save('impacto', np.tanh((boom * 1.4 + crack * 0.8) * 2), 0.9)
    t = T(0.9)
    save('golpe_grave', tone(70 * np.exp(-t * 2) + 28, t) * np.exp(-t * 4) + band(noise(0.9), 60, 400) * np.exp(-t * 20) * 0.5, 0.85)

    t = T(0.12)
    c = band(noise(0.12), 1500, 8000) * np.exp(-t * 120)
    click = c.copy()
    place(click, c * 0.7, 0.05)
    save('click', click, 0.6)

    t = T(0.5)
    e = np.zeros_like(t)
    e[: int(0.18 * SR)] = 1
    e[int(0.24 * SR): int(0.46 * SR)] = 1
    f = np.where(t < 0.21, 330, 247)
    save('error', tone(f, t, 'square') * e * 0.5, 0.5)

    t = T(1.6)
    f = np.where((t * 4).astype(int) % 2 == 0, 880, 660)
    gate = ((t * 8) % 1 < 0.8).astype(float)
    save('alarma', band(tone(f, t, 'square'), 300, 3000) * gate * np.minimum(1, (1.6 - t) * 6), 0.55)
    t = T(2.6)
    f = 650 + 300 * np.sin(2 * np.pi * 2.2 * t)
    save('alarma_fuerte', band(tone(f, t, 'saw') + tone(f * 1.5, t, 'square') * 0.4, 250, 3500) * np.minimum(1, (2.6 - t) * 4), 0.6)

    # latidos que se aceleran
    out = np.zeros(int(3.2 * SR))
    tt = 0.0
    k = 0
    while tt < 2.9:
        for off, a in [(0, 1.0), (0.13, 0.65)]:
            s = T(0.25)
            thump = tone(58 * np.exp(-s * 6) + 40, s) * np.exp(-s * 22) * a
            place(out, thump, tt + off)
        period = max(0.42, 0.85 - k * 0.08)
        tt += period
        k += 1
    save('latidos', np.tanh(out * 2), 0.9)

    t = T(1.1)
    f = np.linspace(180, 360, len(t)) * (1 + 0.02 * np.sin(2 * np.pi * 9 * t))
    tens = (tone(f, t, 'saw') + tone(f * 1.005, t, 'saw')) * (t / 1.1) * np.minimum(1, (1.1 - t) * 10)
    save('tension', band(tens, 150, 2500), 0.5)

    t = T(0.5)
    thud = tone(90 * np.exp(-t * 8) + 40, t) * np.exp(-t * 14)
    slap = band(noise(0.5), 600, 5000) * np.exp(-t * 45)
    save('sello', np.tanh((thud + slap * 0.9) * 2.5), 0.9)

    t = T(0.75)
    honk = tone(415, t, 'square') + tone(523, t, 'square')
    g = np.minimum(1, t / 0.01) * np.minimum(1, (0.75 - t) / 0.03)
    g *= np.where((t > 0.3) & (t < 0.38), 0, 1)
    save('claxon', band(honk, 300, 2500) * g, 0.6)

    t = T(2.2)
    bz = tone(215 + 12 * np.sin(2 * np.pi * 7 * t), t, 'saw') * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
    save('zumbido', band(bz, 200, 3000) * np.minimum(1, t * 4) * np.minimum(1, (2.2 - t) * 3), 0.5)

    t = T(0.9)
    save('puerta', sweep_noise(0.9, 3000, 600, 8) * np.exp(-t * 3) * np.minimum(1, t * 40) + band(noise(0.9), 3000, 9000) * np.exp(-t * 8) * 0.3, 0.55)

    t = T(0.7)
    parts = sum(tone(f, t) * np.exp(-t * d) * a for f, d, a in [(160, 8, 1), (431, 12, 0.6), (893, 18, 0.4), (1543, 25, 0.25)])
    save('clunk', parts + band(noise(0.7), 200, 2000) * np.exp(-t * 60), 0.85)

    t = T(0.6)
    save('boing', tone(220 + 160 * np.exp(-t * 4) * np.sin(2 * np.pi * 14 * t), t) * np.exp(-t * 5), 0.6)

    t = T(1.4)
    bell = sum(tone(f, t) * np.exp(-t * d) * a for f, d, a in [(1318, 3, 1), (2637, 5, 0.4), (3950, 8, 0.2)])
    save('ding', bell * np.minimum(1, t / 0.002), 0.5)

    out = np.zeros(int(1.2 * SR))
    for i, f in enumerate([1568, 1976, 2349, 3136, 3951]):
        s = T(0.6)
        place(out, tone(f, s) * np.exp(-s * 8) * (0.8 - i * 0.08), i * 0.07)
    save('brillo', out, 0.45)

    t = T(1.1)
    save('siseo', band(noise(1.1), 3500, 11000) * np.minimum(1, t * 8) * np.minimum(1, (1.1 - t) * 5) * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * t)), 0.4)

    out = np.zeros(int(1.6 * SR))
    for i in range(14):
        s = T(0.03)
        place(out, band(noise(0.03), 2000, 7000) * np.exp(-s * 200), i * 0.11)
    save('tic', out, 0.5)

    t = T(0.9)
    save('desinflar', tone(np.linspace(900, 180, len(t)) * (1 + 0.05 * np.sin(2 * np.pi * 30 * t)), t, 'tri') * np.exp(-t * 1.5) * 0.6 + band(noise(0.9), 1500, 6000) * np.exp(-t * 3) * 0.3, 0.55)

    out = np.zeros(int(0.8 * SR))
    for i in range(9):
        s = T(0.04)
        place(out, band(noise(0.04), 1500, 6000) * np.exp(-s * 150) + tone(1800, s) * np.exp(-s * 200) * 0.3, i * 0.075)
    save('perilla', out, 0.5)

    out = np.zeros(int(2.0 * SR))
    for i, f in enumerate([523, 659, 784, 1047]):
        s = T(1.2)
        place(out, (tone(f, s, 'tri') * 0.6 + tone(f * 2, s) * 0.2) * np.exp(-s * 4), i * 0.09)
    s = T(1.6)
    place(out, sum(tone(f, s, 'tri') for f in [523, 659, 784, 1047]) * np.exp(-s * 2.2) * 0.35, 0.4)
    save('final', out, 0.55)

    out = np.zeros(int(3.0 * SR))
    for i in range(7):
        s = T(0.12)
        place(out, band(noise(0.12), 80, 900) * np.exp(-s * 45) * (0.8 + 0.2 * (i % 2)), 0.15 + i * 0.4)
    save('pasos', out, 0.6)


# ------------------------------------------------------------------ música
def music(dur):
    """Loop original, curioso y ligero (~96 BPM): punteo, bajo, pad suave y percusión de cepillo."""
    bpm = 96
    beat = 60 / bpm
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    # progresión: Cmaj7 – Am7 – Fmaj7 – G6  (MIDI)
    prog = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]]
    bass = [36, 33, 29, 31]
    midi = lambda m: 440 * 2 ** ((m - 69) / 12)
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]  # arpegio en corcheas

    def pluck(f, d=0.9, amp=0.3):
        s = T(d)
        v = sum(tone(f * h, s) * (0.6 ** (h - 1)) * np.exp(-s * (3 + h * 1.5)) for h in range(1, 5))
        return v * np.minimum(1, s / 0.003) * amp

    bar = 4 * beat
    nbars = int(np.ceil(dur / bar)) + 1
    for b in range(nbars):
        ch = prog[b % 4]
        t0 = b * bar
        # pad
        s = T(bar + 0.3)
        pad = sum(tone(midi(m) * (1 + d), s, 'tri') for m in ch for d in (-0.002, 0.002)) * 0.03
        pad *= np.minimum(1, s / 0.4) * np.minimum(1, (bar + 0.3 - s) / 0.4)
        place(L, pad, t0)
        place(R, pad, t0)
        # bajo
        for k in (0, 2.5):
            s = T(beat * 1.2)
            bv = tone(midi(bass[b % 4]), s) * np.exp(-s * 2.5) * 0.22 + tone(midi(bass[b % 4]) * 2, s) * np.exp(-s * 5) * 0.05
            place(L, bv, t0 + k * beat)
            place(R, bv, t0 + k * beat)
        # arpegio (más presente en compases pares, variación en impares)
        for i, p in enumerate(pattern):
            if b % 8 in (6, 7) and i % 2:
                continue
            m = ch[p] + (12 if (b % 4 == 3 and i == 7) else 0)
            pv = pluck(midi(m + 12), amp=0.12)
            pan = 0.5 + 0.35 * np.sin(i * 1.3)
            place(L, pv * (1 - pan), t0 + i * beat / 2)
            place(R, pv * pan, t0 + i * beat / 2)
        # percusión: bombo suave en 1 y 3, cepillo en corcheas
        for k in (0, 2):
            s = T(0.25)
            kick = tone(90 * np.exp(-s * 25) + 45, s) * np.exp(-s * 18) * 0.25
            place(L, kick, t0 + k * beat)
            place(R, kick, t0 + k * beat)
        for i in range(8):
            s = T(0.08)
            hat = band(noise(0.08), 5000, 12000) * np.exp(-s * 70) * (0.05 if i % 2 else 0.03)
            place(L, hat * 0.8, t0 + i * beat / 2)
            place(R, hat, t0 + i * beat / 2)
    x = np.stack([L, R], 1)
    fi = int(1.0 * SR)
    x[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(2.5 * SR)
    x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    save('ep01_musica', x, 0.6, MUS)


if __name__ == '__main__':
    sfx()
    nar = json.load(open(os.path.join(ROOT, 'src/episodes/ep01/narracion.json')))
    music(nar['total'] + 1.0)
    print('✔ efectos en public/audio/sfx/, música en public/audio/musica/ep01_musica.wav')
    print('  ', sorted(f[:-4] for f in os.listdir(SFX)))
