// Bootstrap. Wires engine + renderer + controls + i18n into the page,
// then runs the requestAnimationFrame loop. Exposes window.__engine /
// window.__renderer / window.__driveFrame for the video-capture pipeline.

import { DoublePendulumEngine } from './engine.js';
import { Renderer } from './renderer.js';
import { initControls } from './controls.js';
import { initLanguageSwitcher } from './i18n.js';

const canvas = document.getElementById('sim');
const engine = new DoublePendulumEngine();
const renderer = new Renderer(canvas, engine);

initLanguageSwitcher();
initControls(engine, renderer);

window.addEventListener('resize', () => renderer.resize());

function frame() {
  engine.step();
  renderer.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// === Test/capture hooks (used by the video pipeline) ===
window.__engine = engine;
window.__renderer = renderer;
window.__driveFrame = () => { engine.step(); renderer.draw(); };
