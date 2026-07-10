// FR/EN dictionary for the lattice-Boltzmann page.

export const SUPPORTED = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'L\'allée de von Kármán',
    subtitle: 'Un seul nombre décide si un sillage se met à osciller',
    sectionParams: 'Paramètres',
    reynolds: 'Re (nombre de Reynolds)',
    steps: 'Vitesse',
    sectionStats: 'Mesures',
    statRe: 'Re effectif',
    statRegime: 'Régime',
    statSt: 'Strouhal (St)',
    statPeriod: 'Période de lâcher',
    statNu: 'Viscosité ν',
    statD: 'Taille D de l\'obstacle',
    sectionShapes: 'Obstacles',
    cylinder: 'Cylindre',
    plate: 'Plaque',
    wedge: 'Triangle',
    airfoil: 'Aile',
    sectionTools: 'Outils',
    drawTool: '✏️ Dessiner',
    eraseTool: '🧽 Effacer',
    brush: 'Épaisseur du trait',
    clearAll: 'Tout effacer',
    sectionField: 'Champ affiché',
    vorticity: 'Vorticité',
    speed: 'Vitesse',
    pressure: 'Pression',
    tracers: '💨 Particules traçantes',
    reset: 'Réinitialiser',
    start: '⏸ Pause',
    citation: 'Frisch, U., Hasslacher, B. & Pomeau, Y. (1986). Lattice-gas automata for the Navier–Stokes equation. Phys. Rev. Lett. 56, 1505.',
    'regime.settling': 'établissement de l\'écoulement…',
    'regime.creeping': 'écoulement rampant — pas de décollement',
    'regime.steady': 'sillage stable — deux tourbillons collés',
    'regime.shedding': 'allée de von Kármán — le sillage oscille',
    'regime.empty': 'aucun obstacle',
    'short.settling': '…',
    'short.creeping': 'rampant',
    'short.steady': 'stable',
    'short.shedding': 'von Kármán',
    'short.empty': '—',
    'unit.steps': 'pas',
    'unit.cell': 'cellule',
    'unit.cells': 'cellules',
    'hud.hint': 'Dessinez un obstacle dans le canal',
    'hud.unstable': 'simulation divergée — réinitialisez',
    'tip.lang': 'Changer la langue',
    'tip.reynolds': 'Re = U·D/ν, le rapport entre inertie et viscosité. C\'est le seul bouton physique : la vitesse d\'entrée U est fixe, et la viscosité ν en découle. Sous Re ≈ 50 le sillage reste collé ; au-dessus il lâche des tourbillons en alternance. Tout près du seuil, la simulation met longtemps à trancher — c\'est le ralentissement critique, et il est réel.',
    'tip.steps': 'Nombre de pas de réseau calculés par image. Le pas de temps du réseau est fixe : l\'écoulement obtenu est exactement le même, seule l\'attente change.',
    'tip.statRe': 'Le Re réellement simulé, une fois ν ramenée dans la plage où le schéma BGK reste stable. Aux extrêmes du curseur il peut différer de la consigne.',
    'tip.statRegime': 'Verdict mesuré à la sonde, pas déduit de Re : on regarde si l\'oscillation transverse du sillage croît ou s\'éteint.',
    'tip.statSt': 'St = f·D/U, la fréquence de lâcher rendue sans dimension. L\'expérience donne ≈ 0,2 pour un cylindre sur cinq décades de Re. Ce code ne connaît pas ce nombre : il le retrouve.',
    'tip.statPeriod': 'Temps séparant deux tourbillons lâchés du même côté, en pas de réseau.',
    'tip.statNu': 'Viscosité cinématique en unités de réseau, ν = (1/ω − 1/2)/3. Déduite de Re et de D, puis bornée : trop faible, le schéma diverge.',
    'tip.statD': 'Hauteur de l\'obstacle en cellules — la longueur caractéristique D du nombre de Reynolds. Elle est mesurée sur ce que vous avez dessiné.',
    'tip.cylinder': 'Le cas d\'école. Seuil mesuré ici à Re ≈ 50 : à 48 l\'oscillation s\'éteint, à 50 elle s\'installe. La référence pour un cylindre en milieu infini est 47 ; notre canal (16 % de blocage) relève le seuil, comme en soufflerie. Au-delà, l\'amplitude croît comme √(Re − 50) — la signature d\'une bifurcation de Hopf.',
    'tip.plate': 'Une plaque en travers : arêtes vives, décollement forcé, tourbillons dès un Re bien plus bas.',
    'tip.wedge': 'Un triangle pointe en amont : nez fendeur, culot large. Le sillage est plus large que celui du cylindre.',
    'tip.airfoil': 'Un profil épais légèrement incliné. Nez arrondi, bord de fuite aigu : le sillage reste mince tant que l\'incidence est faible.',
    'tip.drawTool': 'Peindre des obstacles à la souris ou au doigt. La taille D est remesurée, donc Re change avec ce que vous dessinez.',
    'tip.eraseTool': 'Retirer de la matière.',
    'tip.brush': 'Diamètre du pinceau, en cellules du réseau. Le cercle en pointillé sous le curseur montre exactement ce qui sera peint. À 1 cellule on trace un fil fin ; à 25, on bouche le canal.',
    'tip.clearAll': 'Vider le canal. Sans obstacle, il n\'y a rien à mesurer.',
    'tip.vorticity': 'Le rotationnel de la vitesse. Bleu et ambre tournent en sens contraire. C\'est le seul champ où les tourbillons se voient vraiment.',
    'tip.speed': 'La norme de la vitesse. Montre la couche limite et le déficit de vitesse dans le sillage.',
    'tip.pressure': 'ρ − 1. Montre le point d\'arrêt au nez et le cœur dépressionnaire de chaque tourbillon.',
    'tip.tracers': 'Des particules passives portées par l\'écoulement. Elles ne le modifient pas — elles le racontent.',
    'tip.reset': 'Repart d\'un écoulement uniforme.',
    'tip.pause': 'Fige le fluide.',
  },
  en: {
    appTitle: 'The von Kármán Street',
    subtitle: 'One number decides whether a wake starts to oscillate',
    sectionParams: 'Parameters',
    reynolds: 'Re (Reynolds number)',
    steps: 'Speed',
    sectionStats: 'Readouts',
    statRe: 'Effective Re',
    statRegime: 'Regime',
    statSt: 'Strouhal (St)',
    statPeriod: 'Shedding period',
    statNu: 'Viscosity ν',
    statD: 'Obstacle size D',
    sectionShapes: 'Obstacles',
    cylinder: 'Cylinder',
    plate: 'Plate',
    wedge: 'Wedge',
    airfoil: 'Airfoil',
    sectionTools: 'Tools',
    drawTool: '✏️ Draw',
    eraseTool: '🧽 Erase',
    brush: 'Brush size',
    clearAll: 'Clear all',
    sectionField: 'Field shown',
    vorticity: 'Vorticity',
    speed: 'Speed',
    pressure: 'Pressure',
    tracers: '💨 Tracer particles',
    reset: 'Reset',
    start: '⏸ Pause',
    citation: 'Frisch, U., Hasslacher, B. & Pomeau, Y. (1986). Lattice-gas automata for the Navier–Stokes equation. Phys. Rev. Lett. 56, 1505.',
    'regime.settling': 'flow settling…',
    'regime.creeping': 'creeping flow — nothing separates',
    'regime.steady': 'steady wake — two vortices, stuck',
    'regime.shedding': 'von Kármán street — the wake oscillates',
    'regime.empty': 'no obstacle',
    'short.settling': '…',
    'short.creeping': 'creeping',
    'short.steady': 'steady',
    'short.shedding': 'von Kármán',
    'short.empty': '—',
    'unit.steps': 'steps',
    'unit.cell': 'cell',
    'unit.cells': 'cells',
    'hud.hint': 'Draw an obstacle in the channel',
    'hud.unstable': 'simulation diverged — reset',
    'tip.lang': 'Switch language',
    'tip.reynolds': 'Re = U·D/ν, inertia divided by viscosity. It is the only physical knob: the inflow speed U is fixed and ν follows. Below Re ≈ 50 the wake stays attached; above it, the obstacle sheds vortices alternately left and right. Close to the threshold the simulation takes a long time to decide — that is critical slowing down, and it is real.',
    'tip.steps': 'Lattice steps computed per frame. The lattice time step is fixed, so you get exactly the same flow — only sooner.',
    'tip.statRe': 'The Re actually simulated, once ν is clamped to the range where the BGK scheme stays stable. At the ends of the slider it can differ from the setting.',
    'tip.statRegime': 'A verdict measured at the probe, not inferred from Re: we watch whether the wake\'s transverse oscillation grows or dies.',
    'tip.statSt': 'St = f·D/U, the shedding frequency made dimensionless. Experiment gives ≈0.2 for a cylinder across five decades of Re. This code was never told that number — it finds it.',
    'tip.statPeriod': 'Lattice steps between two vortices shed from the same side.',
    'tip.statNu': 'Kinematic viscosity in lattice units, ν = (1/ω − 1/2)/3. Derived from Re and D, then clamped: too small and the scheme diverges.',
    'tip.statD': 'The obstacle\'s height in cells — the characteristic length D in the Reynolds number. Measured from whatever you drew.',
    'tip.cylinder': 'The textbook case. Threshold measured here at Re ≈ 50: at 48 the oscillation dies, at 50 it settles into a limit cycle. The reference value for an unconfined cylinder is 47; our channel (16% blockage) pushes it up, exactly as a wind tunnel does. Above it the amplitude grows like √(Re − 50) — the signature of a Hopf bifurcation.',
    'tip.plate': 'A plate across the flow: sharp edges force separation, so vortices appear at a far lower Re.',
    'tip.wedge': 'A triangle, point upstream: splitting nose, blunt base. Its wake is wider than the cylinder\'s.',
    'tip.airfoil': 'A thick section at a small angle. Rounded nose, sharp trailing edge: the wake stays thin while the incidence is low.',
    'tip.drawTool': 'Paint obstacles with the mouse or your finger. D is re-measured, so Re changes with whatever you draw.',
    'tip.eraseTool': 'Take material away.',
    'tip.brush': 'Brush diameter, in lattice cells. The dashed circle under the cursor shows exactly what will be painted. At 1 cell you draw a thin wire; at 25 you block the channel.',
    'tip.clearAll': 'Empty the channel. With no obstacle there is nothing to measure.',
    'tip.vorticity': 'The curl of the velocity. Blue and amber spin opposite ways. It is the only field in which vortices are really visible.',
    'tip.speed': 'The magnitude of the velocity. Shows the boundary layer and the velocity deficit in the wake.',
    'tip.pressure': 'ρ − 1. Shows the stagnation point at the nose and the low-pressure core of each vortex.',
    'tip.tracers': 'Passive particles carried by the flow. They do not change it — they narrate it.',
    'tip.reset': 'Start again from a uniform flow.',
    'tip.pause': 'Freeze the fluid.',
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
