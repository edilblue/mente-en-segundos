#!/usr/bin/env python3
"""Narración del Short "Los flamencos no nacen rosados" con Gemini TTS.

- Lee la clave SOLO de la variable de entorno GEMINI_API_KEY (nunca se guarda).
- Elige el modelo TTS más reciente que exponga la cuenta (consulta /models).
- Pide TODA la narración en una sola toma (voz y energía constantes, 1 petición:
  la cuota gratuita es de ~10 peticiones/día por modelo). El estilo va en el formato
  de "notas de dirección" de Gemini TTS, que el modelo interpreta sin leerlo.
- Mide la duración real, corta la toma por escenas en las pausas reales, reparte el
  tiempo sobrante como respiros entre escenas (y ajusta el ritmo con atempo solo si
  no cabe) para que el video dure exactamente 35 s.
- Calcula los tiempos de cada palabra (pausas detectadas + peso silábico) y escribe
  src/flamencos/data/narracion.json, que es la línea de tiempo del video.

Uso:  GEMINI_API_KEY=... python3 scripts/flamencos/narracion.py
Opcionales: GEMINI_TTS_MODEL, GEMINI_TTS_VOICE (Puck por defecto).
"""
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GUION = json.loads((ROOT / "src/flamencos/data/guion.json").read_text())
OUT_JSON = ROOT / "src/flamencos/data/narracion.json"
VOZ_DIR = ROOT / "public/flamencos/voz"
CACHE = ROOT / ".tts-cache"
API = "https://generativelanguage.googleapis.com/v1beta"
PREFERIDOS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-pro-preview-tts", "gemini-2.5-flash-preview-tts"]
VOZ = os.environ.get("GEMINI_TTS_VOICE", "Puck")

TOTAL = GUION["duracion"]  # 35.0 s exactos
INICIO = GUION["inicioVoz"]  # la voz arranca casi en el frame 0 (gancho)
HUECO_MIN = GUION["huecoMinimo"]  # respiro mínimo entre escenas
HUECO_MAX = GUION["huecoMaximo"]  # respiro máximo (si sobra más, se ralentiza un poco)
COLA = GUION["colaFinal"]  # silencio final para que el loop respire


def pedir(url, body=None, intentos=8):
    key = os.environ["GEMINI_API_KEY"]
    for i in range(intentos):
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode() if body else None,
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
            method="POST" if body else "GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code in (429, 503) and i < intentos - 1:
                # la cuota gratuita responde 429 a ráfagas aunque diga "por día": esperar y reintentar
                print(f"   … {e.code}, reintentando en 45 s")
                time.sleep(45)
                continue
            raise RuntimeError(f"{e.code}: {msg[:400]}")
        except (urllib.error.URLError, TimeoutError):
            if i == intentos - 1:
                raise
            time.sleep(5)
    raise RuntimeError("sin respuesta")


def modelos():
    if os.environ.get("GEMINI_TTS_MODEL"):
        return [os.environ["GEMINI_TTS_MODEL"]]
    j = pedir(f"{API}/models?pageSize=1000")
    tts = [m["name"].split("/", 1)[1] for m in j.get("models", []) if "tts" in m["name"]]
    return [m for m in PREFERIDOS if m in tts] + sorted((m for m in tts if m not in PREFERIDOS), reverse=True)


def prompt_completo():
    v = GUION["voz"]
    transcript = "\n\n".join(e["texto"] for e in GUION["escenas"])
    return (
        f"# AUDIO PROFILE: {v['perfil']}\n{v['descripcion']}\n\n"
        f"### DIRECTOR'S NOTES\nStyle: {v['estilo']}\nPacing: {v['ritmo']}\nAccent: {v['acento']}\n\n"
        f"#### TRANSCRIPT\n{transcript}"
    )


def sintetizar(modelo, prompt):
    j = pedir(
        f"{API}/models/{modelo}:generateContent",
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOZ}}},
            },
        },
    )
    part = next(p for p in j["candidates"][0]["content"]["parts"] if "inlineData" in p)
    mime = part["inlineData"].get("mimeType", "")
    rate = int((re.search(r"rate=(\d+)", mime) or [0, 24000])[1])
    return base64.b64decode(part["inlineData"]["data"]), rate


def guardar_wav(path, pcm, rate):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]))


def silencios(path, db=-40, d=0.1):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", f"silencedetect=noise={db}dB:d={d}", "-f", "null", "-"], capture_output=True, text=True)
    out, s = [], None
    for line in r.stderr.splitlines():
        if m := re.search(r"silence_start: ([-\d.]+)", line):
            s = max(0.0, float(m.group(1)))
        if (m := re.search(r"silence_end: ([\d.]+)", line)) and s is not None:
            out.append((s, float(m.group(1))))
            s = None
    return out


def cortar(src, dst, a, b, tempo):
    af = f"atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,atempo={tempo:.4f},afade=t=in:d=0.015,areverse,afade=t=in:d=0.04,areverse"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-af", af, "-ar", "48000", "-ac", "1", str(dst)], check=True)


# ---------------------------------------------------------------- alineación de palabras
FUERTES, DEBILES_TILDE = set("aeoáéó"), set("íú")
VOC = set("aeiouáéíóúü")


def silabas(w):
    """Número de sílabas en español (núcleos vocálicos, con hiatos)."""
    w = re.sub(r"[^a-záéíóúüñ]", "", w.lower())
    n, prev = 0, ""
    for ch in w:
        if ch in VOC:
            if not prev or prev not in VOC or (prev in FUERTES and ch in FUERTES) or ch in DEBILES_TILDE or prev in DEBILES_TILDE:
                n += 1
        prev = ch
    return max(1, n)


def peso(w):
    return silabas(w) + 0.1 * len(re.sub(r"[^\wáéíóúüñ]", "", w)) + 0.2


def pausa(w):
    return 3 if w.endswith("...") or w.endswith("…") else 2 if re.search(r"[.!?:]$", w) else 1 if re.search(r"[,;]$", w) else 0


def leer(path):
    import numpy as np

    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
        return x, w.getframerate()


def nucleos(path):
    """Núcleos silábicos: picos de energía de la banda de voz (250–4000 Hz) cada 10 ms."""
    import numpy as np

    x, sr = leer(path)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / sr)
    X[(f < 250) | (f > 4000)] = 0
    y = np.fft.irfft(X, len(x))
    hop = sr // 100
    env = np.sqrt(np.convolve(y**2, np.ones(hop * 3) / (hop * 3), "same")[::hop])
    k = np.hanning(7)
    env = np.convolve(env, k / k.sum(), "same")
    e = 20 * np.log10(env + 1e-6)
    top = np.percentile(e, 97)
    picos = []
    for i in range(3, len(e) - 3):
        if e[i] == e[max(0, i - 6) : i + 7].max() and e[i] > top - 26:
            izq = e[max(0, i - 15) : i].min()
            der = e[i + 1 : i + 16].min()
            if e[i] - max(izq, der) > 2.0:
                if picos and i - picos[-1] < 7:
                    if e[i] > e[picos[-1]]:
                        picos[-1] = i
                    continue
                picos.append(i)
    return [p / 100 for p in picos]


def esperado(k, n_sil, picos, a0, b0):
    """Tiempo esperado tras la sílaba k (de n_sil) usando los núcleos detectados como reloj."""
    if len(picos) < 4:
        return a0 + (b0 - a0) * k / n_sil
    j = k * len(picos) / n_sil
    i = min(len(picos) - 1, max(1, int(round(j))))
    return (picos[i - 1] + picos[i]) / 2


def unir(sil, gap=0.2):
    out = []
    for a, b in sil:
        if out and a - out[-1][1] < gap:
            out[-1] = (out[-1][0], b)
        else:
            out.append((a, b))
    return out


def voz_inicio_fin(sil, d):
    a = sil[0][1] if sil and sil[0][0] <= 0.02 else 0.0
    b = d
    for s0, s1 in reversed(sil):  # una cola de <0,25 s tras la última pausa es respiración/ruido
        if s1 >= d - 0.25:
            b = s0
        break
    return a, b


def repartir(grupo, t0, t1, picos):
    """Asigna cada palabra a sus sílabas: la sílaba j cae en el pico j (estirando si el conteo no cuadra)."""
    import numpy as np

    sil = [silabas(w) for w in grupo]
    n = sum(sil)
    pk = [p for p in picos if t0 + 0.02 < p < t1 - 0.02]
    res = []
    if len(pk) >= 2 and 0.6 < len(pk) / n < 1.5:
        idx = np.arange(len(pk))
        tiempo = lambda j: float(np.interp(j * (len(pk) - 1) / max(1, n - 1), idx, pk))
        j = 0
        for w, s in zip(grupo, sil):
            res.append([w, max(t0, tiempo(j) - 0.08)])
            j += s
    else:  # sin picos fiables: reparto por peso silábico
        tot = sum(peso(w) for w in grupo)
        t = t0
        for w in grupo:
            res.append([w, t])
            t += (t1 - t0) * peso(w) / tot
    res[0][1] = t0
    out = []
    for i, (w, st) in enumerate(res):
        en = res[i + 1][1] if i + 1 < len(res) else t1
        out.append({"w": w, "start": round(st, 3), "end": round(max(st + 0.05, en), 3)})
    return out


def alinear(texto, path):
    """Empareja la puntuación con las pausas reales y dentro de cada tramo sigue las sílabas detectadas."""
    words = texto.split()
    d = dur(path)
    sil = silencios(path, -40, 0.08)
    picos = nucleos(path)
    a0, b0 = voz_inicio_fin(sil, d)
    internas = [s for s in sil if s[0] > a0 + 0.02 and s[1] < b0 - 0.02]
    # posición esperada de cada signo según las sílabas → la pausa real más cercana
    sil_acum, c = [], 0
    n_sil = sum(silabas(w) for w in words)
    for w in words:
        c += silabas(w)
        sil_acum.append(c)
    pk = [p for p in picos if a0 < p < b0]
    anclas, libres = {}, list(internas)
    for i in sorted([i for i, w in enumerate(words[:-1]) if pausa(w)], key=lambda i: -pausa(words[i])):
        t_esp = esperado(sil_acum[i], n_sil, pk, a0, b0)
        cand = sorted(libres, key=lambda s: abs((s[0] + s[1]) / 2 - t_esp) - 0.3 * min(0.5, s[1] - s[0]))
        if cand and abs((cand[0][0] + cand[0][1]) / 2 - t_esp) < 0.6:
            anclas[i] = cand[0]
            libres.remove(cand[0])
    res, desde, t, ult = [], 0, a0, -1.0
    for i, s in sorted(anclas.items()) + [(len(words) - 1, (b0, b0))]:
        if s[0] <= ult or i < desde:
            continue
        res += repartir(words[desde : i + 1], t, s[0], picos)
        desde, t, ult = i + 1, s[1], s[0]
    # ninguna palabra empieza dentro de una pausa (p. ej. la pausa dramática antes de "carotenoides")
    for k in range(1, len(res)):
        for s0, s1 in internas:
            if s0 - 0.06 <= res[k]["start"] < s1:
                res[k]["start"] = round(s1 - 0.02, 3)
                res[k - 1]["end"] = round(min(res[k - 1]["end"], s0), 3)
                if res[k]["end"] <= res[k]["start"]:
                    res[k]["end"] = round(res[k]["start"] + 0.1, 3)
    return res


# ---------------------------------------------------------------- cortes por escena
def limites_escena(sil, d, picos):
    """Para cada cambio de escena, la pausa real más cercana al final esperado (contando sílabas)."""
    escenas = GUION["escenas"]
    n = [sum(silabas(w) for w in e["texto"].split()) for e in escenas]
    a0, b0 = voz_inicio_fin(sil, d)
    internas = [s for s in sil if s[0] > a0 and s[1] < b0]
    pk = [p for p in picos if a0 < p < b0]
    cortes, acum = [], 0
    for k in range(len(escenas) - 1):
        acum += n[k]
        t_esp = esperado(acum, sum(n), pk, a0, b0)
        cand = [s for s in internas if not cortes or s[0] > cortes[-1][1]]
        cortes.append(min(cand, key=lambda s: abs((s[0] + s[1]) / 2 - t_esp) - 0.3 * min(0.5, s[1] - s[0])))
    return a0, b0, cortes


def main():
    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("✖ Falta GEMINI_API_KEY en el entorno.")
    CACHE.mkdir(exist_ok=True)
    VOZ_DIR.mkdir(parents=True, exist_ok=True)
    prompt = prompt_completo()
    toma, modelo = None, None
    for m in modelos():
        h = hashlib.sha1(f"{m}|{VOZ}|{prompt}".encode()).hexdigest()[:16]
        c = CACHE / f"flam-toma-{h}.wav"
        if c.exists():
            toma, modelo = c, m
            print(f"→ Toma en caché ({m}, voz {VOZ})")
            break
        try:
            print(f"→ Generando toma completa con {m} · voz {VOZ}")
            pcm, rate = sintetizar(m, prompt)
            guardar_wav(c, pcm, rate)
            toma, modelo = c, m
            break
        except RuntimeError as err:
            print(f"   ⚠ {m}: {str(err)[:200]}")
    if not toma:
        sys.exit("✖ Ningún modelo TTS respondió.")

    d = dur(toma)
    # umbral algo más alto para los cortes de escena: así las respiraciones cuentan como pausa
    a0, b0, cortes = limites_escena(unir(silencios(toma, -38, 0.1)), d, nucleos(toma))
    # tramos de voz por escena (en la toma original)
    tramos = []
    ini = a0
    for s in cortes:
        tramos.append((ini, s[0] + 0.03))
        ini = s[1] - 0.03
    tramos.append((ini, b0 + 0.03))
    voz = sum(b - a for a, b in tramos)
    n = len(tramos)
    libre = TOTAL - INICIO - COLA - voz
    tempo = 1.0
    if libre < HUECO_MIN * (n - 1):  # no cabe: acelerar
        tempo = voz / (TOTAL - INICIO - COLA - HUECO_MIN * (n - 1))
    elif libre > HUECO_MAX * (n - 1) + 0.6:  # sobra mucho: frenar un poco (máx. 6 %)
        tempo = max(0.94, voz / (TOTAL - INICIO - COLA - 0.6 - HUECO_MAX * (n - 1)))
    voz_t = voz / tempo
    hueco = min(HUECO_MAX, (TOTAL - INICIO - COLA - voz_t) / (n - 1))
    print(f"→ toma {d:.2f} s · voz {voz:.2f} s · ritmo ×{tempo:.3f} · respiro entre escenas {hueco:.2f} s")

    salida, t = [], INICIO
    for e, (a, b) in zip(GUION["escenas"], tramos):
        f = VOZ_DIR / f"escena{e['id']}.wav"
        cortar(toma, f, a, b, tempo)
        dd = dur(f)
        palabras = alinear(e["texto"], f)
        salida.append({"id": e["id"], "texto": e["texto"], "audio": f"flamencos/voz/escena{e['id']}.wav", "vozInicio": round(t, 3), "vozDur": round(dd, 3), "palabras": palabras})
        t += dd + hueco
    fin_voz = t - hueco
    for i, s in enumerate(salida):
        s["inicio"] = 0.0 if i == 0 else round(s["vozInicio"] - min(0.35, hueco * 0.6), 3)
    for i, s in enumerate(salida):
        s["fin"] = salida[i + 1]["inicio"] if i + 1 < len(salida) else TOTAL
    data = {"modelo": modelo, "voz": VOZ, "ritmo": round(tempo, 3), "duracion": TOTAL, "finVoz": round(fin_voz, 3), "escenas": salida}
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    for s in salida:
        print(f"   escena {s['id']}: {s['inicio']:5.2f}–{s['fin']:5.2f} s · voz {s['vozInicio']:.2f}+{s['vozDur']:.2f} s")
    print(f"✔ {OUT_JSON.relative_to(ROOT)} · la voz termina en {fin_voz:.2f} s de {TOTAL} s")


if __name__ == "__main__":
    main()
