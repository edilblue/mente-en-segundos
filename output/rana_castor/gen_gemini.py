#!/usr/bin/env python3
"""Genera con Gemini las imágenes (img/sNN.png) y la narración (audio/sNN.wav) del video.

Uso:  GEMINI_API_KEY=... python3 gen_gemini.py img 2 3 4    -> imágenes de esas escenas
      GEMINI_API_KEY=... python3 gen_gemini.py tts 1 2 ...  -> narración de esas escenas
La clave solo se lee de la variable de entorno; nunca se guarda.
"""
import base64, json, os, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent
API = "https://generativelanguage.googleapis.com/v1beta/models"
KEY = os.environ["GEMINI_API_KEY"]
IMG_MODEL = os.environ.get("GEMINI_IMG_MODEL", "gemini-3-pro-image")
TTS_MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
VOZ = os.environ.get("GEMINI_TTS_VOICE", "Vindemiatrix")

SET = ("Use the reference image as the fixed set and art style: the same large old oak tree, the same small "
       "white cottage with a grey roof far away in the background, the same pond with the dome-shaped beaver lodge "
       "of sticks and mud, the same museum-diorama cross-section layout (landscape on top, a clean cut through the "
       "earth or water below), the same hyperrealistic painterly-photoreal style and soft misty teal-green haze. "
       "Vertical 9:16 portrait. No text, no labels, no watermark, no logos, no borders.\n\n")

ESCENAS = {
 1: ("Cuando llega el otoño, la rana de madera no busca un lago. Se esconde bajo la hojarasca del bosque, casi en la superficie.", None),
 2: ("Con las primeras heladas, empieza a congelarse. Hasta dos tercios del agua de su cuerpo se convierten en hielo.",
     "Keep the same composition as the reference (oak on the left, cottage and pond on the right, frog in the hollow "
     "under the leaf litter). Change: late autumn, first hard frost at dawn. White frost crystals cover the fallen "
     "leaves, the grass and the oak branches; pale cold bluish light. Frame a bit closer on the hollow: the same wood "
     "frog (tan-brown, dark eye mask) crouched still, with delicate ice crystals forming on its skin and on the leaves "
     "around it, its color slightly paler and greyish."),
 3: ("Su corazón se detiene. Deja de respirar. Pero su hígado llena sus células de glucosa, que actúa como anticongelante y las protege.",
     "Same place as the reference. Change: winter. Snow covers the ground, the leaf litter and the bare branches of "
     "the oak; soft grey-blue light. Close-up on the hollow under the snowy leaf litter: the same wood frog frozen "
     "solid, rigid, eyes closed and clouded, skin coated in white frost and tiny ice crystals. A very faint warm amber "
     "inner glow radiates from inside its body, subtly suggesting protective sugar in its cells. Quiet and still."),
 4: ("En Alaska, algunas pasan así más de siete meses, soportando hasta dieciocho grados bajo cero.",
     "Same composition as the reference, wide view. Change: deep mid-winter. Everything buried in thick snow: the oak "
     "bare with snow on every branch, the cottage roof heavy with snow and one window glowing warm, the pond frozen "
     "white and the beaver lodge a snowy mound. In the cut earth below, frozen topsoil with veins of ice and a thick "
     "snow layer above the leaves; the small frozen frog visible as a tiny frosted shape in its hollow. Cold blue "
     "twilight, gentle snowfall."),
 5: ("En primavera, se descongela y su corazón vuelve a latir. Pronto, los machos cantan en las charcas con un sonido parecido al de un pato.",
     "Same place as the reference. Change: early spring. Snow melted, fresh light-green buds on the oak, wet ground, "
     "a shallow meltwater pool in the foreground. Close-up: the same wood frog sits in the shallow pool calling, with "
     "its two small vocal sacs inflated at the sides of its head. In the cross-section of the pool below the surface, "
     "round gelatinous clusters of frog eggs attached to submerged twigs. Soft fresh morning light."),
 6: ("En cambio, el castor no hiberna. En otoño, clava ramas en el fondo del estanque, junto a su refugio: es su despensa de invierno.",
     "The camera has moved to the pond: the beaver lodge in the center, the same oak on the left bank, the white "
     "cottage far away in the background, autumn colors. Top 40%: autumn landscape and water surface; bottom 60%: a "
     "clean cut through the pond showing water and muddy bottom. Underwater, a North American beaver (dense brown fur, "
     "flat black scaly tail, webbed hind feet) carries a leafy branch in its mouth and pushes it into the mud, next to "
     "a pile of branches stuck in the pond bottom beside the lodge. Murky green-brown water, light rays, small bubbles."),
 7: ("Cubre el refugio con barro. Con el frío, el barro se congela y se vuelve duro como la piedra, una muralla contra los depredadores.",
     "Camera at the pond: the beaver lodge in the center, the oak on the left bank, the white cottage far behind. "
     "Change: early winter, first light snowfall, oak almost bare. On top of the lodge a beaver plasters wet dark mud "
     "onto the sticks with its front paws. On the bank a red fox sniffs at the frozen, mud-hardened wall, unable to get "
     "in. The cross-section below shows the lodge cut open: thick walls of sticks and frozen mud around a dry inner "
     "chamber above the waterline, and the water and muddy bottom underneath. Cool grey light."),
 8: ("Cuando el estanque se cubre de hielo, sale por una entrada sumergida, nada hasta sus ramas y puede aguantar la respiración unos quince minutos.",
     "Camera at the pond in deep winter: the snowy lodge, the bare snowy oak on the left bank, the white cottage far "
     "behind. The pond surface is a thick layer of ice covered with snow. Top third: snowy landscape; below: a clean "
     "cut through the ice and the cold blue-green water. Underwater, a beaver swims out of the submerged tunnel "
     "entrance at the base of the lodge toward the pile of branches stuck in the muddy bottom, a trail of small silver "
     "air bubbles behind it. Dim blue light filtering through the ice."),
 9: ("Dentro, la familia se mantiene unida y el refugio se conserva por encima de cero grados. Su cola, además, guarda grasa de reserva.",
     "Camera at the pond in winter: the lodge is a snow-covered dome on the frozen pond, the bare snowy oak on the "
     "left, the white cottage far behind with a warm window. The lodge is cut open revealing a cozy dry chamber above "
     "the waterline lined with wood shavings, where a beaver family (two adults and two younger beavers) huddles "
     "together. One adult in front shows its broad, flat, scaly tail clearly. Below the chamber, the flooded tunnel "
     "leads down into dark icy water. Warm dim light inside, cold blue outside."),
 10: ("En primavera nacen las crías. Y un dato curioso: los dientes del castor son anaranjados, porque su esmalte contiene hierro.",
     "Camera at the pond in spring: ice gone, the oak covered in fresh green leaves, green grass, the white cottage in "
     "the distance under soft sunlight. The lodge is cut open: inside the dry chamber, three tiny fluffy newborn "
     "beaver kits curled against their mother. In the foreground at the water's edge, an adult beaver sits holding a "
     "peeled stick in its front paws and gnaws it, its large incisor teeth clearly visible and distinctly bright "
     "orange. Gentle warm spring light."),
}


def post(model, body, tries=4):
    req = urllib.request.Request(f"{API}/{model}:generateContent", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    for k in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:400]
            if e.code in (429, 500, 503) and k < tries - 1:
                print(f"  {e.code}, reintento en {20*(k+1)} s: {msg[:120]}"); time.sleep(20 * (k + 1)); continue
            raise SystemExit(f"HTTP {e.code}: {msg}")


def imagen(n):
    ref = base64.b64encode((ROOT / "img/s01.png").read_bytes()).decode()
    body = {"contents": [{"parts": [{"inline_data": {"mime_type": "image/png", "data": ref}},
                                    {"text": SET + ESCENAS[n][1]}]}],
            "generationConfig": {"responseModalities": ["IMAGE"],
                                 "imageConfig": {"aspectRatio": "9:16", "imageSize": "2K"}}}
    d = post(IMG_MODEL, body)
    for p in d["candidates"][0]["content"]["parts"]:
        if "inlineData" in p:
            out = ROOT / f"img/s{n:02d}.png"
            raw = ROOT / f"img/s{n:02d}.raw"
            raw.write_bytes(base64.b64decode(p["inlineData"]["data"]))
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, out], check=True); raw.unlink()
            print("ok", out.name); return
    raise SystemExit(f"sin imagen en la respuesta: {json.dumps(d)[:400]}")


def tts(n):
    body = {"contents": [{"parts": [{"text": os.environ.get("TTS_ESTILO", "")
                + ESCENAS[n][0]}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOZ}}}}}
    d = post(TTS_MODEL, body)
    p = d["candidates"][0]["content"]["parts"][0]["inlineData"]
    mime = p.get("mimeType", "")
    raw = ROOT / f"audio/s{n:02d}.raw"; raw.write_bytes(base64.b64decode(p["data"]))
    if "wav" in mime:  # los modelos TTS nuevos devuelven WAV con cabecera
        entrada = ["-i", raw]
    else:              # los anteriores devuelven PCM crudo (audio/L16;rate=24000)
        rate = mime.split("rate=")[1].split(";")[0] if "rate=" in mime else "24000"
        entrada = ["-f", "s16le", "-ar", rate, "-ac", "1", "-i", raw]
    out = ROOT / f"audio/s{n:02d}.wav"
    # Recorta silencios al inicio y final para que la duración de la escena siga a la voz.
    subprocess.run(["ffmpeg", "-v", "error", "-y", *entrada, "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse", out], check=True)
    raw.unlink(); print("ok", out.name)


if __name__ == "__main__":
    modo, nums = sys.argv[1], [int(x) for x in sys.argv[2:]]
    for n in nums:
        (imagen if modo == "img" else tts)(n)
