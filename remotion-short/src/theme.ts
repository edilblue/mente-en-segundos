export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const DURATION = 30 * FPS; // 900 frames

// Zona segura (UI de YouTube Shorts)
export const SAFE_TOP = 150;
export const SAFE_BOTTOM = 250;

export const CYAN = '#29f3ff';
export const PINK = '#ff3dc8';
export const AMBER = '#ffb347';
export const FONT = 'InterBlack, "Noto Color Emoji", sans-serif';

// Escenas (en frames)
export const SCENES = {
  hook: {from: 0, len: 3 * FPS},
  step1: {from: 3 * FPS, len: 8 * FPS},
  step2: {from: 11 * FPS, len: 8 * FPS},
  step3: {from: 19 * FPS, len: 8 * FPS},
  outro: {from: 27 * FPS, len: 3 * FPS},
};

// Solapamiento entre escenas para el fundido + deslizamiento
export const TRANSITION = 14;
