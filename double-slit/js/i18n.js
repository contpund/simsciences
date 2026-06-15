// FR/EN dictionary for the double-slit page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'La fente de Young',
    subtitle: 'L\'expérience la plus étrange de la physique quantique',
    sectionParams: 'Paramètres',
    lambda: 'λ (longueur d\'onde)',
    slitSep: 'd (écart des fentes)',
    screenDist: 'L (distance à l\'écran)',
    rate: 'Débit de particules',
    sectionOptions: 'Options',
    observe: '👁 Observer quelle fente',
    sectionModes: 'Particule',
    photon: 'Photon',
    electron: 'Électron',
    ball: 'Bille classique',
    clear: 'Effacer l\'écran',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Young, T. (1804). The Bakerian Lecture: Experiments and calculations relative to physical optics.',
    'tip.lang': 'Changer la langue',
    'tip.lambda': 'Longueur d\'onde de la source. Plus elle est grande (rouge), plus les franges sont espacées ; plus elle est petite (violet), plus elles sont serrées.',
    'tip.slitSep': 'Distance entre les deux fentes. Plus elles sont écartées, plus les franges d\'interférence sont rapprochées.',
    'tip.screenDist': 'Distance entre les fentes et l\'écran. Plus l\'écran est loin, plus la figure s\'élargit.',
    'tip.rate': 'Nombre de particules envoyées par instant. Baisse-le pour les voir arriver une par une.',
    'tip.observe': 'Place un détecteur à chaque fente pour savoir par où passe la particule. Connaître le chemin DÉTRUIT la figure d\'interférence — il ne reste qu\'une tache.',
    'tip.photon': 'Des photons (lumière). Envoyés un par un, ils construisent quand même une figure d\'interférence.',
    'tip.electron': 'Des électrons — de la matière. Et pourtant, eux aussi interfèrent avec eux-mêmes.',
    'tip.ball': 'Des billes classiques : pas d\'interférence, juste deux bandes derrière les fentes. Le monde quotidien.',
    'tip.clear': 'Vide l\'écran pour recommencer l\'accumulation.',
    'tip.reset': 'Réinitialise tous les paramètres.',
    'tip.pause': 'Met l\'expérience en pause.',
  },
  en: {
    appTitle: 'Young\'s Double Slit',
    subtitle: 'The strangest experiment in quantum physics',
    sectionParams: 'Parameters',
    lambda: 'λ (wavelength)',
    slitSep: 'd (slit separation)',
    screenDist: 'L (screen distance)',
    rate: 'Particle rate',
    sectionOptions: 'Options',
    observe: '👁 Observe which slit',
    sectionModes: 'Particle',
    photon: 'Photon',
    electron: 'Electron',
    ball: 'Classical ball',
    clear: 'Clear screen',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Young, T. (1804). The Bakerian Lecture: Experiments and calculations relative to physical optics.',
    'tip.lang': 'Switch language',
    'tip.lambda': 'Wavelength of the source. Longer (red) spreads the fringes apart; shorter (violet) packs them tighter.',
    'tip.slitSep': 'Distance between the two slits. The wider apart they are, the closer together the interference fringes.',
    'tip.screenDist': 'Distance from the slits to the screen. The farther the screen, the wider the pattern.',
    'tip.rate': 'How many particles are launched per instant. Turn it down to watch them arrive one at a time.',
    'tip.observe': 'Place a detector at each slit to learn which path the particle takes. Knowing the path DESTROYS the interference pattern — only a blob remains.',
    'tip.photon': 'Photons (light). Sent one at a time, they still build up an interference pattern.',
    'tip.electron': 'Electrons — matter. And yet they too interfere with themselves.',
    'tip.ball': 'Classical balls: no interference, just two bands behind the slits. The everyday world.',
    'tip.clear': 'Empty the screen to restart the accumulation.',
    'tip.reset': 'Reset all parameters.',
    'tip.pause': 'Pause the experiment.',
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
