"""Versión 2 (≈1 min): genera la narración con Google Gemini TTS y construye la
línea de tiempo del video a partir de la propia voz.

Uso (desde remotion-short/):
    export GEMINI_API_KEY=...          # https://aistudio.google.com/apikey
    python tools/voz_v2.py             # o: python tools/voz_v2.py audio.wav  (narración propia)
    python tools/sonido_v2.py
    npm run render:v2

Entradas:  src/v2/script.json  (frases: texto hablado, texto en pantalla, escena)
Salidas:   public/audio/v2/voz.wav
           src/v2/timeline.json  (duración total, escenas y frase por frase en frames)
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from voz_externa import atempo, load, silences, trim  # noqa: E402

ROOT = os.path.dirname(HERE)
SR = 48000
FPS = 30
KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
VOICE = os.environ.get("GEMINI_VOICE", "Orus")
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
# Si se agota la cuota gratuita diaria del modelo principal, se usa este (misma voz).
FALLBACK_MODEL = os.environ.get("GEMINI_TTS_FALLBACK", "gemini-3.8-flash-lite-tts")

LEAD_IN = 0.12      # silencio al inicio del video
GAP_LINE = 0.22     # pausa entre frases de la misma escena
GAP_SCENE = 0.45    # pausa entre escenas (transición)
SCENE_LEAD = 0.25   # la escena empieza un poco antes que su voz
OUTRO_HOLD = 1.8    # tiempo extra al final (comentarios + loop)
MAX_LINE = 7.5      # una frase nunca dura más que esto

# Indicación corta de estilo (las instrucciones largas el modelo las lee en voz alta).
STYLE_LINE = "Dilo con energía y en tono intrigante, rápido: "

STYLE = (
    "Narra en español latinoamericano neutro, como un narrador de YouTube Shorts de curiosidades: "
    "voz cercana, intrigante y con energía, como si contaras un secreto increíble. "
    "Ritmo RÁPIDO y fluido, propio de un YouTube Short (ningún párrafo debe durar más de 5 segundos), "
    "sin pausas dramáticas dentro de las frases, con énfasis en los números y palabras clave. "
    "Haz una pausa breve (medio segundo) entre cada párrafo.\n\n"
)


def tts(text, model=None):
    model = model or MODEL
    if not KEY:
        sys.exit("Falta GEMINI_API_KEY (crea una gratis en https://aistudio.google.com/apikey).")
    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.load(r)
    pcm = base64.b64decode(data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
    d = tempfile.mkdtemp()
    wav = os.path.join(d, "gemini.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "-", wav], input=pcm, check=True)
    return wav


def tts_lines(script, cache_dir):
    """Una petición por frase (cortes exactos). Se guardan en caché para no repetir."""
    import time
    import urllib.error

    os.makedirs(cache_dir, exist_ok=True)
    out = []
    model = MODEL
    for l in script:
        path = os.path.join(cache_dir, f"{l['id']}.wav")
        if not os.path.exists(path):
            for attempt in range(6):
                try:
                    w = tts(STYLE_LINE + l["spoken"], model)
                    os.replace(w, path)
                    break
                except urllib.error.HTTPError as e:
                    body = e.read().decode(errors="ignore")
                    if e.code == 429 and "PerDay" in body and model != FALLBACK_MODEL:
                        print(f"  cuota diaria de {model} agotada -> {FALLBACK_MODEL}", file=sys.stderr)
                        model = FALLBACK_MODEL
                        continue
                    if e.code in (429, 500, 503) and attempt < 5:
                        wait = 20 * (attempt + 1)
                        print(f"  {l['id']}: HTTP {e.code}, reintento en {wait}s", file=sys.stderr)
                        time.sleep(wait)
                    else:
                        raise
        out.append(path)
    return out


def tighten(seg, max_pause=0.22):
    """Acorta las pausas internas largas (ritmo de Short)."""
    hop = int(0.01 * SR)
    n = len(seg) // hop
    rms = np.sqrt((seg[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    thr = max(0.06 * np.percentile(rms, 95), 1e-4)
    keep = np.ones(len(seg), dtype=bool)
    i = 0
    lim = int(max_pause / 0.01)
    while i < n:
        if rms[i] < thr:
            j = i
            while j < n and rms[j] < thr:
                j += 1
            if j - i > lim:
                cut0 = (i + lim // 2) * hop
                cut1 = (j - lim // 2) * hop
                keep[cut0:cut1] = False
            i = j
        else:
            i += 1
    return seg[keep]


def strip_spoken_instructions(seg, spoken, cps=13.0):
    """Si la toma incluye instrucciones leídas en voz alta antes de la frase,
    se queda sólo con el final: corta en la pausa que deja una duración
    restante más parecida a la esperada para la frase."""
    expected = len(spoken) / cps
    total = len(seg) / SR
    if total < expected * 1.7 + 1.2:
        return seg
    best, best_err = None, None
    for p, d in silences(seg, min_len=0.25):
        err = abs((total - p) - expected)
        if best_err is None or err < best_err:
            best, best_err = p, err
    return seg[int(best * SR):] if best is not None else seg


def split(a, weights):
    """Elige len(weights)-1 pausas (en orden) que mejor separan las frases."""
    total = len(a) / SR
    cands = silences(a, min_len=0.18)
    k = len(weights) - 1
    if len(cands) < k:
        sys.exit(f"Sólo encontré {len(cands)} pausas y necesito {k}.")
    expected = np.cumsum(weights)[:-1] / np.sum(weights) * total
    pos = np.array([c[0] for c in cands])
    dur = np.array([c[1] for c in cands])
    m = len(cands)
    INF = 1e18
    # dp[i][j]: costo mínimo usando la pausa j como corte i
    dp = np.full((k, m), INF)
    back = np.zeros((k, m), dtype=int)
    cost = lambda i, j: abs(pos[j] - expected[i]) - 2.5 * min(dur[j], 1.2)  # noqa: E731
    for j in range(m):
        dp[0][j] = cost(0, j)
    for i in range(1, k):
        best, arg = INF, -1
        for j in range(m):
            if j > 0 and dp[i - 1][j - 1] < best:
                best, arg = dp[i - 1][j - 1], j - 1
            if arg >= 0:
                dp[i][j] = best + cost(i, j)
                back[i][j] = arg
    j = int(np.argmin(dp[k - 1]))
    cuts = []
    for i in range(k - 1, -1, -1):
        cuts.append(pos[j])
        j = back[i][j]
    return [0, *[int(c * SR) for c in reversed(cuts)], len(a)]


def main():
    script = json.load(open(os.path.join(ROOT, "src", "v2", "script.json")))["lines"]
    if len(sys.argv) > 1:  # una sola narración propia con todas las frases
        a = trim(load(sys.argv[1]))
        cuts = split(a, [len(l["spoken"]) + 8 for l in script])
        raw = [a[s:e] for s, e in zip(cuts[:-1], cuts[1:])]
    else:
        cache = os.environ.get("TTS_CACHE", os.path.join(ROOT, "build", "tts_v2"))
        raw = []
        for p in tts_lines(script, cache):
            a = trim(load(p))
            # Corte manual opcional: <id>.start con el segundo (en el audio recortado)
            # donde empieza la frase, si la toma incluye instrucciones leídas.
            over = p[:-4] + ".start"
            if os.path.exists(over):
                a = a[int(float(open(over).read()) * SR):]
                raw.append(("ok", a))
            else:
                raw.append(("auto", a))

    segs = []
    for r, l in zip(raw, script):
        if isinstance(r, tuple):
            mode, r = r
            if mode == "auto":
                r = strip_spoken_instructions(r, l["spoken"])
        seg = tighten(trim(r))
        if len(seg) / SR > MAX_LINE:
            seg = trim(atempo(seg, min(1.25, len(seg) / SR / MAX_LINE)))
        segs.append(seg)

    # Línea de tiempo
    t = LEAD_IN
    lines, scenes = [], []
    for i, (l, seg) in enumerate(zip(script, segs)):
        new_scene = i == 0 or l["scene"] != script[i - 1]["scene"]
        if i > 0:
            t += GAP_SCENE if new_scene else GAP_LINE
        if new_scene:
            scenes.append({"id": l["scene"], "from": 0 if i == 0 else t - SCENE_LEAD})
        dur = len(seg) / SR
        lines.append({"id": l["id"], "scene": l["scene"], "start": t, "end": t + dur})
        print(f"{l['id']:>4} {t:6.2f}s  {dur:4.2f}s  {l['display']}", file=sys.stderr)
        t += dur
    total = t + OUTRO_HOLD
    n_frames = int(np.ceil(total * FPS))

    track = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for l, seg in zip(lines, segs):
        i0 = int(l["start"] * SR)
        track[i0 : i0 + len(seg)] += seg
    track = track[: int(n_frames / FPS * SR)]
    track = track / (np.max(np.abs(track)) or 1) * 0.89
    os.makedirs(os.path.join(ROOT, "public", "audio", "v2"), exist_ok=True)
    sf.write(os.path.join(ROOT, "public", "audio", "v2", "voz.wav"), track, SR, subtype="PCM_16")

    f = lambda x: int(round(x * FPS))  # noqa: E731
    out_scenes = []
    for i, s in enumerate(scenes):
        end = scenes[i + 1]["from"] if i + 1 < len(scenes) else n_frames / FPS
        out_scenes.append({"id": s["id"], "from": f(s["from"]), "len": f(end) - f(s["from"])})
    timeline = {
        "fps": FPS,
        "durationInFrames": n_frames,
        "voice": f"{MODEL} / {VOICE}",
        "scenes": out_scenes,
        "lines": [{"id": l["id"], "scene": l["scene"], "start": f(l["start"]), "end": f(l["end"])} for l in lines],
    }
    with open(os.path.join(ROOT, "src", "v2", "timeline.json"), "w") as fh:
        json.dump(timeline, fh, indent=2)
    print(f"Total: {total:.1f}s ({n_frames} frames)", file=sys.stderr)


if __name__ == "__main__":
    main()
