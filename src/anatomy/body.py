"""Cuerpo humano estilizado: piel, esqueleto torácico y sistema vascular.

Unidades en metros. Origen entre los pies, y hacia arriba, z hacia la cámara.
La izquierda del paciente es +x (derecha de la pantalla).
"""
import numpy as np

from .model import Part

SKIN = (0.55, 0.8, 1.0)


def build_skin():
    p = Part("skin")
    c = SKIN
    # Cabeza
    p.sphere((0, 1.635, 0.0), 0.088, c)
    p.sphere((0, 1.655, -0.018), 0.083, c, 0.8)
    p.sphere((0, 1.575, 0.022), 0.058, c, 0.7)       # mandíbula
    p.sphere((0, 1.605, 0.072), 0.022, c, 0.5)       # nariz
    # Cuello y trapecios
    p.tube([(0, 1.44, -0.01), (0, 1.56, 0.0)], 0.052, c)
    for sx in (-1, 1):
        p.tube([(0.03 * sx, 1.47, -0.02), (0.13 * sx, 1.44, -0.02), (0.19 * sx, 1.425, -0.01)], 0.05, c)
    # Torso como pila de cápsulas horizontales
    prof = [(0.90, 0.150, 0.100), (0.98, 0.160, 0.100), (1.06, 0.140, 0.092), (1.12, 0.132, 0.095),
            (1.20, 0.142, 0.105), (1.28, 0.158, 0.112), (1.36, 0.168, 0.112), (1.42, 0.165, 0.100),
            (1.45, 0.140, 0.080)]
    ys = np.arange(0.90, 1.455, 0.032)
    py = np.array([q[0] for q in prof])
    for y in ys:
        wx = np.interp(y, py, [q[1] for q in prof])
        rz = np.interp(y, py, [q[2] for q in prof])
        zc = 0.012 if y > 1.15 else 0.0
        sp = rz * 0.45
        xs = np.arange(-wx + rz, wx - rz + 1e-6, sp)
        if len(xs) == 0:
            xs = np.array([0.0])
        w = (sp * 0.032) / (np.pi * rz * rz)
        for x in xs:
            p.sphere((x, y, zc), rz, c, w)
    # Pecho (pectorales) y abdomen
    for sx in (-1, 1):
        p.sphere((0.075 * sx, 1.33, 0.06), 0.07, c, 0.45)
    # Brazos (pose en A)
    for sx in (-1, 1):
        p.tube([(0.185 * sx, 1.415, 0), (0.235 * sx, 1.25, -0.005), (0.27 * sx, 1.12, -0.005)], 0.046, c, r1=0.037)
        p.tube([(0.27 * sx, 1.12, -0.005), (0.30 * sx, 1.0, 0.01), (0.325 * sx, 0.88, 0.02)], 0.036, c, r1=0.026)
        p.tube([(0.33 * sx, 0.865, 0.02), (0.345 * sx, 0.80, 0.025)], 0.03, c, r1=0.022)
    # Piernas
    for sx in (-1, 1):
        p.tube([(0.088 * sx, 0.93, 0), (0.095 * sx, 0.72, 0.005), (0.10 * sx, 0.50, 0.01)], 0.078, c, r1=0.05)
        p.tube([(0.10 * sx, 0.50, 0.01), (0.10 * sx, 0.30, 0.0), (0.10 * sx, 0.08, -0.01)], 0.05, c, r1=0.032)
        p.tube([(0.10 * sx, 0.045, -0.02), (0.105 * sx, 0.035, 0.09)], 0.03, c, r1=0.026)
    return p.build()


BONE = (0.92, 0.95, 1.0)


def build_skeleton():
    p = Part("skeleton")
    # Columna
    for y in np.arange(0.98, 1.56, 0.024):
        p.sphere((0, y, -0.075 + 0.02 * np.sin((y - 0.98) * 5.0)), 0.013, BONE, 0.9)
    # Costillas
    for i in range(10):
        y0 = 1.425 - i * 0.026
        a = 0.075 + 0.055 * np.sin(np.clip((i + 1.2) / 6.5, 0, 1) * np.pi / 2)
        b = 0.088 + 0.01 * min(i, 5) / 5
        th = np.linspace(0.12, 2.75 - 0.05 * i, 14)
        for sx in (-1, 1):
            pts = [(sx * a * np.sin(t), y0 - 0.05 * (t / 2.8) ** 1.4 - 0.005 * i, -0.075 + b * (1 - np.cos(t)) * 0.92 - 0.0)
                   for t in th]
            p.tube(pts, 0.0058, BONE, spacing=0.6)
    # Esternón
    p.tube([(0, 1.425, 0.10), (0, 1.29, 0.11), (0, 1.22, 0.10)], 0.012, BONE)
    # Clavículas
    for sx in (-1, 1):
        p.tube([(0.015 * sx, 1.44, 0.075), (0.09 * sx, 1.455, 0.05), (0.165 * sx, 1.445, -0.005)], 0.008, BONE)
    # Pelvis
    for sx in (-1, 1):
        p.tube([(0.02 * sx, 0.97, -0.07), (0.11 * sx, 1.0, -0.02), (0.13 * sx, 0.96, 0.03), (0.06 * sx, 0.89, 0.05)],
               0.012, BONE)
    return p.build()


ART = (1.0, 0.13, 0.12)
VEIN = (0.25, 0.35, 1.0)


def build_vessels():
    """Árbol vascular principal. Grupo 0 = arterias, 1 = venas."""
    p = Part("vessels")
    s_list = []

    def art(pts, r0, r1=None):
        s_list.append(("a", p.tube(pts, r0, ART, r1=r1, g=0, spacing=0.6)))

    def vein(pts, r0, r1=None):
        s_list.append(("v", p.tube(pts, r0, VEIN, r1=r1, g=1, spacing=0.6)))

    # Aorta
    art([(0.01, 1.33, 0.03), (0.0, 1.40, 0.02), (0.03, 1.425, -0.02), (0.035, 1.38, -0.05),
         (0.02, 1.2, -0.05), (0.01, 1.0, -0.04)], 0.010, 0.008)
    for sx in (-1, 1):
        # Carótidas y vasos del cerebro
        art([(0.012 * sx, 1.42, 0.0), (0.025 * sx, 1.50, 0.01), (0.03 * sx, 1.58, 0.0), (0.04 * sx, 1.65, 0.02),
             (0.03 * sx, 1.71, 0.03)], 0.0055, 0.0035)
        # Subclavia y brazo
        art([(0.02 * sx, 1.42, -0.01), (0.12 * sx, 1.43, -0.01), (0.2 * sx, 1.40, 0.0), (0.24 * sx, 1.25, 0.005),
             (0.275 * sx, 1.12, 0.01), (0.31 * sx, 0.97, 0.025), (0.335 * sx, 0.84, 0.03)], 0.0055, 0.003)
        # Ilíacas y piernas
        art([(0.01, 1.0, -0.03), (0.06 * sx, 0.93, 0.0), (0.09 * sx, 0.75, 0.025), (0.10 * sx, 0.52, 0.01),
             (0.10 * sx, 0.3, 0.0), (0.10 * sx, 0.08, 0.0)], 0.0065, 0.0035)
        # Venas paralelas
        vein([(-0.03, 1.36, 0.0), (0.03 * sx - 0.02, 1.44, 0.0), (0.042 * sx, 1.52, 0.015),
              (0.048 * sx, 1.6, 0.005), (0.05 * sx, 1.68, -0.01)], 0.006, 0.0035)
        vein([(-0.03, 1.40, -0.01), (0.13 * sx, 1.44, 0.0), (0.21 * sx, 1.40, 0.012), (0.25 * sx, 1.25, 0.018),
              (0.285 * sx, 1.12, 0.02), (0.32 * sx, 0.97, 0.035), (0.34 * sx, 0.84, 0.035)], 0.005, 0.003)
        vein([(-0.02, 1.02, -0.02), (0.07 * sx, 0.93, 0.012), (0.105 * sx, 0.75, 0.035), (0.115 * sx, 0.52, 0.02),
              (0.115 * sx, 0.3, 0.012), (0.11 * sx, 0.08, 0.01)], 0.006, 0.0035)
    # Vena cava inferior
    vein([(-0.03, 1.30, 0.0), (-0.025, 1.15, -0.03), (-0.02, 1.02, -0.02)], 0.009, 0.008)
    p.build()
    # Parámetro de recorrido para pulsos de sangre
    p.S = np.concatenate([s for _, s in s_list]).astype(np.float32)
    return p
