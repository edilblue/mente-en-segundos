"""Director: decide qué escena(s) renderizar en cada instante y aplica las
transiciones, el post-procesado y las capas 2D."""
import numpy as np

from . import config as C
from .engine import post
from .engine.mathx import smoothstep
from .scenes.body_world import BodyWorld
from .scenes.vessel import VesselScene
from .overlay.text import Overlay


class Director:
    def __init__(self, tl):
        self.tl = tl
        self.body = BodyWorld(tl)
        self.vessel = VesselScene(tl)
        self.overlay = Overlay(tl)
        self.scale = C.W / C.RW

    def _body(self, t):
        cam = self.body.camera(t)
        f, anc = self.body.render(t, cam)
        # desenfoque de movimiento según la velocidad de la cámara
        dt = 1.0 / C.FPS
        c2 = self.body.camera(t + dt)
        p = np.array([cam.target], np.float32)
        x0, y0, _, _ = cam.project(p)
        x1, y1, _, _ = c2.project(p)
        dx, dy = float(x1[0] - x0[0]), float(y1[0] - y0[0])
        if np.hypot(dx, dy) > 6:
            f = post.motion_blur(f, dx * 0.8, dy * 0.8)
        return f, anc

    def render(self, t):
        tl = self.tl
        flash = 0.0
        anchors = {}
        # --- transición pulmón -> vaso sanguíneo
        a0, a1 = tl.T3 - 0.4, tl.T3 + 0.35
        b0, b1 = tl.T4 - 0.45, tl.T4 + 0.4
        if a0 <= t < a1:
            u = (t - a0) / (a1 - a0)
            if u < 0.5:
                f, anchors = self._body(t)
                f = post.zoom_blur(f, 0.35 * smoothstep(0.0, 0.5, u))
            else:
                f, _ = self.vessel.render(t)
                f = post.zoom_blur(f, 0.35 * (1 - smoothstep(0.5, 1.0, u)))
            flash = float(np.exp(-((u - 0.5) / 0.12) ** 2)) * 0.9
            fcol = (1.0, 0.45, 0.35)
        elif b0 <= t < b1:
            u = (t - b0) / (b1 - b0)
            if u < 0.5:
                f, _ = self.vessel.render(t)
                f = post.zoom_blur(f, 0.5 * smoothstep(0.0, 0.5, u))
            else:
                f, anchors = self._body(t)
                f = post.zoom_blur(f, 0.3 * (1 - smoothstep(0.5, 1.0, u)))
            flash = float(np.exp(-((u - 0.5) / 0.12) ** 2)) * 1.0
            fcol = (1.0, 0.85, 0.9)
        elif tl.T3 <= t < tl.T4:
            f, _ = self.vessel.render(t)
            fcol = (1, 1, 1)
        else:
            f, anchors = self._body(t)
            fcol = (1, 1, 1)
            # latido: pequeño "punch" de exposición en la escena del corazón
            if tl.T5 <= t < tl.T6:
                v, _, _ = tl.beat_phase(t)
                f = f * (1 + 0.06 * v)
        # fundidos de inicio y fin
        fade = smoothstep(0.0, 0.35, t) * (1 - smoothstep(tl.END - 0.5, tl.END, t))
        f = f * fade
        u8 = post.finish(f, t, flash=flash, flash_col=fcol)
        u8 = self.overlay.draw(u8, t, anchors, self.scale)
        if fade < 1:
            u8 = (u8.astype(np.float32) * max(fade, 0.0)).astype(np.uint8)
        u8 = post.grain(u8, t, 4)
        return u8
