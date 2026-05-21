// Minimal FR/EN dictionary + language switcher. Mirrors the boids/flocking
// approach so the channel keeps a consistent UX across episodes.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'Double Pendule',
    subtitle: 'Chaos déterministe — Newton + Lorenz',
    sectionParams: 'Paramètres',
    L1: 'Bras supérieur (L₁)',
    L2: 'Bras inférieur (L₂)',
    m1: 'Masse supérieure (m₁)',
    m2: 'Masse inférieure (m₂)',
    theta1: 'Angle initial θ₁',
    theta2: 'Angle initial θ₂',
    damping: 'Amortissement',
    sectionOptions: 'Options',
    showTrace: 'Afficher la trace',
    twin: 'Ajouter un jumeau (±0.0001 rad)',
    sectionPresets: 'Préréglages',
    presetGentle: 'Doux',
    presetWild: 'Chaotique',
    presetAsymmetric: 'Asymétrique',
    reset: 'Réinitialiser',
    pause: 'Pause',
    start: '▶ Démarrer',
    'tip.start': 'Relâche le pendule depuis sa position verticale haute. Une perturbation minuscule garantit une chute visible.',
    'tip.L1': 'Longueur du bras supérieur. Affecte la période d\'oscillation.',
    'tip.L2': 'Longueur du bras inférieur. Affecte la complexité du mouvement.',
    'tip.m1': 'Masse de la bobine supérieure.',
    'tip.m2': 'Masse de la bobine inférieure. Une asymétrie de masse amplifie le chaos.',
    'tip.theta1': 'Angle initial du bras supérieur depuis la verticale.',
    'tip.theta2': 'Angle initial du bras inférieur depuis la verticale.',
    'tip.damping': 'Friction angulaire. 0 = système conservatif (énergie constante).',
    'tip.showTrace': 'Afficher la trajectoire du bout du pendule au fil du temps.',
    'tip.twin': 'Lance un second pendule identique sauf 0,0001 rad sur θ₁. Démontre la sensibilité aux conditions initiales.',
    'tip.lang': 'Changer la langue',
    'tip.pause': 'Met en pause la simulation',
    'tip.reset': 'Réinitialise positions et paramètres',
    'tip.presetGentle': 'Oscillations douces, comportement quasi-régulier',
    'tip.presetWild': 'Grand angle, masses asymétriques — chaos maximal',
    'tip.presetAsymmetric': 'Bras et masses très différents',
  },
  en: {
    appTitle: 'Double Pendulum',
    subtitle: 'Deterministic Chaos — Newton + Lorenz',
    sectionParams: 'Parameters',
    L1: 'Upper arm (L₁)',
    L2: 'Lower arm (L₂)',
    m1: 'Upper mass (m₁)',
    m2: 'Lower mass (m₂)',
    theta1: 'Initial angle θ₁',
    theta2: 'Initial angle θ₂',
    damping: 'Damping',
    sectionOptions: 'Options',
    showTrace: 'Show trace',
    twin: 'Add identical twin (±0.0001 rad)',
    sectionPresets: 'Presets',
    presetGentle: 'Gentle',
    presetWild: 'Wild',
    presetAsymmetric: 'Asymmetric',
    reset: 'Reset',
    pause: 'Pause',
    start: '▶ Start',
    'tip.start': 'Releases the pendulum from its upright equilibrium. A tiny numerical perturbation guarantees a visible fall.',
    'tip.L1': 'Length of the upper arm. Affects oscillation period.',
    'tip.L2': 'Length of the lower arm. Affects motion complexity.',
    'tip.m1': 'Mass of the upper bob.',
    'tip.m2': 'Mass of the lower bob. Mass asymmetry amplifies chaos.',
    'tip.theta1': 'Initial angle of the upper arm from vertical.',
    'tip.theta2': 'Initial angle of the lower arm from vertical.',
    'tip.damping': 'Angular friction. 0 = conservative system (energy preserved).',
    'tip.showTrace': 'Display the path of the bottom bob over time.',
    'tip.twin': 'Spawn a second pendulum identical except for 0.0001 rad on θ₁. Demonstrates sensitivity to initial conditions.',
    'tip.lang': 'Switch language',
    'tip.pause': 'Pause the simulation',
    'tip.reset': 'Reset positions and parameters',
    'tip.presetGentle': 'Small angles, near-regular motion',
    'tip.presetWild': 'Large angle, asymmetric masses — peak chaos',
    'tip.presetAsymmetric': 'Very different arms and masses',
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
  // Apply data-i18n text content
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  }
  // Apply data-i18n-tip via the global tooltip system (if loaded later)
  for (const el of document.querySelectorAll('[data-i18n-tip]')) {
    el.setAttribute('data-tip', t(el.getAttribute('data-i18n-tip')));
  }
  // Update language nav button states
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
