// FR/EN dictionary for the Schelling segregation page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'La ségrégation de Schelling',
    subtitle: 'Personne ne veut de ghetto. Tout le monde en fabrique un.',
    sectionParams: 'Paramètres',
    tolerance: 'τ — voisins semblables voulus',
    empty: 'Logements vides',
    size: 'Taille du quartier',
    speed: 'Vitesse',
    sectionStats: 'Mesures',
    statAsked: 'Demandé (τ)',
    statGot: 'Obtenu (S)',
    statRandom: 'Au hasard',
    statUnhappy: 'Mécontents',
    statChurn: 'Déménagements / tour',
    statRounds: 'Tours',
    statState: 'État',
    sectionPresets: 'Expériences',
    mild: 'À peine 30 %',
    half: 'Une moitié',
    last: '75 % — la limite',
    never: '80 % — sans fin',
    shuffle: '🎲 Remélanger',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Schelling, T. C. (1971). Dynamic models of segregation. Journal of Mathematical Sociology 1(2), 143–186.',
    'panel.asked': 'ils demandent',
    'panel.got': 'ils obtiennent',
    'panel.baseline': 'un mélange au hasard donnerait 50 %',
    'hud.round': 'tour',
    'hud.unhappy': 'de mécontents',
    'state.fresh': 'mélange initial',
    'state.moving': 'les mécontents déménagent…',
    'state.settled': 'stabilisé — plus personne ne bouge',
    'state.restless': 'toujours en mouvement — personne ne se fixe',
    'tip.lang': 'Changer la langue',
    'tip.tolerance': 'La part minimale de voisins semblables qu\'un agent exige pour rester chez lui. À 30 %, il accepte d\'être minoritaire à sept contre trois. Personne ici n\'est raciste : c\'est une préférence, pas un rejet. Et pourtant.',
    'tip.empty': 'Part de logements vides. C\'est la mobilité du système : sans vide, personne ne peut déménager. Mesuré : à τ = 80 %, 10 % de vide et le quartier tourne encore après 2000 tours ; 20 % de vide et il se stabilise au tour 77, à S = 99,9 %. Le vide rend les exigences extrêmes satisfiables. Trop peu de vide fige tout : à τ = 60 % avec 2 % de vide, ils déménagent indéfiniment, moins de 3 % à la fois.',
    'tip.size': 'Côté de la grille, en cellules. Chaque agent regarde ses huit voisins.',
    'tip.speed': 'Nombre de cellules visitées par image. Ne change rien au résultat : la règle est la même, seule l\'attente change.',
    'tip.statAsked': 'τ, ce que chaque agent exige. Identique pour tout le monde.',
    'tip.statGot': 'S, la part moyenne de voisins semblables, sur tous les agents qui ont au moins un voisin. C\'est ce que le quartier produit, pas ce qu\'on lui a demandé.',
    'tip.statRandom': 'Deux groupes de taille égale jetés au hasard donnent S = 50 %. C\'est la référence : tout ce qui dépasse est fabriqué par la règle.',
    'tip.statUnhappy': 'Part des agents dont le voisinage ne satisfait pas leur τ. Ce sont eux qui déménagent.',
    'tip.statRounds': 'Un tour = un balayage complet de la grille, dans un ordre aléatoire. Les déménagements prennent effet immédiatement : celui qui s\'installe à côté de vous change votre avis avant la fin du tour.',
    'tip.statChurn': 'Part des agents qui déménagent à chaque tour, moyennée sur les 20 derniers. C\'est le chiffre qui décide : il tombe à zéro, ou il ne tombe pas.',
    'tip.statState': 'Ce que l\'écran constate, pas ce qu\'il prédit. « Stabilisé » veut dire que personne n\'a bougé du tour. « Toujours en mouvement » veut dire qu\'au tour 120 ils déménageaient encore. Savoir si un quartier finira par se fixer n\'est pas décidable depuis une fenêtre de quelques tours : à τ = 0,71 avec 5 % de vide, il se stabilise au tour 429 après avoir semblé repartir.',
    'tip.mild': 'τ = 30 %. Chacun accepte d\'être minoritaire à 70 %. Mesuré : la ségrégation grimpe de 50,1 % à 75,5 %, en 11 tours. Au départ, seuls 17,4 % des agents étaient mécontents — un sur six.',
    'tip.half': 'τ = 50 %. Chacun veut juste la moitié. Mesuré : S = 87,7 %, en 16 tours.',
    'tip.last': 'τ = 75 %, soit six voisins sur huit — la dernière exigence satisfaisable. Mesuré : S = 99,5 %, en 61 tours. À 76 %, il faudrait sept voisins sur huit, et plus rien ne converge.',
    'tip.never': 'τ = 80 %, soit sept voisins sur huit. 93,4 % sont mécontents au départ. Mesuré : après 2000 tours, 9 agents sur 10 déménagent encore à chaque tour, et la ségrégation stagne vers 57 % — plus bas qu\'à τ = 30 %. Exiger plus donne moins.',
    'tip.shuffle': 'Rejette tout le monde au hasard, sans toucher à τ. La ségrégation retombe à 50 %.',
    'tip.reset': 'Réinitialise tous les paramètres.',
    'tip.pause': 'Fige le quartier.',
  },
  en: {
    appTitle: 'Schelling Segregation',
    subtitle: 'Nobody wants a ghetto. Everybody builds one.',
    sectionParams: 'Parameters',
    tolerance: 'τ — like neighbours wanted',
    empty: 'Empty homes',
    size: 'Neighbourhood size',
    speed: 'Speed',
    sectionStats: 'Readouts',
    statAsked: 'Asked for (τ)',
    statGot: 'Delivered (S)',
    statRandom: 'At random',
    statUnhappy: 'Unhappy',
    statChurn: 'Moves / round',
    statRounds: 'Rounds',
    statState: 'State',
    sectionPresets: 'Experiments',
    mild: 'Barely 30%',
    half: 'Just a half',
    last: '75% — the limit',
    never: '80% — endless',
    shuffle: '🎲 Reshuffle',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Schelling, T. C. (1971). Dynamic models of segregation. Journal of Mathematical Sociology 1(2), 143–186.',
    'panel.asked': 'they ask for',
    'panel.got': 'they get',
    'panel.baseline': 'a random mix would give 50%',
    'hud.round': 'round',
    'hud.unhappy': 'unhappy',
    'state.fresh': 'random mix',
    'state.moving': 'the unhappy are moving…',
    'state.settled': 'settled — nobody wants to move',
    'state.restless': 'still moving — nobody settles',
    'tip.lang': 'Switch language',
    'tip.tolerance': 'The smallest share of like neighbours an agent needs in order to stay. At 30% it is content to be outnumbered seven to three. Nobody here is a bigot: this is a preference, not a rejection. And yet.',
    'tip.empty': 'Share of empty homes — the mobility of the system: with no vacancies nobody can move. Measured: at τ = 80%, 10% vacancy and the grid is still churning after 2000 rounds; 20% vacancy and it settles at round 77, at S = 99.9%. Vacancy is what makes extreme demands satisfiable. Too little of it jams everything: at τ = 60% with 2% vacancy they relocate forever, under 3% at a time.',
    'tip.size': 'Side of the grid, in cells. Every agent looks at its eight neighbours.',
    'tip.speed': 'Cells visited per frame. It changes nothing about the outcome — the rule is the same, only the waiting differs.',
    'tip.statAsked': 'τ, what every agent demands. The same for everybody.',
    'tip.statGot': 'S, the mean share of like neighbours over every agent that has at least one. This is what the neighbourhood produces, not what anyone asked of it.',
    'tip.statRandom': 'Two equally sized groups scattered at random give S = 50%. That is the baseline: everything above it is manufactured by the rule.',
    'tip.statUnhappy': 'Share of agents whose neighbourhood fails their τ. They are the ones who move.',
    'tip.statRounds': 'One round is a full sweep of the grid in random order. Moves take effect at once: whoever lands next to you changes your mind before the round is over.',
    'tip.statChurn': 'Share of agents relocating each round, averaged over the last 20. This is the number that decides: it falls to zero, or it does not.',
    'tip.statState': 'What the screen observes, not what it predicts. "Settled" means nobody moved this round. "Still moving" means that at round 120 they were still relocating. Whether a neighbourhood will ever settle cannot be decided from a window of a few rounds: at τ = 0.71 with 5% vacancy it settles at round 429, after appearing to pick up again.',
    'tip.mild': 'τ = 30%. Everyone accepts being outnumbered 70/30. Measured: segregation climbs from 50.1% to 75.5%, in 11 rounds. At the start only 17.4% of agents were unhappy — one in six.',
    'tip.half': 'τ = 50%. Everyone just wants half. Measured: S = 87.7%, in 16 rounds.',
    'tip.last': 'τ = 75% — six neighbours out of eight, the last demand that can be met. Measured: S = 99.5%, in 61 rounds. At 76% you would need seven of eight, and nothing converges any more.',
    'tip.never': 'τ = 80% — seven neighbours out of eight. 93.4% are unhappy at the start. Measured: after 2000 rounds, nine agents in ten still relocate every round, and segregation stalls around 57% — lower than at τ = 30%. Asking for more delivers less.',
    'tip.shuffle': 'Throw everyone back at random, without touching τ. Segregation drops to 50%.',
    'tip.reset': 'Reset every parameter.',
    'tip.pause': 'Freeze the neighbourhood.',
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
