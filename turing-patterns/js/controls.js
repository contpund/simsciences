// Wires the sidebar controls to the Gray-Scott engine.

import { PRESETS } from './engine.js';

function setSliderFill(input) {
  const min = +input.min, max = +input.max, val = +input.value;
  const pct = ((val - min) / (max - min)) * 100;
  input.style.setProperty('--fill', pct + '%');
}

function bindSlider(input, valueEl, format, onChange) {
  const update = () => {
    setSliderFill(input);
    if (valueEl) valueEl.textContent = format(+input.value);
    onChange(+input.value);
  };
  input.addEventListener('input', update);
  update();
}

export function initControls(engine) {
  const $ = (id) => document.getElementById(id);

  bindSlider($('slFeed'),  $('valFeed'),  v => v.toFixed(4),
    v => engine.setParam('feed', v));
  bindSlider($('slKill'),  $('valKill'),  v => v.toFixed(4),
    v => engine.setParam('kill', v));
  bindSlider($('slDA'),    $('valDA'),    v => v.toFixed(2),
    v => engine.setParam('dA', v));
  bindSlider($('slDB'),    $('valDB'),    v => v.toFixed(2),
    v => engine.setParam('dB', v));
  bindSlider($('slSpeed'), $('valSpeed'), v => Math.round(v) + '×',
    v => engine.setParam('speed', v));

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    $('slFeed').value = p.feed;
    $('slKill').value = p.kill;
    $('slDA').value = p.dA;
    $('slDB').value = p.dB;
    $('slFeed').dispatchEvent(new Event('input'));
    $('slKill').dispatchEvent(new Event('input'));
    $('slDA').dispatchEvent(new Event('input'));
    $('slDB').dispatchEvent(new Event('input'));
    engine.setPalette(p.palette);
    paletteButtons.forEach(b => b.classList.toggle('active', b.dataset.palette === p.palette));
    engine.resetSeed(p.seed);
  }

  $('btnLeopard').addEventListener('click',   () => applyPreset('leopard'));
  $('btnZebra').addEventListener('click',     () => applyPreset('zebra'));
  $('btnCoral').addEventListener('click',     () => applyPreset('coral'));
  $('btnMitosis').addEventListener('click',   () => applyPreset('mitosis'));
  $('btnLabyrinth').addEventListener('click', () => applyPreset('labyrinth'));
  $('btnSolitons').addEventListener('click',  () => applyPreset('solitons'));
  $('btnReset').addEventListener('click', () => engine.resetSeed('random'));

  const paletteButtons = Array.from(document.querySelectorAll('.palette-btn'));
  paletteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.palette;
      engine.setPalette(p);
      paletteButtons.forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  // Default highlight on SimSciences palette.
  paletteButtons.find(b => b.dataset.palette === 'sim')?.classList.add('active');

  const btnPause = $('btnPause');
  btnPause.addEventListener('click', () => {
    const paused = engine.togglePause();
    btnPause.classList.toggle('active', paused);
  });
  window.addEventListener('turing:pause-state', ev => {
    btnPause.classList.toggle('active', !!ev.detail.paused);
  });

  // Click-drag painting on the canvas.
  const canvas = document.getElementById('sim');
  let painting = false;
  function paintFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = 1 - (e.clientY - rect.top) / rect.height;   // flip Y to match shader coords
    engine.paintAt(u, v, 0.025, 0.6);
  }
  canvas.addEventListener('pointerdown', e => {
    painting = true;
    canvas.setPointerCapture(e.pointerId);
    paintFromEvent(e);
  });
  canvas.addEventListener('pointermove', e => { if (painting) paintFromEvent(e); });
  canvas.addEventListener('pointerup',   () => painting = false);
  canvas.addEventListener('pointerleave', () => painting = false);
}
