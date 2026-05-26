// Bootstrap. Wires engine + controls + i18n + tooltips into the page,
// then runs the requestAnimationFrame loop. Exposes the same hooks as
// the previous episodes for the deterministic video-capture pipeline.

import { TuringEngine } from './engine.js';
import { initControls } from './controls.js';
import { initLanguageSwitcher } from './i18n.js';

const canvas = document.getElementById('sim');

let engine;
try {
  engine = new TuringEngine(canvas);
} catch (err) {
  document.getElementById('fallback').style.display = 'flex';
  document.getElementById('fallback-msg').textContent = err.message;
  throw err;
}

initLanguageSwitcher();
initControls(engine);

window.addEventListener('resize', () => engine.render());

// Tooltip system identical to the other episodes.
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

function frame() {
  engine.tick();
  engine.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// === Test/capture hooks (used by the video pipeline) ===
window.__engine = engine;
window.__driveFrame = () => { engine.tick(); engine.render(); };
