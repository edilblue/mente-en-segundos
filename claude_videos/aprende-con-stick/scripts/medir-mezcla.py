#!/usr/bin/env python3
"""Mide la mezcla a partir de las pistas separadas (out/stem_voz.wav, stem_sfx.wav, stem_musica.wav).
Render de pistas:  npx remotion render AprendeConStick-Ep01 out/stem_voz.wav --codec=wav --props='{"stem":"voz"}'
Criterio: mientras hay voz, efectos y música deben quedar ≥ 8 dB por debajo; fuera de la voz, los efectos no
deben superar el nivel medio de la voz."""
import subprocess, wave, sys
import numpy as np

def load(f):
    w = wave.open(f); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
    return x.reshape(-1, w.getnchannels()).mean(1), w.getframerate()

def lufs(f):
    o = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return o.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0].strip()

def win_db(x, sr, w=0.4):
    n = int(w * sr); k = len(x) // n
    return 10 * np.log10(np.mean(x[:k * n].reshape(k, n) ** 2, 1) + 1e-12)

v, sr = load('out/stem_voz.wav'); s, _ = load('out/stem_sfx.wav'); m, _ = load('out/stem_musica.wav')
V, S, M = win_db(v, sr), win_db(s, sr), win_db(m, sr)
act = V > V.max() - 30
vmed = np.median(V[act])
for name, f in [('voz', 'out/stem_voz.wav'), ('efectos', 'out/stem_sfx.wav'), ('música', 'out/stem_musica.wav')]:
    print(f'{name:8s} integrada {lufs(f)} LUFS')
print(f'voz: nivel mediano mientras habla {vmed:.1f} dBFS (ventanas de 400 ms)')
for name, X in [('efectos', S), ('música', M)]:
    d = X[act] - V[act]
    print(f'{name}: durante la voz, diferencia mediana {np.median(d):+.1f} dB, peor caso {d.max():+.1f} dB; '
          f'ventanas a menos de 8 dB de la voz: {np.mean(d > -8) * 100:.1f} %')
    g = X[~act]
    if len(g): print(f'{name}: fuera de la voz, máximo {g.max() - vmed:+.1f} dB respecto a la voz mediana')
worst = np.argsort(S - np.where(act, V, vmed))[-5:][::-1]
print('efectos más altos respecto a la voz (s):', ', '.join(f'{i * 0.4:.1f}s ({S[i] - (V[i] if act[i] else vmed):+.1f} dB)' for i in worst))
