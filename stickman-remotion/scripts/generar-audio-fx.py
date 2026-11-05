#!/usr/bin/env python3
"""Efectos de sonido y música de fondo 100 % sintetizados con código (sin muestras externas).

Lee src/data/tiempos-audio.json (npm run audio lo genera) y escribe:
  public/audio/sfx/<nombre>.wav     efectos de cómic (boing, pum, splash, muu, ...)
  public/audio/musica/fondo.wav     música original sincronizada con las escenas
La mezcla final (volúmenes y "ducking" bajo la narración) la hace Remotion (src/mezcla.ts).
"""
import json
import os
import wave

import numpy as np
from scipy.signal import butter, iirpeak, lfilter, sosfilt

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ utilidades
def t_axis(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.005, r=0.2, total=None):
    """Envolvente ataque-lineal / caída exponencial."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    return e * np.exp(-t / max(r, 1e-4))


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.1):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na, endpoint=False)
    e[na : na + nd] = np.linspace(1, s, len(e[na : na + nd]), endpoint=False)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def sine_f(freq):
    """Seno con frecuencia variable (array)."""
    return np.sin(2 * np.pi * np.cumsum(freq) / SR)


def saw_f(freq):
    ph = np.cumsum(freq) / SR
    return 2 * (ph - np.floor(ph + 0.5))


def noise(d):
    return rng.standard_normal(int(d * SR))


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)


def formant(x, fs_q):
    """Filtro de formantes (vocal) sumando resonadores."""
    y = np.zeros_like(x)
    for f, q, g in fs_q:
        b, a = iirpeak(f, q, fs=SR)
        y += g * lfilter(b, a, x)
    return y


VOC = {
    'a': [(800, 6, 1.0), (1200, 8, 0.6), (2500, 10, 0.25)],
    'e': [(500, 6, 1.0), (1800, 9, 0.6), (2500, 10, 0.3)],
    'u': [(320, 5, 1.0), (800, 7, 0.4), (2300, 10, 0.1)],
    'm': [(250, 4, 1.0), (1100, 8, 0.12)],
}


def norm(x, peak=0.89):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def write(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def place(buf, x, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


# ------------------------------------------------------------------ efectos
def fx_boing(d=0.75):
    t = t_axis(d)
    f = 260 * (1 + 0.45 * np.sin(2 * np.pi * 16 * t) * np.exp(-3.5 * t)) * (1 + 0.5 * t)
    return sine_f(f) * env(len(t), 0.004, 0.28) + 0.3 * sine_f(2 * f) * env(len(t), 0.004, 0.12)


def fx_pum(d=0.55):
    t = t_axis(d)
    f = 40 + 110 * np.exp(-t * 22)
    body = sine_f(f) * env(len(t), 0.002, 0.18)
    crack = lp(noise(d), 1800) * env(len(t), 0.001, 0.035)
    return np.tanh(2.2 * (body + 0.6 * crack))


def fx_splash(d=1.3):
    t = t_axis(d)
    x = bp(noise(d), 350, 5000) * (np.minimum(1, t / 0.02) * np.exp(-t / 0.35))
    x += 0.5 * lp(noise(d), 300) * env(len(t), 0.003, 0.12)
    for k in range(18):
        at = 0.05 + rng.random() * 0.9
        dd = 0.06
        tt = t_axis(dd)
        f0 = 900 + rng.random() * 1600
        drop = sine_f(f0 * (1 + 2.5 * tt / dd)) * env(len(tt), 0.001, 0.02) * 0.35
        place(x, drop, at)
    return x


def sweep(d, f0, f1, f2=None, bw=1.0):
    n = noise(d)
    t = t_axis(d)
    out = np.zeros_like(n)
    blocks = 64
    edges = np.linspace(0, len(n), blocks + 1).astype(int)
    for i in range(blocks):
        u = i / blocks
        fc = f0 + (f1 - f0) * (u * 2 if f2 else u) if (not f2 or u < 0.5) else f1 + (f2 - f1) * (u - 0.5) * 2
        lo, hi = fc / (1 + bw), fc * (1 + bw)
        seg = bp(n[max(0, edges[i] - 2000) : edges[i + 1]], max(30, lo), min(SR / 2 - 100, hi))
        out[edges[i] : edges[i + 1]] = seg[-(edges[i + 1] - edges[i]) :]
    return out * np.sin(np.pi * t / d) ** 1.5


def fx_swoosh():
    return sweep(0.45, 300, 3200, 900, 0.6)


def fx_whoosh():
    x = sweep(0.9, 200, 2600, None, 0.5)
    t = t_axis(0.9)
    return x + 0.25 * sine_f(120 + 500 * t) * np.sin(np.pi * t / 0.9)


def voice(d, f_start, f_end, vowel, vib=5, vib_depth=0.03, a=0.03, r=0.15, shimmer=0.0):
    t = t_axis(d)
    f = np.geomspace(f_start, f_end, len(t)) * (1 + vib_depth * np.sin(2 * np.pi * vib * t))
    src = saw_f(f) + 0.04 * noise(d) + shimmer * lp(noise(d), 3000)
    return formant(src, VOC[vowel]) * adsr(len(t), a, 0.1, 0.85, r)


def fx_muu():
    m = voice(0.25, 150, 145, 'm', a=0.05, r=0.05)
    u = voice(1.05, 145, 105, 'u', vib=4.5, vib_depth=0.04, r=0.35)
    out = np.zeros(int(1.3 * SR))
    place(out, m * 0.8, 0)
    place(out, u, 0.2)
    return out


def fx_tragamonedas(d=1.8):
    out = np.zeros(int(d * SR))
    place(out, lp(noise(0.12), 900) * env(int(0.12 * SR), 0.002, 0.04) * 0.9, 0)
    rate = 19
    for k in range(int((d - 0.25) * rate)):
        at = 0.2 + k / rate
        tt = t_axis(0.03)
        click = hp(noise(0.03), 2500) * env(len(tt), 0.0005, 0.006)
        bell = sine_f(np.full(len(tt), 1800 + (k % 4) * 200)) * env(len(tt), 0.001, 0.01) * 0.3
        place(out, (click + bell) * 0.6, at)
    return out


def bell(freq, d=1.6, r=0.5):
    t = t_axis(d)
    x = np.zeros_like(t)
    for p, g, dec in [(1, 1, 1), (2.76, 0.5, 0.6), (5.4, 0.25, 0.35), (8.93, 0.12, 0.2)]:
        x += g * np.sin(2 * np.pi * freq * p * t) * np.exp(-t / (r * dec))
    return x * np.minimum(1, t / 0.002)


def fx_ding():
    out = np.zeros(int(1.8 * SR))
    place(out, bell(1318.5), 0)
    place(out, bell(1975.5) * 0.8, 0.12)
    return out


def fx_grito():
    return voice(0.9, 620, 900, 'a', vib=11, vib_depth=0.06, a=0.02, r=0.25, shimmer=0.4)


def fx_conteo():
    t = t_axis(0.22)
    return (np.sin(2 * np.pi * 880 * t) + 0.3 * np.sin(2 * np.pi * 1760 * t)) * adsr(len(t), 0.003, 0.05, 0.6, 0.06)


def fx_multitud(d=1.9):
    out = np.zeros(int(d * SR))
    for k in range(28):
        f0 = 140 + rng.random() * 280
        v = voice(d - 0.2, f0, f0 * (1.15 + rng.random() * 0.25), rng.choice(['a', 'e']), vib=4 + rng.random() * 4, vib_depth=0.05, a=0.08 + rng.random() * 0.1, r=0.5)
        place(out, v * (0.4 + rng.random() * 0.6), rng.random() * 0.15)
    out += 0.35 * bp(noise(d), 400, 3500) * np.sin(np.pi * t_axis(d) / d)
    return out


def fx_slowmo(d=2.6):
    t = t_axis(d)
    f = 110 * np.exp(-t * 0.35)
    x = sine_f(f) + 0.5 * sine_f(f * 1.5) + 0.3 * saw_f(f / 2)
    x = lp(x, 500) * (np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.8))
    x += 0.4 * sweep(d, 1200, 150, None, 0.4)
    # latidos lentos
    for at in np.arange(0.3, d - 0.3, 0.75):
        place(x, fx_pum(0.3) * 0.35, at)
    return x


def fx_bostezo():
    a = voice(1.5, 210, 120, 'a', vib=3, vib_depth=0.02, a=0.25, r=0.5, shimmer=0.6)
    return a + 0.3 * lp(noise(1.5), 1200) * np.sin(np.pi * t_axis(1.5) / 1.5)


def fx_grillos(d=2.2):
    out = np.zeros(int(d * SR))
    for g in range(4):
        at0 = 0.1 + g * 0.55
        for k in range(3):
            tt = t_axis(0.045)
            chirp = np.sin(2 * np.pi * 4400 * tt) * np.sin(np.pi * tt / 0.045) * (0.6 + 0.4 * np.sin(2 * np.pi * 180 * tt))
            place(out, chirp, at0 + k * 0.07)
    return out


def fx_risa():
    out = np.zeros(int(1.2 * SR))
    for k in range(6):
        f0 = 300 - k * 18
        place(out, voice(0.13, f0, f0 * 0.92, 'a', a=0.01, r=0.04, shimmer=0.5), k * 0.17)
    return out


def fx_eh():
    return voice(0.45, 170, 330, 'e', vib=6, vib_depth=0.02, a=0.02, r=0.12)


def fx_sello():
    x = fx_pum(0.4) * 0.8
    slap = hp(noise(0.06), 1500) * env(int(0.06 * SR), 0.0005, 0.012)
    place(x, slap * 0.9, 0)
    return x


def fx_esfuerzo(d=1.6):
    t = t_axis(d)
    f = 95 * (1 + 0.04 * np.sin(2 * np.pi * 7 * t)) * (1 + 0.15 * t)
    x = formant(saw_f(f) + 0.3 * noise(d), VOC['m'] + [(700, 5, 0.4)])
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * 9 * t)
    return x * trem * adsr(len(t), 0.1, 0.2, 0.9, 0.3)


def fx_aleteo(d=1.4):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 8)):
        tt = t_axis(0.08)
        place(out, lp(noise(0.08), 900) * np.sin(np.pi * tt / 0.08) ** 2 * (0.6 + 0.4 * (k % 2)), k / 8)
    return out


def fx_brillo():
    out = np.zeros(int(1.2 * SR))
    for k, f in enumerate([2093, 2637, 3136, 4186]):
        place(out, bell(f, 0.8, 0.18) * 0.6, k * 0.06)
    return out


def fx_hmm():
    return voice(0.8, 135, 150, 'm', vib=4, vib_depth=0.015, a=0.06, r=0.2)


def fx_pasitos():
    out = np.zeros(int(0.9 * SR))
    for k in range(10):
        tt = t_axis(0.02)
        place(out, hp(noise(0.02), 3000) * env(len(tt), 0.0005, 0.004), k * 0.085)
    return out


def fx_hormigas(d=4.0):
    out = np.zeros(int(d * SR))
    for k in range(260):
        tt = t_axis(0.015)
        place(out, hp(noise(0.015), 3500) * env(len(tt), 0.0003, 0.003) * (0.3 + rng.random() * 0.7), rng.random() * (d - 0.05))
    t = t_axis(d)
    return out * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.6)


SFX = {
    'boing': fx_boing, 'pum': fx_pum, 'splash': fx_splash, 'swoosh': fx_swoosh, 'whoosh': fx_whoosh,
    'muu': fx_muu, 'tragamonedas': fx_tragamonedas, 'ding': fx_ding, 'grito': fx_grito, 'conteo': fx_conteo,
    'multitud': fx_multitud, 'slowmo': fx_slowmo, 'bostezo': fx_bostezo, 'grillos': fx_grillos, 'risa': fx_risa,
    'eh': fx_eh, 'sello': fx_sello, 'esfuerzo': fx_esfuerzo, 'aleteo': fx_aleteo, 'brillo': fx_brillo,
    'hmm': fx_hmm, 'pasitos': fx_pasitos, 'hormigas': fx_hormigas,
}


# ------------------------------------------------------------------ música
BPM = 116
BEAT = 60 / BPM
BAR = 4 * BEAT
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
# Do mayor: C – Am – F – G (I–vi–IV–V)
CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
BASS = [36, 33, 29, 31]


def pluck(freq, d=0.6, bright=0.5):
    """Karplus-Strong (cuerda pulsada tipo ukelele) con lfilter."""
    n = int(d * SR)
    N = max(2, int(SR / freq))
    exc = np.zeros(n)
    exc[:N] = rng.uniform(-1, 1, N)
    exc[:N] = lp(exc[:N], 1000 + 6000 * bright, 1)
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -0.497
    a[N + 1] = -0.497
    y = lfilter([1], a, exc)
    return y * np.minimum(1, (n - np.arange(n)) / (0.03 * SR))


def glock(freq, d=0.9):
    return bell(freq, d, 0.28) * 0.5


def kick():
    t = t_axis(0.3)
    return sine_f(45 + 90 * np.exp(-t * 30)) * env(len(t), 0.001, 0.09)


def hat(open_=False):
    d = 0.18 if open_ else 0.04
    return hp(noise(d), 7000) * env(int(d * SR), 0.0005, 0.05 if open_ else 0.012)


def clap():
    return bp(noise(0.15), 900, 4000) * env(int(0.15 * SR), 0.001, 0.04)


def snare(g=1.0):
    t = t_axis(0.12)
    return g * (bp(noise(0.12), 1500, 7000) * env(len(t), 0.001, 0.03) + 0.4 * sine_f(np.full(len(t), 190)) * env(len(t), 0.001, 0.03))


def bass_note(m, d):
    t = t_axis(d)
    f = NOTE(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return x * adsr(len(t), 0.005, 0.08, 0.7, 0.06)


def groove(buf, t0, t1, energy=1.0, seed=0):
    """Toca el groove principal entre t0 y t1 (segundos), alineado a compases desde t0."""
    r = np.random.default_rng(seed)
    melody_scale = [72, 74, 76, 79, 81, 84]
    bar = 0
    t = t0
    while t < t1 - 0.05:
        ch = CHORDS[bar % 4]
        # arpegio de ukelele en corcheas
        for k in range(8):
            at = t + k * BEAT / 2
            if at >= t1:
                break
            m = ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + (12 if k in (2, 5) else 0)
            place(buf['pluck'], pluck(NOTE(m), 0.55, 0.45 + 0.1 * (k % 2)) * (0.8 if k % 2 else 1.0), at)
        # bajo
        for k, dd in [(0, 1.5), (2, 1.0), (3.5, 0.45)]:
            at = t + k * BEAT
            if at < t1:
                place(buf['bass'], bass_note(BASS[bar % 4] + (7 if k == 3.5 else 0), dd * BEAT), at)
        # batería
        if energy > 0.3:
            for k in range(4):
                at = t + k * BEAT
                if at >= t1:
                    break
                if k in (0, 2):
                    place(buf['drums'], kick() * 0.9, at)
                if k in (1, 3):
                    place(buf['drums'], clap() * 0.35 * energy, at)
            for k in range(8):
                at = t + k * BEAT / 2
                if at < t1:
                    place(buf['drums'], hat(k == 7) * (0.25 if k % 2 else 0.4) * energy, at)
        # melodía de glockenspiel cada 2 compases
        if bar % 2 == 1:
            for k in range(4):
                at = t + (k * 0.75 + (0.5 if k == 3 else 0)) * BEAT
                if at < t1 and r.random() < 0.85:
                    m = melody_scale[(bar // 2 + k * 2 + int(r.integers(0, 2))) % len(melody_scale)]
                    place(buf['glock'], glock(NOTE(m)) * 0.8, at)
        bar += 1
        t += BAR


def music(T, s7, escenas):
    n = int((T + 0.5) * SR)
    buf = {k: np.zeros(n) for k in ['pluck', 'bass', 'drums', 'glock', 'fx']}
    # Intro suave (1 compás sin batería) + groove hasta la escena 7
    groove(buf, 0.0, min(BAR, s7['inicio']), energy=0.0, seed=1)
    groove(buf, BAR, s7['inicio'], energy=1.0, seed=2)
    # ---- escena 7: tensión
    # pedal grave + redoble que crece desde el "3" hasta "¡SALTEN!"
    d = s7['go'] - s7['inicio']
    t = t_axis(d)
    pad = (saw_f(np.full(len(t), NOTE(36))) + saw_f(np.full(len(t), NOTE(43)) * 1.003)) * 0.25
    u = t / d  # el filtro se va abriendo: mezcla de versión oscura y brillante
    pad = (lp(pad, 400) * (1 - u) + lp(pad, 1800) * u) * np.minimum(1, t / 0.4) * (0.5 + 0.5 * u)
    place(buf['fx'], pad, s7['inicio'])
    roll_t = s7['n3']
    while roll_t < s7['go'] - 0.02:
        u = (roll_t - s7['n3']) / max(0.1, s7['go'] - s7['n3'])
        place(buf['drums'], snare(0.25 + 0.75 * u), roll_t)
        roll_t += 0.11 - 0.07 * u
    for k in ('n3', 'n2', 'n1'):
        place(buf['drums'], kick() * 1.2, s7[k])
        place(buf['bass'], bass_note(36, 0.5), s7[k])
    # ¡SALTEN!: golpe de acorde con platillo
    hit = sum(pluck(NOTE(m), 1.0, 0.8) for m in (60, 64, 67, 72)) * 0.6
    place(buf['pluck'], hit, s7['go'])
    place(buf['drums'], hp(noise(1.2), 5000) * env(int(1.2 * SR), 0.002, 0.4) * 0.5, s7['go'])
    # cámara lenta: acorde soñador sostenido (Cmaj7) con trémolo lento
    d = s7['slowEnd'] - s7['apex']
    t = t_axis(d)
    pad = sum(np.sin(2 * np.pi * NOTE(m) * t) for m in (48, 55, 59, 64, 71)) / 5
    pad *= (0.7 + 0.3 * np.sin(2 * np.pi * 1.2 * t)) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4)
    place(buf['fx'], pad * 0.7, s7['apex'])
    # vuelve el groove después del aterrizaje (con un fill)
    resume = s7['land'] + 0.6
    for k in range(4):
        place(buf['drums'], snare(0.5 + 0.15 * k), resume - BEAT + k * BEAT / 4)
    end_groove = T - 1.6
    groove(buf, resume, end_groove, energy=1.0, seed=3)
    # final: "¡ta-da!"
    tada = sum(pluck(NOTE(m), 1.6, 0.9) for m in (48, 60, 64, 67, 72)) * 0.7
    place(buf['pluck'], tada, end_groove)
    place(buf['glock'], glock(NOTE(84), 1.5), end_groove)
    place(buf['drums'], kick() * 1.2, end_groove)
    place(buf['drums'], hp(noise(1.5), 5000) * env(int(1.5 * SR), 0.002, 0.5) * 0.45, end_groove)
    mix = 0.55 * buf['pluck'] + 0.7 * buf['bass'] + 0.6 * buf['drums'] + 0.45 * buf['glock'] + 0.6 * buf['fx']
    mix = np.tanh(1.2 * mix / (np.max(np.abs(mix)) or 1))
    tt = np.arange(len(mix)) / SR
    mix *= np.minimum(1, (T - tt).clip(0) / 0.4 + (tt < T - 0.4))  # fade al final
    return norm(mix[: int(T * SR)], 0.89)


def main():
    data = json.load(open(os.path.join(ROOT, 'src/data/tiempos-audio.json')))
    usados = sorted({c['sfx'] for c in data['cues']})
    faltan = [s for s in usados if s not in SFX]
    if faltan:
        raise SystemExit(f'Faltan sintetizadores para: {faltan}')
    for name in usados:
        write(os.path.join(ROOT, 'public/audio/sfx', f'{name}.wav'), norm(SFX[name](), 0.89))
    print(f'✔ {len(usados)} efectos en public/audio/sfx/')
    write(os.path.join(ROOT, 'public/audio/musica/fondo.wav'), music(data['total'], data['s7'], data['escenas']))
    print(f"✔ public/audio/musica/fondo.wav ({data['total']:.2f} s, {BPM} BPM)")


if __name__ == '__main__':
    main()
