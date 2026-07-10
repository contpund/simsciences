// FR/EN dictionary for the Fourier epicycles page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'La série de Fourier',
    subtitle: 'Dessinez n\'importe quoi — des cercles le redessineront',
    sectionParams: 'Paramètres',
    harmonics: 'N (harmoniques)',
    speed: 'Vitesse',
    sectionOptions: 'Affichage',
    showCircles: '⭕ Montrer les cercles',
    showOriginal: '👻 Montrer le tracé d\'origine',
    sectionStats: 'Mesures',
    statCircles: 'Cercles utilisés',
    statError: 'Erreur de reconstruction',
    statDominant: 'Harmonique dominante',
    statPoints: 'Points échantillonnés',
    sectionPresets: 'Formes',
    square: 'Carré',
    star: 'Étoile',
    heart: 'Cœur',
    infinity: 'Lemniscate',
    draw: '✏️ À vous de dessiner',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Fourier, J.-B. J. (1822). Théorie analytique de la chaleur. Firmin Didot, Paris.',
    'hud.circles': 'cercles',
    'hud.error': 'erreur',
    'hud.hint': 'Dessinez une forme fermée dans ce cadre',
    'spec.title': 'Spectre des amplitudes',
    'spec.axis': 'harmonique n (tours par cycle)',
    'tip.lang': 'Changer la langue',
    'tip.harmonics': 'Nombre d\'harmoniques conservées. Chaque harmonique ajoute deux cercles (n et −n). Monte-le et la courbe se referme sur le tracé d\'origine.',
    'tip.speed': 'Vitesse de rotation. La courbe obtenue est exactement la même — seule l\'attente change.',
    'tip.showCircles': 'Affiche la chaîne de cercles, du plus grand au plus petit. Chaque cercle tourne n fois par cycle.',
    'tip.showOriginal': 'Superpose en pointillé le tracé que Fourier essaie de reproduire. L\'écart entre les deux, c\'est l\'erreur.',
    'tip.statCircles': '2N+1 cercles : un par harmonique de −N à +N, y compris le décalage central.',
    'tip.statError': 'Part de l\'« énergie » du tracé que les N harmoniques ne capturent pas. Ce n\'est pas une estimation : le théorème de Parseval donne exactement la somme des coefficients jetés.',
    'tip.statDominant': 'L\'harmonique de plus grande amplitude — le cercle qui fait le gros du travail.',
    'tip.statPoints': 'Le tracé est rééchantillonné à pas constant le long de sa longueur, puis transformé. 512 points, donc 512 coefficients exacts.',
    'tip.square': 'Ses angles vifs font décroître les coefficients en 1/n² seulement. Surtout, sa symétrie d\'ordre 4 perfore le spectre : seules survivent les harmoniques n ≡ 1 (mod 4) — 1, 5, 9, −3, −7… Passer de N=1 à N=2 ne change donc rigoureusement rien. Il faut N=11 pour descendre sous 1 % d\'erreur.',
    'tip.star': 'Cinq branches, donc une symétrie d\'ordre 5 : le spectre ne garde que les harmoniques n ≡ 1 (mod 5) — 1, 6, 11, −4, −9… D\'où les paliers quand on monte N. Il en faut 24 pour passer sous 1 %.',
    'tip.heart': 'Aucune symétrie : tout le spectre est occupé, sans trou. La pointe du bas fait décroître les coefficients en 1/n^1,6 environ ; 12 harmoniques suffisent pour tomber sous 1 %.',
    'tip.infinity': 'Lemniscate de Gerono. Lisse et analytique, sans le moindre angle : ses coefficients s\'effondrent en 1/n³ et 8 harmoniques suffisent pour descendre sous 1 % d\'erreur.',
    'tip.draw': 'Efface tout et vous rend la main. Dessinez une forme fermée dans le cadre — elle sera analysée au relâchement.',
    'tip.reset': 'Réinitialise tous les paramètres.',
    'tip.pause': 'Fige les cercles.',
  },
  en: {
    appTitle: 'The Fourier Series',
    subtitle: 'Draw anything — circles will draw it back',
    sectionParams: 'Parameters',
    harmonics: 'N (harmonics)',
    speed: 'Speed',
    sectionOptions: 'Display',
    showCircles: '⭕ Show the circles',
    showOriginal: '👻 Show the original path',
    sectionStats: 'Readouts',
    statCircles: 'Circles used',
    statError: 'Reconstruction error',
    statDominant: 'Dominant harmonic',
    statPoints: 'Sampled points',
    sectionPresets: 'Shapes',
    square: 'Square',
    star: 'Star',
    heart: 'Heart',
    infinity: 'Lemniscate',
    draw: '✏️ Draw your own',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Fourier, J.-B. J. (1822). Théorie analytique de la chaleur. Firmin Didot, Paris.',
    'hud.circles': 'circles',
    'hud.error': 'error',
    'hud.hint': 'Draw a closed shape inside this frame',
    'spec.title': 'Amplitude spectrum',
    'spec.axis': 'harmonic n (turns per cycle)',
    'tip.lang': 'Switch language',
    'tip.harmonics': 'How many harmonics are kept. Each one adds two circles (n and −n). Turn it up and the curve closes in on the original path.',
    'tip.speed': 'How fast the circles turn. The curve you get is exactly the same — only the waiting changes.',
    'tip.showCircles': 'Draw the chain of circles, largest first. Each circle turns n times per cycle.',
    'tip.showOriginal': 'Overlay the dashed path Fourier is trying to reproduce. The gap between the two is the error.',
    'tip.statCircles': '2N+1 circles: one per harmonic from −N to +N, including the central offset.',
    'tip.statError': 'The share of the path\'s "energy" the N harmonics fail to capture. Not an estimate: Parseval\'s theorem gives the discarded coefficients exactly.',
    'tip.statDominant': 'The harmonic with the largest amplitude — the circle doing most of the work.',
    'tip.statPoints': 'The path is resampled at even spacing along its arc length, then transformed. 512 points, so 512 exact coefficients.',
    'tip.square': 'Its sharp corners make the coefficients decay as slowly as 1/n². Better still, its 4-fold symmetry punches holes in the spectrum: only harmonics n ≡ 1 (mod 4) survive — 1, 5, 9, −3, −7… so going from N=1 to N=2 changes absolutely nothing. N=11 gets you under 1% error.',
    'tip.star': 'Five points, so 5-fold symmetry: the spectrum keeps only harmonics n ≡ 1 (mod 5) — 1, 6, 11, −4, −9… which is why N climbs in plateaus. It takes 24 to get under 1%.',
    'tip.heart': 'No symmetry at all: every harmonic is occupied, no gaps. The cusp at the bottom slows the decay to about 1/n^1.6; 12 harmonics drop it under 1%.',
    'tip.infinity': 'Lemniscate of Gerono. Smooth, analytic, not a single corner: its coefficients collapse as 1/n³ and just 8 harmonics get under 1% error.',
    'tip.draw': 'Clears everything and hands you the pen. Draw a closed shape in the frame — it is analysed when you let go.',
    'tip.reset': 'Reset every parameter.',
    'tip.pause': 'Freeze the circles.',
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
