#!/usr/bin/env bash
# Descarga el modelo de voz Kokoro (ONNX) usado para la narración local.
set -euo pipefail
mkdir -p models
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -f "models/$f" ] || curl -L -o "models/$f" "$BASE/$f"
done
echo "Modelos listos en ./models"
