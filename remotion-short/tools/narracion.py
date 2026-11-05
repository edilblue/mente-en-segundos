"""Genera la voz en off del Short con voces neuronales de Microsoft (Edge TTS, gratis).

Uso (desde remotion-short/):
    pip install edge-tts
    python tools/narracion.py                       # voz por defecto
    TTS_VOICE=es-MX-DaliaNeural python tools/narracion.py
    python tools/narracion.py --list                # ver voces en español

Requiere ffmpeg y acceso a speech.platform.bing.com.

Salida:
    public/audio/voz.wav   -> pista de narración de 30 s
    src/narration.json     -> por frase: inicio/fin y el frame exacto de cada
                              palabra (WordBoundary de Microsoft) para que los
                              subtítulos aparezcan justo cuando se dicen.
"""
import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.environ.get("TTS_VOICE", "es-MX-JorgeNeural")
PITCH = os.environ.get("TTS_PITCH", "+0Hz")
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
SR = 48000
FPS = 30
TOTAL = 30.0

# (escena, texto, inicio en s, duración máxima en s)
# El texto es el mismo que se muestra en pantalla (Microsoft lee bien "24" y "1964").
LINES = [
    ("hook", "¿Qué pasaría si dejaras de dormir?", 0.15, 2.6),
    ("step1", "Después de 24 horas despierto, tus reflejos se parecen a los de alguien que bebió alcohol", 3.35, 7.3),
    ("step2", "Mientras duermes, tu cerebro limpia desechos que se acumulan durante el día. Sin dormir, esa limpieza no ocurre", 11.35, 7.3),
    ("step3", "El récord registrado es de Randy Gardner: 11 días sin dormir en 1964", 19.35, 7.3),
    ("outro", "¿Cuántas horas duermes tú?", 27.2, 2.4),
]


def norm(w):
    return re.sub(r"[^\wáéíóúüñ]", "", w.lower())


async def synth(text, rate):
    com = edge_tts.Communicate(text, VOICE, rate=rate, pitch=PITCH, boundary="WordBoundary", proxy=PROXY)
    audio = bytearray()
    words = []
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            words.append((chunk["offset"] / 1e7, chunk["duration"] / 1e7, chunk["text"]))
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(audio)
        mp3 = f.name
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", mp3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    os.unlink(mp3)
    return pcm, words


def align(display, bounds):
    """Asigna a cada palabra mostrada el instante (s) en que se pronuncia."""
    out = []
    j = 0
    for w in display:
        k = j
        while k < len(bounds) and norm(bounds[k][2]) != norm(w):
            k += 1
        if k < len(bounds):
            out.append(bounds[k][0])
            j = k + 1
        else:
            out.append(None)
    # rellena huecos interpolando
    for i, v in enumerate(out):
        if v is None:
            prev = next((out[p] for p in range(i - 1, -1, -1) if out[p] is not None), 0.0)
            out[i] = prev + 0.15
    return out


async def main():
    if "--list" in sys.argv:
        for v in await edge_tts.list_voices(proxy=PROXY):
            if v["Locale"].startswith("es-"):
                print(v["ShortName"], v["Gender"])
        return

    import numpy as np

    track = np.zeros(int(TOTAL * SR), dtype=np.float32)
    timing = {}
    for key, text, start, max_dur in LINES:
        rate = 8
        while True:
            pcm, bounds = await synth(text, f"{rate:+d}%")
            audio = np.frombuffer(pcm, dtype=np.float32)
            # recorta silencio inicial/final
            idx = np.nonzero(np.abs(audio) > 0.005)[0]
            lead = max(idx[0] - int(0.02 * SR), 0) if len(idx) else 0
            tail = min(idx[-1] + int(0.1 * SR), len(audio)) if len(idx) else len(audio)
            audio = audio[lead:tail]
            dur = len(audio) / SR
            if dur <= max_dur or rate >= 40:
                break
            rate += 6
        print(f"{key}: {dur:.2f}s (rate {rate:+d}%)", file=sys.stderr)
        s = int(start * SR)
        e = min(s + len(audio), len(track))
        track[s:e] += audio[: e - s]
        shift = start - lead / SR
        words = [round((t + shift) * FPS) for t in align(text.split(" "), bounds)]
        timing[key] = {"start": round(start * FPS), "end": round((start + dur) * FPS), "words": words}

    peak = float(np.max(np.abs(track))) or 1.0
    track = track / peak * 0.89
    wav = os.path.join(ROOT, "public", "audio", "voz.wav")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-i", "-", "-c:a", "pcm_s16le", wav],
        input=track.tobytes(), check=True,
    )
    with open(os.path.join(ROOT, "src", "narration.json"), "w") as f:
        json.dump({"voice": VOICE, **timing}, f, indent=2)
    print(f"Voz: {VOICE} -> {wav}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
