#!/usr/bin/env bash
# Monta el video vertical "Rana de madera y castor" a partir de img/sNN.png y audio/sNN.mp3.
# Uso: ./montar.sh [salida.mp4]
#   BORRADOR=1 ./montar.sh  -> usa img/s01.png donde falte una imagen y omite escenas sin audio.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-rana_castor_final.mp4}"
FPS=30; W=1080; H=1920; XF=0.5; PAD=0.7
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# Movimiento de cámara por escena: zin (zoom lento), zout (alejar), pdown, pup, pright
MOVES=(zin pdown zin zout pright zin pup pright zin zout)

clips=(); durs=()
for i in $(seq 1 10); do
  n=$(printf "%02d" "$i")
  a="audio/s$n.mp3"; img="img/s$n.png"
  if [[ ! -f $a ]]; then
    [[ ${BORRADOR:-0} == 1 ]] && { echo "omito escena $n (sin audio)"; continue; }
    echo "falta $a" >&2; exit 1
  fi
  if [[ ! -f $img ]]; then
    [[ ${BORRADOR:-0} == 1 ]] && img="img/s01.png" || { echo "falta $img" >&2; exit 1; }
  fi
  ad=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$a")
  d=$(python3 -c "print(round($ad+$PAD+$XF,3))")
  frames=$(python3 -c "import math;print(math.ceil($d*$FPS))")
  case ${MOVES[$((i-1))]} in
    zin)    z="1.0+0.12*on/$frames"; x="iw/2-(iw/zoom/2)"; y="ih/2-(ih/zoom/2)";;
    zout)   z="1.12-0.12*on/$frames"; x="iw/2-(iw/zoom/2)"; y="ih/2-(ih/zoom/2)";;
    pdown)  z="1.12"; x="iw/2-(iw/zoom/2)"; y="(ih-ih/zoom)*(0.2+0.6*on/$frames)";;
    pup)    z="1.12"; x="iw/2-(iw/zoom/2)"; y="(ih-ih/zoom)*(0.8-0.6*on/$frames)";;
    pright) z="1.12"; x="(iw-iw/zoom)*(0.2+0.6*on/$frames)"; y="ih/2-(ih/zoom/2)";;
  esac
  # Escalado previo grande para que el zoompan sea suave (sin "temblor").
  ffmpeg -v error -y -loop 1 -i "$img" -i "$a" -filter_complex \
    "[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,zoompan=z='$z':x='$x':y='$y':d=$frames:s=${W}x${H}:fps=$FPS,format=yuv420p[v];
     [1:a]aresample=48000,adelay=250|250,apad,atrim=0:$d,aformat=channel_layouts=stereo[a]" \
    -map "[v]" -map "[a]" -t "$d" -c:v libx264 -preset medium -crf 18 -c:a pcm_s16le "$TMP/c$n.mkv"
  clips+=("$TMP/c$n.mkv"); durs+=("$d")
done

# Encadenar con fundidos cruzados (video xfade + audio acrossfade).
inputs=(); for c in "${clips[@]}"; do inputs+=(-i "$c"); done
fc=""; prevv="[0:v]"; preva="[0:a]"; off=0
for ((k=1; k<${#clips[@]}; k++)); do
  off=$(python3 -c "print(round($off+${durs[$((k-1))]}-$XF,3))")
  fc+="${prevv}[$k:v]xfade=transition=fade:duration=$XF:offset=$off[v$k];"
  fc+="${preva}[$k:a]acrossfade=d=$XF:c1=tri:c2=tri[a$k];"
  prevv="[v$k]"; preva="[a$k]"
done
total=$(python3 -c "print(round($off+${durs[-1]},3))")

# Música ambiental muy baja, sintetizada localmente (acorde suave La menor con lento vaivén).
fc+="aevalsrc='0.5*sin(2*PI*110*t)+0.35*sin(2*PI*164.81*t)+0.3*sin(2*PI*220*t)+0.2*sin(2*PI*261.63*t)':s=48000:d=$total,"
fc+="tremolo=f=0.15:d=0.5,lowpass=f=900,volume=0.035,afade=t=in:d=2,afade=t=out:st=$(python3 -c "print($total-2.5)"):d=2.5,aformat=channel_layouts=stereo[m];"
fc+="${preva}[m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout];"
fc+="${prevv}fade=t=in:d=0.6,fade=t=out:st=$(python3 -c "print($total-0.8)"):d=0.8[vout]"

ffmpeg -v error -y "${inputs[@]}" -filter_complex "$fc" -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 19 -preset medium -r $FPS \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
echo "Listo: $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s)"
