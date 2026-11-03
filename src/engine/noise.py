"""Ruido procedural 3D rápido (suma de ondas en direcciones aleatorias)."""
import numpy as np


class WaveNoise:
    def __init__(self, n_waves=7, seed=0):
        rng = np.random.default_rng(seed)
        d = rng.normal(size=(n_waves, 3))
        self.dirs = (d / np.linalg.norm(d, axis=1, keepdims=True)).astype(np.float32)
        self.phase = rng.uniform(0, 2 * np.pi, n_waves).astype(np.float32)
        self.freqs = rng.uniform(0.8, 1.25, n_waves).astype(np.float32)
        self.n = n_waves

    def __call__(self, x, y, z, freq=1.0):
        acc = np.zeros_like(x, dtype=np.float32)
        for i in range(self.n):
            d = self.dirs[i] * (freq * self.freqs[i])
            acc += np.sin(x * d[0] + y * d[1] + z * d[2] + self.phase[i])
        return acc * (1.0 / np.sqrt(self.n))  # ~[-1.5, 1.5]


def fbm(noises, x, y, z, freq, octaves=3, lac=2.03, gain=0.5):
    acc = np.zeros_like(x, dtype=np.float32)
    amp = 1.0
    norm = 0.0
    for o in range(octaves):
        acc += amp * noises[o % len(noises)](x, y, z, freq)
        norm += amp
        freq *= lac
        amp *= gain
    return acc / norm


class Perlin3D:
    """Ruido de gradiente (Perlin) 3D vectorizado, periódico en una red de tamaño N."""

    def __init__(self, seed=0, N=64):
        rng = np.random.default_rng(seed)
        g = rng.normal(size=(N, N, N, 3)).astype(np.float32)
        self.g = g / np.linalg.norm(g, axis=-1, keepdims=True)
        self.N = N
        self.gf = self.g.reshape(-1, 3)

    def __call__(self, x, y, z, freq=1.0):
        x = x * freq
        y = y * freq
        z = z * freq
        xi = np.floor(x)
        yi = np.floor(y)
        zi = np.floor(z)
        fx, fy, fz = (x - xi).astype(np.float32), (y - yi).astype(np.float32), (z - zi).astype(np.float32)
        N = self.N
        xi = xi.astype(np.int32) % N
        yi = yi.astype(np.int32) % N
        zi = zi.astype(np.int32) % N
        ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
        uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
        uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10)
        g = self.gf
        N2 = N * N
        bx0, bx1 = xi * N2, ((xi + 1) % N) * N2
        by0, by1 = yi * N, ((yi + 1) % N) * N
        bz0, bz1 = zi, (zi + 1) % N
        fx1, fy1, fz1 = fx - 1, fy - 1, fz - 1

        def corner(ix, iy, iz, ox, oy, oz):
            gg = g[ix + iy + iz]
            return gg[..., 0] * ox + gg[..., 1] * oy + gg[..., 2] * oz

        c000 = corner(bx0, by0, bz0, fx, fy, fz)
        c100 = corner(bx1, by0, bz0, fx1, fy, fz)
        c010 = corner(bx0, by1, bz0, fx, fy1, fz)
        c110 = corner(bx1, by1, bz0, fx1, fy1, fz)
        c001 = corner(bx0, by0, bz1, fx, fy, fz1)
        c101 = corner(bx1, by0, bz1, fx1, fy, fz1)
        c011 = corner(bx0, by1, bz1, fx, fy1, fz1)
        c111 = corner(bx1, by1, bz1, fx1, fy1, fz1)
        x00 = c000 + ux * (c100 - c000)
        x10 = c010 + ux * (c110 - c010)
        x01 = c001 + ux * (c101 - c001)
        x11 = c011 + ux * (c111 - c011)
        y0 = x00 + uy * (x10 - x00)
        y1 = x01 + uy * (x11 - x01)
        return ((y0 + uz * (y1 - y0)) * 1.6).astype(np.float32)  # ~[-1, 1]


def eval_lowres(fn, qx, qy, qz, factor=2):
    """Evalúa un campo de ruido suave a menor resolución y lo reescala (bicúbico)."""
    import cv2
    h, w = qx.shape
    if factor <= 1 or h < 8 or w < 8:
        return fn(qx, qy, qz)
    sw, sh = max(w // factor, 2), max(h // factor, 2)
    small = [cv2.resize(np.ascontiguousarray(q), (sw, sh), interpolation=cv2.INTER_AREA) for q in (qx, qy, qz)]
    v = fn(*small).astype(np.float32)
    return cv2.resize(v, (w, h), interpolation=cv2.INTER_CUBIC)
