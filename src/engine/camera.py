"""Cámara de perspectiva con look-at."""
import numpy as np
from .mathx import normalize


class Camera:
    def __init__(self, eye, target, fov_deg=35.0, width=720, height=1280, roll=0.0, near=0.02):
        self.eye = np.asarray(eye, np.float32)
        self.target = np.asarray(target, np.float32)
        self.w, self.h = width, height
        self.near = near
        f = normalize(self.target - self.eye)
        up = np.array([np.sin(roll), np.cos(roll), 0.0], np.float32)
        r = normalize(np.cross(f, up))
        u = np.cross(r, f)
        # Base de cámara: x derecha, y arriba, z hacia delante (profundidad positiva)
        self.R = np.stack([r, u, f]).astype(np.float32)
        self.fpx = 0.5 * height / np.tan(np.radians(fov_deg) / 2)
        self.cx, self.cy = width / 2, height / 2

    def to_cam(self, P):
        return (np.asarray(P, np.float32) - self.eye) @ self.R.T

    def project(self, P, R=None):
        """Devuelve x, y (píxeles), z (profundidad) y radio proyectado."""
        Pc = self.to_cam(P)
        z = np.maximum(Pc[..., 2], 1e-4)
        x = self.cx + self.fpx * Pc[..., 0] / z
        y = self.cy - self.fpx * Pc[..., 1] / z
        rp = None if R is None else self.fpx * np.asarray(R, np.float32) / z
        return x, y, Pc[..., 2], rp

    def dir_to_cam(self, d):
        return np.asarray(d, np.float32) @ self.R.T
