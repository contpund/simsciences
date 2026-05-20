// Internationalization: a flat translation dictionary for 5 locales plus a
// DOM-walking applier. No dependencies, no reload — switching is instant.

export const SUPPORTED = ['fr', 'en', 'es', 'zh', 'ja'];
export const DEFAULT_LANG = 'fr';

export const translations = {
  fr: {
    appTitle: 'Simulation de Nuées',
    subtitle: 'Boids — Reynolds 1987',
    sectionParams: 'Paramètres',
    sectionOptions: 'Options',
    sectionPresets: 'Préréglages',
    boidCount: 'Nombre de boids',
    cohesion: 'Cohésion',
    separation: 'Séparation',
    alignment: 'Alignement',
    visionRadius: 'Rayon de vision',
    maxSpeed: 'Vitesse max',
    showVision: 'Afficher les cercles de vision',
    predator: 'Prédateur',
    obstacleMode: 'Placer des obstacles',
    presetMurmur: 'Murmure',
    presetChaos: 'Chaos',
    presetSchooling: 'Banc de poissons',
    reset: 'Réinitialiser',
    pause: 'Pause',
    resume: 'Reprendre',
    ovFps: 'IPS',
    ovBoids: 'Boids',
    ovGroup: 'Groupe moy.',
    chartTitle: 'Cohésion de la nuée (distance moyenne aux 5 plus proches)',
    chartX: 'Temps (images)',
    chartY: 'Distance moyenne (px)',
    langLabel: 'Langue',
    hintObstacle: 'Cliquez sur le canevas pour déposer un obstacle',
    'tip.boidCount': "Nombre de boids simulés. Élevé → nuées denses et chargées. Faible → individus clairsemés, faciles à suivre.",
    'tip.cohesion': "Attire chaque boid vers le centre de ses voisins. Max → amas serrés en rotation. Min → les boids s'ignorent.",
    'tip.separation': "Écarte les boids pour éviter les collisions. Max → répartition uniforme. Min → les boids se chevauchent et s'entassent.",
    'tip.alignment': "Oriente chaque boid selon la direction de ses voisins. Max → nuée parfaitement synchronisée. Min → mouvement chaotique et aléatoire.",
    'tip.visionRadius': "Distance à laquelle un boid « voit » ses voisins. Plus grand → de plus grandes nuées. Plus petit → de nombreux petits groupes indépendants.",
    'tip.maxSpeed': "Vitesse de déplacement maximale par boid. Élevée → mouvement rapide et chaotique. Faible → mouvement lent et gracieux.",
    'tip.showVision': "Dessine le rayon de perception de chaque boid. Utile pour montrer comment des règles locales créent un ordre global.",
    'tip.predator': "Active un prédateur rouge qui poursuit la nuée. Les boids le détectent et le fuient dans leur rayon de vision.",
    'tip.obstacleMode': "Cliquez sur le canevas pour placer des obstacles circulaires. Les boids les contournent automatiquement.",
    'tip.presetMurmur': "Murmuration d'étourneaux : fort alignement, large vision, séparation douce.",
    'tip.presetChaos': "Aucun alignement, faible cohésion : mouvement erratique et sans meneur.",
    'tip.presetSchooling': "Banc de poissons : règles équilibrées, virages serrés, vitesse modérée.",
    'tip.reset': "Rétablir tous les paramètres par défaut et régénérer la nuée.",
    'tip.pause': "Figer la simulation. Cliquez à nouveau pour reprendre dans le même état.",
    'tip.lang': "Changer la langue de l'interface.",
  },
  en: {
    appTitle: 'Flocking Simulation',
    subtitle: 'Boids — Reynolds 1987',
    sectionParams: 'Parameters',
    sectionOptions: 'Options',
    sectionPresets: 'Presets',
    boidCount: 'Boid count',
    cohesion: 'Cohesion',
    separation: 'Separation',
    alignment: 'Alignment',
    visionRadius: 'Vision radius',
    maxSpeed: 'Max speed',
    showVision: 'Show vision circles',
    predator: 'Predator',
    obstacleMode: 'Place obstacles',
    presetMurmur: 'Murmur',
    presetChaos: 'Chaos',
    presetSchooling: 'Schooling Fish',
    reset: 'Reset',
    pause: 'Pause',
    resume: 'Resume',
    ovFps: 'FPS',
    ovBoids: 'Boids',
    ovGroup: 'Avg group',
    chartTitle: 'Flock cohesion (mean distance to 5 nearest)',
    chartX: 'Time (frames)',
    chartY: 'Mean distance (px)',
    langLabel: 'Language',
    hintObstacle: 'Click the canvas to drop an obstacle',
    'tip.boidCount': "Number of simulated boids. High → dense, busy flocks. Low → sparse, easy to follow individuals.",
    'tip.cohesion': "Pulls each boid toward the center of its neighbors. Max → tight spinning clusters. Min → boids ignore each other.",
    'tip.separation': "Pushes boids apart to avoid collisions. Max → boids spread uniformly. Min → boids overlap and pile up.",
    'tip.alignment': "Steers each boid to match its neighbors' direction. Max → perfectly synchronized flock. Min → chaotic random motion.",
    'tip.visionRadius': "How far each boid can 'see' its neighbors. Larger → bigger flocks form. Smaller → many small independent groups.",
    'tip.maxSpeed': "Maximum travel speed per boid. High → fast chaotic motion. Low → slow graceful movement.",
    'tip.showVision': "Draws each boid's perception radius. Useful to explain how local rules create global order.",
    'tip.predator': "Activates a red predator that chases the flock. Boids detect and flee it within their vision radius.",
    'tip.obstacleMode': "Click on the canvas to place circular obstacles. Boids steer around them automatically.",
    'tip.presetMurmur': "Starling murmuration: high alignment, large vision, gentle separation.",
    'tip.presetChaos': "No alignment, low cohesion: erratic, leaderless motion.",
    'tip.presetSchooling': "Fish-like schooling: balanced rules, tight turns, moderate speed.",
    'tip.reset': "Restore all parameters to their defaults and reseed the flock.",
    'tip.pause': "Freeze the simulation. Click again to resume from the same state.",
    'tip.lang': "Change the interface language.",
  },
  es: {
    appTitle: 'Simulación de Bandadas',
    subtitle: 'Boids — Reynolds 1987',
    sectionParams: 'Parámetros',
    sectionOptions: 'Opciones',
    sectionPresets: 'Preajustes',
    boidCount: 'Número de boids',
    cohesion: 'Cohesión',
    separation: 'Separación',
    alignment: 'Alineación',
    visionRadius: 'Radio de visión',
    maxSpeed: 'Velocidad máx',
    showVision: 'Mostrar círculos de visión',
    predator: 'Depredador',
    obstacleMode: 'Colocar obstáculos',
    presetMurmur: 'Murmuración',
    presetChaos: 'Caos',
    presetSchooling: 'Banco de peces',
    reset: 'Reiniciar',
    pause: 'Pausar',
    resume: 'Reanudar',
    ovFps: 'FPS',
    ovBoids: 'Boids',
    ovGroup: 'Grupo prom.',
    chartTitle: 'Cohesión de la bandada (distancia media a los 5 más cercanos)',
    chartX: 'Tiempo (fotogramas)',
    chartY: 'Distancia media (px)',
    langLabel: 'Idioma',
    hintObstacle: 'Haz clic en el lienzo para soltar un obstáculo',
    'tip.boidCount': "Número de boids simulados. Alto → bandadas densas y recargadas. Bajo → individuos dispersos y fáciles de seguir.",
    'tip.cohesion': "Atrae a cada boid hacia el centro de sus vecinos. Máx → grupos compactos que giran. Mín → los boids se ignoran.",
    'tip.separation': "Separa los boids para evitar colisiones. Máx → se reparten uniformemente. Mín → se solapan y se amontonan.",
    'tip.alignment': "Orienta cada boid según la dirección de sus vecinos. Máx → bandada perfectamente sincronizada. Mín → movimiento caótico y aleatorio.",
    'tip.visionRadius': "Distancia a la que un boid 've' a sus vecinos. Mayor → bandadas más grandes. Menor → muchos grupos pequeños independientes.",
    'tip.maxSpeed': "Velocidad máxima de desplazamiento por boid. Alta → movimiento rápido y caótico. Baja → movimiento lento y elegante.",
    'tip.showVision': "Dibuja el radio de percepción de cada boid. Útil para explicar cómo las reglas locales crean orden global.",
    'tip.predator': "Activa un depredador rojo que persigue a la bandada. Los boids lo detectan y huyen dentro de su radio de visión.",
    'tip.obstacleMode': "Haz clic en el lienzo para colocar obstáculos circulares. Los boids los esquivan automáticamente.",
    'tip.presetMurmur': "Murmuración de estorninos: alta alineación, visión amplia, separación suave.",
    'tip.presetChaos': "Sin alineación, baja cohesión: movimiento errático y sin líder.",
    'tip.presetSchooling': "Banco de peces: reglas equilibradas, giros cerrados, velocidad moderada.",
    'tip.reset': "Restaurar todos los parámetros por defecto y regenerar la bandada.",
    'tip.pause': "Congelar la simulación. Haz clic de nuevo para reanudar en el mismo estado.",
    'tip.lang': "Cambiar el idioma de la interfaz.",
  },
  zh: {
    appTitle: '群体模拟',
    subtitle: 'Boids — 雷诺兹 1987',
    sectionParams: '参数',
    sectionOptions: '选项',
    sectionPresets: '预设',
    boidCount: '个体数量',
    cohesion: '内聚力',
    separation: '分离力',
    alignment: '对齐力',
    visionRadius: '视野半径',
    maxSpeed: '最大速度',
    showVision: '显示视野范围',
    predator: '捕食者',
    obstacleMode: '放置障碍物',
    presetMurmur: '群鸟',
    presetChaos: '混沌',
    presetSchooling: '鱼群',
    reset: '重置',
    pause: '暂停',
    resume: '继续',
    ovFps: '帧率',
    ovBoids: '个体',
    ovGroup: '平均群规模',
    chartTitle: '群体内聚度（到最近 5 个邻居的平均距离）',
    chartX: '时间（帧）',
    chartY: '平均距离（像素）',
    langLabel: '语言',
    hintObstacle: '点击画布放置障碍物',
    'tip.boidCount': '模拟个体的数量。多 → 密集繁忙的群体。少 → 稀疏、易于追踪单个个体。',
    'tip.cohesion': '将每个个体拉向邻居的中心。最大 → 紧密旋转的集群。最小 → 个体彼此忽略。',
    'tip.separation': '将个体相互推开以避免碰撞。最大 → 均匀分布。最小 → 个体重叠并堆积。',
    'tip.alignment': '使每个个体朝向邻居的方向。最大 → 完全同步的群体。最小 → 混乱的随机运动。',
    'tip.visionRadius': '个体能“看到”邻居的距离。越大 → 形成越大的群体。越小 → 许多小的独立群体。',
    'tip.maxSpeed': '每个个体的最大移动速度。高 → 快速混乱的运动。低 → 缓慢优雅的运动。',
    'tip.showVision': '绘制每个个体的感知半径。有助于说明局部规则如何产生全局秩序。',
    'tip.predator': '激活一个追逐群体的红色捕食者。个体会在其视野半径内察觉并逃离它。',
    'tip.obstacleMode': '点击画布放置圆形障碍物。个体会自动绕开它们。',
    'tip.presetMurmur': '椋鸟群飞：高对齐、大视野、轻微分离。',
    'tip.presetChaos': '无对齐、低内聚：无领导的混乱运动。',
    'tip.presetSchooling': '鱼群：规则平衡、转弯紧凑、速度适中。',
    'tip.reset': '将所有参数恢复为默认值并重新生成群体。',
    'tip.pause': '冻结模拟。再次点击以从相同状态继续。',
    'tip.lang': '更改界面语言。',
  },
  ja: {
    appTitle: '群れのシミュレーション',
    subtitle: 'Boids — レイノルズ 1987',
    sectionParams: 'パラメータ',
    sectionOptions: 'オプション',
    sectionPresets: 'プリセット',
    boidCount: 'ボイド数',
    cohesion: '結合力',
    separation: '分離力',
    alignment: '整列力',
    visionRadius: '視野半径',
    maxSpeed: '最大速度',
    showVision: '視野円を表示',
    predator: '捕食者',
    obstacleMode: '障害物を配置',
    presetMurmur: '群れ',
    presetChaos: 'カオス',
    presetSchooling: '魚群',
    reset: 'リセット',
    pause: '一時停止',
    resume: '再開',
    ovFps: 'FPS',
    ovBoids: 'ボイド',
    ovGroup: '平均群サイズ',
    chartTitle: '群れの結合度（最近傍 5 体への平均距離）',
    chartX: '時間（フレーム）',
    chartY: '平均距離（px）',
    langLabel: '言語',
    hintObstacle: 'キャンバスをクリックして障害物を配置',
    'tip.boidCount': 'シミュレートするボイドの数。多い → 密集して賑やかな群れ。少ない → まばらで個体を追いやすい。',
    'tip.cohesion': '各ボイドを近傍の中心へ引き寄せます。最大 → 密に回転する塊。最小 → ボイドは互いを無視。',
    'tip.separation': '衝突を避けるためボイドを離します。最大 → 均一に分散。最小 → 重なり合って密集。',
    'tip.alignment': '各ボイドを近傍の進行方向に合わせます。最大 → 完全に同期した群れ。最小 → 無秩序でランダムな動き。',
    'tip.visionRadius': 'ボイドが近傍を「見る」距離。大きい → より大きな群れ。小さい → 多数の小さな独立した群れ。',
    'tip.maxSpeed': 'ボイドごとの最大移動速度。高い → 速く無秩序な動き。低い → ゆっくり優雅な動き。',
    'tip.showVision': '各ボイドの知覚半径を描画します。局所的な規則が全体の秩序を生む様子の説明に有用。',
    'tip.predator': '群れを追う赤い捕食者を有効化します。ボイドは視野半径内でそれを察知し逃げます。',
    'tip.obstacleMode': 'キャンバスをクリックして円形の障害物を配置します。ボイドは自動的に回避します。',
    'tip.presetMurmur': 'ムクドリのマーマレーション：高い整列、広い視野、穏やかな分離。',
    'tip.presetChaos': '整列なし・低い結合：リーダー不在の不規則な動き。',
    'tip.presetSchooling': '魚群：バランスの取れた規則、鋭い旋回、中程度の速度。',
    'tip.reset': 'すべてのパラメータを既定値に戻し、群れを再生成します。',
    'tip.pause': 'シミュレーションを停止。もう一度クリックすると同じ状態から再開します。',
    'tip.lang': 'インターフェースの言語を変更します。',
  },
};

let currentLang = DEFAULT_LANG;

export function getLang() {
  return currentLang;
}

// Look up a key in the active language, falling back to English then the key.
export function t(key, lang = currentLang) {
  const dict = translations[lang] || translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}

// Apply a language to the whole document. Walks [data-i18n] for text content
// and [data-i18n-tip] for tooltip/aria text, updates <title>, and fires a
// 'languagechanged' event so the chart can relabel itself.
export function applyLanguage(lang) {
  if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
  currentLang = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'), lang);
  });

  document.querySelectorAll('[data-i18n-tip]').forEach((el) => {
    const tip = t(el.getAttribute('data-i18n-tip'), lang);
    el.setAttribute('data-tip', tip);
    el.setAttribute('aria-label', tip);
  });

  document.title = t('appTitle', lang);

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    btn.setAttribute('aria-pressed', String(btn.getAttribute('data-lang') === lang));
  });

  document.dispatchEvent(new CustomEvent('languagechanged', { detail: { lang } }));
}

// Wire the flag buttons in the header to switch language with no reload.
export function initLanguageSwitcher() {
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => applyLanguage(btn.getAttribute('data-lang')));
  });
  applyLanguage(DEFAULT_LANG);
}
