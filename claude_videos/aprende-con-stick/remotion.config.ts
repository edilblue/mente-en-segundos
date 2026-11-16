import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(94);
Config.setCodec('h264');
Config.setCrf(15);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// Chromium headless del sistema si existe (evita descargarlo).
import fs from 'node:fs';
const sistema = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const chrome = process.env.REMOTION_CHROME || (fs.existsSync(sistema) ? sistema : null);
if (chrome) Config.setBrowserExecutable(chrome);
