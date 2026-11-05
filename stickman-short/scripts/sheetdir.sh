#!/bin/sh
# uso: scripts/sheetdir.sh carpeta salida.png
python3 - "$1" "$2" <<'PY'
import sys, glob, re, subprocess
fs = sorted(glob.glob(sys.argv[1] + '/*.png'), key=lambda p: float(re.search(r't([\d_]+)s', p).group(1).replace('_', '.')))
subprocess.run(['python3', 'scripts/sheet.py', sys.argv[2]] + fs, check=True)
PY
