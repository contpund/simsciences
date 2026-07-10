// Wires the DOM controls to the Fourier engine + renderer, and owns the
// freehand drawing tool.
//
// Drawing is the point of this episode, so it is deliberately forgiving: any
// drag inside the canvas frame starts a stroke, and the path is closed for you
// on release. A stroke shorter than MIN_INK points is treated as a stray click
// and ignored — otherwise a mis-click would wipe the shape you were studying.
//
// Every slider applies on 'input' (not 'change') because the capture pipeline
// drives them with a synthetic input event.

import { PRESETS } from './engine.js';

const MIN_INK = 12;          // points below which a stroke is a stray click
const DEFAULTS = { N: 40, speed: 1 };

function setSliderFill(input) {
  const pct = ((+input.value - +input.min) / (+input.max - +input.min)) * 100;
  input.style.setProperty('--fill', pct + '%');
}

function bindSlider(input, valueEl, formatter, onInput) {
  const live = () => {
    setSliderFill(input);
    if (valueEl) valueEl.textContent = formatter(+input.value);
    if (onInput) onInput(+input.value);
  };
  input.addEventListener('input', live);
  live();
}

export function initControls(engine, renderer) {
  const $ = (id) => document.getElementById(id);

  // ── Readouts. Declared first: bindSlider fires its handler on setup. ──────
  const outCircles = $('valCircles'), outError = $('valError');
  const outDominant = $('valDominant'), outPoints = $('valPoints');

  function syncStats() {
    // Mid-stroke there is no analysed path yet: report nothing rather than
    // a confident 0.00 % about a curve that does not exist.
    if (!engine.path.length) {
      outCircles.textContent = '—';
      outError.textContent = '—';
      outError.classList.remove('good', 'bad');
      outDominant.textContent = '—';
      outPoints.textContent = '0';
      return;
    }
    outCircles.textContent = String(engine.circles);
    const err = engine.error;
    outError.textContent = err.toFixed(2) + ' %';
    outError.classList.toggle('good', err < 1);
    outError.classList.toggle('bad', err >= 1);
    const n = engine.dominantHarmonic;
    outDominant.textContent = 'n = ' + (n > 0 ? '+' : '') + n;
    outPoints.textContent = String(engine.path.length);
  }

  bindSlider($('slN'), $('valN'), (v) => String(Math.round(v)),
    (v) => { engine.setN(v); syncStats(); });
  bindSlider($('slSpeed'), $('valSpeed'), (v) => v.toFixed(2) + '×',
    (v) => engine.setSpeed(v));

  const tgCircles = $('tgCircles');
  tgCircles.addEventListener('change', () => engine.setShowCircles(tgCircles.checked));
  engine.setShowCircles(tgCircles.checked);

  const tgOriginal = $('tgOriginal');
  tgOriginal.addEventListener('change', () => engine.setShowOriginal(tgOriginal.checked));
  engine.setShowOriginal(tgOriginal.checked);

  // ── Shape presets ────────────────────────────────────────────────────────
  const presetBtns = {
    square: $('btnSquare'), star: $('btnStar'),
    heart: $('btnHeart'), infinity: $('btnInfinity'),
  };

  function markPreset(name) {
    for (const [k, btn] of Object.entries(presetBtns)) btn.classList.toggle('active', k === name);
  }

  for (const name of Object.keys(presetBtns)) {
    presetBtns[name].addEventListener('click', () => {
      engine.loadPreset(name);
      markPreset(name);
      syncStats();
    });
  }

  // ── The freehand tool ────────────────────────────────────────────────────
  const canvas = renderer.canvas;

  function canvasPoint(ev) {
    const r = canvas.getBoundingClientRect();
    return { px: ev.clientX - r.left, py: ev.clientY - r.top };
  }

  let raw = [];

  function beginStroke(ev) {
    const { px, py } = canvasPoint(ev);
    if (!renderer.hitDrawArea(px, py)) return;
    ev.preventDefault();
    canvas.setPointerCapture?.(ev.pointerId);
    engine.isDrawing = true;
    engine.ink = [{ px, py }];
    raw = [renderer.toEngine(px, py)];
  }

  function extendStroke(ev) {
    if (!engine.isDrawing) return;
    ev.preventDefault();
    const { px, py } = canvasPoint(ev);
    engine.ink.push({ px, py });
    raw.push(renderer.toEngine(px, py));
  }

  function endStroke(ev) {
    if (!engine.isDrawing) return;
    canvas.releasePointerCapture?.(ev.pointerId);
    engine.isDrawing = false;
    engine.ink = [];
    if (raw.length >= MIN_INK && engine.setPath(raw)) {
      engine.preset = 'custom';
      markPreset(null);
    }
    raw = [];
    syncStats();
  }

  canvas.addEventListener('pointerdown', beginStroke);
  canvas.addEventListener('pointermove', extendStroke);
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('pointerleave', endStroke);

  $('btnDraw').addEventListener('click', () => {
    engine.isDrawing = false;
    engine.ink = [];
    raw = [];
    // An empty circle is the least presumptuous canvas to start from: it is
    // what one single harmonic looks like, which is the lesson anyway.
    engine.setPath(Array.from({ length: 256 }, (_, i) => {
      const a = (i / 256) * Math.PI * 2;
      return { x: Math.cos(a) * 0.75, y: Math.sin(a) * 0.75 };
    }));
    engine.preset = 'custom';
    markPreset(null);
    syncStats();
  });

  $('btnReset').addEventListener('click', () => {
    $('slN').value = DEFAULTS.N;
    $('slSpeed').value = DEFAULTS.speed;
    for (const id of ['slN', 'slSpeed']) $(id).dispatchEvent(new Event('input'));
    tgCircles.checked = true; tgOriginal.checked = true;
    engine.reset();          // also clears `paused`, so drop the button state
    engine.setN(DEFAULTS.N);
    btnPause.classList.remove('active');
    markPreset('infinity');
    syncStats();
  });

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('fourier:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  markPreset(engine.preset in PRESETS ? engine.preset : null);
  syncStats();

  return { syncStats };
}
