"""Capas 2D a resolución completa: subtítulos dinámicos, títulos, etiquetas,
HUD de oxígeno / CO2, electrocardiograma y avisos."""
import re
import unicodedata

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

from .. import config as C
from ..engine.mathx import smoothstep, ease_out

WHITE = (255, 255, 255)
CYAN = (70, 215, 255)
ORANGE = (255, 150, 45)
PINK = (255, 105, 190)
RED = (255, 62, 62)
YELLOW = (255, 222, 60)
GREEN = (110, 255, 150)

KEYWORDS = {
    "oxígeno": CYAN, "aire": CYAN, "respirar": CYAN, "respiración": CYAN, "fresco": CYAN,
    "dióxido": ORANGE, "carbono": ORANGE, "acumula": ORANGE,
    "cerebro": PINK, "conocimiento": YELLOW, "sufrir": YELLOW,
    "corazón": RED, "sangre": RED, "irreversible": RED, "daño": RED,
    "pulmones": (255, 140, 165), "órganos": (255, 140, 165),
    "vivo": GREEN, "disminuir": YELLOW, "segundos": YELLOW,
}

_fonts = {}


def font(path, size):
    k = (path, size)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(path, size)
    return _fonts[k]


def _key(w):
    w = re.sub(r"[^\wáéíóúüñ]", "", w.lower())
    return w


def kw_color(w):
    return KEYWORDS.get(_key(w))


def text_w(draw, s, f, stroke=0):
    b = draw.textbbox((0, 0), s, font=f, stroke_width=stroke)
    return b[2] - b[0]


def chunk_words(words, max_words=3, max_chars=16):
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        n = sum(len(x["w"]) + 1 for x in cur)
        if len(cur) >= max_words or n > max_chars or w["w"].endswith((",", ".", "?")):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


class Overlay:
    def __init__(self, tl):
        self.tl = tl
        self.chunks = []
        for li, ln in enumerate(tl.lines):
            if li == 0:
                continue  # la frase inicial ya está como título
            ws = [{"w": w["w"], "t0": w["t0"] + ln["start"], "t1": w["t1"] + ln["start"]} for w in ln["words"]]
            for ch in chunk_words(ws):
                self.chunks.append(ch)
        # fin visible de cada bloque = inicio del siguiente (dentro de la misma frase) o +0.35s
        for i, ch in enumerate(self.chunks):
            end = ch[-1]["t1"] + 0.3
            if i + 1 < len(self.chunks):
                end = min(end, self.chunks[i + 1][0]["t0"])
            ch[0]["end"] = end

    # -------------------------------------------------------------- primitivas
    def _canvas(self):
        return Image.new("RGBA", (C.W, C.H), (0, 0, 0, 0))

    def _glow_text(self, img, xy, s, f, fill, stroke=7, glow=None, anchor="la", alpha=255):
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        if glow:
            g = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ImageDraw.Draw(g).text(xy, s, font=f, fill=glow + (int(alpha * 0.8),), anchor=anchor,
                                   stroke_width=stroke + 4, stroke_fill=glow + (int(alpha * 0.8),))
            g = g.filter(ImageFilter.GaussianBlur(14))
            img.alpha_composite(g)
        # sombra
        d.text((xy[0] + 4, xy[1] + 6), s, font=f, fill=(0, 0, 0, int(alpha * 0.55)), anchor=anchor,
               stroke_width=stroke, stroke_fill=(0, 0, 0, int(alpha * 0.55)))
        d.text(xy, s, font=f, fill=fill + (alpha,), anchor=anchor, stroke_width=stroke,
               stroke_fill=(10, 10, 16, alpha))
        img.alpha_composite(lay)

    # ---------------------------------------------------------- subtítulos
    def subtitles(self, img, t):
        cur = None
        for ch in self.chunks:
            if ch[0]["t0"] - 0.05 <= t < ch[0]["end"]:
                cur = ch
        if cur is None:
            return
        age = t - cur[0]["t0"]
        pop = 0.82 + 0.18 * ease_out(age / 0.14)
        alpha = int(255 * min(1, max(0, (cur[0]["end"] - t) / 0.08)))
        size = int(84 * pop)
        f = font(C.FONT_BLACK, size)
        d = ImageDraw.Draw(img)
        words = [w["w"].upper() for w in cur]
        space = int(size * 0.28)
        widths = [text_w(d, w, f) for w in words]
        total = sum(widths) + space * (len(words) - 1)
        lines = [list(range(len(words)))]
        if total > C.W - 140 and len(words) > 1:
            lines = [list(range(len(words) - 1)), [len(words) - 1]]
        y = 1265
        for li, ln in enumerate(lines):
            tw = sum(widths[i] for i in ln) + space * (len(ln) - 1)
            x = (C.W - tw) / 2
            for i in ln:
                w = cur[i]
                active = w["t0"] <= t
                col = kw_color(w["w"])
                speaking = w["t0"] <= t < w["t1"] + 0.05
                if col is None:
                    col = YELLOW if speaking else WHITE
                fill = col if active else (200, 200, 205)
                glow = col if (kw_color(w["w"]) and active) else None
                self._glow_text(img, (x, y + li * int(size * 1.12)), words[i], f, fill, stroke=8, glow=glow,
                                alpha=alpha if active else int(alpha * 0.85))
                x += widths[i] + space

    # -------------------------------------------------------------- títulos
    def title(self, img, t):
        tl = self.tl
        if t > tl.T2 + 0.2:
            return
        a = smoothstep(0.15, 0.55, t) * (1 - smoothstep(tl.T2 - 0.35, tl.T2 + 0.15, t))
        if a <= 0:
            return
        lines = [("¿QUÉ PASA SI", WHITE), ("DEJAS DE", WHITE), ("RESPIRAR?", CYAN)]
        for i, (s, col) in enumerate(lines):
            ti = 0.2 + i * 0.18
            k = ease_out((t - ti) / 0.35)
            if k <= 0:
                continue
            size = int((112 if i < 2 else 150) * (0.7 + 0.3 * k))
            f = font(C.FONT_BLACK, size)
            y = 175 + i * 128 + (30 if i == 2 else 0)
            self._glow_text(img, (C.W / 2, y), s, f, col, stroke=9, glow=CYAN if i == 2 else None,
                            anchor="mm", alpha=int(255 * a * min(k * 1.5, 1)))

    def final_text(self, img, t):
        tl = self.tl
        t0 = tl.FINAL_TEXT
        if t < t0:
            return
        lines = [("TU CEREBRO", WHITE, 116), ("NECESITA", WHITE, 116), ("OXÍGENO", CYAN, 160),
                 ("CADA SEGUNDO.", YELLOW, 116)]
        for i, (s, col, sz) in enumerate(lines):
            ti = t0 + i * 0.32
            k = ease_out((t - ti) / 0.3)
            if k <= 0:
                continue
            f = font(C.FONT_BLACK, int(sz * (0.75 + 0.25 * k)))
            y = 300 + i * 150 + (20 if i >= 2 else 0) + (25 if i == 3 else 0)
            self._glow_text(img, (C.W / 2, y), s, f, col, stroke=10, glow=col if i >= 2 else None,
                            anchor="mm", alpha=int(255 * min(k * 1.4, 1)))

    # --------------------------------------------------------------- chips
    def chip(self, img, x, y, s, col, a=1.0, size=40, anchor="mm", dot=True):
        if a <= 0.01:
            return
        f = font(C.FONT_XBOLD, size)
        d = ImageDraw.Draw(img)
        tw = text_w(d, s, f)
        pad = int(size * 0.55)
        wbox = tw + pad * 2 + (int(size * 0.7) if dot else 0)
        hbox = int(size * 1.7)
        if anchor == "mm":
            x0, y0 = x - wbox / 2, y - hbox / 2
        elif anchor == "lm":
            x0, y0 = x, y - hbox / 2
        else:
            x0, y0 = x - wbox, y - hbox / 2
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        dl = ImageDraw.Draw(lay)
        dl.rounded_rectangle((x0, y0, x0 + wbox, y0 + hbox), radius=hbox // 2, fill=(8, 12, 22, int(200 * a)),
                             outline=col + (int(255 * a),), width=4)
        tx = x0 + pad
        if dot:
            r = size * 0.22
            cx, cy = x0 + pad + r, y0 + hbox / 2
            dl.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col + (int(255 * a),))
            tx += int(size * 0.7)
        dl.text((tx, y0 + hbox / 2), s, font=f, fill=(255, 255, 255, int(255 * a)), anchor="lm")
        g = lay.filter(ImageFilter.GaussianBlur(10))
        img.alpha_composite(g)
        img.alpha_composite(lay)
        return (x0, y0, x0 + wbox, y0 + hbox)

    def label(self, img, anchor_px, s, col, a, side=1, dy=-120, t_in=0.0):
        """Etiqueta con línea guía hacia un punto 3D proyectado."""
        if a <= 0.01 or anchor_px is None:
            return
        ax, ay, az = anchor_px
        if az <= 0 or not (-200 < ax < C.W + 200 and -200 < ay < C.H + 200):
            return
        k = ease_out(t_in / 0.4) if t_in < 0.4 else 1.0
        ex = ax + side * 170 * k
        ey = ay + dy * k
        ex = float(np.clip(ex, 170, C.W - 170))
        d = ImageDraw.Draw(img)
        A = int(255 * a)
        d.line([(ax, ay), (ex, ey)], fill=col + (A,), width=4)
        d.ellipse((ax - 9, ay - 9, ax + 9, ay + 9), outline=col + (A,), width=4)
        d.ellipse((ax - 4, ay - 4, ax + 4, ay + 4), fill=WHITE + (A,))
        self.chip(img, ex, ey, s, col, a * k, size=36)

    # ----------------------------------------------------------------- HUD
    def hud(self, img, t):
        tl = self.tl
        a = smoothstep(tl.T2 + 0.3, tl.T2 + 1.0, t) * (1 - smoothstep(tl.FINAL_TEXT - 0.6, tl.FINAL_TEXT, t))
        if a <= 0.01:
            return
        oxy = tl.oxy(t)
        co2 = tl.co2(t)
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        A = int(255 * a)
        x0, y0, wbar = 70, 120, 360
        f = font(C.FONT_XBOLD, 30)
        fb = font(C.FONT_BLACK, 34)
        d.rounded_rectangle((x0 - 26, y0 - 26, x0 + wbar + 140, y0 + 176), 26, fill=(6, 10, 20, int(170 * a)),
                            outline=(80, 130, 180, int(120 * a)), width=2)
        # O2
        pct = int(round(98 * oxy))
        col_o = CYAN if oxy > 0.6 else (YELLOW if oxy > 0.42 else RED)
        if oxy < 0.42 and int(t * 4) % 2 == 0:
            col_o = (255, 120, 120)
        d.text((x0, y0), "O₂ EN SANGRE", font=f, fill=(210, 225, 240, A))
        d.text((x0 + wbar + 110, y0), f"{pct}%", font=fb, fill=col_o + (A,), anchor="ra")
        d.rounded_rectangle((x0, y0 + 46, x0 + wbar + 110, y0 + 66), 10, fill=(40, 50, 70, A))
        d.rounded_rectangle((x0, y0 + 46, x0 + int((wbar + 110) * oxy), y0 + 66), 10, fill=col_o + (A,))
        # CO2
        d.text((x0, y0 + 88), "CO₂ ACUMULADO", font=f, fill=(210, 225, 240, A))
        d.text((x0 + wbar + 110, y0 + 88), "▲" if co2 > 0.05 else "", font=fb, fill=ORANGE + (A,), anchor="ra")
        d.rounded_rectangle((x0, y0 + 134, x0 + wbar + 110, y0 + 154), 10, fill=(40, 50, 70, A))
        d.rounded_rectangle((x0, y0 + 134, x0 + int((wbar + 110) * max(co2, 0.03)), y0 + 154), 10,
                            fill=ORANGE + (A,))
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(6)))
        img.alpha_composite(lay)

    def ecg(self, img, t):
        tl = self.tl
        a = smoothstep(tl.T5 + 0.2, tl.T5 + 0.8, t) * (1 - smoothstep(tl.T6 + 1.2, tl.T6 + 2.0, t))
        if a <= 0.01:
            return
        x0, x1, yc = 90, C.W - 90, 1560
        win = 3.0
        xs = np.linspace(x0, x1, 260)
        ts = t - win + (xs - x0) / (x1 - x0) * win
        beats = tl.beats
        v = np.zeros_like(ts)
        for bt in beats[(beats > t - win - 1) & (beats < t + 0.1)]:
            d = ts - bt + 0.12
            strength = 1.0 - 0.5 * smoothstep(tl.T5 + 6, tl.END, bt)
            v += strength * (-0.15 * np.exp(-((d + 0.12) / 0.03) ** 2) + 1.0 * np.exp(-(d / 0.012) ** 2)
                             - 0.35 * np.exp(-((d - 0.03) / 0.015) ** 2) + 0.22 * np.exp(-((d - 0.22) / 0.05) ** 2))
        v[ts > t] = np.nan
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        A = int(255 * a)
        pts = [(float(x), float(yc - 95 * y)) for x, y in zip(xs, v) if not np.isnan(y)]
        col = GREEN if tl.heart_rate(t) > 60 else RED
        if len(pts) > 2:
            d.line(pts, fill=col + (A,), width=5, joint="curve")
            hx, hy = pts[-1]
            d.ellipse((hx - 8, hy - 8, hx + 8, hy + 8), fill=WHITE + (A,))
        bpm = int(tl.heart_rate(t))
        f = font(C.FONT_BLACK, 46)
        d.text((x1, yc - 140), f"♥ {bpm} LPM", font=f, fill=col + (A,), anchor="ra")
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(8)))
        img.alpha_composite(lay)

    # ----------------------------------------------------------- composición
    def draw(self, frame_u8, t, anchors, scale):
        tl = self.tl
        img = self._canvas()
        A = {k: (v[0] * scale, v[1] * scale, v[2]) for k, v in (anchors or {}).items()}
        sid = tl.scene_at(t)[0]

        # Etiquetas por escena
        if t < tl.T2:
            for key, s, col, side, ti, dy in (("lungs_l", "PULMONES", (255, 140, 165), 1, 1.5, 170),
                                              ("heart", "CORAZÓN", RED, -1, 2.1, 300)):
                a = smoothstep(ti, ti + 0.3, t) * (1 - smoothstep(tl.T2 - 0.6, tl.T2 - 0.2, t))
                self.label(img, A.get(key), s, col, a, side=side, dy=dy, t_in=t - ti)
        if sid == 2:
            a = smoothstep(tl.T2 + 0.8, tl.T2 + 1.2, t) * (1 - smoothstep(tl.T3 - 0.5, tl.T3 - 0.2, t))
            if "trachea_top" in A and a > 0:
                self._blocked_arrow(img, A["trachea_top"], a, t)
            a2 = smoothstep(tl.T2 + 2.4, tl.T2 + 2.8, t) * (1 - smoothstep(tl.T3 - 0.5, tl.T3 - 0.2, t))
            self.label(img, A.get("lungs_r"), "CO₂ SE ACUMULA", ORANGE, a2, side=1, dy=-260, t_in=t - tl.T2 - 2.4)
        if sid == 3:
            lt = t - tl.T3
            a = smoothstep(0.5, 0.9, lt) * (1 - smoothstep(tl.T4 - tl.T3 - 0.7, tl.T4 - tl.T3 - 0.3, lt))
            self.chip(img, C.W / 2, 1080, "GLÓBULOS ROJOS  +  O₂", RED, a, size=40)
        if sid == 4:
            lt = t - tl.T4
            a = smoothstep(1.4, 1.8, lt) * (1 - smoothstep(tl.T5 - tl.T4 - 0.6, tl.T5 - tl.T4 - 0.2, lt))
            self.chip(img, C.W / 2, 1080, "ACTIVIDAD NEURONAL", CYAN if lt < 5 else RED, a, size=40)
            if lt > 4.5:
                k = smoothstep(4.5, 4.9, lt) * (1 - smoothstep(tl.T5 - tl.T4 - 0.6, tl.T5 - tl.T4 - 0.2, lt))
                self.chip(img, C.W / 2, 1170, "▼ BAJA  ·  POCO O₂", RED, k, size=36, dot=False)
        if sid == 6 or (sid == 5 and t > tl.T6 - 0.01):
            items = [(tl.T6 + 1.0, "PÉRDIDA DE CONCIENCIA", YELLOW), (tl.T6 + 2.4, "DAÑO CEREBRAL", ORANGE),
                     (tl.T6 + 3.8, "MUERTE", RED)]
            for i, (ti, s, col) in enumerate(items):
                a = smoothstep(ti, ti + 0.25, t) * (1 - smoothstep(tl.FINAL_TEXT - 0.7, tl.FINAL_TEXT - 0.2, t))
                self.chip(img, C.W / 2, 880 + i * 95, s, col, a, size=40)

        self.hud(img, t)
        self.ecg(img, t)
        self.title(img, t)
        self.final_text(img, t)
        self.subtitles(img, t)

        arr = np.asarray(img, dtype=np.float32)
        a = arr[..., 3:4] / 255.0
        out = frame_u8.astype(np.float32) * (1 - a) + arr[..., :3] * a
        return np.clip(out, 0, 255).astype(np.uint8)

    def _blocked_arrow(self, img, anc, a, t):
        ax, ay, _ = anc
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        A = int(255 * a)
        top = ay - 300
        # flecha de aire bajando que se detiene
        d.line([(ax, top), (ax, ay - 60)], fill=CYAN + (A,), width=12)
        d.polygon([(ax - 30, ay - 70), (ax + 30, ay - 70), (ax, ay - 20)], fill=CYAN + (A,))
        fo = font(C.FONT_BLACK, 52)
        d.text((ax + 40, top + 20), "O₂", font=fo, fill=CYAN + (A,), anchor="lm")
        # X roja
        k = smoothstep(0.0, 1.0, a)
        r = 52 * (0.6 + 0.4 * k)
        cx, cy = ax, ay - 160
        pulse = 1 + 0.08 * np.sin(t * 10)
        r *= pulse
        d.ellipse((cx - r * 1.3, cy - r * 1.3, cx + r * 1.3, cy + r * 1.3), fill=(40, 0, 0, int(160 * a)),
                  outline=RED + (A,), width=8)
        d.line([(cx - r * 0.7, cy - r * 0.7), (cx + r * 0.7, cy + r * 0.7)], fill=RED + (A,), width=14)
        d.line([(cx - r * 0.7, cy + r * 0.7), (cx + r * 0.7, cy - r * 0.7)], fill=RED + (A,), width=14)
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(12)))
        img.alpha_composite(lay)
        self.chip(img, ax - 30, cy, "SIN AIRE NUEVO", RED, a, size=36, anchor="rm")
