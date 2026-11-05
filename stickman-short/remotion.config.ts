import {Config} from '@remotion/cli/config';

// Chromium headless ya instalado en el entorno (sin descargar nada).
Config.setBrowserExecutable(
  process.env.REMOTION_CHROME ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('swangle');
