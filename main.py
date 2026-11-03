"""¿Qué pasa en tu cuerpo cuando dejas de respirar? — generador de video.

Uso:
    python main.py                 # video final -> output/que_pasa_si_dejas_de_respirar.mp4
    python main.py --preview       # versión rápida a media resolución de render
    python main.py --frames 9.5 26 # sólo exporta fotogramas PNG a build/

Todo el contenido (modelos 3D, render, textos, música y efectos) se genera por
código con Python + NumPy + OpenCV + Pillow + SciPy. La voz se sintetiza
localmente con Kokoro TTS (modelo ONNX).
"""
import argparse
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)


def _parse():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true", help="render interno a escala 0.5")
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2)))
    ap.add_argument("--frames", type=float, nargs="*", help="exportar sólo estos instantes como PNG")
    ap.add_argument("--out", default=None)
    return ap.parse_args()


ARGS = _parse() if __name__ == "__main__" else None
if ARGS is not None and ARGS.preview:
    os.environ["RENDER_SCALE"] = "0.5"

from src import config as C  # noqa: E402

_director = None


def _init_worker(lines):
    global _director
    import numpy as np  # noqa: F401
    import cv2
    cv2.setNumThreads(1)
    from src.timeline import Timeline
    from src.director import Director
    _director = Director(Timeline(lines))


def _render(i):
    return _director.render(i / C.FPS).tobytes()


def main():
    from src.audio import narration, soundtrack
    from src.timeline import Timeline

    os.makedirs(C.OUTPUT, exist_ok=True)
    os.makedirs(C.BUILD, exist_ok=True)
    t_start = time.time()

    print("1/4  Narración (Kokoro TTS, español latino)...")
    lines = narration.generate()
    tl = Timeline(lines)
    print(f"     duración del video: {tl.END:.2f}s  |  escenas: "
          + ", ".join(f"{sid}:{a:.1f}-{b:.1f}" for sid, a, b in tl.scenes))

    if ARGS.frames:
        import cv2
        _init_worker(lines)
        for t in ARGS.frames:
            img = _director.render(t)
            p = os.path.join(C.BUILD, f"frame_{t:06.2f}.png")
            cv2.imwrite(p, img[..., ::-1])
            print("     ", p)
        return

    print("2/4  Música y efectos de sonido...")
    wav = os.path.join(C.BUILD, "soundtrack.wav")
    soundtrack.build(tl, lines, wav)

    n_frames = int(round(tl.END * C.FPS))
    print(f"3/4  Render 3D: {n_frames} fotogramas {C.W}x{C.H} @ {C.FPS} fps "
          f"(render interno {C.RW}x{C.RH}, {ARGS.workers} procesos)...")
    out = ARGS.out or os.path.join(C.OUTPUT, "que_pasa_si_dejas_de_respirar.mp4")
    silent = os.path.join(C.BUILD, "video_silent.mp4")
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{C.W}x{C.H}", "-r", str(C.FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-movflags", "+faststart", silent], stdin=subprocess.PIPE)

    import multiprocessing as mp
    ctx = mp.get_context("fork")
    t0 = time.time()
    with ctx.Pool(ARGS.workers, initializer=_init_worker, initargs=(lines,)) as pool:
        for k, buf in enumerate(pool.imap(_render, range(n_frames), chunksize=2)):
            ff.stdin.write(buf)
            if k % 30 == 0 or k == n_frames - 1:
                el = time.time() - t0
                eta = el / (k + 1) * (n_frames - k - 1)
                print(f"     {k + 1}/{n_frames}  ({el:.0f}s, faltan ~{eta:.0f}s)", flush=True)
    ff.stdin.close()
    ff.wait()

    print("4/4  Mezcla final de audio y video...")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest",
        "-movflags", "+faststart", out], check=True)
    print(f"Listo: {out}  ({(time.time() - t_start) / 60:.1f} min)")


if __name__ == "__main__":
    main()
