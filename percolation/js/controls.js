// Wires the DOM controls to the percolation engine + renderer.
//
// Every slider applies on 'input' (not 'change') because the capture pipeline
// drives them with a synthetic input event.

import { t, getLang } from './i18n.js';

const DEFAULTS = { p: 0.55, size: 100, speed: 2 };

// The tooltips are written with a French comma; the readouts must agree.
const dec = (v, d) => v.toFixed(d).replace('.', getLang() === 'fr' ? ',' : '.');
const pct = (v, d = 1) => dec(v * 100, d) + ' %';

// Each preset keeps the current rock and moves the water table to its p, so
// you watch the same landscape seal or open at different porosities.
const PRESETS = { sealed: 0.45, soclose: 0.57, threshold: 0.5927, through: 0.65 };

function setSliderFill(input) {
  const p = ((+input.value - +input.min) / (+input.max - +input.min)) * 100;
  input.style.setProperty('--fill', p + '%');
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

  // Declared first: bindSlider fires its handler during setup, and that handler
  // calls syncStats(), which reads all of these.
  const outP = $('valP'), outOpen = $('valOpen'), outLargest = $('valLargest');
  const outDepth = $('valDepth'), outPc = $('valPc'), outState = $('valState');

  function syncStats() {
    outP.textContent = dec(engine.p, 3);
    outP.classList.toggle('over', engine.p > engine.pc);
    outOpen.textContent = pct(engine.openFraction);
    outLargest.textContent = pct(engine.largestFraction);
    outLargest.classList.toggle('warm', engine.largestFraction > 0.25);
    outDepth.textContent = pct(engine.depthFraction, 0);
    outDepth.classList.toggle('good', engine.percolated);
    outPc.textContent = dec(engine.pc, 4);
    const st = engine.state;
    outState.textContent = t('state.' + st);
    outState.classList.toggle('good', st === 'percolates');
    outState.classList.toggle('warm', st === 'pouring');
  }

  bindSlider($('slP'), $('valPslider'), (v) => dec(v, 3),
    (v) => { engine.setP(v); syncStats(); });
  bindSlider($('slSpeed'), $('valSpeed'), (v) => String(Math.round(v)),
    (v) => engine.setLayersPerFrame(v));

  // Size re-seeds the rock: a different lattice is a different landscape.
  bindSlider($('slSize'), $('valSize'), (v) => String(Math.round(v)), (v) => {
    if (engine.L !== Math.round(v)) { engine.setSize(v); syncStats(); }
  });

  $('tgClusters').addEventListener('input', (ev) => {
    renderer.showClusters = ev.target.checked;
  });

  // ── Experiments ──────────────────────────────────────────────────────────
  const presetBtns = { sealed: $('btnSealed'), soclose: $('btnSoclose'), threshold: $('btnThreshold'), through: $('btnThrough') };

  function markPreset(name) {
    for (const [k, b] of Object.entries(presetBtns)) b.classList.toggle('active', k === name);
  }

  function runPreset(name) {
    const p = PRESETS[name];
    engine.setP(p);
    engine.pour();
    const s = $('slP');
    s.value = p;
    setSliderFill(s);
    $('valPslider').textContent = dec(p, 3);
    engine.resume();
    btnPause.classList.remove('active');
    markPreset(name);
    syncStats();
  }
  for (const name of Object.keys(presetBtns)) {
    presetBtns[name].addEventListener('click', () => runPreset(name));
  }

  // Deviating from a preset should un-highlight it.
  $('slP').addEventListener('input', () => {
    const v = +$('slP').value;
    const hit = Object.entries(PRESETS).find(([, p]) => Math.abs(p - v) < 1e-9);
    markPreset(hit ? hit[0] : null);
  });

  $('btnShuffle').addEventListener('click', () => {
    engine.randomize();
    engine.resume();
    btnPause.classList.remove('active');
    syncStats();
  });

  $('btnPour').addEventListener('click', () => {
    engine.pour();
    engine.resume();
    btnPause.classList.remove('active');
    syncStats();
  });

  $('btnReset').addEventListener('click', () => {
    $('slP').value = DEFAULTS.p;
    $('slSize').value = DEFAULTS.size;
    $('slSpeed').value = DEFAULTS.speed;
    for (const id of ['slSize', 'slP', 'slSpeed']) $(id).dispatchEvent(new Event('input'));
    $('tgClusters').checked = false;
    renderer.showClusters = false;
    engine.setSize(DEFAULTS.size);
    engine.setP(DEFAULTS.p);
    engine.pour();
    engine.resume();
    btnPause.classList.remove('active');
    markPreset(null);
    syncStats();
  });

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('percolation:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  markPreset(null);
  syncStats();

  return { syncStats };
}
