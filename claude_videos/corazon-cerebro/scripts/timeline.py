#!/usr/bin/env python3
"""Línea de tiempo maestra a partir de las duraciones REALES de la narración de Gemini.

Escribe data/timeline.json, que usan tanto la animación (Remotion) como la mezcla de audio:
  - inicio y duración de cada escena, momento en que entra la voz y su tempo
  - tiempo (global) de cada palabra, para sincronizar revelaciones visuales
  - tramos de ritmo cardiaco (lpm) → latidos visuales y sonoros idénticos
  - lista de efectos de sonido con su instante exacto
"""
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = 119.6  # duración total objetivo (s)
N = json.load(open(os.path.join(ROOT, 'data/narracion.json'), encoding='utf-8'))
esc = N['escenas']

LEAD = [0.9, 0.5, 0.55, 0.5, 0.55, 0.5, 0.55, 0.5]   # silencio antes de la voz en cada escena
TAILW = [0.5, 0.8, 0.8, 0.8, 1.0, 0.9, 0.9, 2.2]     # peso del "aire" después de la voz

voz = sum(e['duracion'] for e in esc)
tempo = 1.0
minimo_aire = 0.35 * len(esc) + 2.0
if voz + sum(LEAD) + minimo_aire > TARGET:
    tempo = (voz) / (TARGET - sum(LEAD) - minimo_aire)
    tempo = round(min(tempo, 1.12), 3)
voz_t = voz / tempo
aire = TARGET - sum(LEAD) - voz_t
tails = [aire * w / sum(TAILW) for w in TAILW]

scenes = []
t = 0.0
for i, e in enumerate(esc):
    d = e['duracion'] / tempo
    v0 = t + LEAD[i]
    dur = LEAD[i] + d + tails[i]
    words = [{'w': p['w'], 't': round(v0 + p['t'] / tempo, 3)} for p in e['palabras']]
    scenes.append({'id': e['id'], 'start': round(t, 3), 'dur': round(dur, 3), 'voiceStart': round(v0, 3), 'voiceDur': round(d, 3),
                   'audio': e['audio'], 'words': words})
    t += dur
total = t


def cue(sid, word, nth=0):
    s = scenes[sid - 1]
    k = 0
    for w in s['words']:
        if w['w'].lower().strip('¿?¡!.,;:…').startswith(word.lower()):
            if k == nth:
                return w['t']
            k += 1
    raise SystemExit(f'cue no encontrado: escena {sid} «{word}»')


S = {s['id']: s for s in scenes}
st = lambda i: S[i]['start']
en = lambda i: S[i]['start'] + S[i]['dur']

# ---------------------------------------------------------------- ritmo cardiaco (tramos lineales)
hb = [
    [0.0, st(2), 58, 62],
    [st(2), st(3), 66, 70],
    [st(3), cue(3, 'pulso'), 72, 84],
    [cue(3, 'pulso'), cue(3, 'pulso') + 3.0, 84, 118],
    [cue(3, 'pulso') + 3.0, cue(3, 'corazón'), 118, 112],
    [cue(3, 'corazón'), st(4), 112, 92],
    [st(4), st(5), 88, 86],
    [st(5), cue(5, 'oxitocina'), 86, 74],
    [cue(5, 'oxitocina'), st(6), 74, 62],
    [st(6), cue(6, 'estrés'), 64, 92],
    [cue(6, 'estrés'), st(7), 92, 84],
    [st(7), st(8), 70, 64],
    [st(8), total + 1, 64, 66],
]


def bpm(tt):
    for a, b, x, y in hb:
        if a <= tt < b:
            return x + (y - x) * (tt - a) / max(1e-6, b - a)
    return hb[-1][3]


beats = []
ph, tt, dt = 0.0, 0.0, 0.002
first = 0.12  # el primer latido golpea en el segundo 0.12 (gancho)
while tt < total:
    prev = ph
    ph += bpm(tt) / 60 * dt
    if int(ph) != int(prev):
        beats.append(round(tt + first, 3))
    tt += dt
beats = [0.12] + [b for b in beats if b < total - 0.3]

# volumen del latido por zonas (más presente en el gancho, el corazón y el final)
def beat_gain(b):
    if b < st(2): return 1.0
    if st(3) <= b < st(4): return 0.75
    if st(5) <= b < st(6): return 0.45
    if st(6) <= b < st(7): return 0.55
    if b >= st(8): return 0.7
    return 0.3

# ---------------------------------------------------------------- efectos
sfx = []
add = lambda kind, at, gain=1.0: sfx.append({'k': kind, 't': round(at, 3), 'g': gain})
add('impact', 0.1, 1.0)
add('riser', cue(1, 'cerebro') - 1.2, 0.7)
add('whoosh', en(1) - 1.8, 0.9)
add('whoosh', st(2) - 0.3, 0.6)
for w in ['área', 'núcleo']:
    add('ping', cue(2, w), 0.6)
add('synapse', cue(2, 'dopamina'), 0.9)
add('sparkle', cue(2, 'motivación'), 0.6)
add('whoosh', st(3) - 0.35, 0.8)
add('zap', cue(3, 'simpático'), 0.7)
add('zap', cue(3, 'adrenalina'), 0.6)
add('drip', cue(3, 'manos') + 0.3, 0.7)
add('flutter', cue(3, 'estómago') + 0.4, 0.7)
add('zap', cue(3, 'señales') - 0.2, 0.6)
add('whoosh', st(4) - 0.35, 0.8)
for w in ['recuerdo', 'mensaje', 'posible']:
    add('pop', cue(4, w), 0.6)
add('shimmer', cue(4, 'brilla'), 0.7)
add('whoosh', st(5) - 0.4, 0.6)
add('warm', cue(5, 'abraza') - 0.2, 0.8)
add('sparkle', cue(5, 'oxitocina'), 0.6)
add('whoosh', st(6) - 0.4, 0.6)
add('crack', cue(6, 'rechazo'), 0.6)
add('riser', cue(6, 'entonces') - 1.0, 0.5)
add('whoosh', st(7) - 0.4, 0.6)
add('shimmer', cue(7, 'apego'), 0.5)
add('whoosh', st(8) - 0.4, 0.6)
add('impact', cue(8, 'quién') - 0.15, 0.55)

out = {
    'fps': 30,
    'total': round(total, 3),
    'frames': int(round(total * 30)),
    'tempo': tempo,
    'modelo': N['modelo'],
    'voz': N['voz'],
    'scenes': scenes,
    'heart': hb,
    'beats': [{'t': b, 'g': beat_gain(b)} for b in beats],
    'sfx': sorted(sfx, key=lambda x: x['t']),
}
json.dump(out, open(os.path.join(ROOT, 'data/timeline.json'), 'w'), ensure_ascii=False, indent=1)
print(f'voz {voz:.2f}s · tempo {tempo} · total {total:.2f}s · {len(beats)} latidos')
for s in scenes:
    print(f"  escena {s['id']}: {s['start']:6.2f} → {s['start'] + s['dur']:6.2f}  (voz {s['voiceStart']:.2f}+{s['voiceDur']:.2f})")
