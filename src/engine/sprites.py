"""Sprites sombreados (esferas, brillos) para partículas y moléculas."""
import numpy as np
import cv2

from .blobs import KEY_L, HALF_KEY

_SPH = 96


def _make_sphere(n=_SPH):
    c = (n - 1) / 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    x = (xx - c) / c
    y = -(yy - c) / c
    r2 = x * x + y * y
    a = np.clip((1 - np.sqrt(r2)) * c * 0.9, 0, 1)
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    ndl = np.clip(x * KEY_L[0] + y * KEY_L[1] + z * KEY_L[2], 0, 1)
    ndh = np.clip(x * HALF_KEY[0] + y * HALF_KEY[1] + z * HALF_KEY[2], 0, 1)
    diff = 0.25 + 0.85 * ndl
    spec = ndh ** 40 * 0.9
    rim = (1 - z) ** 3
    return diff.astype(np.float32), spec.astype(np.float32), rim.astype(np.float32), a.astype(np.float32)


def _make_glow(n=64):
    c = (n - 1) / 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    r2 = ((xx - c) ** 2 + (yy - c) ** 2) / (c * c)
    return (np.exp(-r2 * 4.5) + 0.25 * np.exp(-r2 * 1.2) * (r2 < 1)).astype(np.float32)


SPH_DIFF, SPH_SPEC, SPH_RIM, SPH_A = _make_sphere()
GLOW = _make_glow()
_cache = {}


def _resized(key, arr, d):
    k = (key, d)
    v = _cache.get(k)
    if v is None:
        v = cv2.resize(arr, (d, d), interpolation=cv2.INTER_AREA if d < arr.shape[0] else cv2.INTER_LINEAR)
        if len(_cache) > 4000:
            _cache.clear()
        _cache[k] = v
    return v


def _region(frame, x, y, d):
    h, w = frame.shape[:2]
    x0 = int(round(x - d / 2))
    y0 = int(round(y - d / 2))
    x1, y1 = x0 + d, y0 + d
    cx0, cy0 = max(x0, 0), max(y0, 0)
    cx1, cy1 = min(x1, w), min(y1, h)
    if cx1 <= cx0 or cy1 <= cy0:
        return None
    return (cy0, cy1, cx0, cx1), (cy0 - y0, cy1 - y0, cx0 - x0, cx1 - x0)


def draw_sphere(frame, x, y, radius, color, alpha=1.0, emissive=0.0, rim_color=(0.6, 0.9, 1.0)):
    d = int(max(3, round(radius * 2)))
    if d > 600:
        return
    reg = _region(frame, x, y, d)
    if reg is None:
        return
    (a0, a1, b0, b1), (s0, s1, t0, t1) = reg
    diff = _resized("d", SPH_DIFF, d)[s0:s1, t0:t1]
    spec = _resized("s", SPH_SPEC, d)[s0:s1, t0:t1]
    rim = _resized("r", SPH_RIM, d)[s0:s1, t0:t1]
    al = _resized("a", SPH_A, d)[s0:s1, t0:t1] * alpha
    col = np.asarray(color, np.float32)
    rgb = diff[..., None] * col + spec[..., None] + rim[..., None] * np.asarray(rim_color, np.float32) * 0.6 \
        + emissive * col
    dst = frame[a0:a1, b0:b1]
    dst *= (1 - al[..., None])
    dst += rgb * al[..., None]


def draw_glow(frame, x, y, radius, color, intensity=1.0):
    d = int(max(3, round(radius * 2)))
    if d > 900:
        return
    reg = _region(frame, x, y, d)
    if reg is None:
        return
    (a0, a1, b0, b1), (s0, s1, t0, t1) = reg
    g = _resized("g", GLOW, d)[s0:s1, t0:t1]
    frame[a0:a1, b0:b1] += g[..., None] * (np.asarray(color, np.float32) * intensity)


def draw_molecule(frame, cam, center, kind, scale, rot, alpha=1.0, glow=1.0):
    """O2: dos esferas cian brillantes. CO2: carbono gris + dos oxígenos ámbar."""
    from .mathx import rot_y, rot_x
    R = rot_y(rot) @ rot_x(rot * 0.7)
    if kind == "o2":
        offs = np.array([[-0.55, 0, 0], [0.55, 0, 0]], np.float32)
        cols = [(0.45, 0.9, 1.0), (0.45, 0.9, 1.0)]
        rads = [0.62, 0.62]
        gc = (0.2, 0.7, 1.0)
    else:
        offs = np.array([[-0.95, 0, 0], [0, 0, 0], [0.95, 0, 0]], np.float32)
        cols = [(1.0, 0.55, 0.15), (0.35, 0.35, 0.38), (1.0, 0.55, 0.15)]
        rads = [0.55, 0.6, 0.55]
        gc = (1.0, 0.45, 0.1)
    P = np.asarray(center, np.float32)[None] + (offs @ R.T) * scale
    x, y, z, rp = cam.project(P, np.array(rads, np.float32) * scale)
    if np.any(z <= cam.near):
        return
    cx, cy, _, rr = cam.project(np.asarray(center, np.float32)[None], np.array([scale * 2.2], np.float32))
    draw_glow(frame, cx[0], cy[0], rr[0] * 1.6, gc, 0.35 * glow * alpha)
    for i in np.argsort(-z):
        draw_sphere(frame, x[i], y[i], rp[i], cols[i], alpha, emissive=0.35 * glow)
