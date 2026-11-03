"""Texturas procedurales 3D (se evalúan en coordenadas de objeto por píxel)."""
import numpy as np

from ..engine.noise import WaveNoise, Perlin3D, eval_lowres

_N = [WaveNoise(7, seed=s) for s in range(8)]
_P = [Perlin3D(seed=100 + s, N=64) for s in range(4)]


def lung_texture(oxy=1.0, glow=0.0):
    """Tejido pulmonar: moteado alveolar, cisuras de lóbulos."""
    def tex(qx, qy, qz, base, thick):
        n1 = eval_lowres(lambda a, b, c: _P[0](a, b, c, 45.0) + 0.5 * _P[1](a, b, c, 110.0), qx, qy, qz, 3)
        n3 = eval_lowres(lambda a, b, c: _P[2](a, b, c, 380.0), qx, qy, qz, 2)
        mott = 0.7 * n1 + 0.3 * n3
        # Cisura oblicua
        fis = np.abs((qy - 1.30) + 0.55 * qz - 0.25 * np.abs(qx)) / 0.003
        fis = np.exp(-fis * fis)
        dark = np.array([0.55, 0.20, 0.32], np.float32)
        cyan = np.array([0.45, 0.42, 0.78], np.float32)
        spots = np.clip(n3 * 1.8 - 0.25, 0, 1)
        b = base * (1 + 0.28 * mott[..., None])
        b = b * (1 - 0.3 * spots[..., None]) + dark * 0.3 * spots[..., None]
        b = b * (1 - 0.6 * fis[..., None])
        hyp = (1 - oxy)
        b = b * (1 - 0.5 * hyp) + cyan * 0.5 * hyp
        bump = 0.25 * mott + 0.12 * n3 - 0.4 * fis
        extra = None
        if glow > 0:
            extra = (glow * (0.35 + 0.65 * (1 - thick)) * (0.7 + 0.3 * n1))[..., None] * np.array(
                [0.35, 0.75, 1.0], np.float32)
        return b, bump, extra
    return tex


def heart_texture(oxy=1.0, stress=0.0):
    """Miocardio con fibras en espiral, grasa en surcos y brillo húmedo."""
    def tex(qx, qy, qz, base, thick):
        n1 = eval_lowres(lambda a, b, c: _P[0](a, b, c, 60.0), qx, qy, qz, 3)
        n2 = eval_lowres(lambda a, b, c: _P[1](a, b, c, 260.0), qx, qy, qz, 2)
        ang = np.arctan2(qx, qz)
        fib = np.sin(ang * 10.0 + qy * 150.0 + 3.0 * n1)
        fat_zone = np.exp(-((qy - 0.0) / 0.009) ** 2) * np.clip(0.2 + n1 * 2.0, 0, 1)
        fat = np.array([1.0, 0.80, 0.48], np.float32)
        b = base * (1 + 0.10 * fib[..., None] + 0.25 * n2[..., None])
        b = b * (1 - 0.65 * fat_zone[..., None]) + fat * 0.65 * fat_zone[..., None] * 0.85
        hyp = 1 - oxy
        b = b * (1 - 0.45 * hyp) + np.array([0.32, 0.10, 0.30], np.float32) * 0.45 * hyp
        bump = 0.03 * fib + 0.1 * n2 + 0.15 * fat_zone * n1
        extra = None
        if stress > 0:
            extra = (stress * (0.25 + 0.75 * np.clip(1 - thick, 0, 1) ** 1.5))[..., None] * np.array([1.0, 0.12, 0.08], np.float32)
        return b, bump, extra
    return tex


def _gyri(a, b, c):
    w = 0.0045
    wa = a + w * _P[1](a, b, c, 70.0)
    wb = b + w * _P[2](a, b, c, 70.0)
    wc = c + w * _P[3](a, b, c, 70.0)
    return _P[0](wa, wb, wc, 165.0) + 0.12 * _P[1](wa, wb, wc, 380.0)


def brain_texture(t=0.0, activity=1.0, damage=0.0, glow_col=(0.3, 0.8, 1.0)):
    """Circunvoluciones (surcos = cruces por cero de ruido deformado) + actividad eléctrica."""
    gc = np.array(glow_col, np.float32)

    def tex(qx, qy, qz, base, thick):
        n = eval_lowres(_gyri, qx, qy, qz, 2)
        sul = np.exp(-(n / 0.11) ** 2)
        gyr = np.clip(np.abs(n) / 0.35, 0, 1) ** 0.6
        mid = np.exp(-(qx / 0.0035) ** 2) * (qy > -0.025)
        sul = np.maximum(sul, mid)
        gyr = np.minimum(gyr, 1 - mid)
        cb = (qy < -0.03) & (qz < -0.025)
        fol = 0.5 + 0.5 * np.sin(qy * 950.0 + 4 * n)
        sul = np.where(cb, fol ** 4, sul)
        gyr = np.where(cb, 1 - fol ** 4, gyr)
        v = eval_lowres(lambda a, b, c: _P[2](a, b, c, 40.0), qx, qy, qz, 3)
        ves = np.exp(-(v / 0.025) ** 2) * 0.75 * (1 - sul)
        dark = np.array([0.40, 0.13, 0.20], np.float32)
        red = np.array([0.80, 0.10, 0.14], np.float32)
        b = base * (0.86 + 0.18 * gyr[..., None])
        b = b * (1 - 0.75 * sul[..., None]) + dark * 0.75 * sul[..., None]
        b = b * (1 - 0.6 * ves[..., None]) + red * 0.6 * ves[..., None]
        if damage > 0:
            gray = b.mean(-1, keepdims=True)
            b = b * (1 - 0.6 * damage) + (gray * np.array([0.75, 0.62, 0.9], np.float32)) * 0.6 * damage
        bump = 0.45 * gyr - 0.25 * sul
        # Actividad neuronal: destellos que viajan por los giros
        a1 = eval_lowres(lambda a, b, c: _P[3](a, b, c, 30.0), qx, qy, qz, 4)
        w1 = np.sin(a1 * 14.0 - t * 6.0)
        w2 = np.sin(n * 18.0 + t * 4.0)
        spark = np.clip(w1, 0, 1) ** 10 * (0.5 + 0.5 * np.clip(w2, 0, 1))
        e = activity * (1.3 * spark + 0.35 * np.clip(w2, 0, 1) ** 12) * gyr * (0.4 + 0.6 * (1 - thick))
        extra = e[..., None] * gc
        return b, bump, extra
    return tex
