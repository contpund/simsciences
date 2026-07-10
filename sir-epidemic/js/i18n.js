// FR/EN dictionary for the SIR epidemic page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'Le modèle SIR',
    subtitle: 'Pourquoi une épidémie s\'arrête — et ce que la vaccination y change',
    sectionParams: 'Paramètres',
    beta: 'β (taux de transmission)',
    gamma: 'γ (taux de guérison)',
    vax: 'Vaccination',
    popN: 'Population N',
    speed: 'Vitesse',
    sectionOptions: 'Options',
    theory: '📈 Courbe théorique (ODE)',
    sectionStats: 'Mesures',
    statR0: 'R₀',
    statReff: 'Rₑ (effectif)',
    statVc: 'Seuil d\'immunité',
    statPeak: 'Pic d\'infectés',
    statAttack: 'Population touchée',
    sectionPresets: 'Maladies réelles',
    flu: 'Grippe',
    covid: 'COVID-19',
    smallpox: 'Variole',
    measles: 'Rougeole',
    herd: '💉 Vacciner au seuil',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Kermack, W. O. & McKendrick, A. G. (1927). A Contribution to the Mathematical Theory of Epidemics. Proc. R. Soc. A.',
    'hud.day': 'jour',
    'hud.spreading': 'l\'épidémie s\'étend',
    'hud.dying': 'l\'épidémie s\'éteint',
    'hud.over': 'épidémie terminée',
    'hud.attack': '{p} % de la population a été infectée',
    'chart.days': 'jours →',
    'tip.lang': 'Changer la langue',
    'tip.beta': 'Nombre de contacts contaminants par jour et par malade. Monte-le : la vague part plus vite et plus haut.',
    'tip.gamma': 'Vitesse de guérison. Un γ de 0,10 veut dire qu\'on reste contagieux 10 jours en moyenne (1/γ).',
    'tip.vax': 'Part de la population immunisée avant le jour 0. Au-delà du seuil d\'immunité collective, l\'épidémie ne démarre jamais — même chez les non-vaccinés.',
    'tip.popN': 'Nombre d\'individus simulés. Change la population et l\'épidémie recommence.',
    'tip.speed': 'Accélère ou ralentit le temps simulé. Le pas de calcul reste identique : l\'épidémie obtenue est exactement la même, seule la patience nécessaire change.',
    'tip.theory': 'Superpose la solution des équations de Kermack & McKendrick. La foule s\'en écarte : les contacts réels ne sont pas parfaitement mélangés.',
    'tip.statR0': 'R₀ = β/γ. Le nombre de personnes qu\'un malade contamine dans une population entièrement susceptible. Au-dessus de 1, l\'épidémie grandit.',
    'tip.statReff': 'R₀ corrigé par la part de gens encore susceptibles. Dans les équations, l\'épidémie atteint son pic exactement quand Rₑ passe sous 1 ; dans la foule, un peu avant — les contacts n\'y sont pas parfaitement mélangés.',
    'tip.statVc': '1 − 1/R₀ : la fraction à immuniser pour que Rₑ soit sous 1 dès le premier jour. C\'est l\'immunité collective.',
    'tip.statPeak': 'Le plus grand nombre de malades simultanés — ce qui sature (ou non) les hôpitaux.',
    'tip.statAttack': 'Part de la population qui aura été infectée au moins une fois avant la fin.',
    'tip.flu': 'Grippe saisonnière, R₀ ≈ 1,3. Elle se propage à peine — mais elle se propage.',
    'tip.covid': 'COVID-19, souche initiale, R₀ ≈ 3. Il faut immuniser environ 2 personnes sur 3.',
    'tip.smallpox': 'Variole, R₀ ≈ 6. Éradiquée en 1980 par la vaccination — le seul cas pour une maladie humaine.',
    'tip.measles': 'Rougeole, R₀ ≈ 15. L\'une des maladies les plus contagieuses connues : il faut immuniser plus de 93 % de la population.',
    'tip.herd': 'Place le curseur de vaccination juste au-dessus du seuil d\'immunité collective, et relance l\'épidémie.',
    'tip.reset': 'Réinitialise tous les paramètres.',
    'tip.pause': 'Met la simulation en pause.',
  },
  en: {
    appTitle: 'The SIR Model',
    subtitle: 'Why an epidemic stops — and what vaccination changes',
    sectionParams: 'Parameters',
    beta: 'β (transmission rate)',
    gamma: 'γ (recovery rate)',
    vax: 'Vaccination',
    popN: 'Population N',
    speed: 'Speed',
    sectionOptions: 'Options',
    theory: '📈 Theoretical curve (ODE)',
    sectionStats: 'Readouts',
    statR0: 'R₀',
    statReff: 'Rₑ (effective)',
    statVc: 'Herd-immunity threshold',
    statPeak: 'Peak infected',
    statAttack: 'Population hit',
    sectionPresets: 'Real diseases',
    flu: 'Flu',
    covid: 'COVID-19',
    smallpox: 'Smallpox',
    measles: 'Measles',
    herd: '💉 Vaccinate to threshold',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Kermack, W. O. & McKendrick, A. G. (1927). A Contribution to the Mathematical Theory of Epidemics. Proc. R. Soc. A.',
    'hud.day': 'day',
    'hud.spreading': 'the epidemic is growing',
    'hud.dying': 'the epidemic is dying out',
    'hud.over': 'epidemic over',
    'hud.attack': '{p}% of the population was infected',
    'chart.days': 'days →',
    'tip.lang': 'Switch language',
    'tip.beta': 'Infectious contacts per day per case. Raise it and the wave arrives sooner and higher.',
    'tip.gamma': 'How fast people recover. γ = 0.10 means you stay infectious for 10 days on average (1/γ).',
    'tip.vax': 'Share of the population immunised before day 0. Past the herd-immunity threshold the epidemic never takes off — even among the unvaccinated.',
    'tip.popN': 'How many individuals are simulated. Changing the population restarts the outbreak.',
    'tip.speed': 'Speeds up or slows down simulated time. The computation step is unchanged, so you get exactly the same epidemic — only sooner.',
    'tip.theory': 'Overlay the solution of the Kermack & McKendrick equations. The crowd drifts away from it: real contacts are not perfectly mixed.',
    'tip.statR0': 'R₀ = β/γ. How many people one case infects in a fully susceptible population. Above 1, the epidemic grows.',
    'tip.statReff': 'R₀ scaled by the share of people still susceptible. In the equations the epidemic peaks exactly when Rₑ drops below 1; in the crowd it peaks a little earlier — contacts there are not perfectly mixed.',
    'tip.statVc': '1 − 1/R₀: the fraction you must immunise so that Rₑ stays below 1 from day one. That is herd immunity.',
    'tip.statPeak': 'The largest number of people ill at the same time — what does or does not overwhelm hospitals.',
    'tip.statAttack': 'Share of the population that will have been infected at least once by the end.',
    'tip.flu': 'Seasonal flu, R₀ ≈ 1.3. It barely spreads — but it spreads.',
    'tip.covid': 'COVID-19, original strain, R₀ ≈ 3. You need to immunise about 2 people in 3.',
    'tip.smallpox': 'Smallpox, R₀ ≈ 6. Eradicated in 1980 by vaccination — the only human disease so far.',
    'tip.measles': 'Measles, R₀ ≈ 15. One of the most contagious diseases known: more than 93% of the population must be immunised.',
    'tip.herd': 'Set the vaccination slider just above the herd-immunity threshold, and restart the epidemic.',
    'tip.reset': 'Reset all parameters.',
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
