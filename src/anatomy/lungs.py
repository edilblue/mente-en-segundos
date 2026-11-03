"""Pulmones con árbol bronquial."""
import numpy as np

from .model import Part, sample_volume

LUNG_COL = (0.98, 0.50, 0.55)
BRONCH_COL = (0.98, 0.86, 0.82)
LUNG_TOP, LUNG_BASE = 1.455, 1.175


def lung_inside(side):
    cx = 0.078 * side
    prof_u = np.array([0.0, 0.25, 0.55, 0.8, 0.95, 1.0])
    prof_w = np.array([0.92, 1.0, 0.9, 0.62, 0.32, 0.08])

    def f(p):
        u = (p[:, 1] - LUNG_BASE) / (LUNG_TOP - LUNG_BASE)
        w = np.interp(u, prof_u, prof_w)
        dx = (p[:, 0] - cx) * side  # >0 lateral, <0 medial
        wx = np.where(dx > 0, 0.062, 0.042) * w
        wz = 0.072 * w
        dz = p[:, 2] + 0.005
        rr = (dx / (wx + 1e-6)) ** 2 + (dz / (wz + 1e-6)) ** 2
        dome = LUNG_BASE + 0.045 * np.clip(1 - rr, 0, 1) - 0.02 * (dz / 0.07)
        ok = (rr < 1) & (u <= 1) & (p[:, 1] > dome)
        if side > 0:  # muesca cardiaca del pulmón izquierdo
            notch = ((p[:, 0] - 0.035) ** 2 / 0.03 ** 2 + (p[:, 1] - 1.255) ** 2 / 0.06 ** 2
                     + (p[:, 2] - 0.06) ** 2 / 0.06 ** 2) < 1
            ok &= ~notch
        return ok
    return f


def build_lungs():
    p = Part("lungs")
    for gi, side in enumerate((-1, 1)):
        pts = sample_volume(lung_inside(side), [(-0.16, LUNG_BASE - 0.01, -0.09), (0.16, LUNG_TOP, 0.09)],
                            170, seed=3 + gi, min_dist=0.016)
        p.cloud(pts, 0.024, LUNG_COL, w=0.42, g=gi)
    return p.build()


def build_bronchi(seed=7):
    rng = np.random.default_rng(seed)
    p = Part("bronchi")
    # Tráquea
    p.tube([(0, 1.56, 0.03), (0, 1.48, 0.02), (0, 1.415, 0.01)], 0.0095, BRONCH_COL, g=0)
    insides = {-1: lung_inside(-1), 1: lung_inside(1)}

    paths = []
    trachea = [np.array(q, np.float32) for q in [(0, 1.60, 0.03), (0, 1.56, 0.03), (0, 1.48, 0.02), (0, 1.415, 0.01)]]

    def branch(start, d, length, r, depth, side, hist=None):
        hist = (hist or trachea)
        d = d / np.linalg.norm(d)
        pts = [start]
        cur = np.array(start, np.float32)
        for k in range(4):
            cur = cur + d * length / 4 + rng.normal(0, 0.003, 3)
            pts.append(cur.copy())
        p.tube(pts, r, BRONCH_COL, r1=r * 0.75, g=1 + depth)
        hist = hist + [np.asarray(q, np.float32) for q in pts[1:]]
        if depth >= 4:
            paths.append(np.array(hist, np.float32))
            return
        for k in range(2):
            nd = d + rng.normal(0, 0.55, 3)
            nd[1] -= 0.25
            nd[0] += 0.2 * side
            nd /= np.linalg.norm(nd)
            end = cur + nd * length * 0.72
            if not insides[side](end[None])[0] and depth > 0:
                nd = d + rng.normal(0, 0.3, 3)
                nd /= np.linalg.norm(nd)
            branch(cur, nd, length * 0.72, r * 0.72, depth + 1, side, hist)

    for side in (-1, 1):
        branch(np.array([0, 1.415, 0.01], np.float32), np.array([side * 0.9, -0.55, -0.05], np.float32),
               0.05, 0.0068, 0, side)
    p.build()
    p.paths = paths
    return p
