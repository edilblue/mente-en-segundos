#!/usr/bin/env bash
# Render del episodio: Remotion (video + mezcla de voz/música/efectos) → FFmpeg (loudness -14 LUFS, faststart).
#   bash scripts/render.sh            → ../aprende_con_stick_ep01_miedo.mp4 (exige narración real de Gemini)
#   bash scripts/render.sh --borrador → out/borrador_ep01.mp4 (permite tiempos estimados, sin voz)
set -euo pipefail
cd "$(dirname "$0")/.."
GEN=$(node -e "console.log(require('./src/episodes/ep01/narracion.json').generadoCon)")
if [[ "${1:-}" == "--borrador" ]]; then
  FINAL=out/borrador_ep01.mp4
else
  if [[ "$GEN" != "gemini" ]]; then
    echo "✖ narracion.json no viene de Gemini ($GEN). Ejecuta 'npm run narracion' primero (o usa --borrador)." >&2
    exit 2
  fi
  FINAL=../aprende_con_stick_ep01_miedo.mp4
fi
mkdir -p out
python3 scripts/generar-audio.py >/dev/null
npx remotion render AprendeConStick-Ep01 out/ep01_remotion.mp4 --log=error
# Normalización de sonoridad en dos pasadas (objetivo plataformas: -14 LUFS, pico -1 dBTP)
M=$(ffmpeg -hide_banner -i out/ep01_remotion.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$M" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)['$1']))"; }
ffmpeg -hide_banner -loglevel error -y -i out/ep01_remotion.mp4 \
  -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 17 -profile:v high -r 30 -color_range tv \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$FINAL"
echo "✔ $FINAL"
bash scripts/verificar.sh "$FINAL"
