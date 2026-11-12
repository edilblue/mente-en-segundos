#!/usr/bin/env python3
"""Analiza videos de referencia para extraer un perfil de estilo.

Por cada URL (o archivo local):
  1. Descarga con yt-dlp            -> referencias/<id>/video.mp4
  2. Transcribe con Whisper         -> referencias/<id>/transcripcion.{json,srt,txt}
  3. Mide el estilo (HyperFrames)   -> referencias/<id>/cortes.json, look.json
  4. Saca fotogramas de muestra     -> referencias/<id>/frames/
Al final combina todo en referencias/perfil_estilo.json.

Uso:
  python3 flujo/referencias.py URL [URL ...] [--modelo small] [--idioma es]
"""
import argparse
import json
import shutil
import statistics
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "referencias"


def correr(cmd, **kw):
    print("  $", " ".join(str(c) for c in cmd))
    return subprocess.run(cmd, check=True, text=True, **kw)


def json_de(cmd):
    out = subprocess.run(cmd, check=True, text=True, capture_output=True).stdout
    return json.loads(out[out.index("{"):])


def descargar(url: str) -> Path:
    local = Path(url)
    if local.exists():
        carpeta = DESTINO / local.stem
        carpeta.mkdir(parents=True, exist_ok=True)
        destino = carpeta / "video.mp4"
        shutil.copy(local, destino)
        return carpeta
    vid = subprocess.run(
        ["yt-dlp", "--print", "id", "--skip-download", url],
        check=True, text=True, capture_output=True,
    ).stdout.strip().splitlines()[-1]
    carpeta = DESTINO / vid
    carpeta.mkdir(parents=True, exist_ok=True)
    correr([
        "yt-dlp", "-f", "bv*[height<=1080]+ba/b", "--merge-output-format", "mp4",
        "--write-info-json", "-o", str(carpeta / "video.%(ext)s"), url,
    ])
    return carpeta


def transcribir(carpeta: Path, modelo: str, idioma: str | None):
    cmd = ["whisper", str(carpeta / "video.mp4"), "--model", modelo,
           "--word_timestamps", "True", "--output_format", "all",
           "--output_dir", str(carpeta)]
    if idioma:
        cmd += ["--language", idioma]
    try:
        correr(cmd)
    except subprocess.CalledProcessError:
        print("  ! Whisper falló (¿no pudo descargar el modelo?). Sigo sin transcripción.")
        return None
    for ext in ("json", "srt", "txt", "vtt", "tsv"):
        f = carpeta / f"video.{ext}"
        if f.exists():
            f.rename(carpeta / f"transcripcion.{ext}")
    return json.loads((carpeta / "transcripcion.json").read_text())


def medir(carpeta: Path) -> dict:
    video = str(carpeta / "video.mp4")
    cortes = json_de(["hyperframes", "measure", "cuts", video])
    look = json_de(["hyperframes", "measure", "look", video])
    (carpeta / "cortes.json").write_text(json.dumps(cortes, indent=1))
    (carpeta / "look.json").write_text(json.dumps(look, indent=1))
    dur = cortes["end"] - cortes["start"]
    cada = max(1, round(dur / 24))
    subprocess.run(["hyperframes", "measure", "frames", video, "--every", str(cada),
                    "--out", str(carpeta / "frames")], check=False, capture_output=True)
    return {"cortes": cortes, "look": look, "duracion": dur}


def resumen_video(carpeta: Path, medidas: dict, trans: dict | None) -> dict:
    tomas = [s["seconds"] for s in medidas["cortes"]["shots"]]
    dur = medidas["duracion"]
    r = {
        "id": carpeta.name,
        "duracion_s": round(dur, 2),
        "num_cortes": len(medidas["cortes"]["cuts"]),
        "cortes_por_minuto": round(len(medidas["cortes"]["cuts"]) / dur * 60, 1) if dur else 0,
        "toma_media_s": round(statistics.mean(tomas), 2) if tomas else None,
        "toma_mediana_s": round(statistics.median(tomas), 2) if tomas else None,
        "look": {k: medidas["look"].get(k) for k in ("luma", "contrast", "saturation", "bw_share", "warmth")},
    }
    if trans:
        palabras = [w for s in trans["segments"] for w in s.get("words", [])]
        r["idioma"] = trans.get("language")
        r["palabras_por_minuto"] = round(len(palabras) / dur * 60) if dur else None
        r["primeros_3s"] = " ".join(w["word"].strip() for w in palabras if w["start"] < 3)
        r["texto"] = trans["text"].strip()
    return r


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("urls", nargs="+")
    ap.add_argument("--modelo", default="small", help="modelo de Whisper (tiny, base, small, medium, turbo)")
    ap.add_argument("--idioma", default="es", help="código de idioma, vacío = autodetectar")
    a = ap.parse_args()

    DESTINO.mkdir(exist_ok=True)
    resumenes = []
    for url in a.urls:
        print(f"\n== {url}")
        carpeta = descargar(url)
        trans = transcribir(carpeta, a.modelo, a.idioma or None)
        medidas = medir(carpeta)
        r = resumen_video(carpeta, medidas, trans)
        (carpeta / "resumen.json").write_text(json.dumps(r, indent=1, ensure_ascii=False))
        resumenes.append(r)

    todos = [json.loads(p.read_text()) for p in sorted(DESTINO.glob("*/resumen.json"))]

    def media(clave, sub=None):
        vals = [(t.get(sub) or {}).get(clave) if sub else t.get(clave) for t in todos]
        vals = [v for v in vals if isinstance(v, (int, float))]
        return round(statistics.mean(vals), 2) if vals else None

    perfil = {
        "videos": [t["id"] for t in todos],
        "toma_media_s": media("toma_media_s"),
        "cortes_por_minuto": media("cortes_por_minuto"),
        "palabras_por_minuto": media("palabras_por_minuto"),
        "look": {k: media(k, "look") for k in ("luma", "contrast", "saturation", "bw_share", "warmth")},
        "ganchos": {t["id"]: t.get("primeros_3s") for t in todos},
    }
    (DESTINO / "perfil_estilo.json").write_text(json.dumps(perfil, indent=1, ensure_ascii=False))
    print("\nPerfil de estilo ->", DESTINO / "perfil_estilo.json")
    print(json.dumps(perfil, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    sys.exit(main())
