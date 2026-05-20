// Bootstrap: build the engine/renderer/chart, wire controls, tooltips and the
// language switcher, then run the requestAnimationFrame loop with FPS metering.

import { FlockingEngine } from './engine.js';
import { Renderer } from './renderer.js';
import { initControls } from './controls.js';
import { initTooltips } from './tooltip.js';
import { MetricsChart } from './metrics-chart.js';
import { initLanguageSwitcher } from './i18n.js';

const canvas = document.getElementById('sim');
const rect = canvas.getBoundingClientRect();

const engine = new FlockingEngine(rect.width || 800, rect.height || 600);
const renderer = new Renderer(canvas, engine);
const chart = new MetricsChart('metricChart');
const controls = initControls(engine, renderer);

initTooltips();
initLanguageSwitcher(); // applies French by default

// Click-to-place obstacles when obstacle mode is active.
canvas.addEventListener('pointerdown', (e) => {
  if (!controls.obstacleMode) return;
  const r = canvas.getBoundingClientRect();
  engine.addObstacle(e.clientX - r.left, e.clientY - r.top);
});

canvas.addEventListener('pointermove', (e) => {
  if (!controls.obstacleMode) {
    renderer.obstacleCursor = null;
    return;
  }
  const r = canvas.getBoundingClientRect();
  renderer.obstacleCursor = { x: e.clientX - r.left, y: e.clientY - r.top };
});

canvas.addEventListener('pointerleave', () => {
  renderer.obstacleCursor = null;
});

// Keep the canvas and engine in step with the layout.
let resizeRAF = null;
window.addEventListener('resize', () => {
  if (resizeRAF) return;
  resizeRAF = requestAnimationFrame(() => {
    resizeRAF = null;
    renderer.resize();
  });
});

// FPS: exponential moving average of instantaneous frame rate.
let fps = 60;
let last = performance.now();

function frame(now) {
  const dt = now - last;
  last = now;
  if (dt > 0) fps += ((1000 / dt) - fps) * 0.1;

  engine.step();
  renderer.draw();
  chart.maybeSample(engine);
  renderer.updateOverlay(fps);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
