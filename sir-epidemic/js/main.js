// Bootstrap. Wires engine + renderer + controls + i18n, runs the rAF loop, and
// exposes window.__engine / __renderer / __driveFrame for the capture pipeline.

import { SIREngine } from './engine.js';
import { Renderer } from './renderer.js';
import { initControls } from './controls.js';
import { initLanguageSwitcher } from './i18n.js';

const canvas = document.getElementById('sim');
const engine = new SIREngine();
const renderer = new Renderer(canvas, engine);

initLanguageSwitcher();
const controls = initControls(engine, renderer);

window.addEventListener('resize', () => renderer.resize());

// Lightweight tooltip system (mirrors ep03–ep06). Reads [data-tip] set by i18n.
(function tooltips() {
  let el = null;
  document.body.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!target) return;
    if (!el) {
      el = document.createElement('div');
      el.className = 'tooltip';
      document.body.appendChild(el);
    }
    el.textContent = target.getAttribute('data-tip');
    el.classList.add('visible');
    const rect = target.getBoundingClientRect();
    el.style.left = (rect.left + rect.width / 2 - 130) + 'px';
    el.style.top  = (rect.bottom + 8) + 'px';
  });
  document.body.addEventListener('mouseout', () => {
    if (el) el.classList.remove('visible');
  });
})();

// The readouts change far slower than the canvas; refreshing them every frame
// would just thrash layout.
let tick = 0;
function tickFrame() {
  engine.step();
  renderer.draw();
  if ((tick++ % 6) === 0) controls.syncStats();
}

function frame() {
  tickFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// === Test/capture hooks (used by the video pipeline) ===
window.__engine = engine;
window.__renderer = renderer;
window.__driveFrame = () => { tickFrame(); };
