"""Renderizador de superficies orgánicas implícitas ("metaballs" gaussianas).

Cada órgano se describe como una nube de esferas 3D (centro, radio, color,
coordenada de textura). En pantalla se acumula un campo gaussiano; la
iso-superficie F = T define la silueta y a partir del campo se reconstruye
una altura h (equivalente exacto a una esfera para un blob aislado):

    h = r * sqrt(ln(F / T))

Con h se obtienen normales, y con ellas iluminación Phong, fresnel,
subsurface scattering aproximado, oclusión ambiental y texturas 3D
procedurales que se "pegan" al objeto (se evalúan en coordenadas de objeto
interpoladas por píxel).
"""
import numpy as np
import cv2

from .mathx import normalize

T_ISO = float(np.exp(-1.0))
KEY_L = normalize(np.array([-0.45, 0.60, 0.66], np.float32))
FILL_L = normalize(np.array([0.70, -0.25, 0.45], np.float32))
HALF_KEY = normalize(KEY_L + np.array([0, 0, 1], np.float32))


class Material:
    def __init__(self, ambient=0.28, diffuse=0.85, specular=0.35, shininess=28.0,
                 rim_color=(0.35, 0.75, 1.0), rim_strength=0.55, rim_power=2.6,
                 sss_color=(1.0, 0.25, 0.2), sss=0.35, ao=0.8, opacity=1.0,
                 glass=None, bump=0.0, emissive=(1.0, 0.4, 0.3),
                 key_color=(1.0, 0.95, 0.9), fill_color=(0.35, 0.5, 0.9)):
        self.ambient = ambient
        self.diffuse = diffuse
        self.specular = specular
        self.shininess = shininess
        self.rim_color = np.array(rim_color, np.float32)
        self.rim_strength = rim_strength
        self.rim_power = rim_power
        self.sss_color = np.array(sss_color, np.float32)
        self.sss = sss
        self.ao = ao
        self.opacity = opacity
        self.glass = glass          # None (opaco) o opacidad base del interior
        self.bump = bump
        self.emissive = np.array(emissive, np.float32)
        self.key_color = np.array(key_color, np.float32)
        self.fill_color = np.array(fill_color, np.float32)

    def copy(self, **kw):
        m = Material.__new__(Material)
        m.__dict__ = {k: (v.copy() if isinstance(v, np.ndarray) else v) for k, v in self.__dict__.items()}
        for k, v in kw.items():
            setattr(m, k, np.array(v, np.float32) if isinstance(v, (tuple, list)) else v)
        return m


class Layer:
    """Resultado de render de una capa: región, color (no premultiplicado) y alfa."""

    def __init__(self, x0, y0, rgb, alpha, add=None):
        self.x0, self.y0 = x0, y0
        self.rgb, self.alpha, self.add = rgb, alpha, add

    def composite(self, frame, opacity=1.0):
        h, w = self.alpha.shape
        reg = frame[self.y0:self.y0 + h, self.x0:self.x0 + w]
        a = (self.alpha * opacity)[..., None]
        reg *= (1 - a)
        reg += self.rgb * a
        if self.add is not None:
            reg += self.add * opacity
        return frame


def render_blobs(cam, P, R, C, Q=None, E=None, W=None, mat=None, texture=None,
                 depth_bias=1.6, K=2.8, min_px=0.6, shade_scale=1.0):
    """Renderiza una nube de blobs. Devuelve Layer o None."""
    mat = mat or Material()
    P = np.asarray(P, np.float32)
    n = len(P)
    if n == 0:
        return None
    R = np.broadcast_to(np.asarray(R, np.float32), (n,))
    C = np.broadcast_to(np.asarray(C, np.float32), (n, 3))
    Q = P if Q is None else np.asarray(Q, np.float32)
    E = np.zeros(n, np.float32) if E is None else np.broadcast_to(np.asarray(E, np.float32), (n,))
    W = np.ones(n, np.float32) if W is None else np.broadcast_to(np.asarray(W, np.float32), (n,))

    x, y, z, rp = cam.project(P, R)
    vis = (z > cam.near + R * 0.5) & (rp > 0.15) & (x + K * rp > 0) & (x - K * rp < cam.w) \
        & (y + K * rp > 0) & (y - K * rp < cam.h) & (W > 1e-4)
    if not np.any(vis):
        return None
    idx = np.nonzero(vis)[0]
    # Ordenar de atrás hacia delante no es necesario para el campo, pero sí
    # útil para el peso de atributos (la cara frontal domina).
    x, y, z, rp, Rw = x[idx], y[idx], z[idx], np.maximum(rp[idx], min_px), R[idx]
    C, Q, E, W = C[idx], Q[idx], E[idx], W[idx]

    bx0 = int(max(0, np.floor(np.min(x - K * rp))))
    by0 = int(max(0, np.floor(np.min(y - K * rp))))
    bx1 = int(min(cam.w, np.ceil(np.max(x + K * rp))))
    by1 = int(min(cam.h, np.ceil(np.max(y + K * rp))))
    bw, bh = bx1 - bx0, by1 - by0
    if bw < 2 or bh < 2:
        return None

    # Escala de acumulación: los campos son suaves, se acumulan a baja resolución.
    s = int(np.clip(np.percentile(rp, 30) / 4.0, 1, 8))
    lw, lh = bw // s + 2, bh // s + 2
    F = np.zeros((lh, lw), np.float32)
    Wa = np.zeros((lh, lw), np.float32)
    Rs = np.zeros((lh, lw), np.float32)
    A = np.zeros((lh, lw, 8), np.float32)

    xl = (x - bx0) / s
    yl = (y - by0) / s
    rl = np.maximum(rp / s, 0.55)
    wamp = W * (rp / s / rl) ** 2  # conservar masa en blobs muy pequeños
    zmin = float(np.min(z))
    aw = np.exp(-np.minimum((z - zmin) / np.maximum(Rw, 1e-4) * depth_bias, 6.0)).astype(np.float32)
    attrs = np.concatenate([C, Q, rp[:, None], E[:, None]], 1).astype(np.float32)

    for i in range(len(xl)):
        r = rl[i]
        ix0 = max(0, int(xl[i] - K * r))
        ix1 = min(lw, int(xl[i] + K * r) + 2)
        iy0 = max(0, int(yl[i] - K * r))
        iy1 = min(lh, int(yl[i] + K * r) + 2)
        if ix1 <= ix0 or iy1 <= iy0:
            continue
        ex = np.exp(-((np.arange(ix0, ix1, dtype=np.float32) - xl[i]) / r) ** 2)
        ey = np.exp(-((np.arange(iy0, iy1, dtype=np.float32) - yl[i]) / r) ** 2) * wamp[i]
        g = np.outer(ey, ex)
        F[iy0:iy1, ix0:ix1] += g
        Rs[iy0:iy1, ix0:ix1] += g * rp[i]
        ga = g * g * aw[i]
        Wa[iy0:iy1, ix0:ix1] += ga
        A[iy0:iy1, ix0:ix1] += ga[..., None] * attrs[i]

    A /= np.maximum(Wa, 1e-36)[..., None]
    A[..., 6] = Rs / np.maximum(F, 1e-30)
    A[..., 6][F < 1e-6] = float(np.median(rp))

    # Oclusión ambiental a baja resolución
    lnl = np.log(np.maximum(F, 1e-30) / T_ISO)
    hl = A[..., 6] / s * np.sqrt(np.maximum(lnl, 0))
    rmed = max(float(np.median(rl)), 1.0)
    hb = cv2.GaussianBlur(hl, (0, 0), rmed * 0.9)
    aol = np.clip(1.0 - mat.ao * np.maximum(hb - hl, 0) / rmed * 1.6, 0.25, 1.0)

    # Subir a resolución de render
    def up(a, interp=cv2.INTER_CUBIC):
        u = cv2.resize(a, (lw * s, lh * s), interpolation=interp)
        return u[:bh, :bw]

    if s > 1:
        sig = 0.55 * s
        Ff = np.maximum(cv2.GaussianBlur(up(F, cv2.INTER_LINEAR), (0, 0), sig), 1e-30)
        Af = up(A, cv2.INTER_LINEAR)
        Af[..., :4] = cv2.GaussianBlur(np.ascontiguousarray(Af[..., :4]), (0, 0), sig)
        Af[..., 4:] = cv2.GaussianBlur(np.ascontiguousarray(Af[..., 4:]), (0, 0), sig)
        Af[..., 6] = np.maximum(Af[..., 6], 0.5)
        ao = up(aol, cv2.INTER_LINEAR)
    else:
        Ff = np.maximum(F[:bh, :bw], 1e-30)
        Af = A[:bh, :bw]
        ao = aol[:bh, :bw]

    lnF = np.log(Ff / T_ISO)
    alpha = np.clip(lnF * np.maximum(Af[..., 6], 1.0) * 0.5 + 0.5, 0, 1) * (lnF > -2.0)
    ys, xs = np.nonzero(alpha > 0.002)
    if len(ys) == 0:
        return None
    # Recorte al contenido real
    cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    cy0, cx0 = max(cy0 - 1, 0), max(cx0 - 1, 0)
    cy1, cx1 = min(cy1 + 1, bh), min(cx1 + 1, bw)
    lnF, Af, ao, alpha = lnF[cy0:cy1, cx0:cx1], Af[cy0:cy1, cx0:cx1], ao[cy0:cy1, cx0:cx1], alpha[cy0:cy1, cx0:cx1]
    rloc = np.maximum(Af[..., 6], 0.5)
    h = rloc * np.sqrt(np.maximum(lnF, 0))

    base = Af[..., 0:3]
    emis = Af[..., 7]
    extra = None
    if texture is not None:
        out = texture(Af[..., 3], Af[..., 4], Af[..., 5], base, h / rloc)
        base, bump = out[0], out[1]
        extra = out[2] if len(out) > 2 else None
        if bump is not None and mat.bump:
            h = h + mat.bump * rloc * bump * np.clip(lnF * 3, 0, 1)

    h = h.astype(np.float32)
    gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3) * (0.125 * shade_scale)
    gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3) * (0.125 * shade_scale)
    inv = 1.0 / np.sqrt(gx * gx + gy * gy + 1.0)
    nx, ny, nz = -gx * inv, gy * inv, inv

    ndl = np.maximum(nx * KEY_L[0] + ny * KEY_L[1] + nz * KEY_L[2], 0)
    ndf = np.maximum(nx * FILL_L[0] + ny * FILL_L[1] + nz * FILL_L[2], 0)
    ndh = np.maximum(nx * HALF_KEY[0] + ny * HALF_KEY[1] + nz * HALF_KEY[2], 0)
    fres = (1.0 - nz) ** mat.rim_power
    thick = np.clip(h / rloc, 0, 1)

    light = (mat.ambient + mat.diffuse * ndl[..., None] * mat.key_color
             + 0.45 * ndf[..., None] * mat.fill_color) * ao[..., None]
    rgb = base * light
    rgb += (mat.specular * ndh ** mat.shininess * ao)[..., None]
    rgb += (mat.rim_strength * fres)[..., None] * mat.rim_color
    rgb += (mat.sss * (1 - thick) ** 2)[..., None] * mat.sss_color * base
    rgb += emis[..., None] * mat.emissive
    if extra is not None:
        rgb += extra

    if mat.glass is not None:
        a = alpha * np.clip(mat.glass + (1 - mat.glass) * fres * 1.2, 0, 1) * mat.opacity
    else:
        a = alpha * mat.opacity
    return Layer(bx0 + cx0, by0 + cy0, rgb.astype(np.float32), a.astype(np.float32))


def tube_samples(path, radius, spacing_frac=0.45, r_end=None):
    """Muestras de blobs a lo largo de un camino (tubo). Devuelve P, R, W, s."""
    from .mathx import resample_polyline
    r0 = radius
    r1 = radius if r_end is None else r_end
    sp = min(r0, r1) * spacing_frac
    P, s = resample_polyline(path, sp)
    R = (r0 + (r1 - r0) * s).astype(np.float32)
    # Peso para que el tubo continuo tenga superficie ~ a distancia R
    W = (sp / (R * np.sqrt(np.pi))).astype(np.float32)
    # Con este peso el campo de la línea es exp(-d²/R²) => superficie en d = R
    return P, R, W, s
