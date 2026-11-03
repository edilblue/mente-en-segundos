"""Montaje de la prueba de Blender: fotogramas + narración + subtítulos + sonido.

Uso: python blender/compose_test.py --frames build/bt/frames --out output/prueba_sueno_24h.mp4
"""
import argparse
import os
import subprocess
import sys

import numpy as np
import cv2
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from src import config as C  # noqa: E402
from src.audio import narration as NR  # noqa: E402
from src.audio import soundtrack as ST  # noqa: E402
from src.engine.mathx import ease_out, smoothstep  # noqa: E402

FPS = 30
SR = 44100
LINES = [
    ("¿Qué le pasa a tu cerebro si no duermes en veinticuatro horas?", 0.25),
    ("Partes de tu cerebro empiezan a apagarse, aunque sigas despierto.", 4.1),
]
KEY = {"cerebro": (255, 120, 200), "veinticuatro": (255, 220, 60), "horas": (255, 220, 60),
       "apagarse": (90, 210, 255), "despierto": (255, 220, 60), "duermes": (90, 210, 255)}
FONT = os.path.join(C.FONTS, "InterDisplay-BlackItalic.otf")


def voice(cache):
    from kokoro_onnx import Kokoro
    os.makedirs(cache, exist_ok=True)
    k = None
    out = []
    for i, (text, start) in enumerate(LINES):
        p = os.path.join(cache, f"l{i}.wav")
        if not os.path.exists(p):
            k = k or Kokoro(os.path.join(C.MODELS, "kokoro-v1.0.onnx"), os.path.join(C.MODELS, "voices-v1.0.bin"))
            a, sr = k.create(text, voice=NR.VOICE, speed=1.1, lang=NR.LANG)
            sf.write(p, NR._trim(np.asarray(a, np.float32), sr), sr)
        a, sr = sf.read(p, dtype="float32")
        words = NR._word_times(text, a, sr)
        out.append({"text": text, "start": start, "dur": len(a) / sr, "audio": a, "sr": sr,
                    "words": [{"w": w["w"], "t0": w["t0"] + start, "t1": w["t1"] + start} for w in words]})
    return out


def audio(lines, dur, out):
    n = int(dur * SR)
    t = np.arange(n) / SR
    mix = np.zeros((n, 2))
    # Pad nocturno suave (re menor) + sub
    pad = sum(np.sin(2 * np.pi * f * t + 0.4 * np.sin(2 * np.pi * 0.15 * t)) for f in (146.83, 174.61, 220.0, 293.66))
    pad = ST._lp(pad, 900) * 0.035 * np.clip(t / 1.5, 0, 1)
    sub = np.sin(2 * np.pi * 36.7 * t) * 0.06
    mix += np.stack([pad + sub, pad * 0.9 + sub], 1)
    # Tic-tac del reloj
    rng = np.random.default_rng(1)
    for k, tt in enumerate(np.arange(0.0, dur, 0.5)):
        ln = int(0.03 * SR)
        click = ST._bp(rng.normal(0, 1, ln), 2500 if k % 2 else 1800, 7000) * np.exp(-np.linspace(0, 8, ln))
        ST._place(mix, click, tt, 0.05)
    # Bostezo (ruido filtrado) y whoosh + impacto en el rayos X
    yawn = ST.breath("out", 1.1)
    ST._place(mix, yawn, 1.9, 0.18)
    ST._place(mix, ST.whoosh(0.9, True), 3.3, 0.3)
    ST._place(mix, ST.impact(), 4.2, 0.28)
    # Zumbido eléctrico del cerebro que se apaga
    a, b = 4.3, dur
    m = int((b - a) * SR)
    tt = np.arange(m) / SR
    hum = np.sin(2 * np.pi * 220 * tt) * 0.5 + np.sin(2 * np.pi * 330 * tt) * 0.3
    hum *= np.exp(-tt * 0.4) * (0.6 + 0.4 * (np.sin(2 * np.pi * 7 * tt) > 0))
    ST._place(mix, ST._lp(hum, 1200), a, 0.03)
    mix = ST._reverb(mix, 2.5, 0.3)
    # Voz + ducking
    v = np.zeros(n)
    for ln in lines:
        a_ = ln["audio"]
        if ln["sr"] != SR:
            from scipy import signal
            a_ = signal.resample_poly(a_, SR, ln["sr"])
        i = int(ln["start"] * SR)
        mm = min(len(a_), n - i)
        v[i:i + mm] += a_[:mm]
    v = v / (np.max(np.abs(v)) + 1e-9) * 0.9
    env = ST._lp(np.abs(v), 4)
    env = np.clip(env / (np.percentile(env[env > 1e-4], 90) + 1e-9), 0, 1)
    mix = mix * (1 - 0.5 * env)[:, None] + np.stack([v, v], 1)
    mix = np.tanh(mix / (np.max(np.abs(mix)) + 1e-9) * 1.2) / np.tanh(1.2) * 0.92
    f = int(0.5 * SR)
    mix[-f:] *= np.linspace(1, 0, f)[:, None]
    sf.write(out, mix.astype(np.float32), SR, subtype="PCM_16")


_f = {}


def font(sz):
    if sz not in _f:
        _f[sz] = ImageFont.truetype(FONT, sz)
    return _f[sz]


def draw_text(img, xy, s, sz, fill, alpha=255, glow=None, stroke=9):
    f = font(sz)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    if glow:
        g = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(g).text(xy, s, font=f, fill=glow + (alpha,), anchor="mm", stroke_width=stroke + 6,
                               stroke_fill=glow + (alpha,))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(16)))
    d.text((xy[0] + 5, xy[1] + 7), s, font=f, fill=(0, 0, 0, int(alpha * 0.5)), anchor="mm", stroke_width=stroke,
           stroke_fill=(0, 0, 0, int(alpha * 0.5)))
    d.text(xy, s, font=f, fill=fill + (alpha,), anchor="mm", stroke_width=stroke, stroke_fill=(12, 12, 18, alpha))
    img.alpha_composite(lay)


def overlay(frame, t, lines, dur):
    img = Image.new("RGBA", (C.W, C.H), (0, 0, 0, 0))
    # Título
    a = smoothstep(0.2, 0.5, t) * (1 - smoothstep(3.6, 4.0, t))
    if a > 0:
        rows = [("¿QUÉ LE PASA A TU", (255, 255, 255), 84), ("CEREBRO", (255, 120, 200), 150),
                ("SI NO DUERMES", (255, 255, 255), 84), ("24 HORAS?", (255, 220, 60), 130)]
        y = 210
        for i, (s, col, sz) in enumerate(rows):
            k = ease_out((t - 0.2 - i * 0.15) / 0.3)
            if k > 0:
                draw_text(img, (C.W / 2, y), s, int(sz * (0.75 + 0.25 * k)), col, int(255 * a * min(1, k * 1.5)),
                          glow=col if col != (255, 255, 255) else None)
            y += int(sz * 1.05) + 10
    # Subtítulos: una o dos palabras, con banda translúcida
    words = [w for ln in lines[1:] for w in ln["words"]]
    cur = None
    for i, w in enumerate(words):
        end = words[i + 1]["t0"] if i + 1 < len(words) else w["t1"] + 0.4
        if w["t0"] <= t < end:
            cur = w
    if cur is not None:
        key = "".join(ch for ch in cur["w"].lower() if ch.isalnum() or ch in "áéíóúñ")
        col = KEY.get(key, (255, 255, 255))
        k = ease_out((t - cur["t0"]) / 0.1)
        band = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(band).rounded_rectangle((140, 1255, C.W - 140, 1385), 60, fill=(90, 90, 100, 110))
        img.alpha_composite(band.filter(ImageFilter.GaussianBlur(8)))
        draw_text(img, (C.W / 2, 1318), cur["w"].upper().strip(",.?¿"), int(100 * (0.85 + 0.15 * k)), col,
                  glow=col if col != (255, 255, 255) else None)
    # Chip informativo durante el rayos X
    a = smoothstep(5.0, 5.4, t) * (1 - smoothstep(dur - 0.6, dur - 0.2, t))
    if a > 0:
        s = "CORTEZA PREFRONTAL ▼"
        f = ImageFont.truetype(os.path.join(C.FONTS, "Inter-ExtraBold.otf"), 40)
        d = ImageDraw.Draw(img)
        tw = d.textbbox((0, 0), s, font=f)[2]
        x0 = (C.W - tw) / 2 - 36
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        dl = ImageDraw.Draw(lay)
        dl.rounded_rectangle((x0, 1080, x0 + tw + 72, 1150), 35, fill=(8, 12, 22, int(200 * a)),
                             outline=(90, 210, 255, int(255 * a)), width=4)
        dl.text((C.W / 2, 1115), s, font=f, fill=(255, 255, 255, int(255 * a)), anchor="mm")
        img.alpha_composite(lay)
    arr = np.asarray(img, np.float32)
    al = arr[..., 3:4] / 255
    return (frame.astype(np.float32) * (1 - al) + arr[..., :3] * al).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", default=os.path.join(C.BUILD, "bt", "frames"))
    ap.add_argument("--out", default=os.path.join(C.OUTPUT, "prueba_sueno_24h.mp4"))
    a = ap.parse_args()
    lines = voice(os.path.join(C.BUILD, "bt", "voice"))
    files = sorted(f for f in os.listdir(a.frames) if f.endswith(".png"))
    dur = max(len(files) / FPS, lines[-1]["start"] + lines[-1]["dur"] + 0.8)
    n = int(round(dur * FPS))
    print(f"duración {dur:.2f}s, {len(files)} fotogramas renderizados")
    wav = os.path.join(C.BUILD, "bt", "audio.wav")
    audio(lines, dur, wav)
    silent = os.path.join(C.BUILD, "bt", "silent.mp4")
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{C.W}x{C.H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                           "-crf", "19", "-pix_fmt", "yuv420p", silent], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / FPS
        fi = min(i, len(files) - 1)
        img = cv2.imread(os.path.join(a.frames, files[fi]))[..., ::-1]
        img = cv2.resize(img, (C.W, C.H), interpolation=cv2.INTER_LANCZOS4)
        # ligero enfoque tras escalar
        blur = cv2.GaussianBlur(img, (0, 0), 1.2)
        img = cv2.addWeighted(img, 1.35, blur, -0.35, 0)
        fade = min(1.0, t / 0.3, (dur - t) / 0.5)
        img = (img.astype(np.float32) * max(fade, 0)).astype(np.uint8)
        ff.stdin.write(overlay(img, t, lines, dur).tobytes())
    ff.stdin.close()
    ff.wait()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", "-shortest", "-movflags", "+faststart", a.out], check=True)
    print("Listo:", a.out)


if __name__ == "__main__":
    main()
