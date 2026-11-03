"""Post-procesado cinematográfico: bloom, tonemapping, gradación de color,
aberración cromática, viñeta, grano y efectos de transición."""
import numpy as np
import cv2

from .. import config as C


def bloom(frame, threshold=0.75, strength=0.65):
    h, w = frame.shape[:2]
    br = np.maximum(frame - threshold, 0)
    small = cv2.resize(br, (w // 4, h // 4), interpolation=cv2.INTER_AREA)
    acc = cv2.GaussianBlur(small, (0, 0), 3) * 0.5 + cv2.GaussianBlur(small, (0, 0), 9) * 0.35 \
        + cv2.GaussianBlur(small, (0, 0), 24) * 0.3
    return frame + cv2.resize(acc, (w, h), interpolation=cv2.INTER_LINEAR) * strength


def zoom_blur(frame, amount, center=None, n=8):
    if amount <= 0.002:
        return frame
    h, w = frame.shape[:2]
    cx, cy = center or (w / 2, h / 2)
    acc = frame.copy()
    for k in range(1, n + 1):
        s = 1 + amount * k / n
        M = np.array([[s, 0, cx * (1 - s)], [0, s, cy * (1 - s)]], np.float32)
        acc += cv2.warpAffine(frame, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / (n + 1)


def motion_blur(frame, dx, dy):
    L = float(np.hypot(dx, dy))
    if L < 2.0:
        return frame
    L = min(L, 120)
    k = int(L) | 1
    ker = np.zeros((k, k), np.float32)
    c = k // 2
    ux, uy = dx / np.hypot(dx, dy), dy / np.hypot(dx, dy)
    for i in range(k):
        o = i - c
        x, y = int(round(c + ux * o)), int(round(c + uy * o))
        ker[y, x] = 1
    ker /= ker.sum()
    return cv2.filter2D(frame, -1, ker, borderType=cv2.BORDER_REFLECT)


def tonemap(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)


_vig = {}


def grade(frame, exposure=1.15, contrast=1.06, sat=1.12):
    h, w = frame.shape[:2]
    if (h, w) not in _vig:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        r2 = ((xx - w / 2) / (w / 2)) ** 2 * 0.8 + ((yy - h / 2) / (h / 2)) ** 2 * 0.6
        _vig[(h, w)] = np.clip(1 - 0.42 * r2 ** 1.3, 0.25, 1)[..., None].astype(np.float32)
    x = tonemap(frame * exposure)
    lum = x @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    x = lum[..., None] + (x - lum[..., None]) * sat
    # sombras teal, altas luces cálidas
    sh = (1 - lum)[..., None] ** 2
    x = x + sh * np.array([-0.01, 0.012, 0.025], np.float32) + (lum[..., None] ** 2) * np.array([0.02, 0.005, -0.015], np.float32)
    x = (x - 0.5) * contrast + 0.5
    x = x * _vig[(h, w)]
    return np.clip(x, 0, 1)


def chroma_aberration(img_u8, amt=0.0025):
    h, w = img_u8.shape[:2]
    out = img_u8.copy()
    for ch, s in ((0, 1 + amt), (2, 1 - amt)):
        M = np.array([[s, 0, w / 2 * (1 - s)], [0, s, h / 2 * (1 - s)]], np.float32)
        out[..., ch] = cv2.warpAffine(img_u8[..., ch], M, (w, h), flags=cv2.INTER_LINEAR,
                                      borderMode=cv2.BORDER_REPLICATE)
    return out


_grain = None


def grain(img_u8, t, amount=5):
    global _grain
    h, w = img_u8.shape[:2]
    if _grain is None:
        rng = np.random.default_rng(1)
        _grain = [rng.normal(0, amount, (h // 2, w // 2)).astype(np.int16) for _ in range(6)]
    g = _grain[int(t * C.FPS) % len(_grain)]
    g = cv2.resize(g.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR).astype(np.int16)
    return np.clip(img_u8.astype(np.int16) + g[..., None], 0, 255).astype(np.uint8)


def finish(frame_render, t, flash=0.0, flash_col=(1.0, 0.9, 0.85)):
    """frame de render (float, RW x RH, lineal) -> uint8 BGR->RGB a W x H."""
    f = bloom(frame_render)
    if flash > 0:
        f = f + np.asarray(flash_col, np.float32) * flash * 2.0
    f = grade(f)
    u8 = (f * 255 + 0.5).astype(np.uint8)
    up = cv2.resize(u8, (C.W, C.H), interpolation=cv2.INTER_CUBIC)
    up = chroma_aberration(up)
    return up
