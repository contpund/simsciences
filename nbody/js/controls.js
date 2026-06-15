// Wires the DOM controls to the N-body engine + renderer. Sliders that only
// scale the dynamics (G, softening, speed) apply live; sliders that are
// initial conditions (N, spin) and the distribution presets re-seed the
// system on commit. Mirrors the slider-fill + tooltip pattern of ep03/ep04.

const PRESETS = {
  galaxy:    { distribution: 'disk',      spin: 1.0 },
  collision: { distribution: 'collision', spin: 1.0 },
  collapse:  { distribution: 'cloud',     spin: 0.0 },
  cluster:   { distribution: 'cluster',   spin: 0.4 },
};

function setSliderFill(input) {
  const pct = ((+input.value - +input.min) / (+input.max - +input.min)) * 100;
  input.style.setProperty('--fill', pct + '%');
}

/** onLive runs on every `input`; onCommit (optional) runs on `change`
 *  (pointer release) — used for the expensive re-seeding sliders. */
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

  bindSlider($('slN'), $('valN'), (v) => Math.round(v).toString(),
    null, (v) => engine.setN(v));
  bindSlider($('slSpin'), $('valSpin'), (v) => v.toFixed(2) + '×',
    null, (v) => engine.setSpin(v));
  bindSlider($('slG'), $('valG'), (v) => v.toFixed(2),
    (v) => engine.setG(v));
  bindSlider($('slSoft'), $('valSoft'), (v) => v.toFixed(1),
    (v) => engine.setSoft(v));
  bindSlider($('slSpeed'), $('valSpeed'), (v) => v.toFixed(2) + '×',
    (v) => engine.setSpeed(v));

  const tgTrails = $('tgTrails');
  tgTrails.addEventListener('change', () => renderer.setTrails(tgTrails.checked));
  renderer.setTrails(tgTrails.checked);

  const tgColor = $('tgColor');
  tgColor.addEventListener('change', () => renderer.setColorByRadius(tgColor.checked));
  renderer.setColorByRadius(tgColor.checked);

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    $('slSpin').value = p.spin;
    setSliderFill($('slSpin'));
    $('valSpin').textContent = p.spin.toFixed(2) + '×';
    engine.reset({ distribution: p.distribution, spin: p.spin });
  }
  $('btnGalaxy').addEventListener('click', () => applyPreset('galaxy'));
  $('btnCollision').addEventListener('click', () => applyPreset('collision'));
  $('btnCollapse').addEventListener('click', () => applyPreset('collapse'));
  $('btnCluster').addEventListener('click', () => applyPreset('cluster'));
  $('btnReset').addEventListener('click', () => applyPreset('galaxy'));

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('nbody:pause-state', (ev) => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });
}
