"""Narración con las voces de Google (Gemini TTS, capa gratuita de Google AI Studio).

1. Crea una API key gratis en https://aistudio.google.com/apikey
2. Guárdala en la variable de entorno GEMINI_API_KEY
3. Desde remotion-short/:
       python tools/voz_google.py                 # voz por defecto (Orus)
       GEMINI_VOICE=Charon python tools/voz_google.py
       python tools/sonido.py                     # rehace el ducking de la música
       npm run render

Genera el guion completo en una sola toma (frases separadas por pausas) y lo
pasa a tools/voz_externa.py, que corta cada frase y la coloca en su escena.
Voces masculinas recomendadas: Orus, Charon, Fenrir, Puck. Femeninas: Kore, Aoede, Leda.
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from voz_externa import LINES  # noqa: E402

KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
VOICE = os.environ.get("GEMINI_VOICE", "Orus")
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")

STYLE = (
    "Lee en español latinoamericano neutro, como narrador de un video corto de ciencia para redes: "
    "tono cercano, curioso y con energía. Ritmo RÁPIDO, propio de un YouTube Short "
    "(cada párrafo largo debe durar menos de 6 segundos), sin perder claridad. "
    "Haz una pausa de un segundo entre cada párrafo.\n\n"
)


def main():
    if not KEY:
        sys.exit("Falta GEMINI_API_KEY (crea una gratis en https://aistudio.google.com/apikey).")
    text = STYLE + "\n\n".join(t for _, t, _, _ in LINES)
    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
    pcm = base64.b64decode(part["data"])  # PCM 16 bits, 24 kHz, mono
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "google.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "-", wav],
                       input=pcm, check=True)
        subprocess.run([sys.executable, os.path.join(HERE, "voz_externa.py"), wav], check=True)
    print(f"Voz de Google ({VOICE}) colocada en public/audio/voz.wav")


if __name__ == "__main__":
    main()
