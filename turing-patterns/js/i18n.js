// FR/EN dictionary for the Turing patterns page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'Motifs de Turing',
    subtitle: 'L\'équation derrière les taches du léopard',
    sectionParams: 'Paramètres',
    feed: 'f (alimentation)',
    kill: 'k (élimination)',
    dA: 'D_A (diffusion A)',
    dB: 'D_B (diffusion B)',
    speed: 'Vitesse',
    sectionPalette: 'Palette',
    paletteLeopard: '🐆 Léopard',
    paletteZebra: '🦓 Zèbre',
    paletteCoral: '🐠 Corail',
    paletteEmerald: '🌿 Émeraude',
    paletteLava: '🔥 Lave',
    paletteSim: '🔬 SimSciences',
    sectionPresets: 'Préréglages',
    presetLeopard: 'Taches de léopard',
    presetZebra: 'Rayures de zèbre',
    presetCoral: 'Corail',
    presetMitosis: 'Mitose',
    presetLabyrinth: 'Labyrinthe',
    presetSolitons: 'Solitons',
    reset: 'Réinitialiser',
    paint: 'Pinceau (clic-glisser)',
    pause: '⏸ Pause',
    citation: 'Turing, A. M. (1952). The Chemical Basis of Morphogenesis. Phil. Trans. R. Soc. B, 237, 37–72.',
    'tip.lang': 'Changer la langue',
    'tip.feed': 'Taux d\'alimentation en réactif A. Contrôle si les motifs se multiplient ou s\'éteignent. Défaut 0,025–0,065.',
    'tip.kill': 'Taux de dégradation du catalyseur B. Détermine la stabilité du motif. Défaut 0,045–0,065.',
    'tip.dA': 'Coefficient de diffusion du réactif A. Plus élevé = motifs plus étalés.',
    'tip.dB': 'Coefficient de diffusion du catalyseur B. Doit rester inférieur à D_A pour générer des motifs (instabilité de Turing).',
    'tip.speed': 'Nombre de sous-étapes par image. Plus haut = la simulation avance plus vite.',
    'tip.reset': 'Réinitialise le système avec des taches aléatoires.',
    'tip.paint': 'Clic-glissé sur la simulation pour injecter du catalyseur B et lancer des motifs.',
    'tip.pause': 'Met la simulation en pause.',
    'tip.palette': 'Change uniquement la couleur — les équations sont identiques.',
    'tip.presetLeopard': 'f=0,025  k=0,060 — taches arrondies réparties.',
    'tip.presetZebra': 'f=0,040  k=0,060 — bandes labyrinthiques. Compte ~30 s pour que les rayures se forment sur tout le canvas.',
    'tip.presetCoral': 'f=0,062  k=0,062 — branches qui colonisent l\'espace.',
    'tip.presetMitosis': 'f=0,037  k=0,065 — cellules qui se divisent en continu.',
    'tip.presetLabyrinth': 'f=0,029  k=0,057 — labyrinthe organique.',
    'tip.presetSolitons': 'f=0,014  k=0,045 — taches qui se déplacent comme des organismes.',
  },
  en: {
    appTitle: 'Turing Patterns',
    subtitle: 'The equation behind a leopard\'s spots',
    sectionParams: 'Parameters',
    feed: 'f (feed)',
    kill: 'k (kill)',
    dA: 'D_A (diffusion A)',
    dB: 'D_B (diffusion B)',
    speed: 'Speed',
    sectionPalette: 'Palette',
    paletteLeopard: '🐆 Leopard',
    paletteZebra: '🦓 Zebra',
    paletteCoral: '🐠 Coral',
    paletteEmerald: '🌿 Emerald',
    paletteLava: '🔥 Lava',
    paletteSim: '🔬 SimSciences',
    sectionPresets: 'Presets',
    presetLeopard: 'Leopard spots',
    presetZebra: 'Zebra stripes',
    presetCoral: 'Coral',
    presetMitosis: 'Mitosis',
    presetLabyrinth: 'Labyrinth',
    presetSolitons: 'Solitons',
    reset: 'Reset',
    paint: 'Brush (click-drag)',
    pause: '⏸ Pause',
    citation: 'Turing, A. M. (1952). The Chemical Basis of Morphogenesis. Phil. Trans. R. Soc. B, 237, 37–72.',
    'tip.lang': 'Switch language',
    'tip.feed': 'Feed rate of reactant A. Controls whether patterns multiply or fade. Range 0.025–0.065.',
    'tip.kill': 'Decay rate of catalyst B. Controls pattern stability. Range 0.045–0.065.',
    'tip.dA': 'Diffusion coefficient of A. Higher = wider patterns.',
    'tip.dB': 'Diffusion coefficient of B. Must remain below D_A for patterns to form (Turing instability).',
    'tip.speed': 'Sub-steps per frame. Higher = simulation runs faster.',
    'tip.reset': 'Reset with random seeds.',
    'tip.paint': 'Click-drag on the canvas to inject catalyst B and seed new patterns.',
    'tip.pause': 'Pause the simulation.',
    'tip.palette': 'Changes only the colour — the equations are identical.',
    'tip.presetLeopard': 'f=0.025  k=0.060 — round, spread-out spots.',
    'tip.presetZebra': 'f=0.040  k=0.060 — labyrinthine bands. Wait ~30 s for the stripes to cover the canvas.',
    'tip.presetCoral': 'f=0.062  k=0.062 — branches colonising the space.',
    'tip.presetMitosis': 'f=0.037  k=0.065 — cells continuously dividing.',
    'tip.presetLabyrinth': 'f=0.029  k=0.057 — organic maze.',
    'tip.presetSolitons': 'f=0.014  k=0.045 — moving spots that act like organisms.',
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
