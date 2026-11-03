"""Escena 3: viaje por el interior de un vaso sanguíneo.

- Pared del vaso: túnel calculado por píxel (intersección rayo-cilindro con
  curvatura), textura endotelial procedural, niebla volumétrica y luz.
- Glóbulos rojos: forma bicóncava real (modelo de Evans-Fung) prerenderizada
  en 3D para distintas inclinaciones, luego sombreada, rotada y escalada
  en perspectiva con profundidad de campo.
- Moléculas de O2 unidas a la hemoglobina que se van soltando y desaparecen.
"""
import numpy as np
import cv2

from .. import config as CFG
from ..engine.mathx import smoothstep, smootherstep
from ..engine.noise import Perlin3D
from ..engine import sprites
from ..engine.blobs import KEY_L, HALF_KEY

SPR = 160
N_TILT = 16


def _rbc_sprites():
    """Prerender de normal map + alfa de un glóbulo rojo bicóncavo a varias inclinaciones."""
    R0 = 1.0
    c0, c2, c4 = 0.81 / 3.91, 7.83 / 3.91, -4.39 / 3.91
    nr, nph = 260, 520
    rho = np.linspace(0, 1, nr, dtype=np.float32)[:, None]
    ph = np.linspace(0, 2 * np.pi, nph, endpoint=False, dtype=np.float32)[None]
    rr = rho * R0
    hz = 0.5 * np.sqrt(np.clip(1 - rho ** 2, 0, 1)) * (c0 + c2 * rho ** 2 + c4 * rho ** 4) * 0.55
    hz = np.maximum(hz, 0.012)
    out = []
    for k in range(N_TILT):
        tilt = k / (N_TILT - 1) * (np.pi / 2 * 0.98)
        ct, st = np.cos(tilt), np.sin(tilt)
        zbuf = np.full((SPR, SPR), -9, np.float32)
        nbuf = np.zeros((SPR, SPR, 3), np.float32)
        for sgn in (1, -1):
            X = (rr * np.cos(ph)).ravel()
            Y = (rr * np.sin(ph)).ravel()
            Z = (sgn * np.broadcast_to(hz, (nr, nph))).ravel()
            # normal por diferencias en la malla
            hzz = np.broadcast_to(hz, (nr, nph))
            dh = np.gradient(hzz[:, 0], rho[:, 0])
            dh = np.broadcast_to(dh[:, None], (nr, nph)).ravel()
            NX = -sgn * dh * np.cos(ph).repeat(1, 0).ravel() if False else (-sgn * dh * np.broadcast_to(np.cos(ph), (nr, nph)).ravel())
            NY = -sgn * dh * np.broadcast_to(np.sin(ph), (nr, nph)).ravel()
            NZ = np.full_like(NX, float(sgn))
            nn = np.sqrt(NX ** 2 + NY ** 2 + NZ ** 2)
            NX, NY, NZ = NX / nn, NY / nn, NZ / nn
            # inclinar alrededor del eje X
            Y2, Z2 = Y * ct - Z * st, Y * st + Z * ct
            NY2, NZ2 = NY * ct - NZ * st, NY * st + NZ * ct
            px = ((X * 0.47 + 0.5) * (SPR - 1)).astype(np.int32)
            py = ((-Y2 * 0.47 + 0.5) * (SPR - 1)).astype(np.int32)
            order = np.argsort(Z2)
            px, py = px[order], py[order]
            zb = Z2[order]
            zbuf_flat = zbuf.ravel()
            lin = py * SPR + px
            # escritura en orden de profundidad (la última gana = la más cercana)
            m = zb > zbuf_flat[lin]
            nbf = nbuf.reshape(-1, 3)
            sel = lin[m]
            zbuf_flat[sel] = zb[m]
            nbf[sel, 0] = NX[order][m]
            nbf[sel, 1] = NY2[order][m]
            nbf[sel, 2] = NZ2[order][m]
        mask = (zbuf > -9).astype(np.float32)
        # rellenar huecos
        k3 = np.ones((3, 3), np.uint8)
        mask_c = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k3)
        nb = cv2.GaussianBlur(nbuf, (3, 3), 0)
        wsum = cv2.GaussianBlur(mask, (3, 3), 0)
        nb = nb / np.maximum(wsum[..., None], 1e-3)
        nb /= np.linalg.norm(nb, axis=-1, keepdims=True) + 1e-6
        alpha = cv2.GaussianBlur(mask_c, (3, 3), 0.8)
        ndl = np.clip(nb @ KEY_L, 0, 1)
        ndh = np.clip(nb @ HALF_KEY, 0, 1)
        nz = np.clip(nb[..., 2], 0, 1)
        out.append((ndl.astype(np.float32), (ndh ** 30).astype(np.float32), ((1 - nz) ** 2.5).astype(np.float32),
                    alpha.astype(np.float32)))
    return out


class VesselScene:
    def __init__(self, tl, width=None, height=None, seed=5):
        self.tl = tl
        self.w = width or CFG.RW
        self.h = height or CFG.RH
        self.sprites = _rbc_sprites()
        rng = np.random.default_rng(seed)
        n = 150
        self.n = n
        self.cr = np.sqrt(rng.uniform(0.0, 1.0, n)).astype(np.float32) * 0.78
        self.cth = rng.uniform(0, 2 * np.pi, n).astype(np.float32)
        self.cz0 = rng.uniform(0, 30, n).astype(np.float32)
        self.cspd = rng.uniform(0.85, 1.15, n).astype(np.float32)
        self.ctilt = rng.uniform(0, 1, n).astype(np.float32)
        self.ctr = rng.uniform(-0.6, 0.6, n).astype(np.float32)
        self.crot = rng.uniform(0, 360, n).astype(np.float32)
        self.crs = rng.uniform(-40, 40, n).astype(np.float32)
        self.co2_off = rng.uniform(0, 2 * np.pi, (n, 4)).astype(np.float32)
        self.co2_thr = rng.uniform(0, 1, (n, 4)).astype(np.float32)
        self.noise = Perlin3D(seed=77, N=64)
        # Rejilla de direcciones de rayo
        fov = np.radians(70)
        f = 0.5 * self.h / np.tan(fov / 2)
        self.f = f
        yy, xx = np.mgrid[0:self.h, 0:self.w].astype(np.float32)
        self.dx = (xx - self.w / 2) / f
        self.dy = -(yy - self.h / 2) / f
        self.ang = np.arctan2(self.dy, self.dx)
        rr = np.sqrt(self.dx ** 2 + self.dy ** 2) + 1e-4
        self.inv_r = 1.0 / rr                     # profundidad hasta pared de radio 1
        # textura de pared precalculada (cilindro desenrollado: ángulo x profundidad)
        TW, TH = 512, 1024
        a = np.linspace(0, 1, TW, endpoint=False, dtype=np.float32)[None].repeat(TH, 0)
        zz = np.linspace(0, 1, TH, endpoint=False, dtype=np.float32)[:, None].repeat(TW, 1)
        cx, cy = np.cos(a * 2 * np.pi), np.sin(a * 2 * np.pi)
        per = 16.0
        n1 = self.noise(cx * 1.2, cy * 1.2, zz * per, 3.0)
        n2 = self.noise(cx * 3.0 + 5, cy * 3.0, zz * per * 2.4, 3.0)
        cells = np.abs(self.noise(cx * 6.0 + 9, cy * 6.0, zz * per * 5.5, 2.0))
        self.wall_tex = (0.6 + 0.35 * n1 + 0.15 * n2 - 0.12 * np.exp(-(cells / 0.1) ** 2)).astype(np.float32)
        self.wall_h = cv2.GaussianBlur((0.9 * n1 + 0.4 * n2 - 0.25 * np.exp(-(cells / 0.12) ** 2)).astype(np.float32), (0, 0), 2.0)
        self.TW, self.TH = TW, TH
        self.per = per

    def render(self, t):
        tl = self.tl
        lt = t - tl.T3
        dur = tl.T4 - tl.T3
        oxy = tl.oxy(t)
        hyp = 1 - oxy
        _, _, pulse = tl.beat_phase(t)
        # velocidad: pulso cardíaco + aceleración final hacia el cerebro
        speed = 2.2 + 1.2 * pulse + 18.0 * smoothstep(dur - 1.4, dur, lt) ** 2
        # posición integrada (aprox.)
        zcam = 2.2 * lt + 0.35 * np.sin(lt * 7.0) + 18.0 / 3 * 1.4 * smoothstep(dur - 1.4, dur, lt) ** 3
        # curvatura del túnel: desplaza el centro según la profundidad
        bend_x = 0.25 * np.sin(lt * 0.5)
        bend_y = 0.18 * np.cos(lt * 0.37)
        wall_r = 1.0 + 0.035 * pulse
        depth = self.inv_r * wall_r
        # Coordenadas de textura (ángulo, profundidad)
        u = ((self.ang / (2 * np.pi)) + 0.03 * lt) % 1.0
        v = ((depth + zcam) / self.per) % 1.0
        # curvatura aparente
        mx = (u * self.TW).astype(np.float32)
        my = (v * self.TH).astype(np.float32)
        tex = cv2.remap(self.wall_tex, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        hgt = cv2.remap(self.wall_h, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=3)
        # iluminación: luz frontal (cámara) + rim interior
        fog = np.exp(-depth * 0.16).astype(np.float32)
        shade = np.clip(0.55 + 0.9 * (gx * 0.6 - gy * 0.5), 0.15, 1.6)
        base = np.array([0.75, 0.10, 0.12], np.float32) * (1 - 0.5 * hyp) + np.array([0.35, 0.06, 0.25], np.float32) * 0.5 * hyp
        wall = (tex * shade)[..., None] * base * (0.35 + 1.2 * fog[..., None])
        # brillo húmedo (especular) cerca
        spec = np.clip(gx * 0.5 - gy * 0.4, 0, 1) ** 3 * fog
        wall += spec[..., None] * np.array([1.0, 0.7, 0.7], np.float32) * 0.8
        # luz de fondo (final del túnel)
        cen = np.exp(-(self.dx ** 2 + self.dy ** 2) * 9.0)
        glow_col = np.array([1.0, 0.35, 0.25], np.float32) * (1 - 0.4 * hyp)
        frame = wall * (1 - cen[..., None] * 0.6) + cen[..., None] * glow_col * 0.5
        # pulso de luz con el latido
        frame *= (0.9 + 0.25 * pulse)

        # ---------------------------------------------------------- glóbulos
        z = (self.cz0 - zcam * self.cspd * 1.0) % 30.0 + 0.4
        x3 = self.cr * np.cos(self.cth + 0.1 * np.sin(t + self.cz0))
        y3 = self.cr * np.sin(self.cth + 0.1 * np.cos(t * 0.8 + self.cz0))
        order = np.argsort(-z)
        cell_col = np.array([0.92, 0.10, 0.10], np.float32) * (1 - 0.6 * hyp) + np.array([0.42, 0.06, 0.28], np.float32) * 0.6 * hyp
        for i in order:
            zi = z[i]
            if zi < 0.25:
                continue
            sx = self.w / 2 + self.f * x3[i] / zi
            sy = self.h / 2 - self.f * y3[i] / zi
            size = self.f * 0.30 / zi * 2
            if size < 2 or size > self.h * 1.6:
                continue
            if sx < -size or sx > self.w + size or sy < -size or sy > self.h + size:
                continue
            tilt = (self.ctilt[i] + self.ctr[i] * t * 0.15) % 2.0
            tilt = 2.0 - tilt if tilt > 1 else tilt
            ti = int(tilt * (N_TILT - 1))
            ndl, sp, rim, al = self.sprites[ti]
            ang = self.crot[i] + self.crs[i] * t
            fogc = float(np.exp(-zi * 0.16))
            d = int(size)
            if d < 3:
                continue
            M = cv2.getRotationMatrix2D((SPR / 2, SPR / 2), float(ang), d / SPR)
            M[0, 2] += d / 2 - SPR / 2
            M[1, 2] += d / 2 - SPR / 2
            stack = np.dstack([ndl, sp, rim, al])
            spr = cv2.warpAffine(stack, M, (d, d), flags=cv2.INTER_LINEAR)
            # desenfoque por profundidad de campo
            dof = abs(zi - 3.0) * 0.8 + (2.5 if zi < 1.0 else 0)
            if dof > 1.2 and d > 6:
                kk = min(dof * d / 60, 25)
                if kk > 0.6:
                    spr = cv2.GaussianBlur(spr, (0, 0), kk)
            col = cell_col * (0.85 + 0.15 * np.sin(i))
            rgb = (0.18 + 0.95 * spr[..., 0:1]) * col + spr[..., 1:2] * 0.6 + spr[..., 2:3] * col * 1.2
            rgb = rgb * fogc + (1 - fogc) * base * 0.25
            a = spr[..., 3:4] * float(smoothstep(0.35, 1.1, zi))
            x0, y0 = int(sx - d / 2), int(sy - d / 2)
            xa, ya = max(x0, 0), max(y0, 0)
            xb, yb = min(x0 + d, self.w), min(y0 + d, self.h)
            if xb <= xa or yb <= ya:
                continue
            reg = frame[ya:yb, xa:xb]
            ss = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0))
            reg *= (1 - a[ss])
            reg += rgb[ss] * a[ss]
            # O2 unido a la hemoglobina: se pierde con el tiempo
            if zi < 9 and d > 10:
                for k in range(4):
                    if self.co2_thr[i, k] > (oxy - 0.42) / 0.58:
                        continue
                    o = self.co2_off[i, k] + t * 0.8
                    ox_ = sx + np.cos(o) * d * 0.42
                    oy_ = sy + np.sin(o) * d * 0.30
                    rr_ = float(np.clip(d * 0.06, 1.5, 14))
                    sprites.draw_glow(frame, ox_, oy_, rr_ * 4, (0.25, 0.75, 1.0), 0.5 * fogc)
                    sprites.draw_sphere(frame, ox_, oy_, rr_, (0.55, 0.92, 1.0), fogc, emissive=0.6)
        return np.clip(frame, 0, 8).astype(np.float32), {}
