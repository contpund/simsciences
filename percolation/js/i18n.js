// FR/EN dictionary for the percolation page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'La percolation',
    subtitle: 'À 59 %, rien ne passe. À 60 %, tout passe.',
    sectionParams: 'Paramètres',
    porosity: 'p — porosité',
    size: 'Taille de la grille',
    speed: 'Vitesse de l’eau',
    clusters: 'Colorer les amas',
    sectionStats: 'Mesures',
    statP: 'Porosité (p)',
    statOpen: 'Sites ouverts',
    statLargest: 'Plus grand amas',
    statDepth: 'Profondeur atteinte',
    statPc: 'Seuil (p_c)',
    statState: 'État',
    sectionPresets: 'Expériences',
    sealed: 'Étanche',
    soclose: 'Si proche',
    threshold: 'Le seuil',
    through: 'Ça passe',
    shuffle: '🎲 Nouvelle roche',
    pourBtn: '💧 Verser à nouveau',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Broadbent, S. R. & Hammersley, J. M. (1957). Percolation processes I. Crystals and mazes. Proc. Cambridge Phil. Soc. 53, 629–641.',
    'panel.porosity': 'porosité p',
    'panel.depth': 'profondeur',
    'panel.threshold': 'seuil',
    'panel.broke': 'percé à',
    'panel.nobreak': 'jamais percé',
    'hud.sites': 'sites',
    'state.pouring': 'l’eau descend…',
    'state.sealed': 'scellé — l’eau s’est arrêtée',
    'state.percolates': 'ça percole !',
    'tip.lang': 'Changer la langue',
    'tip.porosity': 'p, la fraction de sites ouverts. Chaque site garde le même tirage : monter p rouvre les mêmes pores, dans la même roche — vous montez une nappe dans un paysage figé. Le seuil est à p_c ≈ 0,5927.',
    'tip.size': 'Côté de la grille. Plus la grille est grande, plus la transition est nette : le niveau de perçage de chaque roche se resserre autour de p_c = 0,5927.',
    'tip.speed': 'Couches de propagation de l’eau par image. Ne change rien au verdict : la connectivité est déjà décidée par la roche, seule l’attente change.',
    'tip.clusters': 'Colore chaque amas de pores connectés d’une teinte propre, le plus grand en ambre. Un amas peut être énorme sans relier haut et bas — gros n’est pas traversant.',
    'tip.statP': 'p, ce que vous imposez : la fraction de roche ouverte.',
    'tip.statOpen': 'La fraction de sites réellement ouverts à ce p — elle fluctue autour de p, la grille est finie.',
    'tip.statLargest': 'La taille du plus grand amas connecté, en % de la grille. Sous le seuil il croît doucement ; au seuil il explose.',
    'tip.statDepth': 'La profondeur maximale que l’eau a atteinte dans cette coulée, en % de la hauteur. 100 % = perçage.',
    'tip.statPc': 'p_c ≈ 0,592746, le seuil de la percolation de sites sur réseau carré. Connu numériquement à une douzaine de décimales ; aucune forme exacte connue.',
    'tip.statState': 'Un constat, pas une prédiction : l’eau descend encore, elle a percé, ou elle s’est arrêtée.',
    'tip.sealed': 'p = 0,45. Presque la moitié de la roche est ouverte — et l’eau s’arrête à quelques rangées du haut. Les pores forment des poches, pas des chemins.',
    'tip.soclose': 'p = 0,57. Le plus grand amas est déjà immense, l’eau descend profond… et s’arrête. Gros n’est pas traversant.',
    'tip.threshold': 'p = 0,5927 — p_c. Le fil du rasoir : selon la roche, ça passe ou ça scelle. C’est ici que tout se décide.',
    'tip.through': 'p = 0,65. Au-dessus du seuil, un amas géant traverse la roche : l’eau trouve la sortie, à chaque coulée.',
    'tip.shuffle': 'Tire une roche entièrement nouvelle — mêmes règles, autre hasard — sans toucher à p.',
    'tip.pour': 'Re-verse l’eau en haut de la même roche. Même roche, même p : même résultat — le verdict appartient à la roche, pas à la chance.',
    'tip.reset': 'Réinitialise tous les paramètres.',
    'tip.pause': 'Fige l’eau.',
  },
  en: {
    appTitle: 'Percolation',
    subtitle: 'At 59%, nothing gets through. At 60%, everything does.',
    sectionParams: 'Parameters',
    porosity: 'p — porosity',
    size: 'Grid size',
    speed: 'Water speed',
    clusters: 'Colour the clusters',
    sectionStats: 'Readouts',
    statP: 'Porosity (p)',
    statOpen: 'Open sites',
    statLargest: 'Largest cluster',
    statDepth: 'Depth reached',
    statPc: 'Threshold (p_c)',
    statState: 'State',
    sectionPresets: 'Experiments',
    sealed: 'Sealed',
    soclose: 'So close',
    threshold: 'The threshold',
    through: 'It flows',
    shuffle: '🎲 New rock',
    pourBtn: '💧 Pour again',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Broadbent, S. R. & Hammersley, J. M. (1957). Percolation processes I. Crystals and mazes. Proc. Cambridge Phil. Soc. 53, 629–641.',
    'panel.porosity': 'porosity p',
    'panel.depth': 'depth',
    'panel.threshold': 'threshold',
    'panel.broke': 'broke through at',
    'panel.nobreak': 'never broke through',
    'hud.sites': 'sites',
    'state.pouring': 'water coming down…',
    'state.sealed': 'sealed — the water stopped',
    'state.percolates': 'it percolates!',
    'tip.lang': 'Switch language',
    'tip.porosity': 'p, the fraction of open sites. Every site keeps the same draw: raising p reopens the same pores in the same rock — you are raising a water table through a frozen landscape. The threshold sits at p_c ≈ 0.5927.',
    'tip.size': 'Side of the grid. The bigger the grid, the sharper the transition: each rock’s breakthrough level tightens around p_c = 0.5927.',
    'tip.speed': 'Layers of wetting per frame. It changes nothing about the verdict — connectivity is already decided by the rock; only the waiting differs.',
    'tip.clusters': 'Colours every connected pocket of pores with its own hue, the largest in amber. A cluster can be huge without linking top to bottom — big is not the same as through.',
    'tip.statP': 'p, what you impose: the fraction of the rock that is open.',
    'tip.statOpen': 'The fraction of sites actually open at this p — it fluctuates around p; the grid is finite.',
    'tip.statLargest': 'The size of the largest connected cluster, as % of the grid. Below the threshold it grows gently; at the threshold it explodes.',
    'tip.statDepth': 'The deepest the water has reached on this pour, as % of the height. 100% = breakthrough.',
    'tip.statPc': 'p_c ≈ 0.592746, the site-percolation threshold on the square lattice. Known numerically to a dozen digits; no closed form is known.',
    'tip.statState': 'A report, not a prediction: the water is still moving, it broke through, or it stopped.',
    'tip.sealed': 'p = 0.45. Nearly half the rock is open — and the water stops a few rows from the top. The pores form pockets, not paths.',
    'tip.soclose': 'p = 0.57. The largest cluster is already enormous, the water gets deep… and stops. Big is not the same as through.',
    'tip.threshold': 'p = 0.5927 — p_c. The knife edge: depending on the rock, it flows or it seals. This is where everything is decided.',
    'tip.through': 'p = 0.65. Above the threshold a giant cluster crosses the rock: the water finds the way out, every single pour.',
    'tip.shuffle': 'Draw an entirely new rock — same rules, different randomness — without touching p.',
    'tip.pour': 'Pour the water again onto the same rock. Same rock, same p: same outcome — the verdict belongs to the rock, not to luck.',
    'tip.reset': 'Reset every parameter.',
    'tip.pause': 'Freeze the water.',
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
