#!/usr/bin/env bash
# Imágenes PROVISIONALES (img_provisional/sNN.png) derivadas de img/s01.png con encuadre y
# gradación de color por estación, mientras no haya cuota para generar las escenas 2-10.
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p img_provisional
S=img/s01.png   # 1152x2048
# Encuadres 9:16 (ancho:alto:x:y) en píxeles de s01
FULL="1152:2048:0:0"; FROG="700:1244:180:620"; FROGC="520:924:320:820"; LODGE="380:676:770:420"
WINTER="eq=saturation=0.25:brightness=0.10:contrast=0.92,colorbalance=bs=0.30:bm=0.18:rs=-0.12:rm=-0.08,curves=all='0/0.08 0.5/0.62 1/1'"
FROST="eq=saturation=0.55:brightness=0.05,colorbalance=bs=0.18:bm=0.10:rs=-0.06"
SPRING="hue=h=42:s=0.85,eq=brightness=0.04"
mk(){ ffmpeg -v error -y -i $S -vf "crop=$2,scale=1152:2048:flags=lanczos,$3" "img_provisional/s$1.png"; }
cp $S img_provisional/s01.png
mk 02 "$FROG"  "$FROST"
mk 03 "$FROGC" "$WINTER"
mk 04 "$FULL"  "$WINTER,eq=brightness=-0.03"
mk 05 "$FROG"  "$SPRING"
mk 06 "$LODGE" "eq=saturation=1.05"
mk 07 "$LODGE" "$FROST"
mk 08 "$LODGE" "$WINTER"
mk 09 "$LODGE" "$WINTER,eq=brightness=-0.06"
mk 10 "$LODGE" "$SPRING"
echo ok
