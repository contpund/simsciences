// Wires the DOM controls to the engine and renderer for the Lorenz page.
// Mirrors the slider-fill + tooltip pattern of the double-pendulum page.

const PRESETS = {
  classic:  { sigma: 10, rho: 28,    beta: 8 / 3 },
  stable:   { sigma: 10, rho: 0.5,   beta: 8 / 3 },
  periodic: { sigma: 10, rho: 99.96, beta: 8 / 3 },
  wild:     { sigma: 10, rho: 160,   beta: 8 / 3 },
};

function setSliderFill(input) {
  const min = +input.min;
  const max = +input.max;
  const val = +input.value;
  const pct = ((val - min) / (max - min)) * 100;
  input.style.setProperty('--fill', pct + '%');
}

function bindSlider(input, valueEl, formatter, onChange) {
  const update = () => {
    setSliderFill(input);
    if (valueEl) valueEl.textContent = formatter(+input.value);
    onChange(+input.value);
  };
  input.addEventListener('input', update);
  update();
}

export function initControls(engine, renderer) {
  const $ = (id) => document.getElementById(id);

  bindSlider($('slSigma'), $('valSigma'), (v) => v.toFixed(2),
    (v) => engine.setParam('sigma', v));
  bindSlider($('slRho'), $('valRho'), (v) => v.toFixed(2),
    (v) => engine.setParam('rho', v));
  bindSlider($('slBeta'), $('valBeta'), (v) => v.toFixed(3),
    (v) => engine.setParam('beta', v));
  bindSlider($('slSpeed'), $('valSpeed'), (v) => v.toFixed(2) + '×',
    (v) => engine.setSpeed(v));
  bindSlider($('slTrail'), $('valTrail'), (v) => Math.round(v).toString(),
    (v) => engine.setTrailMax(v));

  const tgRotate = $('tgRotate');
  tgRotate.addEventListener('change', () => renderer.setAutoRotate(tgRotate.checked));
  renderer.setAutoRotate(tgRotate.checked);

  const tgTwin = $('tgTwin');
  tgTwin.addEventListener('change', () => {
    if (tgTwin.checked) engine.enableTwin();
    else engine.disableTwin();
  });

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    $('slSigma').value = p.sigma;
    $('slRho').value = p.rho;
    $('slBeta').value = p.beta;
    $('slSigma').dispatchEvent(new Event('input'));
    $('slRho').dispatchEvent(new Event('input'));
    $('slBeta').dispatchEvent(new Event('input'));
    engine.reset(p);
    tgTwin.checked = false;
  }
  $('btnClassic').addEventListener('click', () => applyPreset('classic'));
  $('btnStable').addEventListener('click', () => applyPreset('stable'));
  $('btnPeriodic').addEventListener('click', () => applyPreset('periodic'));
  $('btnWild').addEventListener('click', () => applyPreset('wild'));

  $('btnReset').addEventListener('click', () => applyPreset('classic'));

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('lorenz:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  // Manual orbit via drag.
  const canvas = document.getElementById('sim');
  let dragging = false;
  let lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    // Auto-rotate pauses while user is in control.
    renderer.setAutoRotate(false);
    tgRotate.checked = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.bumpYaw(dx * 0.01);
    renderer.bumpTilt(-dy * 0.005);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointerleave', () => { dragging = false; });
}
