// Wires the DOM controls to the double-slit engine + renderer. Pattern-changing
// inputs (λ, d, L, mode, observe) update the theoretical curve live, but clear
// the accumulated screen on commit so each new pattern builds from scratch —
// the cleanest way to watch fringes appear, then vanish under observation.

function setSliderFill(input) {
  const pct = ((+input.value - +input.min) / (+input.max - +input.min)) * 100;
  input.style.setProperty('--fill', pct + '%');
}

function bindSlider(input, valueEl, formatter, onLive, onCommit) {
  const live = () => {
    setSliderFill(input);
    if (valueEl) valueEl.textContent = formatter(+input.value);
    if (onLive) onLive(+input.value);
  };
  input.addEventListener('input', live);
  if (onCommit) input.addEventListener('change', () => onCommit(+input.value));
  live();
}

export function initControls(engine, renderer) {
  const $ = (id) => document.getElementById(id);

  bindSlider($('slLambda'), $('valLambda'), (v) => v.toFixed(2),
    (v) => engine.setLambda(v), () => engine.clearScreen());
  bindSlider($('slD'), $('valD'), (v) => v.toFixed(2),
    (v) => engine.setD(v), () => engine.clearScreen());
  bindSlider($('slL'), $('valL'), (v) => v.toFixed(2),
    (v) => engine.setL(v), () => engine.clearScreen());
  bindSlider($('slRate'), $('valRate'), (v) => v.toFixed(1) + '×',
    (v) => engine.setRate(v));

  const tgObserve = $('tgObserve');
  tgObserve.addEventListener('change', () => {
    engine.setObserve(tgObserve.checked);
    engine.clearScreen();
  });

  const modeBtns = { photon: $('btnPhoton'), electron: $('btnElectron'), ball: $('btnBall') };
  function setMode(m) {
    engine.setMode(m);
    engine.clearScreen();
    for (const [k, btn] of Object.entries(modeBtns)) btn.classList.toggle('active', k === m);
    // Observing only makes sense for quanta.
    tgObserve.disabled = (m === 'ball');
  }
  modeBtns.photon.addEventListener('click', () => setMode('photon'));
  modeBtns.electron.addEventListener('click', () => setMode('electron'));
  modeBtns.ball.addEventListener('click', () => setMode('ball'));
  setMode(engine.mode);

  $('btnClear').addEventListener('click', () => engine.clearScreen());

  $('btnReset').addEventListener('click', () => {
    $('slLambda').value = 1.0; $('slD').value = 1.0; $('slL').value = 1.0; $('slRate').value = 2;
    for (const id of ['slLambda', 'slD', 'slL', 'slRate']) $(id).dispatchEvent(new Event('input'));
    tgObserve.checked = false;
    engine.reset({ lambda: 1.0, d: 1.0, L: 1.0, observe: false, mode: 'photon', rate: 2 });
    setMode('photon');
  });

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('dslit:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });
}
