#!/usr/bin/env python3
"""Banda sonora original (100 % procedural, libre de derechos) + mezcla final.

- Música por secciones emocionales (misterio → pulsos electrónicos → tensión cardiaca →
  curiosidad → calidez → tensión controlada → resolución).
- Latidos en los MISMOS instantes que la animación (data/timeline.json).
- Efectos: impactos, whooshes, sinapsis, impulsos eléctricos, gotas, aleteos, cristal...
- Voz de Gemini colocada en su sitio, con ducking de la música bajo la narración.
Salida: out/mezcla.wav (48 kHz estéreo).
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, 'data/timeline.json'), encoding='utf-8'))
SR = 48000
TOTAL = TL['total']
N = int(round(TOTAL * SR))
rng = np.random.default_rng(7)
S = {s['id']: s for s in TL['scenes']}
st = lambda i: S[i]['start']
en = lambda i: S[i]['start'] + S[i]['dur']


def tvec(d):
    return np.arange(int(d * SR)) / SR


def place(buf, sig, t0, gain=1.0):
    i0 = int(round(t0 * SR))
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    i1 = min(len(buf), i0 + len(sig))
    if i1 > i0:
        buf[i0:i1] += sig[: i1 - i0] * gain


def env_adsr(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    na = max(1, int(a * SR))
    nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, sus, na) ** 1.5 if na < n else np.linspace(0, sus, n)[:na]
    if nr < n:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def lp(x, f, order=2):
    sos = butter(order, f, 'low', fs=SR, output='sos')
    return sosfilt(sos, x)


def hp(x, f, order=2):
    sos = butter(order, f, 'high', fs=SR, output='sos')
    return sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], 'band', fs=SR, output='sos')
    return sosfilt(sos, x)


def note(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ============================================================ instrumentos
def pad(freqs, d, bright=0.5, a=1.5, r=2.0, detune=0.004):
    t = tvec(d)
    out = np.zeros(len(t))
    for f in freqs:
        for dv in (-detune, 0, detune):
            ff = f * (1 + dv)
            ph = rng.random() * 6.28
            for h in range(1, 9):
                amp = (1 / h) * np.exp(-(h - 1) * (1.2 - bright))
                out += amp * np.sin(2 * np.pi * ff * h * t + ph * h)
    vib = 1 + 0.15 * np.sin(2 * np.pi * 0.17 * t)
    out *= env_adsr(len(t), a, r) * vib
    return out / (len(freqs) * 3 * 1.6)


def pluck(f, d=1.2, bright=0.7):
    t = tvec(d)
    out = np.zeros(len(t))
    for h in range(1, 7):
        out += (bright ** (h - 1)) * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (3 + h * 2.2))
    return out * np.minimum(1, t * 400)


def piano(f, d=3.0, vel=1.0):
    t = tvec(d)
    out = np.zeros(len(t))
    B = 0.0004
    for h in range(1, 9):
        fh = f * h * np.sqrt(1 + B * h * h)
        out += (0.6 ** (h - 1)) * np.sin(2 * np.pi * fh * t) * np.exp(-t * (0.9 + h * 0.7))
    out += 0.3 * np.sin(2 * np.pi * f * t) * np.exp(-t * 0.5)
    return vel * out * np.minimum(1, t * 300) * 0.5


def sub(f, d, a=0.3, r=0.6):
    t = tvec(d)
    return np.sin(2 * np.pi * f * t) * env_adsr(len(t), a, r)


def noise(d):
    return rng.standard_normal(int(d * SR))


# ============================================================ efectos
def heartbeat(g=1.0):
    def thump(f0, d, amp):
        t = tvec(d)
        f = f0 * (1 + 0.6 * np.exp(-t * 30))
        ph = 2 * np.pi * np.cumsum(f) / SR
        s = np.sin(ph) * np.exp(-t * 14) * amp
        s += 0.25 * lp(noise(d), 300) * np.exp(-t * 40) * amp
        return s

    out = np.zeros(int(0.6 * SR))
    l = thump(52, 0.35, 1.0)
    dub = thump(64, 0.3, 0.7)
    out[: len(l)] += l
    i = int(0.24 * SR)
    out[i: i + len(dub)] += dub
    return out * g


def impact(g=1.0):
    t = tvec(2.5)
    f = 40 + 60 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    s += 0.5 * lp(noise(2.5), 900) * np.exp(-t * 6)
    return s * g


def whoosh(g=1.0, d=1.1):
    t = tvec(d)
    n = noise(d)
    out = np.zeros(len(t))
    # barrido de filtro por bloques
    blocks = 24
    L = len(t) // blocks
    for b in range(blocks):
        u = b / blocks
        fc = 300 + 5000 * np.sin(np.pi * u) ** 2
        seg = bp(n[b * L:(b + 1) * L + 2000], fc * 0.5, min(fc * 1.6, 20000))[:L]
        out[b * L:b * L + len(seg)] += seg
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return out * e * g * 0.6


def riser(g=1.0, d=1.6):
    t = tvec(d)
    f = 200 * (1 + 6 * (t / d) ** 2)
    s = 0.3 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    s += hp(noise(d), 2000) * 0.25
    return s * (t / d) ** 2 * g


def ping(g=1.0, f=1760):
    t = tvec(1.6)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
    return s * g * 0.4


def synapse(g=1.0):
    out = np.zeros(int(2.4 * SR))
    for k in range(26):
        f = 1200 + rng.random() * 3800
        b = ping(1, f)[: int(0.5 * SR)] * np.exp(-np.arange(int(0.5 * SR)) / SR * 6)
        place(out, b, 0.15 + k * 0.07 + rng.random() * 0.04, 0.25 * (1 - k / 30))
    t = tvec(2.4)
    out += 0.4 * np.sin(2 * np.pi * 110 * t) * np.exp(-t * 2) * np.minimum(1, t * 20)
    return out * g


def sparkle(g=1.0):
    out = np.zeros(int(1.8 * SR))
    for k in range(14):
        place(out, ping(1, 2000 + rng.random() * 4000)[: int(0.4 * SR)], k * 0.06 + rng.random() * 0.05, 0.22)
    return out * g


def zap(g=1.0):
    t = tvec(0.6)
    f = 900 * np.exp(-t * 5) + 80
    sq = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    s = 0.25 * lp(sq, 4000) * np.exp(-t * 7) + 0.3 * hp(noise(0.6), 3000) * (rng.random(len(t)) > 0.92) * np.exp(-t * 5)
    return s * g


def drip(g=1.0):
    out = np.zeros(int(1.5 * SR))
    for k in range(4):
        t = tvec(0.25)
        f = 700 + 1500 * (t / 0.25) ** 0.5
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)
        place(out, s, k * 0.28 + rng.random() * 0.1, 0.45)
    return out * g


def flutter(g=1.0):
    d = 2.0
    t = tvec(d)
    am = (np.sin(2 * np.pi * 22 * t) > 0.2).astype(float)
    s = bp(noise(d), 1500, 6000) * am * np.sin(np.pi * t / d) ** 2
    return s * g * 0.3


def pop(g=1.0):
    t = tvec(0.35)
    f = 500 + 700 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * g * 0.6


def shimmer(g=1.0):
    d = 2.5
    t = tvec(d)
    s = np.zeros(len(t))
    for f in (1568, 2093, 2637, 3136):
        s += np.sin(2 * np.pi * f * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t + f))
    return s * np.sin(np.pi * t / d) ** 2 * g * 0.08


def warm(g=1.0):
    return pad([note(50), note(57), note(62), note(66)], 3.5, bright=0.3, a=1.0, r=1.8) * g * 1.4


def crack(g=1.0):
    t = tvec(1.2)
    s = hp(noise(1.2), 2500) * np.exp(-t * 18) * 0.6
    for f in (2400, 3700, 5100):
        s += 0.2 * np.sin(2 * np.pi * f * t) * np.exp(-t * 9)
    s += 0.5 * np.sin(2 * np.pi * 70 * t) * np.exp(-t * 6)
    return s * g


FX = dict(impact=impact, whoosh=whoosh, riser=riser, ping=ping, synapse=synapse, sparkle=sparkle, zap=zap, drip=drip,
          flutter=flutter, pop=pop, shimmer=shimmer, warm=warm, crack=crack)

# ============================================================ música
music = np.zeros(N)
Dm = [note(n) for n in (38, 45, 50, 53, 57, 64)]


def section_pad(chords, t0, t1, bright=0.45, gain=1.0):
    seg = (t1 - t0) / len(chords)
    for i, ch in enumerate(chords):
        place(music, pad([note(n) for n in ch], seg + 2.0, bright=bright, a=1.2, r=2.0), t0 + i * seg - 0.4, gain)


# S1 — misterio: Dm(add9) con swell
section_pad([[38, 50, 53, 57, 64], [34, 50, 53, 58, 62]], 0.0, en(1) + 0.5, bright=0.3, gain=0.9)
place(music, sub(note(26), en(1) + 1, a=2, r=1.5), 0, 0.35)
# S2 — exploración cerebral: pulsos y arpegios electrónicos
section_pad([[38, 50, 53, 57], [41, 53, 57, 60], [36, 48, 52, 55], [43, 50, 55, 59]], st(2), en(2), bright=0.5, gain=0.7)
arp = [62, 65, 69, 72, 69, 65]
step = 60 / 104 / 2
k = 0
tt = st(2) + 0.3
while tt < en(2) - 0.3:
    root_shift = [0, 3, -2, 5][int((tt - st(2)) / ((en(2) - st(2)) / 4)) % 4]
    f = note(arp[k % len(arp)] + root_shift)
    place(music, lp(pluck(f, 0.9, 0.6), 3500), tt, 0.16 * min(1, (tt - st(2)) / 3))
    tt += step
    k += 1
# S3 — corazón: tensión ascendente
section_pad([[38, 50, 57, 62], [39, 51, 58, 63], [41, 53, 60, 65]], st(3), en(3), bright=0.6, gain=0.75)
tt = st(3) + 0.2
while tt < en(3) - 0.4:
    u = (tt - st(3)) / (en(3) - st(3))
    place(music, lp(pluck(note(50 + 12 * (int(u * 3) % 2)), 0.5, 0.8), 2500), tt, 0.09)
    tt += step * (1.0 - 0.35 * u)
# S4 — curiosidad: campanas
section_pad([[41, 53, 57, 60, 64], [38, 50, 57, 62, 65]], st(4), en(4), bright=0.4, gain=0.65)
for i, n in enumerate([72, 76, 79, 77, 74, 72, 76, 81, 79, 76, 74, 77]):
    place(music, piano(note(n), 2.5, 0.5), st(4) + 0.5 + i * (en(4) - st(4) - 1) / 12, 0.22)
# S5 — calidez: re mayor
section_pad([[38, 50, 54, 57, 62], [35, 50, 54, 59, 62], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]], st(5), en(5), bright=0.35, gain=0.85)
mel = [66, 69, 74, 73, 71, 69, 66, 64, 62, 64, 66, 69]
for i, n in enumerate(mel):
    place(music, piano(note(n), 3, 0.7), st(5) + 0.8 + i * (en(5) - st(5) - 2) / len(mel), 0.26)
# S6 — tensión controlada
place(music, pad([note(n) for n in (37, 44, 49, 52)], en(6) - st(6) + 1.5, bright=0.25, a=2.0, r=1.5), st(6) - 0.3, 0.75)
place(music, lp(noise(en(6) - st(6)), 500) * 0.05, st(6), 1.0)
for i in range(6):
    place(music, piano(note([61, 62, 61, 64, 62, 61][i]), 3, 0.5), st(6) + 1.5 + i * 2.6, 0.18)
# S7 — el amor cambia: progresión que se asienta
section_pad([[43, 50, 55, 59, 62], [45, 52, 57, 61, 64], [38, 50, 54, 57, 62]], st(7), en(7), bright=0.4, gain=0.85)
for i, n in enumerate([62, 66, 69, 74, 71, 69, 66, 69, 74]):
    place(music, piano(note(n), 3, 0.6), st(7) + 0.6 + i * (en(7) - st(7) - 1.5) / 9, 0.24)
# S8 — resolución emotiva
section_pad([[35, 47, 54, 59, 62], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64], [38, 50, 54, 57, 62, 66]], st(8), TOTAL, bright=0.5, gain=0.95)
for i, n in enumerate([74, 73, 71, 69, 71, 66, 69, 74]):
    place(music, piano(note(n), 3.5, 0.75), st(8) + 0.4 + i * (TOTAL - st(8) - 2.2) / 8, 0.3)
place(music, sub(note(26), TOTAL - st(8), a=1.5, r=2.5), st(8), 0.3)

# ============================================================ reverberación
def reverb(x, secs=2.6, mix=0.35, seed=1):
    r = np.random.default_rng(seed)
    t = tvec(secs)
    ir = r.standard_normal(len(t)) * np.exp(-t * 6.9 / secs)
    ir = lp(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(x, ir)[: len(x)]
    return (1 - mix) * x + mix * wet


music = hp(music, 35)
mL = reverb(music, seed=1)
mR = reverb(music, seed=2)

# ============================================================ efectos y latidos
fx = np.zeros(N)
for b in TL['beats']:
    place(fx, heartbeat(b['g']), b['t'] - 0.02, 0.55)
for e in TL['sfx']:
    place(fx, FX[e['k']](e['g']), e['t'] - (0.55 if e['k'] == 'whoosh' else 0), 0.5)
fxL = reverb(fx, 1.6, 0.25, 3)
fxR = reverb(fx, 1.6, 0.25, 4)

# ============================================================ voz
voice = np.zeros(N)
tmp = os.path.join(ROOT, 'out', 'voz_tmp')
os.makedirs(tmp, exist_ok=True)
for s in TL['scenes']:
    src = os.path.join(ROOT, 'public', s['audio'])
    dst = os.path.join(tmp, f"v{s['id']}.wav")
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af',
                    f"atempo={TL['tempo']},highpass=f=75,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,"
                    "acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2",
                    '-ar', str(SR), '-ac', '1', dst], check=True)
    v, sr = sf.read(dst)
    assert sr == SR
    place(voice, v, s['voiceStart'])
voice /= np.max(np.abs(voice)) + 1e-9
voice *= 0.82

# ducking: envolvente de la voz (ataque rápido, liberación lenta)
envv = np.abs(voice)
win = int(0.04 * SR)
envv = np.convolve(envv, np.ones(win) / win, mode='same')
duck = np.zeros_like(envv)
a_c = np.exp(-1 / (0.03 * SR))
r_c = np.exp(-1 / (0.45 * SR))
# filtro de envolvente vectorizado por bloques (aprox.: max deslizante + suavizado)
from scipy.ndimage import maximum_filter1d, uniform_filter1d
duck = maximum_filter1d(envv, int(0.35 * SR))
duck = uniform_filter1d(duck, int(0.25 * SR))
duck = np.clip(duck / (np.percentile(duck[duck > 1e-4], 90) + 1e-9), 0, 1)
mgain = 1 - 0.68 * duck

music_gain = 0.42
L = voice + mL * music_gain * mgain + fxL * 0.75 * (1 - 0.6 * duck)
R = voice + mR * music_gain * mgain + fxR * 0.75 * (1 - 0.6 * duck)
# fundido final
fade = int(1.4 * SR)
L[-fade:] *= np.linspace(1, 0, fade) ** 1.3
R[-fade:] *= np.linspace(1, 0, fade) ** 1.3
mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) / 0.89
raw = os.path.join(ROOT, 'out', 'mezcla_raw.wav')
sf.write(raw, mix.astype(np.float32), SR, subtype='FLOAT')
sf.write(os.path.join(ROOT, 'out', 'stem_voz.wav'), voice.astype(np.float32), SR, subtype='FLOAT')
# normalización de sonoridad para plataformas (-14 LUFS, pico real -1.5 dBTP)
out = os.path.join(ROOT, 'out', 'mezcla.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), '-c:a', 'pcm_s16le', out], check=True)
print('✔ mezcla', out, f'{N / SR:.2f}s')
