"""Música de fondo y efectos de sonido (FX) del Short, sintetizados con código.

Uso (desde remotion-short/):
    pip install numpy scipy soundfile
    python tools/sonido.py

Salida:
    public/audio/musica.wav  -> música ambiental suave (con ducking bajo la voz si
                                existe public/audio/voz.wav). Se va "apagando" con
                                un filtro paso bajo a medida que la luna se apaga y
                                se vuelve a abrir en el cierre.
    public/audio/fx.wav      -> whooshes en las transiciones, tic-tac del reloj,
                                campanita a las 24h, apagado del cerebro, blips del
                                conteo 1→11 y brillo final.
Todo en volumen discreto: los niveles finales se ajustan en src/Short.tsx.
"""
import json
import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "public", "audio")
SR = 48000
TOTAL = 30.0
N = int(SR * TOTAL)
FPS = 30
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def place(buf, sig, at):
    s = int(at * SR)
    e = min(s + len(sig), len(buf))
    if s < len(buf):
        buf[s:e] += sig[: e - s]


def adsr(n, a, r):
    env = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    env[:na] = np.linspace(0, 1, na)
    if nr:
        env[-nr:] *= np.linspace(1, 0, nr)
    return env


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ───────────────────────── Música ─────────────────────────
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4
# Am – F – C – G (en notas MIDI)
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]


def pad_note(freq, dur):
    t = t_axis(dur)
    sig = np.zeros_like(t)
    for det in (-0.12, 0.0, 0.12):  # desafinado suave tipo "supersaw" mínimo
        f = freq * 2 ** (det / 12)
        for h in range(1, 6):
            sig += np.sin(2 * np.pi * f * h * t + rng.random() * 6) / (h ** 1.6)
    return sig * adsr(len(t), 0.5, 0.6) / 6


def pluck(freq, dur=0.5):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    return s * np.exp(-t * 7) * adsr(len(t), 0.004, 0.05)


def kick():
    t = t_axis(0.35)
    f = 40 + 70 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def hat():
    t = t_axis(0.05)
    sos = butter(4, 7000, "hp", fs=SR, output="sos")
    return sosfilt(sos, rng.standard_normal(len(t))) * np.exp(-t * 90)


def music():
    pad = np.zeros(N)
    bass = np.zeros(N)
    arp = np.zeros(N)
    drums = np.zeros(N)
    bars = int(np.ceil(TOTAL / BAR))
    for b in range(bars):
        chord = CHORDS[b % 4]
        start = b * BAR
        for m in chord:
            place(pad, pad_note(midi(m), BAR + 0.6), start - 0.3 if b else 0)
        for k in range(4):
            place(bass, np.sin(2 * np.pi * midi(chord[0] - 12) * t_axis(BEAT)) * adsr(int(BEAT * SR), 0.02, 0.25) * 0.8, start + k * BEAT)
        seq = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12]
        for k in range(8):
            place(arp, pluck(midi(seq[k % 4])) * 0.35, start + k * BEAT / 2)
        if 0 < b < bars - 1:  # ritmo muy suave, sin el primer ni el último compás
            for k in (0, 2):
                place(drums, kick() * 0.55, start + k * BEAT)
            for k in range(4):
                place(drums, hat() * 0.12, start + k * BEAT + BEAT / 2)

    mix = pad * 0.55 + bass * 0.35 + arp * 0.45 + drums

    # Filtro que se cierra con la "energía" de la luna y se reabre al final
    def cutoff(sec):
        return float(np.interp(sec, [0, 3, 26.8, 27.5, 29.3, 30], [6000, 5000, 900, 900, 6000, 6000]))

    out = np.zeros(N)
    block = 1024
    zi = np.zeros(2)
    for s in range(0, N, block):
        b_, a_ = butter(2, cutoff(s / SR), "lp", fs=SR)
        out[s : s + block], zi = lfilter(b_, a_, mix[s : s + block], zi=zi)

    # Ducking bajo la voz
    vpath = os.path.join(AUDIO, "voz.wav")
    if os.path.exists(vpath):
        v, vsr = sf.read(vpath, always_2d=True)
        v = np.abs(v.mean(1))
        v = np.interp(np.arange(N) / SR, np.arange(len(v)) / vsr, v)
        w = int(0.12 * SR)
        env = np.convolve(v, np.ones(w) / w, mode="same")
        env = env / (env.max() or 1)
        gain = 1 - 0.5 * np.clip(env * 6, 0, 1)
        # suavizado del ducking (ataque/relajación)
        k = int(0.25 * SR)
        gain = np.convolve(gain, np.ones(k) / k, mode="same")
        out *= gain

    fade = int(0.03 * SR)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))
    return out / np.max(np.abs(out)) * 0.8


# ───────────────────────── FX ─────────────────────────
def whoosh(dur=0.7, f0=400, f1=3500, gain=1.0):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    block = 512
    zi = np.zeros(4)
    for s in range(0, n, block):
        p = s / n
        fc = f0 + (f1 - f0) * np.sin(p * np.pi / 2) ** 2
        sos_b, sos_a = butter(2, [fc * 0.6, fc * 1.4], "bp", fs=SR)
        out[s : s + block], zi = lfilter(sos_b, sos_a, noise[s : s + block], zi=zi)
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * env * gain / (np.max(np.abs(out)) or 1)


def impact():
    t = t_axis(0.8)
    f = 35 + 90 * np.exp(-t * 12)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    return body * 0.9


def tick(freq=2200):
    t = t_axis(0.03)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 180)


def bell(freq=1046.5, dur=1.6):
    t = t_axis(dur)
    s = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 3), (2.76, 0.4, 5), (5.4, 0.2, 8), (2, 0.3, 4)])
    return s * adsr(len(t), 0.003, 0.1) / 1.9


def power_down():
    t = t_axis(0.8)
    f = 520 * np.exp(-t * 2.2)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)
    return s * np.exp(-t * 3) * adsr(len(t), 0.01, 0.2) * 0.5


def blip(freq):
    t = t_axis(0.09)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 40) * adsr(len(t), 0.002, 0.02)


def shimmer(dur=1.5):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for i, m in enumerate([81, 84, 88, 93]):
        s += np.sin(2 * np.pi * midi(m) * t) * np.clip((t - i * 0.15) * 4, 0, 1) * np.exp(-np.clip(t - i * 0.15, 0, None) * 2.5)
    return s * 0.25


def fx():
    out = np.zeros(N)
    timing = {}
    try:
        with open(os.path.join(ROOT, "src", "narration.json")) as f:
            timing = json.load(f)
    except FileNotFoundError:
        pass

    # Gancho: impacto + whoosh con el zoom de entrada
    place(out, impact() * 0.55, 0.0)
    place(out, whoosh(0.5, 3000, 300, 0.35), 0.0)
    # Transiciones entre escenas (empiezan ~0.25 s antes del corte)
    for sec in (3, 11, 19, 27):
        place(out, whoosh(0.7, 350, 3200, 0.32), sec - 0.3)

    # Escena 2: tic-tac acelerando mientras el reloj avanza (frames locales 8→120)
    s2 = 3.0
    a, b = s2 + 8 / FPS, s2 + 120 / FPS
    tt = a
    while tt < b:
        p = (tt - a) / (b - a)
        place(out, tick(2200 if int((tt - a) * 10) % 2 else 1700) * 0.18, tt)
        tt += 0.32 - 0.24 * np.sin(p * np.pi)  # rápido en medio (easing inOut)
    place(out, bell(1046.5) * 0.3, b)
    place(out, bell(1046.5 * 0.94) * 0.12, b + 0.12)  # eco "borroso"

    # Escena 3: apagado de la limpieza cerebral en "Sin dormir"
    s3 = 11.0
    text = "Mientras duermes, tu cerebro limpia desechos que se acumulan durante el día. Sin dormir, esa limpieza no ocurre".split(" ")
    i_sin = text.index("Sin")
    line = timing.get("step2", {"start": 340, "end": 533})
    if line.get("words"):
        sw = line["words"][i_sin] - 330
    else:  # mismo reparto que wordStarts() en Captions.tsx
        st, en = line["start"] - 330, line["end"] - 330 - 8
        wts = [len(x) + 3 for x in text]
        sw = round(st + (en - st) * sum(wts[:i_sin]) / sum(wts))
    place(out, power_down(), s3 + sw / FPS)

    # Escena 4: blips del conteo 1→11 (Easing.out(quad) entre frames 10 y 150)
    s4 = 19.0
    for n in range(2, 12):
        p = 1 - np.sqrt(1 - (n - 1) / 10)
        f = 10 + p * 140
        place(out, blip(500 + n * 45) * 0.22, s4 + f / FPS)
    place(out, bell(1318.5) * 0.25, s4 + 150 / FPS)

    # Cierre: brillo mientras la luna se recarga
    place(out, shimmer() * 0.6, 27.6)
    return out


def main():
    m = music()
    f = fx()
    sf.write(os.path.join(AUDIO, "musica.wav"), m.astype(np.float32), SR, subtype="PCM_16")
    f = f / max(1.0, np.max(np.abs(f)) / 0.9)
    sf.write(os.path.join(AUDIO, "fx.wav"), f.astype(np.float32), SR, subtype="PCM_16")
    print("OK: public/audio/musica.wav, public/audio/fx.wav")


if __name__ == "__main__":
    main()
