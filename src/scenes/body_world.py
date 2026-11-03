"""Mundo anatómico: cuerpo semitransparente con órganos animados.

Se usa en las escenas 1, 2, 4, 5 y 6 (la cámara viaja por el mismo mundo,
así las transiciones son continuas).
"""
import numpy as np
import cv2

from .. import config as CFG
from ..engine.camera import Camera
from ..engine.blobs import render_blobs, Material
from ..engine.mathx import rot_y, rot_z, rot_x, smoothstep, smootherstep, Keyframes, ease_in_out
from ..engine import sprites
from ..anatomy.body import build_skin, build_skeleton, build_vessels, ART, VEIN
from ..anatomy.lungs import build_lungs, build_bronchi
from ..anatomy.heart import build_heart
from ..anatomy.brain import build_brain, build_brain_arteries
from ..anatomy import textures as tx

# ----------------------------------------------------------------- materiales
M_SKIN = Material(ambient=0.10, diffuse=0.35, specular=0.55, shininess=70, rim_color=(0.35, 0.78, 1.0),
                  rim_strength=1.25, rim_power=2.2, sss=0.0, ao=0.0, glass=0.035)
M_BONE = Material(ambient=0.35, diffuse=0.7, specular=0.4, shininess=30, rim_color=(0.7, 0.85, 1.0),
                  rim_strength=0.6, sss=0.2, sss_color=(0.8, 0.9, 1.0), ao=0.3, glass=0.35)
M_VESSEL = Material(ambient=0.3, diffuse=0.75, specular=0.7, shininess=45, rim_color=(1.0, 0.5, 0.5),
                    rim_strength=0.35, sss=0.4, sss_color=(1, 0.3, 0.3), ao=0.0, emissive=(1.0, 0.25, 0.2))
M_LUNG = Material(ambient=0.32, diffuse=0.8, specular=0.32, shininess=18, rim_color=(1.0, 0.75, 0.85),
                  rim_strength=0.45, sss=0.5, sss_color=(1.0, 0.45, 0.45), ao=0.7, bump=0.55,
                  fill_color=(0.45, 0.45, 0.9))
M_BRONCH = Material(ambient=0.35, diffuse=0.7, specular=0.6, shininess=40, rim_color=(0.6, 0.9, 1.0),
                    rim_strength=0.4, sss=0.3, ao=0.2, emissive=(0.35, 0.85, 1.0))
M_HEART = Material(ambient=0.22, diffuse=0.9, specular=0.85, shininess=55, rim_color=(1.0, 0.45, 0.45),
                   rim_strength=0.45, rim_power=2.4, sss=0.45, sss_color=(1.0, 0.25, 0.15), ao=0.8, bump=0.35,
                   fill_color=(0.5, 0.35, 0.7))
M_CORON = Material(ambient=0.3, diffuse=0.8, specular=0.8, shininess=50, rim_strength=0.2, ao=0.0, sss=0.3)
M_BRAIN = Material(ambient=0.28, diffuse=0.85, specular=0.38, shininess=24, rim_color=(1.0, 0.65, 0.75),
                   rim_strength=0.4, sss=0.45, sss_color=(1.0, 0.4, 0.45), ao=0.75, bump=0.6,
                   fill_color=(0.55, 0.4, 0.6))
M_BART = Material(ambient=0.3, diffuse=0.8, specular=0.7, shininess=45, rim_strength=0.25, ao=0.0, sss=0.35,
                  emissive=(1.0, 0.25, 0.2))

HYPOXIC_ART = np.array([0.55, 0.12, 0.42], np.float32)


class BodyWorld:
    def __init__(self, tl, width=None, height=None):
        self.tl = tl
        self.w = width or CFG.RW
        self.h = height or CFG.RH
        self.skin = build_skin()
        self.skel = build_skeleton()
        self.ves = build_vessels()
        self.lungs = build_lungs()
        self.br = build_bronchi()
        self.heart = build_heart()
        self.brain = build_brain()
        self.bart = build_brain_arteries()

        self.H_R = (rot_z(0.62) @ rot_y(-0.45) @ rot_x(0.12)).astype(np.float32)
        self.H_T = np.array([0.03, 1.305, 0.04], np.float32)
        self.H_S = 0.82
        self.B_T = np.array([0.0, 1.655, -0.006], np.float32)
        self.B_S = 0.96

        hg = self.heart.G
        self.h_vent = (hg == 0) | (hg == 4)
        self.h_atr = hg == 1
        self.h_vess = (hg == 2) | (hg == 3)
        self.h_cor = hg == 4
        self.h_body = ~self.h_cor
        self.atr_center = self.heart.P[self.h_atr].mean(0)

        sk = self.skin.P
        self.chest = (sk[:, 1] > 1.1) & (sk[:, 1] < 1.47) & (np.abs(sk[:, 0]) < 0.2)

        rng = np.random.default_rng(42)
        # O2 entrando por las vías respiratorias
        self.o2 = [(rng.integers(len(self.br.paths)), rng.uniform(0, 1), rng.uniform(0.28, 0.4))
                   for _ in range(46)]
        # CO2 acumulándose en los pulmones
        lp = self.lungs.P
        idx = rng.choice(len(lp), 70, replace=False)
        self.co2_pos = lp[idx] + rng.normal(0, 0.012, (70, 3)).astype(np.float32)
        self.co2_pos[:, 2] += 0.03
        self.co2_birth = np.sort(rng.uniform(0, 1, 70)).astype(np.float32)
        self.co2_phase = rng.uniform(0, 6.28, (70, 3)).astype(np.float32)
        # Polvo / bokeh
        self.dust = rng.uniform([-1.2, 0.0, -1.5], [1.2, 2.2, 1.0], (90, 3)).astype(np.float32)
        self.dust_ph = rng.uniform(0, 6.28, 90).astype(np.float32)
        self._bg = None
        self._make_tracks()

    # ------------------------------------------------------------------ cámara
    def _make_tracks(self):
        tl = self.tl
        T2, T3, T4, T5, T6, END = tl.T2, tl.T3, tl.T4, tl.T5, tl.T6, tl.END

        def k(t, eye, tgt, fov):
            return (t, list(eye) + list(tgt) + [fov])

        self.cam_track = Keyframes([
            k(0.0, (0.0, 1.0, 3.45), (0, 0.93, 0), 36),
            k(2.3, (0.10, 1.12, 2.45), (0, 1.06, 0), 35),
            k(T2 - 0.1, (0.30, 1.33, 1.02), (0.0, 1.30, 0.0), 34),
            k(T2 + 1.9, (0.20, 1.335, 0.56), (0.0, 1.305, 0.0), 36),
            k(T3 - 0.85, (-0.14, 1.33, 0.47), (-0.03, 1.30, 0.0), 36),
            k(T3 + 0.35, (-0.075, 1.31, 0.13), (-0.075, 1.29, 0.0), 44),
            k(T4 - 0.35, (0.22, 1.50, 0.34), (0.03, 1.56, 0.0), 40),
            k(T4 + 1.9, (0.56, 1.70, 0.22), (0.0, 1.64, -0.005), 34),
            k(T5 - 1.1, (0.50, 1.78, -0.30), (0.0, 1.64, -0.005), 34),
            k(T5 - 0.15, (0.15, 1.42, 0.50), (0.02, 1.36, 0.0), 38),
            k(T5 + 0.6, (0.10, 1.31, 0.60), (0.03, 1.285, 0.04), 34),
            k(T6 - 3.2, (0.26, 1.27, 0.46), (0.03, 1.285, 0.04), 34),
            k(T6 - 0.55, (-0.12, 1.30, 0.52), (0.03, 1.29, 0.04), 34),
            k(T6 + 2.3, (0.0, 1.03, 3.05), (0, 0.98, 0), 36),
            k(END - 4.4, (0.06, 1.07, 2.75), (0, 1.0, 0), 36),
            k(END - 0.7, (0.30, 1.77, 0.44), (0.0, 1.745, 0.0), 34),
        ])
        self.skin_op = Keyframes([(0, 1.0), (T2 - 0.5, 1.0), (T2 + 1.3, 0.1), (T3 - 0.6, 0.0), (T6 + 0.2, 0.0),
                                  (T6 + 2.0, 1.0), (END - 2.6, 1.0), (END - 0.9, 0.25)])
        self.bone_op = Keyframes([(0, 0.32), (T2 + 1.3, 0.22), (T3 - 0.6, 0.0), (T6 + 0.3, 0.0),
                                  (T6 + 2.0, 0.3), (END - 2.4, 0.3), (END - 1.0, 0.0)])
        self.heart_op = Keyframes([(0, 1.0), (T2 + 0.3, 1.0), (T2 + 1.5, 0.3), (T3 + 0.5, 0.3), (T4, 1.0)])
        self.lung_op = Keyframes([(0, 1.0), (T4 - 0.5, 1.0), (T4 - 0.15, 0.0), (T5 - 0.4, 0.0), (T5 + 0.4, 0.5),
                                  (T6 - 0.5, 0.5), (T6 + 1.0, 1.0), (END - 2.2, 1.0), (END - 1.2, 0.0)])

    def camera(self, t):
        v = self.cam_track(t)
        eye, tgt, fov = v[0:3].copy(), v[3:6].copy(), float(v[6])
        dist = float(np.linalg.norm(eye - tgt))
        eye += dist * 0.012 * np.array([np.sin(t * 0.9), np.sin(t * 1.27 + 1.0) * 0.6, 0], np.float32)
        tgt += dist * 0.004 * np.array([np.sin(t * 1.1 + 2.0), np.sin(t * 0.8), 0], np.float32)
        roll = 0.012 * np.sin(t * 0.6)
        return Camera(eye, tgt, fov, self.w, self.h, roll=roll, near=0.01)

    # --------------------------------------------------------- deformaciones
    def lungs_xf(self, P, b, keep_trachea=False):
        P = P.copy()
        top = 1.465
        side_c = np.where(P[:, 0] < 0, -0.078, 0.078).astype(np.float32)
        m = np.ones(len(P), bool) if not keep_trachea else (P[:, 1] < 1.415)
        k = (1.0 + 0.11 * b - 0.05)
        P[m, 1] = top - (top - P[m, 1]) * k
        sx = 1.0 + 0.07 * b
        P[m, 0] = side_c[m] + (P[m, 0] - side_c[m]) * sx
        P[m, 2] = P[m, 2] * (1.0 + 0.07 * b)
        return P

    def heart_world(self, t, cam_eye):
        vent, atr, pulse = self.tl.beat_phase(t)
        P = self.heart.P.copy()
        R = self.heart.R.copy()
        m = self.h_vent
        y = P[m, 1]
        a = np.clip(-y / 0.115, 0, 1)
        cx = 0.004 + 0.012 * a
        kk = 1 - 0.11 * vent
        dx, dz = (P[m, 0] - cx) * kk, (P[m, 2] - 0.004) * kk
        ang = 0.16 * vent * a
        ca, sa = np.cos(ang), np.sin(ang)
        P[m, 0] = cx + dx * ca - dz * sa
        P[m, 2] = 0.004 + dx * sa + dz * ca
        P[m, 1] = y * (1 - 0.07 * vent)
        m = self.h_atr
        P[m] = self.atr_center + (P[m] - self.atr_center) * (1 - 0.16 * atr)
        R[self.h_vess] *= (1 + 0.07 * pulse)
        # normales aproximadas para descartar coronarias de la cara oculta
        n_loc = P - np.stack([0.004 + 0.012 * np.clip(-P[:, 1] / 0.115, 0, 1), P[:, 1], np.full(len(P), 0.004)], 1)
        sway = rot_y(0.05 * np.sin(t * 0.7)) @ self.H_R
        W = (P * self.H_S) @ sway.T + self.H_T
        N = n_loc @ sway.T
        vis = np.sum(N * (cam_eye - W), 1) > 0
        return W.astype(np.float32), R * self.H_S, vis, (vent, atr, pulse)

    def vessel_emission(self, t):
        S = self.ves.S
        G = self.ves.G
        E = np.full(len(S), 0.12, np.float32)
        beats = self.tl.beats
        i = np.searchsorted(beats, t)
        for bt in beats[max(0, i - 3):i]:
            d = (t - bt) * 0.9
            E += 1.3 * np.exp(-((S - d) / 0.06) ** 2) * np.exp(-(t - bt) * 0.8)
        E[G == 1] = 0.08
        return E

    # ----------------------------------------------------------------- fondo
    def background(self, cam):
        if self._bg is None:
            h, w = self.h, self.w
            yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
            r = np.sqrt(((xx - w * 0.5) / w) ** 2 + ((yy - h * 0.42) / h) ** 2 * 0.6)
            g = np.clip(1 - r * 1.6, 0, 1) ** 1.6
            bg = np.stack([0.008 + 0.05 * g, 0.014 + 0.085 * g, 0.03 + 0.15 * g], -1)
            self._bg = bg.astype(np.float32)
        return self._bg.copy()

    # ----------------------------------------------------------------- render
    def render(self, t, cam=None):
        tl = self.tl
        cam = cam or self.camera(t)
        frame = self.background(cam)
        anchors = {}
        oxy = tl.oxy(t)
        b = tl.breath(t)
        hyp = 1.0 - oxy

        # Polvo flotante (profundidad)
        dp = self.dust + 0.03 * np.stack([np.sin(t * 0.3 + self.dust_ph), np.sin(t * 0.21 + self.dust_ph * 2),
                                          np.zeros_like(self.dust_ph)], 1)
        x, y, z, rp = cam.project(dp, np.full(len(dp), 0.012, np.float32))
        for i in range(len(dp)):
            if z[i] > 0.05:
                sprites.draw_glow(frame, x[i], y[i], min(rp[i] * 2.5, 60), (0.25, 0.55, 0.9), 0.05)

        # Vasos sanguíneos del cuerpo
        E = self.vessel_emission(t)
        C = self.ves.C.copy()
        art = self.ves.G == 0
        C[art] = C[art] * (1 - 0.65 * hyp) + HYPOXIC_ART * 0.65 * hyp
        L = render_blobs(cam, self.ves.P, self.ves.R, C, E=E, W=self.ves.W, mat=M_VESSEL)
        if L:
            L.composite(frame)

        # Pulmones
        lung_op = float(self.lung_op(t))
        glow = 0.0
        if t < tl.T2 + 0.6:
            glow = 0.55 * (0.4 + 0.6 * b) * (1 - smoothstep(tl.T2, tl.T2 + 0.6, t))
        s6 = smoothstep(tl.T6 + 1.0, tl.T6 + 1.8, t)
        glow_warn = 0.0
        if t > tl.T6:
            glow_warn = s6 * (0.45 + 0.25 * np.sin(t * 5.0))
        if lung_op > 0.01:
            LP = self.lungs_xf(self.lungs.P, b)
            mat = M_LUNG.copy(opacity=lung_op)
            if glow_warn > 0:
                mat.emissive = np.array([1.0, 0.35, 0.15], np.float32)
            L = render_blobs(cam, LP, self.lungs.R, self.lungs.C, self.lungs.Q, W=self.lungs.W,
                             E=glow_warn, mat=mat, texture=tx.lung_texture(oxy, glow))
            if L:
                L.composite(frame)
            # Bronquios (con aire brillante cuando entra)
            BP = self.lungs_xf(self.br.P, b, keep_trachea=True)
            air = 0.0
            if t < tl.T2 + 0.3:
                air = (0.5 + 0.5 * np.sin(t * 2 * np.pi / 2.6 - 1.2)) * 0.9
            L = render_blobs(cam, BP, self.br.R, self.br.C, W=self.br.W, E=air,
                             mat=M_BRONCH.copy(opacity=0.8 * lung_op))
            if L:
                L.composite(frame)

        # Corazón
        HW, HR, cvis, (vent, atr, pulse) = self.heart_world(t, cam.eye)
        stress = 0.0
        if t > tl.T5:
            stress = 0.35 * smoothstep(tl.T5, tl.T5 + 3, t) * (0.5 + 0.5 * vent)
        heart_warn = smoothstep(tl.T6 + 2.4, tl.T6 + 3.2, t) * (0.45 + 0.25 * np.sin(t * 5.0 + 1))
        hc = self.heart.C
        mat = M_HEART.copy(opacity=float(self.heart_op(t)))
        if heart_warn > 0:
            mat.emissive = np.array([1.0, 0.3, 0.1], np.float32)
        hoxy = 1 - 0.8 * hyp
        m = self.h_body
        L = render_blobs(cam, HW[m], HR[m], hc[m], self.heart.Q[m], W=self.heart.W[m], E=heart_warn, mat=mat,
                         texture=tx.heart_texture(hoxy, stress))
        if L:
            L.composite(frame)
        m = self.h_cor & cvis
        if np.any(m):
            L = render_blobs(cam, HW[m], HR[m], hc[m], W=self.heart.W[m], mat=M_CORON.copy(opacity=float(self.heart_op(t))))
            if L:
                L.composite(frame)

        # Cerebro
        act = tl.brain_activity(t)
        damage = smoothstep(tl.T4 + 3.0, tl.T5, t) * 0.75
        if t > tl.T6:
            damage = 0.75
        brain_warn = smoothstep(tl.T6 + 3.8, tl.T6 + 4.6, t) * (0.5 + 0.3 * np.sin(t * 5.0 + 2))
        BW = self.brain.P * self.B_S * (1 + 0.006 * pulse) + self.B_T
        mat = M_BRAIN.copy()
        if brain_warn > 0:
            mat.emissive = np.array([1.0, 0.3, 0.12], np.float32)
        glow_col = (0.3, 0.8, 1.0) if t < tl.T4 + 6 else (0.3 + 0.5 * damage, 0.8 - 0.5 * damage, 1.0 - 0.4 * damage)
        L = render_blobs(cam, BW, self.brain.R * self.B_S, self.brain.C, self.brain.Q, W=self.brain.W,
                         E=brain_warn, mat=mat, texture=tx.brain_texture(t, act, damage, glow_col))
        if L:
            L.composite(frame)
        ba = self.bart
        Ca = ba.C * (1 - 0.6 * hyp) + HYPOXIC_ART * 0.6 * hyp
        Ea = 0.15 + 0.9 * pulse
        L = render_blobs(cam, ba.P * self.B_S + self.B_T, ba.R * self.B_S, Ca, W=ba.W, E=Ea, mat=M_BART)
        if L:
            L.composite(frame)

        # Esqueleto y piel (vidrio)
        bop = float(self.bone_op(t))
        if bop > 0.01:
            L = render_blobs(cam, self.skel.P, self.skel.R, self.skel.C, W=self.skel.W,
                             mat=M_BONE.copy(opacity=bop))
            if L:
                L.composite(frame)
        sop = float(self.skin_op(t))
        if sop > 0.01:
            SP = self.skin.P.copy()
            c = self.chest
            SP[c, 0] *= 1 + 0.035 * b
            SP[c, 2] = 0.012 + (SP[c, 2] - 0.012) * (1 + 0.06 * b)
            skin_rim = np.array([0.35, 0.78, 1.0]) * (1 - 0.4 * hyp) + np.array([0.6, 0.4, 1.0]) * 0.4 * hyp
            L = render_blobs(cam, SP, self.skin.R, self.skin.C, W=self.skin.W,
                             mat=M_SKIN.copy(opacity=sop, rim_color=tuple(skin_rim)))
            if L:
                L.composite(frame)

        # Moléculas
        self._molecules(frame, cam, t, b)

        # Anclas para etiquetas (coordenadas de render)
        pts = {"lungs_r": (-0.10, 1.33, 0.06), "lungs_l": (0.11, 1.36, 0.06), "heart": tuple(self.H_T),
               "brain": (0.0, 1.70, 0.02), "trachea": (0.0, 1.55, 0.03), "trachea_top": (0.0, 1.61, 0.03),
               "carotid": (0.03, 1.52, 0.01)}
        for k_, p_ in pts.items():
            px, py, pz, _ = cam.project(np.array([p_], np.float32))
            anchors[k_] = (float(px[0]), float(py[0]), float(pz[0]))
        return frame, anchors

    def _molecules(self, frame, cam, t, b):
        tl = self.tl
        # O2 entrando (escena 1) -> se detiene y se consume (escena 2)
        if t < tl.T3 + 0.3:
            tf = min(t, tl.T2 - 0.1)
            fade = 1.0 - smoothstep(tl.T2 + 0.5, tl.T2 + 4.5, t)
            if fade > 0.01:
                for pi, ph, sp in self.o2:
                    path = self.br.paths[pi]
                    u = (tf * sp + ph) % 1.0
                    if t > tl.T2:
                        u = min(u + (t - tl.T2) * 0.03, 1.0)
                    f = u * (len(path) - 1)
                    j = int(f)
                    j1 = min(j + 1, len(path) - 1)
                    pos = path[j] * (1 - (f - j)) + path[j1] * (f - j)
                    pos = self.lungs_xf(pos[None], b, keep_trachea=True)[0]
                    a = fade * smoothstep(0.0, 0.06, u) * (1 - smoothstep(0.93, 1.0, u) * 0.6)
                    sprites.draw_molecule(frame, cam, pos, "o2", 0.0042, t * 1.3 + ph * 9, a)
        # CO2 acumulándose
        c = tl.co2(t)
        if tl.T2 < t < tl.T3 + 0.5 or t > tl.T6:
            vis = self.co2_birth < c * 1.25
            amt = 1.0 if t < tl.T6 else 0.6
            for i in np.nonzero(vis)[0]:
                age = max(c * 1.25 - self.co2_birth[i], 0)
                pop = smoothstep(0, 0.06, age)
                ph = self.co2_phase[i]
                pos = self.co2_pos[i] + 0.006 * np.array([np.sin(t * 0.9 + ph[0]), np.sin(t * 0.7 + ph[1]),
                                                          np.sin(t * 0.8 + ph[2])], np.float32)
                pos = self.lungs_xf(pos[None], b)[0]
                sprites.draw_molecule(frame, cam, pos, "co2", 0.0045 * (0.6 + 0.4 * pop), t * 0.9 + ph[0],
                                      pop * amt)
