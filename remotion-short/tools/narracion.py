"""Genera la voz en off del Short con Kokoro TTS (ONNX, 100 % local).

Uso (desde remotion-short/):
    ../download_models.sh            # una vez: descarga el modelo a ../models
    python tools/narracion.py

Salida:
    public/audio/voz.wav       -> pista de narración de 30 s
    src/narration.json         -> inicio/fin de cada frase (frames) para
                                  sincronizar los subtítulos palabra por palabra
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.environ.get("KOKORO_MODELS", os.path.join(ROOT, "..", "models"))
VOICE = os.environ.get("TTS_VOICE", "em_alex")
LANG = "es"
FPS = 30
TOTAL = 30.0

# (escena, texto hablado, inicio en s, duración máxima en s)
# Los números se escriben con letras para que la pronunciación sea correcta.
LINES = [
    ("hook", "¿Qué pasaría si dejaras de dormir?", 0.15, 2.6),
    ("step1", "Después de veinticuatro horas despierto, tus reflejos se parecen a los de alguien que bebió alcohol.", 3.35, 7.3),
    ("step2", "Mientras duermes, tu cerebro limpia desechos que se acumulan durante el día. Sin dormir, esa limpieza no ocurre.", 11.35, 7.3),
    ("step3", "El récord registrado es de Randy Gardner: once días sin dormir, en mil novecientos sesenta y cuatro.", 19.35, 7.3),
    ("outro", "¿Cuántas horas duermes tú?", 27.2, 2.4),
]


def trim(a, sr, thr=0.01):
    idx = np.nonzero(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    return a[max(idx[0] - int(0.02 * sr), 0): min(idx[-1] + int(0.08 * sr), len(a))]


def main():
    tts = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    sr = 24000
    track = np.zeros(int(TOTAL * sr), dtype=np.float32)
    timing = {}
    for key, text, start, max_dur in LINES:
        speed = 1.08
        while True:
            audio, sr = tts.create(text, voice=VOICE, speed=speed, lang=LANG)
            audio = trim(np.asarray(audio, dtype=np.float32), sr)
            dur = len(audio) / sr
            if dur <= max_dur or speed >= 1.5:
                break
            speed = round(speed * min(1.25, dur / max_dur) + 0.01, 3)
        print(f"{key}: {dur:.2f}s (speed {speed})", file=sys.stderr)
        s = int(start * sr)
        e = min(s + len(audio), len(track))
        track[s:e] += audio[: e - s]
        timing[key] = {"start": round(start * FPS), "end": round((start + dur) * FPS)}

    peak = np.max(np.abs(track)) or 1.0
    track = track / peak * 0.89
    sf.write(os.path.join(ROOT, "public", "audio", "voz.wav"), track, sr, subtype="PCM_16")
    with open(os.path.join(ROOT, "src", "narration.json"), "w") as f:
        json.dump(timing, f, indent=2)
    print(json.dumps(timing, indent=2))


if __name__ == "__main__":
    main()
