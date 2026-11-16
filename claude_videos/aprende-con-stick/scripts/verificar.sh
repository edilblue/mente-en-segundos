#!/usr/bin/env bash
# Verifica el MP4: códecs, resolución, fps, duración, decodificación completa, sonoridad y voz presente.
set -uo pipefail
F="${1:-../aprende_con_stick_ep01_miedo.mp4}"
[[ -f "$F" ]] || { echo "✖ No existe $F"; exit 1; }
echo "== $F ($(du -h "$F" | cut -f1))"
ffprobe -v error -show_entries stream=codec_type,codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels,bit_rate -show_entries format=duration,format_name -of default=nw=1 "$F"
echo "== decodificación completa (errores):"
ERR=$(ffmpeg -v error -i "$F" -f null - 2>&1 | head -5); [[ -z "$ERR" ]] && echo "   ninguno" || echo "$ERR"
echo "== frames de video: $(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$F")"
echo "== sonoridad (EBU R128):"
ffmpeg -hide_banner -i "$F" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary" | grep -E "I:|LRA:|Peak:" | sed 's/^/   /'
echo "== silencios > 1,5 s (en la pista completa):"
ffmpeg -hide_banner -i "$F" -af silencedetect=noise=-45dB:d=1.5 -f null - 2>&1 | grep -E "silence_(start|end)" | sed 's/^.*\] /   /' || true
