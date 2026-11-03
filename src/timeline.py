"""Línea de tiempo global: escenas, fisiología simulada y latidos.

Todo se deriva de los tiempos reales de la narración, así imagen, sonido y
subtítulos quedan sincronizados.
"""
import numpy as np

from .engine.mathx import smoothstep, smootherstep


class Timeline:
    def __init__(self, lines):
        self.lines = lines
        L = lines
        self.T1 = 0.0
        self.T2 = 5.0                                  # deja de respirar
        self.T3 = L[2]["start"] - 0.55                 # sangre
        self.T4 = L[4]["start"] - 0.65                 # cerebro
        self.T5 = L[6]["start"] - 0.55                 # corazón
        self.T6 = L[7]["start"] + L[7]["dur"] + 0.8    # final
        self.END = L[8]["start"] + L[8]["dur"] + 4.6
        self.FINAL_TEXT = L[8]["start"] + L[8]["dur"] + 0.15
        self.duration = self.END
        self.scenes = [(1, self.T1, self.T2), (2, self.T2, self.T3), (3, self.T3, self.T4),
                       (4, self.T4, self.T5), (5, self.T5, self.T6), (6, self.T6, self.END)]
        self.beats = self._make_beats()
        self.breaths = self._make_breaths()

    # ------------------------------------------------------------------ escenas
    def scene_at(self, t):
        for sid, a, b in self.scenes:
            if a <= t < b:
                return sid, (t - a) / (b - a), t - a
        return 6, 1.0, t - self.T6

    # ------------------------------------------------------------- fisiología
    def oxy(self, t):
        """Oxígeno disponible en sangre (1 = normal). Ilustrativo, no clínico."""
        a = smootherstep(self.T2 + 1.0, self.END - 3.0, t)
        return float(1.0 - 0.72 * a ** 0.9)

    def co2(self, t):
        return float(smootherstep(self.T2 + 0.5, self.END - 4.0, t))

    def breath(self, t):
        """Volumen pulmonar 0..1. Respira normal y luego toma aire y lo retiene."""
        period = 2.6
        last_in = self.T2 - 0.25
        if t < last_in - period * 0.5:
            ph = (t / period) % 1.0
            return float(0.15 + 0.55 * (0.5 - 0.5 * np.cos(2 * np.pi * ph)))
        # inspiración profunda final y retención
        t0 = last_in - period * 0.5
        u = smootherstep(t0, last_in + 0.6, t)
        start = 0.15 + 0.55 * (0.5 - 0.5 * np.cos(2 * np.pi * ((t0 / period) % 1.0)))
        v = start + (0.95 - start) * u
        # espasmos involuntarios del diafragma cuando sube el CO2
        sp = 0.0
        for ts in (self.T2 + 4.2, self.T2 + 5.6, self.T3 + 3.5):
            d = t - ts
            if 0 < d < 0.5:
                sp += 0.07 * np.sin(np.pi * d / 0.5)
        return float(v - sp)

    def _make_breaths(self):
        """Instantes de inspiración / espiración (para el sonido)."""
        out = []
        period = 2.6
        t = 0.0
        while t < self.T2 - 1.5:
            out.append(("in", t))
            out.append(("out", t + period * 0.5))
            t += period
        out.append(("deep", self.T2 - 1.55))
        return out

    def heart_rate(self, t):
        """Frecuencia cardiaca (lpm): sube por estrés y luego se vuelve lenta/irregular."""
        bpm = 72.0
        bpm += 40.0 * smoothstep(self.T2 + 2, self.T5 + 2.5, t)
        bpm -= 70.0 * smoothstep(self.T5 + 4.5, self.T6 + 2.0, t)
        return float(max(bpm, 38.0))

    def _make_beats(self):
        beats = []
        t = 0.25
        rng = np.random.default_rng(3)
        while t < self.END + 2:
            beats.append(t)
            bpm = self.heart_rate(t)
            jitter = 0.0
            if t > self.T5 + 5.0:
                jitter = rng.normal(0, 0.09)  # arritmia
            t += max(60.0 / bpm + jitter, 0.35)
        return np.array(beats, np.float32)

    def beat_phase(self, t):
        """Devuelve (contracción ventricular 0..1, contracción auricular 0..1, pulso 0..1)."""
        b = self.beats
        i = np.searchsorted(b, t) - 1
        if i < 0:
            return 0.0, 0.0, 0.0
        d = t - b[i]
        # sístole ventricular rápida y relajación
        vent = (np.exp(-((d - 0.12) / 0.07) ** 2) if d < 0.12 else np.exp(-((d - 0.12) / 0.16) ** 2))
        nxt = b[i + 1] if i + 1 < len(b) else b[i] + 0.8
        da = t - (nxt - 0.14)
        atr = np.exp(-(da / 0.06) ** 2) if da > -0.3 else 0.0
        strength = 1.0 - 0.45 * smoothstep(self.T5 + 6.0, self.END, t)
        pulse = np.exp(-d / 0.25) * strength
        return float(vent * strength), float(atr * strength), float(pulse)

    def brain_activity(self, t):
        base = 1.0 - 0.8 * smootherstep(self.T4 + 2.5, self.T5 - 0.3, t)
        flick = 0.0
        if t > self.T4 + 4.0:
            flick = 0.25 * max(np.sin(t * 23.0) * np.sin(t * 7.3), 0)
        return float(max(base + flick * (1 - base), 0.05))
