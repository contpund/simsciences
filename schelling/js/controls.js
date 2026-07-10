// Wires the DOM controls to the Schelling engine + renderer.
//
// Every slider applies on 'input' (not 'change') because the capture pipeline
// drives them with a synthetic input event.

import { t, getLang } from './i18n.js';

const DEFAULTS = { tau: 0.30, empty: 0.10, size: 60, speed: 240 };

// The tooltips are written with a French comma; the readouts must agree.
const dec = (v, d) => v.toFixed(d).replace('.', getLang() === 'fr' ? ',' : '.');

// Each preset is a clean experiment: reshuffle, then set the demand. Otherwise
// you would be measuring the leftovers of the previous run.
const PRESETS = { mild: 0.30, half: 0.50, last: 0.75, never: 0.80 };

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

  // Declared first: bindSlider fires its handler during setup, and that handler
  // calls syncStats(), which reads all of these.
  const outAsked = $('valAsked'), outGot = $('valGot'), outRandom = $('valRandom');
  const outUnhappy = $('valUnhappy'), outRounds = $('valRounds'), outState = $('valState');
  const outChurn = $('valChurn');

  function syncStats() {
    const asked = engine.tau * 100, got = engine.segregation * 100;
    outAsked.textContent = asked.toFixed(0) + ' %';
    outGot.textContent = dec(got, 1) + ' %';
    outGot.classList.toggle('over', got > asked + 5);
    outRandom.textContent = '50 %';
    outUnhappy.textContent = dec(engine.unhappyFraction * 100, 1) + ' %';
    outRounds.textContent = String(engine.rounds);
    outChurn.textContent = engine.rounds ? dec(engine.churnRate * 100, 1) + ' %' : '—';
    const st = engine.state;
    outState.textContent = t('state.' + st);
    outState.classList.toggle('bad', st === 'restless');
    outState.classList.toggle('good', st === 'settled');
  }

  bindSlider($('slTau'), $('valTau'), (v) => (v * 100).toFixed(0) + ' %',
    (v) => { engine.setTau(v); syncStats(); });
  bindSlider($('slSpeed'), $('valSpeed'), (v) => String(Math.round(v)),
    (v) => engine.setStepsPerFrame(v));

  // Empty homes and grid size are initial conditions: touching them re-seeds
  // the neighbourhood, which is what a visitor expects and what the numbers
  // require — S must start from the random baseline.
  bindSlider($('slEmpty'), $('valEmpty'), (v) => (v * 100).toFixed(0) + ' %', (v) => {
    if (Math.abs(engine.emptyFrac - v) > 1e-9) { engine.setEmptyFrac(v); syncStats(); }
  });
  bindSlider($('slSize'), $('valSize'), (v) => `${Math.round(v)} × ${Math.round(v)}`, (v) => {
    if (engine.n !== Math.round(v)) { engine.setSize(v); syncStats(); }
  });

  // ── Experiments ──────────────────────────────────────────────────────────
  const presetBtns = { mild: $('btnMild'), half: $('btnHalf'), last: $('btnLast'), never: $('btnNever') };

  function markPreset(name) {
    for (const [k, b] of Object.entries(presetBtns)) b.classList.toggle('active', k === name);
  }

  function runPreset(name) {
    const tau = PRESETS[name];
    engine.randomize();
    engine.setTau(tau);
    const s = $('slTau');
    s.value = tau;
    setSliderFill(s);
    $('valTau').textContent = (tau * 100).toFixed(0) + ' %';
    engine.resume();
    btnPause.classList.remove('active');
    markPreset(name);
    syncStats();
  }
  for (const name of Object.keys(presetBtns)) {
    presetBtns[name].addEventListener('click', () => runPreset(name));
  }

  // Deviating from a preset should un-highlight it.
  $('slTau').addEventListener('input', () => {
    const v = +$('slTau').value;
    const hit = Object.entries(PRESETS).find(([, tau]) => Math.abs(tau - v) < 1e-9);
    markPreset(hit ? hit[0] : null);
  });

  $('btnShuffle').addEventListener('click', () => {
    engine.randomize();
    engine.setTau(engine.tau);   // rebuild the stats against the fresh grid
    engine.resume();
    btnPause.classList.remove('active');
    syncStats();
  });

  $('btnReset').addEventListener('click', () => {
    $('slTau').value = DEFAULTS.tau;
    $('slEmpty').value = DEFAULTS.empty;
    $('slSize').value = DEFAULTS.size;
    $('slSpeed').value = DEFAULTS.speed;
    for (const id of ['slSize', 'slEmpty', 'slTau', 'slSpeed']) $(id).dispatchEvent(new Event('input'));
    engine.randomize();
    engine.setTau(DEFAULTS.tau);
    engine.resume();
    btnPause.classList.remove('active');
    markPreset('mild');
    syncStats();
  });

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('schelling:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  markPreset('mild');
  syncStats();

  return { syncStats };
}
