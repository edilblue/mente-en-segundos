"""Corazón estilizado en coordenadas locales (origen en el centro de la base).

Grupos: 0 ventrículos, 1 aurículas, 2 arterias (aorta), 3 venas/pulmonar, 4 coronarias.
"""
import numpy as np

from .model import Part, sample_volume

MUSCLE = (0.80, 0.14, 0.14)
ATRIUM = (0.78, 0.22, 0.24)
AORTA = (0.95, 0.30, 0.28)
VEIN = (0.30, 0.38, 0.95)
CORONARY = (1.0, 0.35, 0.25)


def _prof(a):
    # Ovoide: a=0 base (y=0) -> a=1 ápex. u en [-1, 1] a lo largo del eje.
    u = np.clip(a * 2.0 - 0.85, -1, 1)
    return 0.052 * np.sqrt(np.clip(1 - u * u, 0, 1)) * (1 - 0.22 * u) + 0.004


def ventricle_inside(p):
    # eje largo: -y (base y=0 -> ápex y=-0.11), levemente desplazado
    a = np.clip(-p[:, 1] / 0.115, 0, 1.2)
    prof = _prof(a)
    cx = 0.004 + 0.012 * a
    dx = p[:, 0] - cx
    dz = (p[:, 2] - 0.004) * 1.15
    return (p[:, 1] <= 0.02) & (dx ** 2 + dz ** 2 < prof ** 2) & (a < 0.93)


def build_heart():
    p = Part("heart")
    V = sample_volume(ventricle_inside, [(-0.07, -0.12, -0.07), (0.07, 0.015, 0.07)], 150, seed=11,
                      min_dist=0.0085)
    p.cloud(V, 0.015, MUSCLE, w=0.42, g=0)
    # Ventrículo derecho (abultamiento anterior)
    rv = sample_volume(lambda q: ((q[:, 0] + 0.018) ** 2 / 0.035 ** 2 + (q[:, 1] + 0.035) ** 2 / 0.05 ** 2
                                  + (q[:, 2] - 0.03) ** 2 / 0.022 ** 2) < 1,
                       [(-0.06, -0.09, 0.0), (0.02, 0.02, 0.06)], 26, seed=12, min_dist=0.008)
    p.cloud(rv, 0.014, MUSCLE, w=0.36, g=0)
    # Aurículas
    p.sphere((-0.03, 0.022, 0.005), 0.026, ATRIUM, 0.9, g=1)
    p.sphere((0.02, 0.026, -0.022), 0.023, ATRIUM, 0.9, g=1)
    p.sphere((0.04, 0.012, 0.022), 0.012, ATRIUM, 0.7, g=1)       # orejuela
    p.sphere((-0.045, 0.012, 0.02), 0.013, ATRIUM, 0.7, g=1)
    # Aorta
    p.tube([(0.0, 0.01, 0.0), (-0.004, 0.06, 0.004), (0.0, 0.095, -0.006), (0.024, 0.11, -0.03),
            (0.035, 0.08, -0.045), (0.035, 0.0, -0.045), (0.032, -0.12, -0.045)], 0.0135, AORTA, r1=0.011, g=2)
    for k, (x, z) in enumerate([(-0.004, -0.008), (0.012, -0.022), (0.026, -0.034)]):
        p.tube([(x, 0.10, z), (x * 1.3, 0.135, z), (x * 1.5 - 0.004, 0.17, z + 0.004)], 0.0055, AORTA,
               r1=0.004, g=2)
    # Tronco pulmonar
    p.tube([(-0.012, 0.0, 0.03), (-0.004, 0.05, 0.03), (0.01, 0.075, 0.012)], 0.012, VEIN, g=3)
    p.tube([(0.01, 0.075, 0.012), (0.04, 0.08, -0.0), (0.075, 0.07, -0.01)], 0.008, VEIN, r1=0.006, g=3)
    p.tube([(0.005, 0.075, 0.012), (-0.03, 0.085, -0.012), (-0.07, 0.075, -0.015)], 0.008, VEIN, r1=0.006, g=3)
    # Cavas
    p.tube([(-0.038, 0.02, 0.0), (-0.04, 0.08, -0.004), (-0.038, 0.14, -0.006)], 0.0115, VEIN, g=3)
    p.tube([(-0.034, 0.0, -0.01), (-0.032, -0.05, -0.02), (-0.03, -0.1, -0.025)], 0.012, VEIN, g=3)
    # Coronarias sobre la superficie
    def surf(a, ang, off=0.003):
        y = -a * 0.112
        prof = float(_prof(a)) + 0.004
        cx = 0.004 + 0.012 * a
        return (cx + (prof + 0.012 + off) * np.sin(ang), y, 0.004 + (prof + 0.012 + off) * np.cos(ang) / 1.15)

    rng = np.random.default_rng(4)
    def vessel(a0, a1, ang0, dang, r, col, n=10):
        pts = [surf(a, ang0 + dang * (a - a0) + 0.05 * np.sin(a * 17 + ang0)) for a in np.linspace(a0, a1, n)]
        p.tube(pts, r, col, r1=r * 0.5, g=4)
        return pts
    # Descendente anterior y ramas diagonales
    vessel(0.05, 0.97, 0.05, 0.35, 0.0022, CORONARY)
    for a0, d in [(0.25, 0.9), (0.45, 0.8), (0.65, 0.7), (0.35, -0.7)]:
        vessel(a0, a0 + 0.3, 0.05 + 0.35 * a0, d, 0.0014, CORONARY, 6)
    # Circunfleja / surco auriculoventricular
    p.tube([surf(0.06, t) for t in np.linspace(-1.5, 1.7, 12)], 0.0019, CORONARY, g=4)
    # Venas cardiacas
    vessel(0.1, 0.85, 0.75, 0.25, 0.0016, (0.35, 0.4, 0.95), 8)
    vessel(0.12, 0.8, -0.8, -0.2, 0.0016, (0.35, 0.4, 0.95), 8)
    return p.build()
