#!/bin/sh
# Mezcla final de audio (voz de Gemini + música/efectos) y la une al video ya renderizado.
# Equivale a renderizar con Remotion (Short.tsx coloca los mismos clips en los mismos frames),
# pero sin volver a dibujar los 2400 frames.
#   uso: scripts/mix.sh out/short.mp4   (reemplaza el audio del archivo)
set -e
cd "$(dirname "$0")/.."
VIDEO="${1:-out/short.mp4}"
node -e "
const fs=require('fs');const src=fs.readFileSync('src/narration.generated.ts','utf8');
const m=JSON.parse(src.slice(src.indexOf('= [')+2).replace(/;\s*\$/,''));
const ins=m.map(c=>['-i','public/'+c.file]).flat();
const f=m.map((c,i)=>{const ms=Math.round(Math.round(c.start*30)/30*1000);return '['+i+']aresample=48000,pan=stereo|c0=c0|c1=c0,adelay='+ms+'|'+ms+'['+i+'a]'}).join(';')+';'+m.map((c,i)=>'['+i+'a]').join('')+'amix=inputs='+m.length+':normalize=0,apad=whole_dur=80[o]';
require('child_process').execFileSync('ffmpeg',['-v','error','-y',...ins,'-filter_complex',f,'-map','[o]','-t','80','-c:a','pcm_s16le','out/voz_timeline.wav']);
"
ffmpeg -v error -y -i out/voz_timeline.wav -i public/audio/fondo.wav \
  -filter_complex "[0]volume=1.0[v];[1]volume=${BG_GAIN:-1.0}[b];[v][b]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[a]" -t 80 -c:a pcm_s16le out/mezcla.wav
ffmpeg -v error -y -i "$VIDEO" -i out/mezcla.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart -t 80 out/_mux.mp4
mv out/_mux.mp4 "$VIDEO"
echo "ok $VIDEO"
