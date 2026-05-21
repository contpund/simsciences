// Bind sliders + toggles + preset buttons to the engine.

export function initControls(engine, renderer) {
  // Set the CSS --fill custom property on a slider so its colored fill
  // matches the current value. This is what the .stage range CSS reads
  // via `background-size: var(--fill, 50%) 100%`.
  const updateFill = (sl) => {
    const min = parseFloat(sl.min);
    const max = parseFloat(sl.max);
    const val = parseFloat(sl.value);
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    sl.style.setProperty('--fill', `${pct.toFixed(2)}%`);
  };

  const bind = (id, valId, key, fmt = (v) => v.toFixed(2), transform = (v) => v) => {
    const sl = document.getElementById(id);
    const out = document.getElementById(valId);
    if (!sl || !out) return;
    const update = () => {
      const raw = parseFloat(sl.value);
      const v = transform(raw);
      engine.setParam(key, v);
      out.textContent = fmt(v);
      updateFill(sl);
    };
    sl.addEventListener('input', update);
    update();
  };

  // Lengths in meters
  bind('slL1', 'valL1', 'L1', (v) => v.toFixed(2) + ' m');
  bind('slL2', 'valL2', 'L2', (v) => v.toFixed(2) + ' m');
  // Masses in kg
  bind('slM1', 'valM1', 'm1', (v) => v.toFixed(2) + ' kg');
  bind('slM2', 'valM2', 'm2', (v) => v.toFixed(2) + ' kg');
  // Angles in degrees (slider is degrees, engine wants radians)
  bind('slT1', 'valT1', 'theta1', (v) => (v * 180 / Math.PI).toFixed(0) + '°',
       (deg) => deg * Math.PI / 180);
  bind('slT2', 'valT2', 'theta2', (v) => (v * 180 / Math.PI).toFixed(0) + '°',
       (deg) => deg * Math.PI / 180);
  // Damping
  bind('slDamping', 'valDamping', 'damping', (v) => v.toFixed(3));

  // Trace toggle
  const tgTrace = document.getElementById('tgTrace');
  if (tgTrace) {
    tgTrace.checked = renderer.showTrace;
    tgTrace.addEventListener('change', () => {
      renderer.showTrace = tgTrace.checked;
      if (!tgTrace.checked) engine.clearTrails();
    });
  }

  // Twin toggle — the chaos demo
  const tgTwin = document.getElementById('tgTwin');
  if (tgTwin) {
    tgTwin.checked = engine.params.twinEnabled;
    tgTwin.addEventListener('change', () => {
      engine.setTwinEnabled(tgTwin.checked);
    });
  }

  // Start / Pause / Play — single button with state-aware label.
  //   - before first release : "▶ Start" (releases the upright pendulum)
  //   - after release, running : "⏸ Pause"
  //   - after pause           : "▶ Play"
  const btnPause = document.getElementById('btnPause');
  const refreshPauseLabel = () => {
    if (!btnPause) return;
    if (!engine.released) btnPause.textContent = '▶ Start';
    else if (engine.paused) btnPause.textContent = '▶ Play';
    else btnPause.textContent = '⏸ Pause';
  };
  refreshPauseLabel();
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      if (!engine.released) {
        engine.release();
      } else {
        engine.paused = !engine.paused;
      }
      refreshPauseLabel();
    });
  }
  // Expose to renderer/main so they can keep the label in sync when reset()
  // is called from elsewhere.
  engine.__refreshPauseLabel = refreshPauseLabel;

  // Reset — puts the pendulum back upright and paused
  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      engine.reset();
      const setSlider = (id, value) => {
        const el = document.getElementById(id);
        if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      setSlider('slL1', engine.params.L1);
      setSlider('slL2', engine.params.L2);
      setSlider('slM1', engine.params.m1);
      setSlider('slM2', engine.params.m2);
      setSlider('slT1', engine.params.theta1 * 180 / Math.PI);
      setSlider('slT2', engine.params.theta2 * 180 / Math.PI);
      setSlider('slDamping', engine.params.damping);
      refreshPauseLabel();
    });
  }

  // Preset shortcuts. Each preset re-poses the pendulum and pauses; user
  // hits Start to release.
  const presets = {
    btnGentle:   { theta1: 30,  theta2: 30,  L1: 1.5, L2: 1.5, m1: 1.0, m2: 1.0, damping: 0 },
    btnWild:     { theta1: 150, theta2: 150, L1: 1.6, L2: 1.4, m1: 1.0, m2: 2.0, damping: 0 },
    btnAsymmetric: { theta1: 120, theta2: 60, L1: 2.0, L2: 0.8, m1: 0.5, m2: 3.0, damping: 0 },
  };
  for (const id of Object.keys(presets)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.addEventListener('click', () => {
      const p = presets[id];
      const setSlider = (slId, value) => {
        const el = document.getElementById(slId);
        if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      setSlider('slL1', p.L1);
      setSlider('slL2', p.L2);
      setSlider('slM1', p.m1);
      setSlider('slM2', p.m2);
      setSlider('slT1', p.theta1);
      setSlider('slT2', p.theta2);
      setSlider('slDamping', p.damping);
      // Park the pendulum at the new initial state and wait for Start.
      engine.paused = true;
      engine.released = false;
      engine.clearTrails();
      refreshPauseLabel();
    });
  }
}
