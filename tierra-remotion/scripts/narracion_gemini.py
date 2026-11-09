#!/usr/bin/env python3
"""Narración con Gemini TTS (voz masculina, español latino), una petición por escena.

La clave se lee SOLO de la variable de entorno GEMINI_API_KEY (nunca se guarda).
Escribe public/audio/narracion.wav y src/data/narracion.json (mismo formato que narracion.py):
los tiempos de frase salen de las pausas reales del audio (ffmpeg silencedetect) y las
palabras se reparten dentro de cada frase según sus sílabas.

Variables opcionales: GEMINI_TTS_MODEL, GEMINI_TTS_VOICE (por defecto Puck), NARRACION_VELOCIDAD.
"""
import base64, hashlib, json, os, re, subprocess, sys, time, urllib.request, urllib.error
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = json.load(open(os.path.join(ROOT, "scripts", "guion.json"), encoding="utf8"))
API = "https://generativelanguage.googleapis.com/v1beta"
KEY = os.environ.get("GEMINI_API_KEY")
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
VOICE = os.environ.get("GEMINI_TTS_VOICE", "Puck")
SPEED = float(os.environ.get("NARRACION_VELOCIDAD", "1.12"))
# Sin indicación de estilo: el modelo la leía en voz alta. Solo se envía el guion; el ritmo se ajusta con atempo.
STYLE = ""
SR = 24000
CACHE = os.path.join(ROOT, ".tts-cache")

def post(url, body):
    for intento in range(8):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="ignore")
            if e.code == 429 or e.code >= 500:
                m = re.search(r'"retryDelay":\s*"([\d.]+)s"', msg)
                wait = float(m.group(1)) + 2 if m else 15 * (intento + 1)
                if wait > 180:
                    raise SystemExit(f"Gemini 429: cuota agotada para este modelo (reintentar en {wait/3600:.1f} h)")
                print(f"  … {e.code}, esperando {wait:.0f} s", flush=True)
                time.sleep(wait); continue
            raise SystemExit(f"Gemini {e.code}: {msg[:400]}")
        except (TimeoutError, urllib.error.URLError) as e:
            print(f"  … {e}, reintentando", flush=True); time.sleep(5)
    raise SystemExit("Gemini: demasiados reintentos")

def tts(text):
    os.makedirs(CACHE, exist_ok=True)
    key = hashlib.sha1(f"v2|{MODEL}|{VOICE}|{STYLE}|{text}".encode()).hexdigest()[:16]
    path = os.path.join(CACHE, f"{key}.npy")
    if os.path.exists(path):
        return np.load(path)
    j = post(f"{API}/models/{MODEL}:generateContent", {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}},
    })
    part = next(p for p in j["candidates"][0]["content"]["parts"] if "inlineData" in p)
    mime = part["inlineData"].get("mimeType", "")
    rate = int((re.search(r"rate=(\d+)", mime) or [None, "24000"])[1])
    pcm = np.frombuffer(base64.b64decode(part["inlineData"]["data"]), dtype="<i2").astype(np.float32) / 32768
    if rate != SR:
        from scipy.signal import resample_poly
        pcm = resample_poly(pcm, SR, rate).astype(np.float32)
    np.save(path, pcm)
    return pcm

def verificar(a, esperado):
    """Transcribe el audio con un modelo de texto de Gemini y compara con el guion."""
    import io, difflib
    buf = io.BytesIO(); sf.write(buf, a, SR, format="WAV", subtype="PCM_16")
    j = post(f"{API}/models/gemini-flash-lite-latest:generateContent", {"contents": [{"parts": [
        {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(buf.getvalue()).decode()}},
        {"text": "Transcribe exactamente lo que se dice en este audio en español. Responde solo con el texto."}]}]})
    txt = j["candidates"][0]["content"]["parts"][0]["text"].strip()
    norm = lambda x: re.sub(r"[^a-záéíóúüñ0-9 ]", " ", x.lower()).split()
    ratio = difflib.SequenceMatcher(None, norm(esperado), norm(txt)).ratio()
    return txt, ratio

def tempo(a):
    if SPEED == 1.0: return a
    tmp_in, tmp_out = os.path.join(CACHE, "_in.wav"), os.path.join(CACHE, "_out.wav")
    sf.write(tmp_in, a, SR)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp_in, "-af", f"atempo={SPEED}", "-ar", str(SR), "-ac", "1", tmp_out], check=True)
    return sf.read(tmp_out, dtype="float32")[0]

def silences(a, thr_db=-38, min_d=0.14):
    hop = int(0.01 * SR); n = len(a) // hop
    rms = np.sqrt(np.mean(a[: n * hop].reshape(n, hop) ** 2, 1) + 1e-12)
    db = 20 * np.log10(rms / (np.abs(a).max() + 1e-9))
    sil = db < thr_db
    out = []; i = 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]: j += 1
            if (j - i) * 0.01 >= min_d: out.append((i * 0.01, j * 0.01))
            i = j
        else: i += 1
    return out

def syl(w): return max(1, len(re.findall(r"[aeiouáéíóúü]+", w.lower())))

def words_in(text, t0, t1):
    ws = text.split()
    wt = [syl(w) + 0.6 + (0.8 if re.search(r"[,.:?!]$", w) else 0) for w in ws]
    tot = sum(wt); t = t0; out = []
    for w, p in zip(ws, wt):
        d = (t1 - t0) * p / tot
        out.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)}); t += d
    return out

def main():
    if not KEY: raise SystemExit("Falta GEMINI_API_KEY en el entorno")
    track = []; t = 0.0; escenas = []
    solo = os.environ.get("SOLO_ESCENA")
    for e in G["escenas"]:
        if solo and str(e["id"]) != solo: continue
        texto = " ".join(e["frases"])
        a = tempo(tts(texto))
        sil = silences(a)
        # recorta silencio inicial/final
        s0 = sil[0][1] if sil and sil[0][0] <= 0.02 else 0.0
        s1 = sil[-1][0] if sil and sil[-1][1] >= len(a) / SR - 0.02 else len(a) / SR
        a = a[int(max(0, s0 - 0.02) * SR): int(min(len(a) / SR, s1 + 0.06) * SR)]
        sil = [(x - s0 + 0.02, y - s0 + 0.02) for x, y in silences(a) if x > 0.05 and y < len(a) / SR - 0.05]
        dur_a = len(a) / SR
        if os.environ.get("VERIFICAR", "1") == "1":
            txt, ratio = verificar(a, texto)
            print(f"  transcripción ({ratio:.0%}): {txt}")
        # límite de frase = la pausa real más cercana a la posición esperada por sílabas
        nb = len(e["frases"]) - 1
        w = [sum(syl(x) for x in f.split()) for f in e["frases"]]
        acc = np.cumsum(w) / sum(w)
        cuts = []; usadas = set(); prev = 0.0
        for i in range(nb):
            esperado = acc[i] * dur_a
            cand = [(abs((x + y) / 2 - esperado) - 0.6 * min(1.0, y - x), k) for k, (x, y) in enumerate(sil)
                    if k not in usadas and x > prev and abs((x + y) / 2 - esperado) < 1.3]
            if cand:
                k = min(cand)[1]; usadas.add(k); cuts.append(sil[k]); prev = sil[k][1]
            else:
                cuts.append((float(esperado), float(esperado))); prev = float(esperado)
        bounds = [0.0] + [c for cut in cuts for c in cut] + [dur_a]
        start = t; off = e["entrada"]
        frases = []
        for i, f in enumerate(e["frases"]):
            f0, f1 = bounds[2 * i] + off, bounds[2 * i + 1] + off
            frases.append({"texto": f, "start": round(f0, 3), "end": round(f1, 3), "palabras": words_in(f, f0, f1)})
        dur = max(e["minimo"], e["entrada"] + dur_a + e["salida"])
        seg = np.zeros(int(round(dur * SR)), np.float32)
        i0 = int(e["entrada"] * SR); seg[i0: i0 + len(a)] = a[: len(seg) - i0]
        track.append(seg)
        escenas.append({"id": e["id"], "nombre": e["nombre"], "inicio": round(start, 3), "duracion": round(dur, 3), "frases": frases})
        print(f"escena {e['id']}: voz {dur_a:5.2f} s → {start:6.2f}–{start + dur:6.2f}  pausas usadas {[(round(float(x),2),round(float(y),2)) for x,y in cuts]}")
        t += dur
    audio = np.concatenate(track)
    audio = audio / max(1e-6, np.abs(audio).max()) * 0.92
    sf.write(os.path.join(ROOT, "public", "audio", "narracion.wav"), audio, SR)
    json.dump({"generadoCon": "gemini-tts", "modelo": MODEL, "voz": VOICE, "total": round(len(audio) / SR, 3), "escenas": escenas},
              open(os.path.join(ROOT, "src", "data", "narracion.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"total {len(audio) / SR:.2f} s")

main()
