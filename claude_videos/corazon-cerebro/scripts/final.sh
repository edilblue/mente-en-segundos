#!/usr/bin/env bash
# Une video + mezcla, exporta el MP4 final y ejecuta el control de calidad técnico.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=../mente_en_segundos_corazon_cerebro_enamorado.mp4
ffmpeg -loglevel error -y -i out/video_mudo.mp4 -i out/mezcla.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart -metadata title="¿Qué le pasa a tu corazón y a tu cerebro cuando te enamoras perdidamente?" \
  -metadata artist="Mente en Segundos" -shortest "$OUT"
echo "== ffprobe"
ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels,bit_rate:format=duration,size,bit_rate -of default=nw=1 "$OUT"
echo "== fotogramas negros (blackdetect)"
ffmpeg -hide_banner -i "$OUT" -vf "blackdetect=d=0.1:pic_th=0.97" -an -f null - 2>&1 | grep -c black_start || true
echo "== fotogramas congelados >1.5 s (freezedetect)"
ffmpeg -hide_banner -i "$OUT" -vf "freezedetect=n=0.001:d=1.5" -an -f null - 2>&1 | grep -E 'freeze_(start|duration)' || echo "ninguno"
echo "== silencios de audio >0.8 s"
ffmpeg -hide_banner -i "$OUT" -vn -af "silencedetect=noise=-45dB:d=0.8" -f null - 2>&1 | grep -E 'silence_(start|end)' || echo "ninguno"
echo "== sonoridad"
ffmpeg -hide_banner -i "$OUT" -vn -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary | grep -E 'I:|Peak:'
