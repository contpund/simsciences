// Wires the DOM controls to the Kuramoto engine + renderer.
//
// Every slider applies on 'input' (not 'change') because the capture pipeline
// drives them with a synthetic input event.

import { t, getLang } from './i18n.js';

const DEFAULTS = { K: 0.60, gamma: 0.60, size: 500, speed: 3 };

// The tooltips are written with a French comma; the readouts must agree.
const dec = (v, d) => v.toFixed(d).replace('.', getLang() === 'fr' ? ',' : '.');

// Each preset reshuffles the population, then sets the coupling, so you watch
// the crowd lock in (or fail to) from scattered phases every time.
const PRESETS = { silence: 0.60, threshold: 1.20, lockin: 1.80, onemind: 3.60 };

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
  const outK = $('valK'), outR = $('valR'), outKc = $('valKc');
  const outRt = $('valRt'), outN = $('valN'), outState = $('valState');

  function syncStats() {
    outK.textContent = dec(engine.K, 2);
    outK.classList.toggle('over', engine.K > engine.Kc);
    outR.textContent = dec(engine.coherence, 2);
    outR.classList.toggle('good', engine.coherence > 0.25);
    outKc.textContent = dec(engine.Kc, 2);
    const rt = engine.rTheory;
    outRt.textContent = rt > 0.001 ? dec(rt, 2) : '—';
    outN.textContent = String(engine.n);
    const st = engine.state;
    outState.textContent = t('state.' + st);
    outState.classList.toggle('good', st === 'locked');
    outState.classList.toggle('warm', st === 'synchronizing');
  }

  bindSlider($('slK'), $('valKslider'), (v) => (getLang() === 'fr' ? v.toFixed(2).replace('.', ',') : v.toFixed(2)),
    (v) => { engine.setK(v); syncStats(); });
  bindSlider($('slSpeed'), $('valSpeed'), (v) => String(Math.round(v)),
    (v) => engine.setStepsPerFrame(v));

  // Spread and size are initial conditions: touching them re-seeds the
  // population, which is what a visitor expects and what K_c = 2γ requires.
  bindSlider($('slGamma'), $('valGamma'), (v) => (getLang() === 'fr' ? v.toFixed(2).replace('.', ',') : v.toFixed(2)), (v) => {
    if (Math.abs(engine.gamma - v) > 1e-9) { engine.setGamma(v); syncStats(); }
  });
  bindSlider($('slSize'), $('valSize'), (v) => String(Math.round(v)), (v) => {
    if (engine.n !== Math.round(v)) { engine.setSize(v); syncStats(); }
  });

  // ── Experiments ──────────────────────────────────────────────────────────
  const presetBtns = { silence: $('btnSilence'), threshold: $('btnThreshold'), lockin: $('btnLockin'), onemind: $('btnOnemind') };

  function markPreset(name) {
    for (const [k, b] of Object.entries(presetBtns)) b.classList.toggle('active', k === name);
  }

  function runPreset(name) {
    const K = PRESETS[name];
    engine.randomize();
    engine.setK(K);
    const s = $('slK');
    s.value = K;
    setSliderFill(s);
    $('valKslider').textContent = getLang() === 'fr' ? K.toFixed(2).replace('.', ',') : K.toFixed(2);
    engine.resume();
    btnPause.classList.remove('active');
    markPreset(name);
    syncStats();
  }
  for (const name of Object.keys(presetBtns)) {
    presetBtns[name].addEventListener('click', () => runPreset(name));
  }

  // Deviating from a preset should un-highlight it.
  $('slK').addEventListener('input', () => {
    const v = +$('slK').value;
    const hit = Object.entries(PRESETS).find(([, K]) => Math.abs(K - v) < 1e-9);
    markPreset(hit ? hit[0] : null);
  });

  $('btnShuffle').addEventListener('click', () => {
    engine.randomize();
    engine.resume();
    btnPause.classList.remove('active');
    syncStats();
  });

  $('btnReset').addEventListener('click', () => {
    $('slK').value = DEFAULTS.K;
    $('slGamma').value = DEFAULTS.gamma;
    $('slSize').value = DEFAULTS.size;
    $('slSpeed').value = DEFAULTS.speed;
    for (const id of ['slSize', 'slGamma', 'slK', 'slSpeed']) $(id).dispatchEvent(new Event('input'));
    engine.randomize();
    engine.setK(DEFAULTS.K);
    engine.resume();
    btnPause.classList.remove('active');
    markPreset('silence');
    syncStats();
  });

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('kuramoto:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  markPreset('silence');
  syncStats();

  return { syncStats };
}
