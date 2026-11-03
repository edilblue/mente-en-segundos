"""Configuración global del proyecto."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
FONTS = os.path.join(ASSETS, "fonts")
MODELS = os.environ.get("TTS_MODELS_DIR", os.path.join(ROOT, "models"))
OUTPUT = os.path.join(ROOT, "output")
BUILD = os.path.join(ROOT, "build")

# Video final
W, H = 1080, 1920
FPS = 30

# Resolución interna del render 3D (se escala a W x H con post-proceso).
# 0.6667 -> 720x1280. Puede bajarse con la variable RENDER_SCALE para previsualizar.
RENDER_SCALE = float(os.environ.get("RENDER_SCALE", "0.6667"))
RW = int(round(W * RENDER_SCALE / 2) * 2)
RH = int(round(H * RENDER_SCALE / 2) * 2)

SAMPLE_RATE = 44100

FONT_BLACK = os.path.join(FONTS, "Inter-Black.otf")
FONT_XBOLD = os.path.join(FONTS, "Inter-ExtraBold.otf")
FONT_SEMI = os.path.join(FONTS, "Inter-SemiBold.otf")
