"""Banda sonora 100% sintetizada con NumPy/SciPy.

- Música: drones graves, pads en re menor, pulsos de tensión y un "riser"
  antes del final, con reverb por convolución.
- Efectos: respiración (ruido filtrado), latidos (lub-dub), whooshes e
  impactos en transiciones, flujo sanguíneo, chispazos neuronales y pitidos
  de monitor.
- Mezcla con la narración y ducking automático de la música.
"""
import numpy as np
import soundfile as sf
from scipy import signal

from .. import config as C

SR = C.SAMPLE_RATE


def _t(n):
    return np.arange(n, dtype=np.float64) / SR


def _env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na > 0:
        e[:na] = np.linspace(0, 1, na)
    if nr > 0:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def _bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def _lp(x, f, order=2):
    sos = signal.butter(order, f, btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def _hp(x, f, order=2):
    sos = signal.butter(order, f, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def _reverb(x, seconds=2.8, wet=0.35, seed=0):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = rng.normal(0, 1, (n, 2)) * np.exp(-np.linspace(0, 7, n))[:, None]
    ir[:, 0] = _lp(ir[:, 0], 6000)
    ir[:, 1] = _lp(ir[:, 1], 6000)
    ir /= np.sqrt(np.sum(ir ** 2, 0))
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    out = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - wet) + out * wet


def _place(buf, x, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n] * gain


def _saw(f, t, detune=0.0):
    ph = (f * (1 + detune)) * t
    return 2 * (ph % 1.0) - 1


def music(tl, dur):
    n = int(dur * SR)
    t = _t(n)
    out = np.zeros((n, 2))
    # Drone grave (re) con filtro que respira
    d = sum(_saw(36.71, t, dt) for dt in (-0.004, 0.0, 0.0037)) / 3
    d2 = sum(_saw(55.0, t, dt) for dt in (-0.003, 0.003)) / 2
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * t / 9.0)
    drone = _lp(d, 180) * (0.6 + 0.4 * lfo) + _lp(d2, 260) * 0.35
    sub = np.sin(2 * np.pi * 36.71 * t) * 0.5
    tension = np.clip((t - tl.T2) / (tl.T6 - tl.T2), 0, 1)
    out += np.stack([drone, drone], 1) * (0.22 + 0.1 * tension)[:, None]
    out += np.stack([sub, sub], 1) * 0.12

    # Pads de acordes: Dm - Bb - Gm - A (misterio)
    chords = [[146.83, 174.61, 220.0, 293.66], [116.54, 146.83, 174.61, 233.08],
              [98.0, 146.83, 196.0, 233.08], [110.0, 138.59, 164.81, 220.0]]
    bar = 4.4
    pad = np.zeros(n)
    k = 0
    tt = 0.0
    while tt < dur:
        ch = chords[k % 4]
        seg_n = int(bar * SR)
        st = _t(seg_n)
        s = np.zeros(seg_n)
        for f in ch:
            s += np.sin(2 * np.pi * f * st + 0.3 * np.sin(2 * np.pi * 0.2 * st)) * 0.5
            s += _saw(f, st, 0.002) * 0.12
        s = _lp(s, 1400) * _env(seg_n, 1.4, 1.6)
        i = int(tt * SR)
        m = min(seg_n, n - i)
        pad[i:i + m] += s[:m]
        tt += bar * 0.92
        k += 1
    pad = pad * 0.07
    pan = np.stack([pad * 0.9, pad], 1)
    out += pan

    # Pulso de tensión (como reloj interno) desde que deja de respirar
    pulse = np.zeros(n)
    bpm = 100
    step = 60 / bpm / 2
    tk = tl.T2
    rng = np.random.default_rng(2)
    while tk < tl.FINAL_TEXT - 0.5:
        ln = int(0.06 * SR)
        click = _bp(rng.normal(0, 1, ln), 1800, 6000) * np.exp(-np.linspace(0, 9, ln))
        i = int(tk * SR)
        pulse[i:i + ln] += click * (0.6 + 0.4 * ((tk - tl.T2) / step % 2 < 1))
        tk += step
    out += np.stack([pulse * 0.6, pulse], 1) * 0.06

    # Arpegio sutil (agudo, frío) en la escena del cerebro
    arp_notes = [587.33, 698.46, 880.0, 698.46]
    ta = tl.T4
    j = 0
    while ta < tl.T5:
        ln = int(0.35 * SR)
        st = _t(ln)
        nt = np.sin(2 * np.pi * arp_notes[j % 4] * st) * np.exp(-st * 7)
        act = tl.brain_activity(ta)
        _place(out, nt * 0.05 * act, ta)
        ta += 0.18
        j += 1

    # Riser antes del final y golpe
    rl = 3.0
    rn = int(rl * SR)
    st = _t(rn)
    noise = np.random.default_rng(4).normal(0, 1, rn)
    riser = _hp(noise, 2000) * (st / rl) ** 3 * 0.12
    riser += np.sin(2 * np.pi * (200 + 600 * (st / rl) ** 2) * st) * (st / rl) ** 2 * 0.04
    _place(out, riser, tl.FINAL_TEXT - rl)
    out = _reverb(out, 3.2, 0.4, seed=1)
    # Final: acorde sostenido
    hn = int(4.5 * SR)
    st = _t(hn)
    fin = sum(np.sin(2 * np.pi * f * st) for f in (73.42, 146.83, 220.0, 293.66, 349.23)) * np.exp(-st * 0.7)
    _place(out, _reverb(fin * 0.07, 3.0, 0.5), tl.FINAL_TEXT)
    return out


def heartbeat(strength=1.0):
    ln = int(0.55 * SR)
    t = _t(ln)

    def thump(t0, f0, f1, dec, g):
        tt = np.clip(t - t0, 0, None)
        f = f1 + (f0 - f1) * np.exp(-tt * 30)
        ph = 2 * np.pi * np.cumsum(f) / SR
        return np.sin(ph) * np.exp(-tt * dec) * (t >= t0) * g

    x = thump(0.0, 95, 48, 16, 1.0) + thump(0.27, 110, 58, 20, 0.7)
    x += _lp(np.random.default_rng(0).normal(0, 1, ln), 300) * np.exp(-t * 30) * 0.3
    return x * strength


def breath(kind, dur):
    n = int(dur * SR)
    t = _t(n)
    noise = np.random.default_rng(int(dur * 100) + len(kind)).normal(0, 1, n)
    if kind == "out":
        x = _bp(noise, 300, 1800)
        env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    else:
        x = _bp(noise, 500, 3200) * 0.8 + _bp(noise, 1500, 5000) * 0.3
        env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    return x * env


def whoosh(dur=0.9, up=True):
    n = int(dur * SR)
    t = _t(n)
    noise = np.random.default_rng(9).normal(0, 1, n)
    # barrido de filtro por bloques
    out = np.zeros(n)
    blocks = 24
    for b in range(blocks):
        a, e = b * n // blocks, (b + 1) * n // blocks
        u = b / blocks if up else 1 - b / blocks
        fc = 200 + 5000 * u ** 2
        seg = _bp(noise[max(0, a - 2000):e], fc * 0.6, min(fc * 1.6, 18000))[-(e - a):]
        out[a:e] = seg
    env = np.sin(np.pi * t / dur) ** 2
    return out * env


def impact():
    n = int(1.6 * SR)
    t = _t(n)
    f = 30 + 70 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5)
    crack = _hp(np.random.default_rng(5).normal(0, 1, n), 3000) * np.exp(-t * 25) * 0.4
    return boom + crack


def beep(f=1046.5, dur=0.09):
    n = int(dur * SR)
    t = _t(n)
    return np.sin(2 * np.pi * f * t) * _env(n, 0.005, 0.03)


def spark():
    n = int(0.08 * SR)
    t = _t(n)
    x = _hp(np.random.default_rng().normal(0, 1, n), 4000) * np.exp(-t * 60)
    return x


def build(tl, lines, out_path):
    dur = tl.END + 0.2
    n = int(dur * SR)
    mus = music(tl, dur)
    sfx = np.zeros((n, 2))
    voice = np.zeros(n)

    # Narración
    for ln in lines:
        a, sr = sf.read(ln["path"], dtype="float32")
        if a.ndim > 1:
            a = a.mean(1)
        if sr != SR:
            a = signal.resample_poly(a, SR, sr)
        i = int(ln["start"] * SR)
        m = min(len(a), n - i)
        voice[i:i + m] += a[:m]
    peak = np.max(np.abs(voice)) + 1e-9
    voice = voice / peak * 0.85
    # ligera compresión + presencia
    voice = np.tanh(voice * 1.4) / np.tanh(1.4)
    voice = voice + _bp(voice, 2500, 6000) * 0.25

    # Respiración (escena 1)
    for kind, t0 in tl.breaths:
        if kind == "in":
            _place(sfx, breath("in", 1.1), t0 + 0.1, 0.22)
        elif kind == "out":
            _place(sfx, breath("out", 1.2), t0, 0.16)
        else:
            _place(sfx, breath("in", 1.9), t0, 0.3)

    # Latidos: suaves al inicio, protagonistas en la escena del corazón
    for bt in tl.beats:
        if bt > tl.END - 0.5:
            break
        if tl.T5 - 0.3 <= bt < tl.T6 + 2:
            g = 0.9
        elif bt < tl.T3:
            g = 0.18
        elif bt < tl.T4:
            g = 0.45   # dentro del vaso se escucha el pulso
        else:
            g = 0.2
        if bt > tl.FINAL_TEXT:
            g *= 0.5
        _, _, p = tl.beat_phase(bt + 0.01)
        _place(sfx, heartbeat(), bt, g * min(1.0, 0.4 + p))
        if tl.T5 + 0.2 <= bt < tl.T6 + 1.0:
            _place(sfx, beep(), bt + 0.03, 0.05)

    # Transiciones
    for tt, up in ((tl.T3 - 0.5, True), (tl.T4 - 0.55, True), (tl.T5 - 0.7, False), (tl.T6 - 0.3, False)):
        _place(sfx, whoosh(0.95, up), tt, 0.35)
    for tt in (tl.T3, tl.T4, tl.T5, tl.FINAL_TEXT):
        _place(sfx, impact(), tt - 0.02, 0.35)
    _place(sfx, impact(), tl.T2 - 0.05, 0.25)

    # Avisos de la escena final
    for k in range(3):
        _place(sfx, impact(), tl.T6 + 1.0 + 1.4 * k, 0.18)
        _place(sfx, beep(523.25 - 60 * k, 0.25), tl.T6 + 1.0 + 1.4 * k, 0.06)

    # Flujo sanguíneo (escena 3): ruido grave pulsante
    a, b = tl.T3 - 0.3, tl.T4 + 0.2
    m = int((b - a) * SR)
    tt = _t(m) + a
    flow = _lp(np.random.default_rng(11).normal(0, 1, m), 220)
    puls = np.array([tl.beat_phase(x)[2] for x in tt[::400]])
    puls = np.interp(np.arange(m), np.arange(0, m, 400)[:len(puls)], puls)
    flow = flow * (0.3 + 0.7 * puls) * _env(m, 0.4, 0.4)
    _place(sfx, flow, a, 0.5)

    # Chispazos neuronales (escena 4)
    rng = np.random.default_rng(12)
    tt = tl.T4
    while tt < tl.T5:
        act = tl.brain_activity(tt)
        if rng.uniform() < act:
            s = spark()
            st = np.stack([s * rng.uniform(0.3, 1), s * rng.uniform(0.3, 1)], 1)
            _place(sfx, st, tt, 0.05)
        tt += rng.uniform(0.05, 0.25)

    sfx = _reverb(sfx, 1.6, 0.2, seed=3)

    # Ducking de la música bajo la voz
    env = np.abs(voice)
    env = _lp(env, 4)
    env = np.clip(env / (np.percentile(env[env > 1e-4], 90) + 1e-9), 0, 1) if np.any(env > 1e-4) else env
    duck = 1 - 0.5 * env
    mix = mus * duck[:, None] * 0.9 + sfx * 0.9 + np.stack([voice, voice], 1) * 1.0
    # limitador suave
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.97
    mix = np.tanh(mix * 1.3) / np.tanh(1.3)
    mix *= 0.93
    # fades
    f = int(0.3 * SR)
    mix[:f] *= np.linspace(0, 1, f)[:, None]
    mix[-int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR))[:, None]
    sf.write(out_path, mix.astype(np.float32), SR, subtype="PCM_16")
    return out_path
