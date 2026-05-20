// Sidebar wiring: sliders → engine (live), toggles, click-to-place obstacles,
// pause/resume, and atomic preset bundles tuned against the acceptance criteria.

import { DEFAULTS } from './engine.js';
import { t } from './i18n.js';

const SLIDERS = [
  { id: 'slCount', param: 'count', val: 'valCount', fixed: 0 },
  { id: 'slCohesion', param: 'cohesion', val: 'valCohesion', fixed: 2 },
  { id: 'slSeparation', param: 'separation', val: 'valSeparation', fixed: 2 },
  { id: 'slAlignment', param: 'alignment', val: 'valAlignment', fixed: 2 },
  { id: 'slVision', param: 'visionRadius', val: 'valVision', fixed: 0 },
  { id: 'slSpeed', param: 'maxSpeed', val: 'valSpeed', fixed: 1 },
];

export const PRESETS = {
  // High alignment + wide vision + gentle separation → starling murmuration.
  murmur: { count: 220, cohesion: 0.9, separation: 0.8, alignment: 1.8, visionRadius: 85, maxSpeed: 3.6 },
  // No alignment, weak cohesion → erratic, leaderless motion.
  chaos: { count: 140, cohesion: 0.25, separation: 1.1, alignment: 0.0, visionRadius: 50, maxSpeed: 5.5 },
  // Balanced, tight-turning → fish school.
  schooling: { count: 170, cohesion: 1.1, separation: 1.3, alignment: 1.4, visionRadius: 60, maxSpeed: 3.0 },
};

export function initControls(engine, renderer) {
  const api = { obstacleMode: false };

  const elsValue = {};
  for (const s of SLIDERS) elsValue[s.id] = document.getElementById(s.val);

  function syncUI() {
    for (const s of SLIDERS) {
      const slider = document.getElementById(s.id);
      const v = engine.params[s.param];
      slider.value = v;
      elsValue[s.id].textContent = Number(v).toFixed(s.fixed);
      const percent = (v - slider.min) / (slider.max - slider.min) * 100;
      slider.style.setProperty('--fill', `${percent}%`);
    }
  }

  // Sliders push values into the engine immediately (next frame uses them).
  for (const s of SLIDERS) {
    const slider = document.getElementById(s.id);
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      elsValue[s.id].textContent = v.toFixed(s.fixed);
      elsValue[s.id].animate([
        { transform: 'scale(1.3)', color: '#fff' },
        { transform: 'scale(1)' }
      ], { duration: 200, easing: 'ease-out' });
      engine.setParam(s.param, v);
      const percent = (v - slider.min) / (slider.max - slider.min) * 100;
      slider.style.setProperty('--fill', `${percent}%`);
    });
  }

  // Toggles.
  const tgVision = document.getElementById('tgVision');
  const tgPredator = document.getElementById('tgPredator');
  const tgObstacle = document.getElementById('tgObstacle');

  tgVision.addEventListener('change', () => { renderer.showVision = tgVision.checked; });
  tgPredator.addEventListener('change', () => engine.setPredator(tgPredator.checked));
  tgObstacle.addEventListener('change', () => {
    api.obstacleMode = tgObstacle.checked;
    document.getElementById('obstacleHint').hidden = !tgObstacle.checked;
    document.getElementById('sim').classList.toggle('crosshair', tgObstacle.checked);
  });

  // Pause / resume — keeps data-i18n in sync so a later language switch is correct.
  const btnPause = document.getElementById('btnPause');
  function refreshPauseLabel() {
    const key = engine.paused ? 'resume' : 'pause';
    btnPause.setAttribute('data-i18n', key);
    btnPause.textContent = t(key);
    btnPause.classList.toggle('active', engine.paused);
  }
  btnPause.addEventListener('click', () => {
    engine.paused = !engine.paused;
    refreshPauseLabel();
  });
  document.addEventListener('languagechanged', refreshPauseLabel);

  // Presets — applied atomically, then the UI is re-synced to the new state.
  function applyPreset(bundle) {
    engine.applyPreset({ ...bundle });
    syncUI();
  }
  document.getElementById('btnMurmur').addEventListener('click', () => applyPreset(PRESETS.murmur));
  document.getElementById('btnChaos').addEventListener('click', () => applyPreset(PRESETS.chaos));
  document.getElementById('btnSchooling').addEventListener('click', () => applyPreset(PRESETS.schooling));

  document.getElementById('btnReset').addEventListener('click', () => {
    engine.reset();
    renderer.showVision = false;
    api.obstacleMode = false;
    tgVision.checked = false;
    tgPredator.checked = false;
    tgObstacle.checked = false;
    document.getElementById('obstacleHint').hidden = true;
    document.getElementById('sim').classList.remove('crosshair');
    engine.applyPreset({ ...DEFAULTS });
    syncUI();
    refreshPauseLabel();
  });

  syncUI();
  refreshPauseLabel();
  return api;
}
