"""Utilidades matemáticas: easing, interpolación, rotaciones."""
import numpy as np


def clamp(x, a=0.0, b=1.0):
    return np.minimum(np.maximum(x, a), b)


def smoothstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0 + 1e-12))
    return t * t * (3 - 2 * t)


def smootherstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0 + 1e-12))
    return t * t * t * (t * (t * 6 - 15) + 10)


def lerp(a, b, t):
    return a + (b - a) * t


def ease_in_out(t):
    t = float(np.clip(t, 0, 1))
    return t * t * t * (t * (t * 6 - 15) + 10)


def ease_out(t):
    t = float(np.clip(t, 0, 1))
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = float(np.clip(t, 0, 1))
    return t ** 3


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], np.float32)


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], np.float32)


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], np.float32)


def normalize(v, axis=-1):
    return v / (np.linalg.norm(v, axis=axis, keepdims=True) + 1e-9)


class Keyframes:
    """Interpolación suave (smootherstep) entre keyframes (t, valor)."""

    def __init__(self, keys, ease=ease_in_out):
        self.keys = sorted(keys, key=lambda k: k[0])
        self.ease = ease

    def __call__(self, t):
        ks = self.keys
        if t <= ks[0][0]:
            return np.asarray(ks[0][1], np.float32)
        if t >= ks[-1][0]:
            return np.asarray(ks[-1][1], np.float32)
        for (t0, v0), (t1, v1) in zip(ks[:-1], ks[1:]):
            if t0 <= t <= t1:
                u = self.ease((t - t0) / max(t1 - t0, 1e-9))
                return np.asarray(v0, np.float32) * (1 - u) + np.asarray(v1, np.float32) * u
        return np.asarray(ks[-1][1], np.float32)


def catmull_rom(points, n_per_seg=20):
    """Curva suave que pasa por los puntos dados."""
    P = np.asarray(points, np.float32)
    P = np.vstack([P[0] * 2 - P[1], P, P[-1] * 2 - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        t = np.linspace(0, 1, n_per_seg, endpoint=False)[:, None]
        t2, t3 = t * t, t * t * t
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2][None])
    return np.vstack(out).astype(np.float32)


def resample_polyline(P, spacing):
    P = np.asarray(P, np.float32)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    L = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(L[-1] / spacing) + 1)
    s = np.linspace(0, L[-1], n)
    return np.stack([np.interp(s, L, P[:, k]) for k in range(3)], 1).astype(np.float32), s / max(L[-1], 1e-9)
