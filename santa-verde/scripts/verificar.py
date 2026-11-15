#!/usr/bin/env python3
"""Revisión automática del MP4 final: formato, duración, sonoridad, loop y zonas seguras.

    python3 scripts/verificar.py [out/santa_verde_short.mp4]
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
mp4 = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/santa_verde_short.mp4"
ok = True


def check(cond, msg):
    global ok
    ok &= bool(cond)
    print(("✔ " if cond else "✖ ") + msg)


info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(mp4)],
                                 capture_output=True, text=True, check=True).stdout)
v = next(s for s in info["streams"] if s["codec_type"] == "video")
a = next(s for s in info["streams"] if s["codec_type"] == "audio")
dur = float(info["format"]["duration"])
check(v["codec_name"] == "h264" and a["codec_name"] == "aac", f"códecs: {v['codec_name']} + {a['codec_name']}")
check((v["width"], v["height"]) == (1080, 1920), f"resolución {v['width']}x{v['height']} (9:16)")
check(v["r_frame_rate"] == "30/1", f"fps {v['r_frame_rate']}")
check(abs(dur - 35) <= 0.3, f"duración {dur:.3f} s (35 ± 0,3)")
check(int(v.get("nb_frames", 0)) == 1050, f"frames de video: {v.get('nb_frames')}")
check(v.get("pix_fmt") == "yuv420p", f"pix_fmt {v.get('pix_fmt')}")

r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(mp4), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
summ = r[r.rindex("Summary:"):]
lufs = float(summ.split("I:")[1].split("LUFS")[0])
peak = float(summ.split("Peak:")[1].split("dBFS")[0])
check(abs(lufs + 14) <= 0.5, f"sonoridad integrada {lufs:.1f} LUFS (objetivo -14)")
check(peak <= -1.0, f"true peak {peak:.1f} dBTP")


def frame(n):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf", f"select=eq(n\\,{n})", "-vframes", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3).astype(float)


f0, f_last = frame(0), frame(1049)
diff = np.abs(f0 - f_last).mean()
check(diff < 6, f"loop: diferencia media entre el último y el primer frame = {diff:.2f} (0-255)")

# Zonas seguras: el 20 % inferior no debe tener texto/elementos de alto contraste salvo en la escena de carteles (decorativa)
narr = json.loads((ROOT / "src/data/narracion.json").read_text())
s5 = next(e for e in narr["escenas"] if e["id"] == 5)
peor = 0.0
for t in np.arange(0.5, 35, 1.5):
    if s5["inicio"] <= t <= s5["fin"]:
        continue
    fr = frame(int(t * 30))
    bottom = fr[1536:, :, :]
    peor = max(peor, float((bottom.mean(axis=2) > 200).mean()))
check(peor < 0.002, f"20 % inferior libre (máx. {peor * 100:.2f} % de píxeles brillantes fuera de la escena de carteles)")
print("\nRESULTADO:", "todo OK" if ok else "revisar los puntos marcados con ✖")
