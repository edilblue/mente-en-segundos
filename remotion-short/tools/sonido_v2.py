"""Música de fondo y FX de la versión 2 (duración y eventos leídos de src/v2/timeline.json).

Uso (desde remotion-short/):  python tools/sonido_v2.py
Salida: public/audio/v2/musica.wav y public/audio/v2/fx.wav
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sonido as S  # noqa: E402  (reutiliza los sintetizadores de la v1)

ROOT = os.path.dirname(HERE)
AUDIO = os.path.join(ROOT, "public", "audio", "v2")
SR = S.SR
TL = json.load(open(os.path.join(ROOT, "src", "v2", "timeline.json")))
FPS = TL["fps"]
TOTAL = TL["durationInFrames"] / FPS
N = int(TOTAL * SR)
LINE = {l["id"]: l for l in TL["lines"]}
SCENE = {s["id"]: s for s in TL["scenes"]}
sec = lambda f: f / FPS  # noqa: E731
rng = np.random.default_rng(11)


def music():
    pad, bass, arp, drums = (np.zeros(N) for _ in range(4))
    bars = int(np.ceil(TOTAL / S.BAR))
    drums_from = sec(SCENE["context"]["from"])
    drums_off = (sec(SCENE["payoff"]["from"]), sec(SCENE["guinness"]["from"]))  # respiro en el desenlace
    for b in range(bars):
        chord = S.CHORDS[b % 4]
        start = b * S.BAR
        for m in chord:
            S.place(pad, S.pad_note(S.midi(m), S.BAR + 0.6), max(0, start - 0.3))
        for k in range(4):
            S.place(bass, np.sin(2 * np.pi * S.midi(chord[0] - 12) * S.t_axis(S.BEAT)) * S.adsr(int(S.BEAT * SR), 0.02, 0.25) * 0.8, start + k * S.BEAT)
        seq = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12]
        for k in range(8):
            S.place(arp, S.pluck(S.midi(seq[k % 4])) * 0.35, start + k * S.BEAT / 2)
        if start >= drums_from and not (drums_off[0] <= start < drums_off[1]) and start < TOTAL - S.BAR:
            for k in (0, 2):
                S.place(drums, S.kick() * 0.55, start + k * S.BEAT)
            for k in range(4):
                S.place(drums, S.hat() * 0.12, start + k * S.BEAT + S.BEAT / 2)
    pad, bass, arp, drums = (x[:N] for x in (pad, bass, arp, drums))
    mix = pad * 0.55 + bass * 0.35 + arp * 0.45 + drums

    # Filtro: se va cerrando con los días y se abre al dormir (desenlace)
    keys = [(0, 6500), (sec(LINE["d1"]["start"]), 5200), (sec(LINE["d11"]["end"]), 900),
            (sec(LINE["p1"]["start"]) + 1.0, 900), (sec(LINE["p2"]["start"]), 6500), (TOTAL, 6500)]
    xs, ys = zip(*keys)
    out = np.zeros(N)
    zi = np.zeros(2)
    for s in range(0, N, 1024):
        b_, a_ = butter(2, float(np.interp(s / SR, xs, ys)), "lp", fs=SR)
        out[s : s + 1024], zi = lfilter(b_, a_, mix[s : s + 1024], zi=zi)

    v, vsr = sf.read(os.path.join(AUDIO, "voz.wav"), always_2d=True)
    v = np.interp(np.arange(N) / SR, np.arange(len(v)) / vsr, np.abs(v.mean(1)))
    env = np.convolve(v, np.ones(int(0.12 * SR)) / int(0.12 * SR), mode="same")
    gain = 1 - 0.5 * np.clip(env / (env.max() or 1) * 6, 0, 1)
    k = int(0.25 * SR)
    out *= np.convolve(gain, np.ones(k) / k, mode="same")
    out[: int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))
    out[-int(0.5 * SR):] *= np.linspace(1, 0.4, int(0.5 * SR))  # no a cero: el loop suena continuo
    return out / np.max(np.abs(out)) * 0.8


def heartbeat():
    t = S.t_axis(0.5)
    one = lambda d: np.sin(2 * np.pi * 55 * S.t_axis(0.18)) * np.exp(-S.t_axis(0.18) * 22)  # noqa: E731
    out = np.zeros(len(t))
    out[: len(one(0))] += one(0)
    out[int(0.2 * SR) : int(0.2 * SR) + len(one(0))] += one(0) * 0.7
    return out


def glitch(dur=0.35):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    # bit-crush + recortes aleatorios
    x = np.round(x * 3) / 3
    gate = np.repeat(rng.random(n // 400 + 1) > 0.45, 400)[:n]
    b, a = butter(2, 2500, "lp", fs=SR)  # sin agudos punzantes
    return lfilter(b, a, x * gate) * np.linspace(1, 0.2, n) * 0.35


def type_click():
    t = S.t_axis(0.02)
    return rng.standard_normal(len(t)) * np.exp(-t * 300) * 0.5


def fx():
    out = np.zeros(N)
    L = lambda i: sec(LINE[i]["start"])  # noqa: E731
    # Gancho: impacto + latido
    S.place(out, S.impact() * 0.55, 0.0)
    S.place(out, S.whoosh(0.5, 1800, 300, 0.18), 0.0)
    S.place(out, heartbeat() * 0.5, 0.7)
    S.place(out, heartbeat() * 0.4, 1.6)
    # Transiciones
    for s in TL["scenes"][1:]:
        S.place(out, S.whoosh(0.6, 300, 2200, 0.2), sec(s["from"]) - 0.2)
    # Cambios de día: golpe suave + tic
    days = [L("d1"), L("d2"), L("d3"), L("d4"), L("d11")] + [L("d9") + k * 4 / FPS for k in range(5)]
    for d in days:
        S.place(out, S.impact() * 0.25, d)
        S.place(out, S.blip(1200) * 0.15, d)
    # Día 1: tic-tac del reloj
    a, b = L("d1") + 4 / FPS, L("d1") + 1.6
    tt = a
    while tt < b:
        S.place(out, S.tick(2000) * 0.16, tt)
        tt += 0.12
    S.place(out, S.bell(1046.5) * 0.25, b)
    # Día 2: zumbido borroso; Día 3: latido acelerado
    S.place(out, S.whoosh(1.2, 200, 500, 0.12), L("d2") + 0.3)
    for k in range(3):
        S.place(out, heartbeat() * 0.35, L("d3") + 0.4 + k * 0.55)
    # Cerebro: apagado de la limpieza
    S.place(out, S.power_down(), L("b2"))
    # Día 4: glitches de alucinación
    for k in range(4):
        S.place(out, glitch(0.25) * 0.6, L("d4") + 0.6 + k * 1.1)
    S.place(out, glitch(0.5), L("d4") + (LINE["d4"]["end"] - LINE["d4"]["start"]) / FPS * 0.8)
    # Día 9: tecleo que se interrumpe
    tt = L("d9") + 0.15
    while tt < sec(LINE["d9"]["end"]) - 0.4:
        S.place(out, type_click() * 0.35, tt)
        tt += 0.09 + rng.random() * 0.05
    # Desenlace: brillo al dormir y campana de "recuperado"
    S.place(out, S.shimmer(2.0) * 0.6, L("p1") + 2.0)
    S.place(out, S.bell(1318.5) * 0.25, sec(LINE["p2"]["end"]) - 0.6)
    # Guinness: sello
    S.place(out, S.impact() * 0.45, L("g1") + 0.9)
    # Cierre: latido como en el inicio (loop)
    S.place(out, heartbeat() * 0.4, TOTAL - 1.2)
    return out / max(1.0, np.max(np.abs(out)) / 0.9)


def main():
    os.makedirs(AUDIO, exist_ok=True)
    sf.write(os.path.join(AUDIO, "musica.wav"), music().astype(np.float32), SR, subtype="PCM_16")
    sf.write(os.path.join(AUDIO, "fx.wav"), fx().astype(np.float32), SR, subtype="PCM_16")
    print("OK: public/audio/v2/musica.wav, public/audio/v2/fx.wav")


if __name__ == "__main__":
    main()
