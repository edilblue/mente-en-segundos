"""Contenedor genérico para piezas anatómicas formadas por blobs."""
import numpy as np

from ..engine.blobs import tube_samples
from ..engine.mathx import catmull_rom


class Part:
    def __init__(self, name):
        self.name = name
        self._P, self._R, self._C, self._W, self._G = [], [], [], [], []

    def sphere(self, c, r, col, w=1.0, g=0):
        self._P.append(np.asarray(c, np.float32)[None])
        self._R.append(np.array([r], np.float32))
        self._C.append(np.asarray(col, np.float32)[None])
        self._W.append(np.array([w], np.float32))
        self._G.append(np.array([g], np.int32))

    def tube(self, pts, r0, col, r1=None, smooth=True, g=0, spacing=0.45, col1=None):
        path = catmull_rom(pts, 16) if (smooth and len(pts) > 2) else np.asarray(pts, np.float32)
        P, R, W, s = tube_samples(path, r0, spacing, r1)
        col = np.asarray(col, np.float32)
        C = np.repeat(col[None], len(P), 0) if col1 is None else \
            (col[None] * (1 - s[:, None]) + np.asarray(col1, np.float32)[None] * s[:, None])
        self._P.append(P)
        self._R.append(R)
        self._C.append(C.astype(np.float32))
        self._W.append(W)
        self._G.append(np.full(len(P), g, np.int32))
        return s

    def cloud(self, P, r, col, w=0.35, g=0):
        P = np.asarray(P, np.float32)
        self._P.append(P)
        self._R.append(np.broadcast_to(np.asarray(r, np.float32), (len(P),)).copy())
        col = np.asarray(col, np.float32)
        self._C.append(np.broadcast_to(col, (len(P), 3)).copy() if col.ndim == 1 else col)
        self._W.append(np.broadcast_to(np.asarray(w, np.float32), (len(P),)).copy())
        self._G.append(np.full(len(P), g, np.int32))

    def build(self):
        self.P = np.concatenate(self._P).astype(np.float32)
        self.R = np.concatenate(self._R).astype(np.float32)
        self.C = np.concatenate(self._C).astype(np.float32)
        self.W = np.concatenate(self._W).astype(np.float32)
        self.G = np.concatenate(self._G)
        self.Q = self.P.copy()
        return self


def sample_volume(inside_fn, bounds, n, seed=0, min_dist=None):
    """Muestreo por rechazo (con separación mínima opcional) dentro de un volumen."""
    rng = np.random.default_rng(seed)
    lo, hi = np.asarray(bounds[0], np.float32), np.asarray(bounds[1], np.float32)
    pts = []
    tries = 0
    while len(pts) < n and tries < 200:
        cand = rng.uniform(lo, hi, size=(4000, 3)).astype(np.float32)
        cand = cand[inside_fn(cand)]
        for c in cand:
            if min_dist is not None and pts:
                d = np.min(np.sum((np.asarray(pts) - c) ** 2, 1))
                if d < min_dist ** 2:
                    continue
            pts.append(c)
            if len(pts) >= n:
                break
        tries += 1
    return np.asarray(pts, np.float32)
