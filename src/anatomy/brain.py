"""Cerebro en coordenadas locales (centro del cerebro en el origen, z = frente).

Grupos: 0 cerebro, 1 cerebelo, 2 tronco encefálico.
"""
import numpy as np

from .model import Part, sample_volume

CORTEX = (0.93, 0.68, 0.70)
CEREBELLUM = (0.86, 0.58, 0.62)
STEM = (0.85, 0.62, 0.62)


def cerebrum_inside(p):
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    ok = np.zeros(len(p), bool)
    for sx in (-1, 1):
        # Hemisferio: elipsoide más ancho atrás, frente redondeada
        cx = 0.036 * sx
        rx = 0.037 * (1 + 0.08 * np.clip(-z / 0.08, 0, 1))
        ry = 0.056 - 0.01 * np.clip(-z / 0.08, 0, 1)
        e = ((x - cx) / rx) ** 2 + ((y - 0.006) / ry) ** 2 + (z / 0.084) ** 2
        lobe = ((x - 0.048 * sx) / 0.024) ** 2 + ((y + 0.028) / 0.02) ** 2 + ((z - 0.012) / 0.04) ** 2
        ok |= ((e < 1) & (y > -0.028)) | (lobe < 1)
    ok &= np.abs(x) > 0.0025
    return ok


def build_brain():
    p = Part("brain")
    C = sample_volume(cerebrum_inside, [(-0.08, -0.05, -0.09), (0.08, 0.07, 0.09)], 360, seed=21,
                      min_dist=0.0105)
    # Separar ligeramente los hemisferios para la cisura longitudinal
    C[:, 0] += np.sign(C[:, 0]) * 0.003
    p.cloud(C, 0.0145, CORTEX, w=0.4, g=0)
    cb = sample_volume(lambda q: ((q[:, 0] / 0.05) ** 2 + ((q[:, 1] + 0.046) / 0.02) ** 2
                                  + ((q[:, 2] + 0.054) / 0.026) ** 2) < 1,
                       [(-0.06, -0.07, -0.085), (0.06, -0.02, -0.02)], 50, seed=22, min_dist=0.009)
    p.cloud(cb, 0.0115, CEREBELLUM, w=0.42, g=1)
    p.tube([(0, -0.02, -0.018), (0, -0.06, -0.028), (0, -0.1, -0.03)], 0.0125, STEM, r1=0.0095, g=2)
    return p.build()


def build_brain_arteries():
    """Arterias superficiales (cerebral media) sobre el cerebro."""
    p = Part("brain_art")
    rng = np.random.default_rng(5)
    col = (1.0, 0.18, 0.16)
    for sx in (-1, 1):
        # Desde la base hacia arriba por la cisura lateral, con ramas
        trunk = [(0.02 * sx, -0.035, 0.015), (0.05 * sx, -0.022, 0.012), (0.066 * sx, -0.005, 0.0)]
        p.tube(trunk, 0.0026, col, r1=0.0022)
        for k in range(6):
            ang = -1.2 + k * 0.5
            pts = [(0.066 * sx, -0.005, 0.0)]
            for j in range(1, 5):
                t = j / 4
                zz = 0.07 * t * np.sin(ang) + rng.normal(0, 0.003)
                yy = -0.005 + 0.05 * t * np.cos(ang) * 0.9 + rng.normal(0, 0.003)
                # proyectar sobre el elipsoide aproximado
                xx = sx * (0.036 + 0.037 * np.sqrt(max(1 - ((yy - 0.006) / 0.056) ** 2 - (zz / 0.084) ** 2, 0.02)) + 0.002)
                pts.append((xx, yy, zz))
            p.tube(pts, 0.0019, col, r1=0.0011)
    return p.build()
