// Wires the DOM controls to the lattice-Boltzmann engine + renderer, and owns
// the obstacle-painting tool.
//
// Every slider applies on 'input' (not 'change') because the capture pipeline
// drives them with a synthetic input event.

import { t } from './i18n.js';

const DEFAULTS = { Re: 120, steps: 8, brush: 3 };

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

  // ── Declared first: bindSlider fires its handler during setup, and that
  //    handler calls syncStats(), which reads all of these. ──────────────────
  const outRe = $('valRe'), outRegime = $('valRegime'), outSt = $('valSt');
  const outPeriod = $('valPeriod'), outNu = $('valNu'), outD = $('valD');
  const outBrush = $('valBrush');
  let brush = DEFAULTS.brush;

  /** The stamp is always an odd number of cells across, so only 1 is singular. */
  const cells = (n) => `${n} ${t(n === 1 ? 'unit.cell' : 'unit.cells')}`;

  function syncStats() {
    outRe.textContent = engine.D ? String(Math.round(engine.effectiveRe)) : '—';
    const r = engine.regime;
    outRegime.textContent = t('short.' + r);
    outRegime.classList.toggle('shed', r === 'shedding');
    outRegime.classList.toggle('calm', r === 'steady' || r === 'creeping');

    const st = engine.strouhal;
    outSt.textContent = st ? st.toFixed(3) : '—';
    outSt.classList.toggle('shed', !!st);

    const T = engine.period;
    outPeriod.textContent = T ? `${Math.round(T)} ${t('unit.steps')}` : '—';
    outNu.textContent = engine.D ? engine.nu.toFixed(4) : '—';
    outD.textContent = engine.D ? cells(engine.D) : '—';
    // Re-rendered here too, so switching language relabels it without a drag.
    outBrush.textContent = cells(2 * brush + 1);
  }

  bindSlider($('slRe'), $('valReSlider'), (v) => String(Math.round(v)),
    (v) => { engine.setRe(v); syncStats(); });
  bindSlider($('slSteps'), $('valSteps'), (v) => String(Math.round(v)),
    (v) => engine.setStepsPerFrame(v));

  // Brush radius in cells; the readout gives the diameter, which is what the
  // stamp actually covers.
  bindSlider($('slBrush'), outBrush, (v) => cells(2 * Math.round(v) + 1),
    (v) => { brush = Math.round(v); renderer.setBrush(brush); });

  const tgTracers = $('tgTracers');
  tgTracers.addEventListener('change', () => engine.setShowTracers(tgTracers.checked));
  engine.setShowTracers(tgTracers.checked);

  // ── Field ────────────────────────────────────────────────────────────────
  const fieldBtns = { vorticity: $('btnVorticity'), speed: $('btnSpeed'), pressure: $('btnPressure') };
  function setField(m) {
    renderer.setMode(m);
    for (const [k, b] of Object.entries(fieldBtns)) b.classList.toggle('active', k === m);
  }
  for (const m of Object.keys(fieldBtns)) fieldBtns[m].addEventListener('click', () => setField(m));
  setField('vorticity');

  // ── Obstacle presets ─────────────────────────────────────────────────────
  const shapeBtns = {
    cylinder: $('btnCylinder'), plate: $('btnPlate'),
    wedge: $('btnWedge'), airfoil: $('btnAirfoil'),
  };
  function markShape(name) {
    for (const [k, b] of Object.entries(shapeBtns)) b.classList.toggle('active', k === name);
  }
  for (const name of Object.keys(shapeBtns)) {
    shapeBtns[name].addEventListener('click', () => {
      engine.preset(name);
      markShape(name);
      syncStats();
    });
  }

  // ── The painting tool ────────────────────────────────────────────────────
  let erasing = false;
  const btnDraw = $('btnDraw'), btnErase = $('btnErase');
  function setTool(er) {
    erasing = er;
    renderer.setTool(er);
    btnDraw.classList.toggle('active', !er);
    btnErase.classList.toggle('active', er);
  }
  btnDraw.addEventListener('click', () => setTool(false));
  btnErase.addEventListener('click', () => setTool(true));
  setTool(false);

  $('btnClear').addEventListener('click', () => {
    engine.clearBarriers();
    engine.reset();
    markShape(null);
    syncStats();
  });

  const canvas = renderer.canvas;
  let painting = false;

  function canvasPoint(ev) {
    const r = canvas.getBoundingClientRect();
    return { px: ev.clientX - r.left, py: ev.clientY - r.top };
  }
  function paintAt(ev) {
    const { px, py } = canvasPoint(ev);
    if (!renderer.hitField(px, py)) return;
    const g = renderer.toGrid(px, py);
    engine.paint(g.x, g.y, brush, erasing);
    markShape(null);
  }

  canvas.addEventListener('pointerdown', (ev) => {
    const { px, py } = canvasPoint(ev);
    if (!renderer.hitField(px, py)) return;
    ev.preventDefault();
    canvas.setPointerCapture?.(ev.pointerId);
    painting = true;
    paintAt(ev);
  });
  canvas.addEventListener('pointermove', (ev) => {
    const { px, py } = canvasPoint(ev);
    renderer.setHover(renderer.hitField(px, py) ? px : null, py);
    if (painting) { ev.preventDefault(); paintAt(ev); }
  });
  const stop = (ev) => {
    if (!painting) return;
    canvas.releasePointerCapture?.(ev.pointerId);
    painting = false;
    syncStats();
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('pointerleave', (ev) => { renderer.setHover(null); stop(ev); });

  // ── Global ───────────────────────────────────────────────────────────────
  $('btnReset').addEventListener('click', () => {
    $('slRe').value = DEFAULTS.Re;
    $('slSteps').value = DEFAULTS.steps;
    $('slBrush').value = DEFAULTS.brush;
    for (const id of ['slRe', 'slSteps', 'slBrush']) $(id).dispatchEvent(new Event('input'));
    tgTracers.checked = true;
    engine.setShowTracers(true);
    engine.preset('cylinder');
    engine.resume();
    btnPause.classList.remove('active');
    setField('vorticity');
    setTool(false);
    markShape('cylinder');
    syncStats();
  });

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('fluid:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  markShape('cylinder');
  syncStats();

  return { syncStats };
}
