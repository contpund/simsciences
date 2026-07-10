// FR/EN dictionary for the Kuramoto synchronisation page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'La synchronisation de Kuramoto',
    subtitle: 'Aucun chef d’orchestre. Et pourtant, ils se mettent d’accord.',
    sectionParams: 'Paramètres',
    coupling: 'K — force du couplage',
    spread: 'γ — écart des fréquences',
    size: 'Nombre d’oscillateurs',
    speed: 'Vitesse',
    sectionStats: 'Mesures',
    statK: 'Couplage (K)',
    statR: 'Cohérence (r)',
    statKc: 'Seuil (K_c)',
    statRt: 'Kuramoto prédit',
    statN: 'Oscillateurs',
    statState: 'État',
    sectionPresets: 'Expériences',
    silence: 'Cacophonie',
    threshold: 'Le seuil',
    lockin: 'Accrochage',
    onemind: 'Un seul esprit',
    shuffle: '🎲 Rebattre',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Kuramoto, Y. (1975). Self-entrainment of a population of coupled non-linear oscillators. Lecture Notes in Physics 39, 420–422.',
    'panel.coupling': 'couplage K',
    'panel.coherence': 'cohérence r',
    'panel.threshold': 'seuil',
    'panel.predicts': 'Kuramoto prédit',
    'panel.below': 'sous le seuil : r → 0',
    'hud.oscillators': 'oscillateurs',
    'state.incoherent': 'incohérent — chacun sa cadence',
    'state.synchronizing': 'accrochage en cours…',
    'state.locked': 'synchronisés — un seul rythme',
    'tip.lang': 'Changer la langue',
    'tip.coupling': 'K, la force avec laquelle chaque oscillateur est tiré vers la phase moyenne du groupe. À K = 0, chacun tourne à sa propre fréquence, ignorant les autres. Mesuré : rien ne se synchronise tant que K ne dépasse pas le seuil K_c = 2γ.',
    'tip.spread': 'γ, la demi-largeur de la distribution (lorentzienne) des fréquences naturelles. Plus les oscillateurs sont différents, plus il faut de couplage : le seuil vaut exactement K_c = 2γ. Changer γ retire une nouvelle population.',
    'tip.size': 'Nombre d’oscillateurs. La loi r = √(1 − K_c/K) est la limite d’une population infinie ; avec un nombre fini, r reste un peu au-dessus, et fluctue davantage.',
    'tip.speed': 'Nombre de pas d’intégration RK4 par image. Ne change rien au résultat : la dynamique est la même, seule l’attente change.',
    'tip.statK': 'K, ce que vous imposez. Le même pour tout le monde.',
    'tip.statR': 'r, la longueur du vecteur moyen des phases, entre 0 et 1. C’est ce que la foule produit : 0 = phases éparpillées qui s’annulent, 1 = tout le monde en phase. Une population de phases au hasard donne √π/2 · 1/√N, pas zéro.',
    'tip.statKc': 'K_c = 2γ, le seuil exact de Kuramoto pour une distribution lorentzienne. En dessous, la seule solution stable est l’incohérence.',
    'tip.statRt': 'r = √(1 − K_c/K), la cohérence exacte prédite par Kuramoto au-dessus du seuil, à la limite d’une population infinie. L’anneau pointillé sur le cercle marque ce rayon.',
    'tip.statN': 'Chaque point sur le cercle est un oscillateur, placé à sa phase et coloré selon sa fréquence propre : bleu lent, ambre rapide.',
    'tip.statState': 'Verdict mesuré, pas déduit de K : on regarde si r est resté près de son plancher d’incohérence, s’il grimpe encore, ou s’il tient une valeur élevée.',
    'tip.silence': 'K = 0,6, sous le seuil (K_c = 1,2). Le couplage est trop faible : la cohérence reste au ras du plancher, r ≈ 0,05. Le vecteur moyen n’est qu’un moignon qui tremble.',
    'tip.threshold': 'K = 1,2, exactement K_c. Le point de bascule : en dessous rien, au-dessus l’ordre apparaît. Tout près du seuil, la cohérence hésite.',
    'tip.lockin': 'K = 1,8, soit une fois et demie le seuil. Kuramoto prédit r = √(1 − 1,2/1,8) = 0,58. Un noyau d’oscillateurs s’accroche en un seul paquet ; les plus extrêmes continuent de dériver.',
    'tip.onemind': 'K = 3,6, trois fois le seuil. Prédit r = √(1 − 1,2/3,6) = 0,82. Presque tout le monde tourne comme un seul homme ; la flèche atteint l’anneau prédit.',
    'tip.shuffle': 'Retire une population au hasard — nouvelles fréquences, nouvelles phases — sans toucher à K.',
    'tip.reset': 'Réinitialise tous les paramètres.',
    'tip.pause': 'Fige les oscillateurs.',
  },
  en: {
    appTitle: 'Kuramoto Synchronisation',
    subtitle: 'No conductor. And still, they agree.',
    sectionParams: 'Parameters',
    coupling: 'K — coupling strength',
    spread: 'γ — frequency spread',
    size: 'Number of oscillators',
    speed: 'Speed',
    sectionStats: 'Readouts',
    statK: 'Coupling (K)',
    statR: 'Coherence (r)',
    statKc: 'Threshold (K_c)',
    statRt: 'Kuramoto predicts',
    statN: 'Oscillators',
    statState: 'State',
    sectionPresets: 'Experiments',
    silence: 'Cacophony',
    threshold: 'The threshold',
    lockin: 'Lock-in',
    onemind: 'One mind',
    shuffle: '🎲 Reshuffle',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Kuramoto, Y. (1975). Self-entrainment of a population of coupled non-linear oscillators. Lecture Notes in Physics 39, 420–422.',
    'panel.coupling': 'coupling K',
    'panel.coherence': 'coherence r',
    'panel.threshold': 'threshold',
    'panel.predicts': 'Kuramoto predicts',
    'panel.below': 'below threshold: r → 0',
    'hud.oscillators': 'oscillators',
    'state.incoherent': 'incoherent — everyone drifts',
    'state.synchronizing': 'locking in…',
    'state.locked': 'synchronised — one rhythm',
    'tip.lang': 'Switch language',
    'tip.coupling': 'K, how hard each oscillator is pulled toward the group’s average phase. At K = 0 each turns at its own frequency, blind to the rest. Measured: nothing synchronises until K passes the threshold K_c = 2γ.',
    'tip.spread': 'γ, the half-width of the (Lorentzian) spread of natural frequencies. The more different the oscillators, the more coupling you need: the threshold is exactly K_c = 2γ. Changing γ draws a fresh population.',
    'tip.size': 'Number of oscillators. The law r = √(1 − K_c/K) is the infinite-population limit; with a finite number, r sits a little above it and fluctuates more.',
    'tip.speed': 'RK4 integration steps per frame. It changes nothing about the outcome — the dynamics are the same, only the waiting differs.',
    'tip.statK': 'K, what you impose. The same for everyone.',
    'tip.statR': 'r, the length of the mean phase vector, between 0 and 1. This is what the crowd produces: 0 = scattered phases that cancel, 1 = everyone in phase. A population of random phases gives √π/2 · 1/√N, not zero.',
    'tip.statKc': 'K_c = 2γ, Kuramoto’s exact threshold for a Lorentzian spread. Below it, the only stable state is incoherence.',
    'tip.statRt': 'r = √(1 − K_c/K), the exact coherence Kuramoto predicts above threshold, in the infinite-population limit. The dashed ring on the circle marks that radius.',
    'tip.statN': 'Every dot on the circle is one oscillator, placed at its phase and coloured by its own frequency: blue slow, amber fast.',
    'tip.statState': 'A measured verdict, not one inferred from K: we watch whether r stayed near its incoherent floor, is still climbing, or holds a high value.',
    'tip.silence': 'K = 0.6, below the threshold (K_c = 1.2). The coupling is too weak: coherence stays at the floor, r ≈ 0.05. The mean vector is a trembling stub.',
    'tip.threshold': 'K = 1.2, exactly K_c. The tipping point: nothing below, order above. Right at the threshold, coherence wavers.',
    'tip.lockin': 'K = 1.8, one and a half times the threshold. Kuramoto predicts r = √(1 − 1.2/1.8) = 0.58. A core of oscillators locks into one packet; the most extreme keep drifting.',
    'tip.onemind': 'K = 3.6, three times the threshold. Predicts r = √(1 − 1.2/3.6) = 0.82. Almost everyone turns as one; the arrow reaches the predicted ring.',
    'tip.shuffle': 'Draw a fresh population at random — new frequencies, new phases — without touching K.',
    'tip.reset': 'Reset every parameter.',
    'tip.pause': 'Freeze the oscillators.',
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
