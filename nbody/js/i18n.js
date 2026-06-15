// FR/EN dictionary for the N-body gravity page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'Problème à N corps',
    subtitle: 'Comment une galaxie naît de la seule loi de Newton',
    sectionParams: 'Paramètres',
    nbody: 'N (nombre d\'étoiles)',
    gravity: 'G (gravité)',
    spin: 'Vitesse initiale (rotation)',
    soft: 'ε (adoucissement)',
    speed: 'Vitesse',
    sectionOptions: 'Options',
    trails: 'Traînées de mouvement',
    colorByRadius: 'Couleur galactique',
    sectionPresets: 'Configurations initiales',
    presetGalaxy: 'Galaxie spirale',
    presetCollision: 'Collision',
    presetCollapse: 'Effondrement',
    presetCluster: 'Amas',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Newton, I. (1687). Philosophiæ Naturalis Principia Mathematica.',
    'tip.lang': 'Changer la langue',
    'tip.nbody': 'Nombre d\'étoiles simulées. Chacune attire toutes les autres : le coût grimpe en N². Au-delà de ~1000, le rendu peut ralentir sur une machine modeste.',
    'tip.gravity': 'Intensité de la gravité G. Trop forte : tout s\'effondre. Trop faible : le système se disperse.',
    'tip.spin': 'Fraction de la vitesse circulaire donnée au départ. 1 = orbites quasi circulaires, 0 = chute libre radiale vers le centre.',
    'tip.soft': 'Longueur d\'adoucissement ε : évite les forces infinies quand deux étoiles se frôlent. Plus elle est petite, plus les rencontres proches sont violentes.',
    'tip.speed': 'Accélère ou ralentit l\'écoulement du temps. Visuel seulement.',
    'tip.trails': 'Laisse une traînée derrière chaque étoile pour révéler les orbites et les bras spiraux.',
    'tip.colorByRadius': 'Colore les étoiles selon leur distance au centre : cœur chaud, bras bleutés.',
    'tip.presetGalaxy': 'Un disque en rotation. L\'auto-gravité y fait spontanément croître des bras spiraux.',
    'tip.presetCollision': 'Deux galaxies lancées l\'une vers l\'autre : elles se déforment, s\'arrachent des bras, puis fusionnent.',
    'tip.presetCollapse': 'Un nuage froid sans rotation : il s\'effondre sous sa propre gravité.',
    'tip.presetCluster': 'Une bulle gaussienne peu tournante qui se relaxe en amas d\'étoiles.',
    'tip.reset': 'Revient à la galaxie spirale par défaut.',
    'tip.pause': 'Met la simulation en pause.',
  },
  en: {
    appTitle: 'The N-Body Problem',
    subtitle: 'How a galaxy is born from Newton\'s law alone',
    sectionParams: 'Parameters',
    nbody: 'N (number of stars)',
    gravity: 'G (gravity)',
    spin: 'Initial velocity (spin)',
    soft: 'ε (softening)',
    speed: 'Speed',
    sectionOptions: 'Options',
    trails: 'Motion trails',
    colorByRadius: 'Galactic color',
    sectionPresets: 'Initial configurations',
    presetGalaxy: 'Spiral galaxy',
    presetCollision: 'Collision',
    presetCollapse: 'Collapse',
    presetCluster: 'Cluster',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Newton, I. (1687). Philosophiæ Naturalis Principia Mathematica.',
    'tip.lang': 'Switch language',
    'tip.nbody': 'Number of simulated stars. Each one attracts every other, so the cost grows as N². Past ~1000 the render may slow on a modest machine.',
    'tip.gravity': 'Strength of gravity G. Too strong: everything collapses. Too weak: the system flies apart.',
    'tip.spin': 'Fraction of the circular velocity given at the start. 1 = near-circular orbits, 0 = radial free-fall toward the centre.',
    'tip.soft': 'Softening length ε: prevents infinite forces when two stars nearly touch. The smaller it is, the more violent close encounters become.',
    'tip.speed': 'Speeds up or slows down the flow of time. Visual only.',
    'tip.trails': 'Leaves a trail behind each star to reveal orbits and spiral arms.',
    'tip.colorByRadius': 'Colors stars by distance from the centre: warm core, bluish arms.',
    'tip.presetGalaxy': 'A rotating disk. Self-gravity spontaneously grows spiral arms within it.',
    'tip.presetCollision': 'Two galaxies hurled at each other: they distort, tear off arms, then merge.',
    'tip.presetCollapse': 'A cold, non-rotating cloud that collapses under its own gravity.',
    'tip.presetCluster': 'A faintly spinning Gaussian blob that relaxes into a star cluster.',
    'tip.reset': 'Return to the default spiral galaxy.',
    'tip.pause': 'Pause the simulation.',
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
    el.textContent = t(el.getAttribute('data-i18n'));
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
    btn.addEventListener('click', () => applyLanguage(btn.getAttribute('data-lang')));
  }
}
