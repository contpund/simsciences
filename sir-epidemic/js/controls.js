// Wires the DOM controls to the SIR engine + renderer.
//
// β, γ and speed retune the epidemic while it runs. Vaccination coverage and
// population size are initial conditions, so touching them re-seeds the crowd
// and restarts the outbreak — which is exactly the point of the vaccination
// slider: you are choosing the world the epidemic starts in.
//
// Every slider applies on 'input' (not 'change') because the capture pipeline
// drives them with a synthetic input event.

// R₀ and mean infectious period for four real diseases.
const PRESETS = {
  flu:      { beta: 0.26, gamma: 0.20 },   // R₀ ≈ 1.3
  covid:    { beta: 0.45, gamma: 0.15 },   // R₀ ≈ 3
  smallpox: { beta: 0.72, gamma: 0.12 },   // R₀ ≈ 6
  measles:  { beta: 1.80, gamma: 0.12 },   // R₀ ≈ 15
};

const DEFAULTS = { beta: 0.45, gamma: 0.15, vax: 0, N: 700, speed: 1 };

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

  // ── Live readouts ────────────────────────────────────────────────────────
  // Declared before the sliders: bindSlider fires its handler once on setup,
  // and those handlers call syncStats.
  const outR0 = $('valR0'), outReff = $('valReff'), outVc = $('valVc');
  const outPeak = $('valPeak'), outAttack = $('valAttack');

  function syncStats() {
    const r0 = engine.R0, reff = engine.Reff;
    outR0.textContent = Number.isFinite(r0) ? r0.toFixed(2) : '∞';
    outReff.textContent = reff.toFixed(2);
    outReff.classList.toggle('danger', reff >= 1);
    outReff.classList.toggle('safe', reff < 1);
    outVc.textContent = (engine.herdThreshold * 100).toFixed(0) + ' %';
    outPeak.textContent = String(engine.peakI);
    outAttack.textContent = (engine.attackRate * 100).toFixed(1) + ' %';
  }

  // R₀ and the herd-immunity threshold are functions of β and γ, so the
  // readouts have to follow the slider immediately rather than wait for the
  // next animation frame (which never comes while the model is paused).
  bindSlider($('slBeta'), $('valBeta'), (v) => v.toFixed(2), (v) => { engine.setBeta(v); syncStats(); });
  bindSlider($('slGamma'), $('valGamma'), (v) => v.toFixed(2), (v) => { engine.setGamma(v); syncStats(); });
  bindSlider($('slSpeed'), $('valSpeed'), (v) => v.toFixed(2) + '×', (v) => engine.setSpeed(v));

  // Initial conditions: only re-seed when the value really moved, so dragging
  // does not thrash the allocator.
  bindSlider($('slVax'), $('valVax'), (v) => (v * 100).toFixed(0) + ' %', (v) => {
    if (Math.abs(engine.vax - v) > 1e-9) { engine.setVax(v); syncStats(); }
  });
  bindSlider($('slN'), $('valN'), (v) => String(Math.round(v)), (v) => {
    if (engine.N !== Math.round(v)) { engine.setN(v); syncStats(); }
  });

  const tgTheory = $('tgTheory');
  tgTheory.addEventListener('change', () => renderer.setShowTheory(tgTheory.checked));
  renderer.setShowTheory(tgTheory.checked);

  // ── Disease presets ──────────────────────────────────────────────────────
  const presetBtns = {
    flu: $('btnFlu'), covid: $('btnCovid'),
    smallpox: $('btnSmallpox'), measles: $('btnMeasles'),
  };

  function markPreset(name) {
    for (const [k, btn] of Object.entries(presetBtns)) btn.classList.toggle('active', k === name);
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    $('slBeta').value = p.beta;
    $('slGamma').value = p.gamma;
    $('slVax').value = 0;               // start from an unprotected population
    for (const id of ['slBeta', 'slGamma', 'slVax']) $(id).dispatchEvent(new Event('input'));
    engine.reset({ beta: p.beta, gamma: p.gamma, vax: 0 });
    markPreset(name);
    syncStats();
  }

  for (const name of Object.keys(presetBtns)) {
    presetBtns[name].addEventListener('click', () => applyPreset(name));
  }

  // Clearing the preset highlight the moment the user deviates from it.
  for (const id of ['slBeta', 'slGamma']) {
    $(id).addEventListener('input', () => {
      const b = +$('slBeta').value, g = +$('slGamma').value;
      const match = Object.entries(PRESETS)
        .find(([, p]) => Math.abs(p.beta - b) < 1e-9 && Math.abs(p.gamma - g) < 1e-9);
      markPreset(match ? match[0] : null);
    });
  }

  // ── The payoff button: cross the herd-immunity threshold ─────────────────
  $('btnHerd').addEventListener('click', () => {
    const vc = engine.herdThreshold;
    const slVax = $('slVax');
    // A hair above vc, so Rₑ starts below 1 rather than exactly at it.
    slVax.value = Math.min(+slVax.max, Math.max(+slVax.min, vc + 0.01));
    slVax.dispatchEvent(new Event('input'));
    syncStats();
  });

  $('btnReset').addEventListener('click', () => {
    $('slBeta').value = DEFAULTS.beta;
    $('slGamma').value = DEFAULTS.gamma;
    $('slVax').value = DEFAULTS.vax;
    $('slN').value = DEFAULTS.N;
    $('slSpeed').value = DEFAULTS.speed;
    for (const id of ['slBeta', 'slGamma', 'slVax', 'slN', 'slSpeed']) {
      $(id).dispatchEvent(new Event('input'));
    }
    engine.reset({ ...DEFAULTS });
    markPreset('covid');   // the defaults are the COVID preset
    syncStats();
  });

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('sir:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  markPreset('covid');
  syncStats();

  return { syncStats };
}
