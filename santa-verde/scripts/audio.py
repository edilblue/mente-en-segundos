#!/usr/bin/env python3
"""Música navideña ORIGINAL + efectos de sonido, sintetizados con numpy (sin samples ni canciones con copyright),
y mezcla final con la voz: ducking de la música bajo la narración y normalización a -14 LUFS.

    python3 scripts/audio.py        → build/musica.wav, build/sfx.wav, build/mezcla.wav

Los momentos de los efectos salen de src/data/narracion.json (mismas palabras clave que usan las escenas).
"""
import json
import subprocess
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SR = 48000
TOTAL = 35.0
N = int(SR * TOTAL)
rng = np.random.default_rng(7)

NARR = json.loads((ROOT / "src/data/narracion.json").read_text())


def norm(w: str) -> str:
    w = unicodedata.normalize("NFD", w.lower())
    return "".join(c for c in w if c.isalnum() and not unicodedata.combining(c))


def esc(i):
    return next(e for e in NARR["escenas"] if e["id"] == i)


def cue(i, palabra, nth=0):
    hits = [w for w in esc(i)["palabras"] if norm(w["w"]) == norm(palabra)]
    return hits[nth]["start"]


def start(i):
    return esc(i)["inicio"]


def dur(i):
    return esc(i)["fin"] - esc(i)["inicio"]


# ------------------------------------------------------------------ síntesis básica
def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.2, sus_len=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    sus_n = max(0, n - a_n - d_n - r_n) if sus_len is None else int(sus_len * SR)
    e = np.concatenate([np.linspace(0, 1, a_n, False), np.linspace(1, s, d_n, False), np.full(sus_n, s), np.linspace(s, 0, r_n)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def bell(f, length, amp=1.0):
    """Celesta / caja de música: parciales inarmónicos con caída rápida."""
    t = np.arange(int(length * SR)) / SR
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2)
         + 0.45 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 5)
         + 0.22 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 8)
         + 0.12 * np.sin(2 * np.pi * f * 4.17 * t) * np.exp(-t * 12))
    return amp * y * np.minimum(1, t / 0.003)


def pluck(f, length, amp=1.0):
    """Bajo pizzicato."""
    t = np.arange(int(length * SR)) / SR
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9)
    return amp * y * np.exp(-t * 4.5) * np.minimum(1, t / 0.004)


def pad(freqs, length, amp=1.0):
    """Colchón suave: sierras desafinadas con filtro paso bajo simple."""
    t = np.arange(int(length * SR)) / SR
    y = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            ph = (ff * t) % 1.0
            y += (2 * ph - 1) * 0.33
    # paso bajo de un polo
    out = np.empty_like(y)
    acc = 0.0
    k = 0.035
    for i in range(len(y)):
        acc += k * (y[i] - acc)
        out[i] = acc
    return amp * out * env_adsr(len(t), a=0.25, d=0.2, s=0.8, r=0.35)


def place(buf, sig, t0, wrap=True):
    i0 = int(round(t0 * SR))
    end = i0 + len(sig)
    if end <= len(buf):
        buf[i0:end] += sig
    else:
        cut = len(buf) - i0
        buf[i0:] += sig[:cut]
        if wrap:  # lo que sobra vuelve al principio → loop perfecto
            buf[: len(sig) - cut] += sig[cut:]


# ------------------------------------------------------------------ música (16 compases = 35 s exactos)
def musica():
    buf = np.zeros(N)
    beat = TOTAL / 64  # 0.546875 s → ~109,7 BPM
    # Progresión original en Do mayor: I – vi – IV – V7 | I – iii – IV – V (×2)
    prog = [
        [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62, 65],
        [60, 64, 67], [52, 55, 59], [53, 57, 60], [55, 59, 62],
    ] * 2
    bass = [36, 33, 29, 31, 36, 28, 29, 31] * 2
    # Melodía original (grados por corchea: None = silencio). 2 compases por frase.
    frases = [
        [76, None, 74, 76, 79, None, 76, None, 74, None, 72, 74, 76, None, None, None],
        [72, None, 74, 76, 77, None, 76, 74, 72, None, 69, None, 71, None, None, None],
        [76, None, 79, 81, 79, None, 76, None, 77, None, 76, 74, 72, None, None, None],
        [74, None, 72, 74, 76, None, 74, None, 72, 71, 72, None, None, None, 67, None],
    ]
    mel = frases + frases[:3] + [[74, None, 76, 77, 79, None, 74, None, 72, None, None, None, None, None, 67, None]]
    for bar in range(16):
        t0 = bar * 4 * beat
        place(buf, pad([midi(m) for m in prog[bar]], 4 * beat + 0.4, 0.05), t0)
        # bajo: 1 y 3 (+ quinta)
        place(buf, pluck(midi(bass[bar]), 1.2, 0.32), t0)
        place(buf, pluck(midi(bass[bar] + 7), 1.0, 0.22), t0 + 2 * beat)
        # arpegio suave de campanitas en contratiempo
        for k, m in enumerate(prog[bar][:3]):
            place(buf, bell(midi(m + 12), 1.2, 0.05), t0 + (k * 2 + 1) * beat / 2 + beat)
    for p, frase in enumerate(mel):
        t0 = p * 8 * beat
        for k, m in enumerate(frase):
            if m is not None:
                place(buf, bell(midi(m), 1.6, 0.16), t0 + k * beat / 2)
    # cascabeles: ruido filtrado en corcheas, acento en 2 y 4
    for k in range(128):
        n = int(0.09 * SR)
        noise = rng.standard_normal(n)
        noise = np.diff(noise, prepend=0)  # brillo (paso alto)
        noise = np.diff(noise, prepend=0)
        e = np.exp(-np.arange(n) / SR * 45)
        acc = 1.0 if k % 4 == 2 else 0.55
        place(buf, noise * e * 0.012 * acc, k * beat / 2)
    return buf


# ------------------------------------------------------------------ efectos
def whoosh(length=0.45, amp=0.35, up=True):
    n = int(length * SR)
    x = rng.standard_normal(n)
    t = np.linspace(0, 1, n)
    # filtro paso banda con frecuencia que barre
    out = np.empty(n)
    lp = bp = 0.0
    for i in range(n):
        fc = 300 + 3200 * (t[i] if up else 1 - t[i])
        f = 2 * np.sin(np.pi * fc / SR)
        hp = x[i] - lp - 0.6 * bp
        bp += f * hp
        lp += f * bp
        out[i] = bp
    e = np.sin(np.pi * t) ** 1.5
    return amp * out / (np.max(np.abs(out)) + 1e-9) * e


def thud(amp=0.9):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t * 9) + 45
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = rng.standard_normal(n) * np.exp(-t * 60) * 0.5
    return amp * (body + click)


def pop(f=900, amp=0.25):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    ff = f * (1 + 1.5 * np.exp(-t * 40))
    return amp * np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 35)


def scratch(length=0.4, amp=0.12):
    """Tiza sobre pizarra: ráfagas de ruido granulado."""
    n = int(length * SR)
    x = rng.standard_normal(n)
    x = np.diff(x, prepend=0)
    t = np.arange(n) / SR
    gran = (np.sin(2 * np.pi * 23 * t) > -0.2).astype(float) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    e = env_adsr(n, a=0.02, d=0.05, s=0.8, r=0.08)
    return amp * x * gran * e


def swish(length=0.5, amp=0.18):
    return whoosh(length, amp, up=False)


def boing(amp=0.3):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 220 + 260 * np.sin(np.pi * np.minimum(1, t / 0.25)) * np.exp(-t * 3)
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)


def sparkle(amp=0.22):
    out = np.zeros(int(0.9 * SR))
    for k, m in enumerate([88, 91, 95, 100]):
        s = bell(midi(m), 0.8, amp * (1 - k * 0.15))
        i0 = int(k * 0.05 * SR)
        out[i0:i0 + len(s)] += s[: len(out) - i0]
    return out


def efectos():
    buf = np.zeros(N)
    # transiciones entre escenas
    for i in range(2, 7):
        place(buf, whoosh(0.42, 0.3), start(i) - 0.24, wrap=False)
    # escena 1: tiza del título, sello, "¡Mentira!"
    place(buf, scratch(0.45, 0.1), 0.05, wrap=False)
    place(buf, whoosh(0.3, 0.2, up=False), 0.5, wrap=False)
    place(buf, thud(0.85), 0.78, wrap=False)
    place(buf, swish(0.4, 0.15), cue(1, "rojo") - 0.25, wrap=False)
    for k in range(3):
        place(buf, pop(1000 + 200 * k, 0.12), cue(1, "rojo") - 0.1 + k * 0.1, wrap=False)
    place(buf, thud(0.6), cue(1, "¡Mentira!"), wrap=False)
    # escena 2: llegadas del desfile, salto y "distinto"
    place(buf, scratch(0.5, 0.08), start(2) + 0.05, wrap=False)
    for k, w in enumerate(["aparecía", "azules", "marrones."]):
        place(buf, pop(600 + 150 * k, 0.2), cue(2, w) + 0.2, wrap=False)
    place(buf, boing(0.18), cue(2, "Cada") + 0.12, wrap=False)
    place(buf, pop(1300, 0.18), cue(2, "distinto."), wrap=False)
    # escena 3: lápiz y relleno rojo
    place(buf, scratch(1.2, 0.07), start(3) + 0.3, wrap=False)
    place(buf, scratch(0.6, 0.09), cue(3, "rojo") - 0.2, wrap=False)
    place(buf, pop(1100, 0.18), cue(3, "rojo") + 0.45, wrap=False)
    # escena 4: año, botella, contrato, pincel, salto fuera del cuadro
    place(buf, thud(0.55), cue(4, "1931,") + 0.0, wrap=False)
    place(buf, pop(700, 0.2), cue(4, "Coca-Cola"), wrap=False)
    place(buf, scratch(0.6, 0.08), cue(4, "contrató") + 0.1, wrap=False)
    place(buf, whoosh(0.35, 0.18), cue(4, "ilustrador") - 0.15, wrap=False)
    place(buf, swish(0.9, 0.12), cue(4, "Haddon") + 0.4, wrap=False)
    place(buf, sparkle(0.12), cue(4, "cálido,") - 0.05, wrap=False)
    place(buf, boing(0.28), cue(4, "botella") - 0.35, wrap=False)
    place(buf, thud(0.4), cue(4, "botella") + 0.2, wrap=False)
    # escena 5: carteles que se duplican + globo
    t_anos = cue(5, "años") - start(5)
    for i in range(35):
        at = 0.15 + (np.log2(i + 1) / 5.2) * (t_anos + 0.1 - 0.15)
        if i in (0, 1, 3, 7, 15, 31) or i % 4 == 0:
            place(buf, pop(800 + (i % 5) * 120, 0.12), start(5) + at, wrap=False)
    place(buf, whoosh(0.5, 0.25), cue(5, "mundo") - 0.3, wrap=False)
    for k in range(6):
        place(buf, pop(1200 + 90 * k, 0.09), cue(5, "mundo") + 0.1 + k * 0.12, wrap=False)
    place(buf, pop(1500, 0.16), cue(5, "adoptó."), wrap=False)
    # escena 6: texto, guiño y borrador del loop
    place(buf, scratch(0.5, 0.08), start(6) + 0.1, wrap=False)
    place(buf, pop(900, 0.16), cue(6, "imposible"), wrap=False)
    place(buf, sparkle(0.2), cue(6, "olvidar.") + 0.25, wrap=False)
    place(buf, swish(0.45, 0.14), TOTAL - 0.5, wrap=True)
    return buf


def guardar(path, x):
    x = np.clip(x, -1, 1)
    data = (x * 32767).astype("<i2").tobytes()
    import wave

    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def main():
    BUILD.mkdir(exist_ok=True)
    m = musica()
    guardar(BUILD / "musica.wav", m / (np.max(np.abs(m)) + 1e-9) * 0.7)
    s = efectos()
    guardar(BUILD / "sfx.wav", s / max(1.0, np.max(np.abs(s))) * 0.9)
    voz = BUILD / "voz.wav"
    # Mezcla: música a -21 dB bajo la voz y con ducking (sidechain), efectos discretos.
    filtro = (
        "[0:a]volume=1.0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2[v];"
        "[v]asplit=2[v1][vk];"
        "[1:a]volume=0.32[m];"
        "[m][vk]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];"
        "[2:a]volume=0.55[s];"
        "[v1][md][s]amix=inputs=3:normalize=0,atrim=0:35,asetpts=N/SR/TB[mix]"
    )
    pre = BUILD / "mezcla_pre.wav"
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(voz), "-i", str(BUILD / "musica.wav"), "-i", str(BUILD / "sfx.wav"),
        "-filter_complex", filtro, "-map", "[mix]", "-ar", "48000", "-ac", "2", str(pre))
    # Normalización a -14 LUFS en dos pasadas (true peak ≤ -1.5 dBTP)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(pre), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    js = r.stderr[r.stderr.rindex("{"): r.stderr.rindex("}") + 1]
    m1 = json.loads(js)
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m1['input_i']}:measured_TP={m1['input_tp']}:"
          f"measured_LRA={m1['input_lra']}:measured_thresh={m1['input_thresh']}:offset={m1['target_offset']}:linear=true")
    out = BUILD / "mezcla.wav"
    run("ffmpeg", "-y", "-loglevel", "error", "-i", str(pre), "-af", f"{ln},atrim=0:35", "-ar", "48000", "-ac", "2", str(out))
    print(f"✔ build/mezcla.wav · entrada {m1['input_i']} LUFS → -14 LUFS")


if __name__ == "__main__":
    main()
