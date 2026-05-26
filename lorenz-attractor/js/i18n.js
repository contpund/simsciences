// FR/EN dictionary for the Lorenz attractor page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'Attracteur de Lorenz',
    subtitle: 'L\'équation qui rend la météo imprévisible',
    sectionParams: 'Paramètres',
    sigma: 'σ (convection)',
    rho: 'ρ (gradient thermique)',
    beta: 'β (géométrie)',
    speed: 'Vitesse',
    trail: 'Longueur de trace',
    sectionOptions: 'Options',
    autoRotate: 'Caméra orbitale',
    showTwin: 'Lancer le jumeau (Δ = 10⁻⁵)',
    sectionPresets: 'Préréglages',
    presetClassic: 'Papillon classique',
    presetStable: 'Point fixe',
    presetPeriodic: 'Orbite périodique',
    presetWild: 'Chaos++',
    reset: 'Réinitialiser',
    pause: 'Pause',
    start: '⏸ Pause',
    citation: 'Lorenz, E. N. (1963). Deterministic Nonperiodic Flow. J. Atmospheric Sciences, 20(2), 130–141.',
    'tip.lang': 'Changer la langue',
    'tip.sigma': 'Nombre de Prandtl — couplage entre convection et diffusion. Défaut 10.',
    'tip.rho': 'Nombre de Rayleigh — gradient thermique. ρ ≈ 24,74 est le seuil au-delà duquel le système devient chaotique. Défaut 28.',
    'tip.beta': 'Paramètre géométrique de la cellule de convection. Défaut 8/3 ≈ 2,667.',
    'tip.speed': 'Vitesse d\'intégration du système. Visuelle seulement, n\'affecte pas la trajectoire.',
    'tip.trail': 'Nombre de points conservés dans la trace.',
    'tip.autoRotate': 'Fait tourner doucement la caméra autour de l\'axe vertical, pour révéler la structure 3D.',
    'tip.showTwin': 'Lance une seconde trajectoire identique au point près (différence 10⁻⁵ sur x). Les deux divergent en quelques secondes — c\'est l\'effet papillon.',
    'tip.reset': 'Réinitialise la trajectoire et les paramètres.',
    'tip.pause': 'Met la simulation en pause.',
    'tip.presetClassic': 'σ=10, ρ=28, β=8/3 — le papillon historique de 1963.',
    'tip.presetStable': 'ρ=0,5 — la trajectoire converge vers l\'origine.',
    'tip.presetPeriodic': 'ρ=99,96 — orbite périodique stable.',
    'tip.presetWild': 'ρ=160 — chaos amplifié, topologie déformée.',
  },
  en: {
    appTitle: 'Lorenz Attractor',
    subtitle: 'The equation that makes weather unpredictable',
    sectionParams: 'Parameters',
    sigma: 'σ (convection)',
    rho: 'ρ (thermal gradient)',
    beta: 'β (geometry)',
    speed: 'Speed',
    trail: 'Trail length',
    sectionOptions: 'Options',
    autoRotate: 'Orbiting camera',
    showTwin: 'Launch twin (Δ = 10⁻⁵)',
    sectionPresets: 'Presets',
    presetClassic: 'Classic butterfly',
    presetStable: 'Fixed point',
    presetPeriodic: 'Periodic orbit',
    presetWild: 'Wild chaos',
    reset: 'Reset',
    pause: 'Pause',
    start: '⏸ Pause',
    citation: 'Lorenz, E. N. (1963). Deterministic Nonperiodic Flow. J. Atmospheric Sciences, 20(2), 130–141.',
    'tip.lang': 'Switch language',
    'tip.sigma': 'Prandtl number — convection / diffusion coupling. Default 10.',
    'tip.rho': 'Rayleigh number — thermal gradient. ρ ≈ 24.74 is the threshold above which the system becomes chaotic. Default 28.',
    'tip.beta': 'Geometric parameter of the convection cell. Default 8/3 ≈ 2.667.',
    'tip.speed': 'Integration speed multiplier. Visual only — does not affect the trajectory.',
    'tip.trail': 'How many points are kept in the trail buffer.',
    'tip.autoRotate': 'Gently rotates the camera around the vertical axis to reveal the 3D structure.',
    'tip.showTwin': 'Launches a second trajectory identical to within 10⁻⁵ on x. The two diverge in seconds — that is the butterfly effect.',
    'tip.reset': 'Reset the trajectory and the parameters.',
    'tip.pause': 'Pause the simulation.',
    'tip.presetClassic': 'σ=10, ρ=28, β=8/3 — the historical 1963 butterfly.',
    'tip.presetStable': 'ρ=0.5 — the trajectory converges to the origin.',
    'tip.presetPeriodic': 'ρ=99.96 — stable periodic orbit.',
    'tip.presetWild': 'ρ=160 — amplified chaos, deformed topology.',
  },
};

let currentLang = DEFAULT_LANG;

export function getLang() { return currentLang; }

export function t(key, lang = currentLang) {
  return (translations[lang] && translations[lang][key]) || key;
}

export function applyLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  }
  for (const el of document.querySelectorAll('[data-i18n-tip]')) {
    el.setAttribute('data-tip', t(el.getAttribute('data-i18n-tip')));
  }
  for (const btn of document.querySelectorAll('.lang button')) {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  }
}

export function initLanguageSwitcher() {
  applyLanguage(DEFAULT_LANG);
  for (const btn of document.querySelectorAll('.lang button')) {
    btn.addEventListener('click', () => {
      const l = btn.getAttribute('data-lang');
      applyLanguage(l);
    });
  }
}
