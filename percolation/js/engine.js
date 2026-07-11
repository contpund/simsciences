// Site percolation on a square lattice — Broadbent & Hammersley, 1957.
//
// An L×L grid of sites. Each site is OPEN with probability p, CLOSED with
// probability 1−p — a porous rock, a random maze. Pour water on the top row:
// it flows through open sites, four neighbours at a time, never diagonally.
// The only question is the one Broadbent asked about coal-filter gas masks:
// does the water come out the bottom?
//
// The answer is the sharpest threshold in statistical physics. On the square
// lattice, in the infinite-size limit, a spanning path exists with probability
// zero for p < p_c and probability one for p > p_c, where
//
//   p_c ≈ 0.592746  (site percolation, square lattice — known numerically
//                    to a dozen digits; no closed form is known)
//
// Below p_c every cluster is finite, however large. Above it, one infinite
// cluster appears and everything changes at once. Forest fires, epidemics,
// conductivity in doped materials, connectivity of random networks — the same
// transition, the same number for this lattice.
//
// Implementation notes:
// - Every site gets a frozen random level u ∈ [0,1), drawn once per rock from
//   a seeded RNG. A site is open iff u < p. Moving the p slider therefore
//   raises a water table through the SAME landscape — clusters only grow, and
//   the exact breakthrough level of a given rock is a well-defined number
//   (computable by union-find insertion in order of u).
// - Wetting is a BFS from the top row through open sites. `step()` advances
//   the front a few layers per frame; connectivity to the top is the truth it
//   converges to. Breakthrough = a wet site on the bottom row, observed, not
//   predicted.
// - Everything is driven by a seeded RNG so the capture pipeline renders
//   identical frames between runs.
//
//   Broadbent, S. R. & Hammersley, J. M. (1957). Percolation processes I.
//   Crystals and mazes. Proc. Cambridge Phil. Soc. 53, 629–641.

const BASE_SEED = 0x9e3779b1;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export const P_C = 0.592746;

export class PercolationEngine {
  constructor(L = 100) {
    this.L = Math.max(20, Math.min(240, Math.round(L)));
    this.p = 0.55;
    this.layersPerFrame = 2;  // BFS layers the water advances per frame
    this.paused = false;
    this.seedIndex = 0;
    this._alloc();
    this.randomize(0);
  }

  _alloc() {
    const n = this.L * this.L;
    this.level = new Float64Array(n);   // frozen random level u of each site
    this.open = new Uint8Array(n);      // 1 = open at the current p
    this.wet = new Int32Array(n);       // BFS depth from the top row, −1 = dry
    this._parent = new Int32Array(n);
    this._size = new Int32Array(n);
  }

  // ── The rock ───────────────────────────────────────────────────────────────

  /** Draw a fresh landscape of levels. Deterministic: rock k is always the
   *  same rock, on every machine, every run. */
  randomize(seedIndex = this.seedIndex + 1) {
    this.seedIndex = seedIndex;
    const rng = makeRng((BASE_SEED + 0x85ebca6b * seedIndex) >>> 0);
    for (let i = 0; i < this.level.length; i++) this.level[i] = rng();
    this.breakthroughP = null;
    this._recut();
    this.pour();
  }

  /** Same rock, same p, fresh pour. The outcome is a property of the rock:
   *  pouring twice gives the same answer twice. */
  pour() {
    this.breakthroughP = null;
    this.wet.fill(-1);
    this._frontier = [];
    const L = this.L;
    for (let x = 0; x < L; x++) {
      if (this.open[x]) { this.wet[x] = 0; this._frontier.push(x); }
    }
    this.pourDone = this._frontier.length === 0;
    this.percolated = false;
    this.depthReached = this._frontier.length ? 0 : -1;
    this.wetCount = this._frontier.length;
  }

  /** Re-derive the open set from the levels, then rebuild the clusters. */
  _recut() {
    const n = this.level.length;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const o = this.level[i] < this.p ? 1 : 0;
      this.open[i] = o;
      count += o;
    }
    this.openCount = count;
    this._findClusters();
  }

  /** Union-find over open sites: cluster count, largest cluster, exact
   *  top-to-bottom spanning. */
  _findClusters() {
    const L = this.L, n = L * L, par = this._parent, sz = this._size;
    for (let i = 0; i < n; i++) { par[i] = i; sz[i] = 1; }
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const union = (a, b) => {
      let ra = find(a), rb = find(b);
      if (ra === rb) return;
      if (sz[ra] < sz[rb]) { const t = ra; ra = rb; rb = t; }
      par[rb] = ra; sz[ra] += sz[rb];
    };
    const open = this.open;
    for (let y = 0; y < L; y++) {
      for (let x = 0; x < L; x++) {
        const i = y * L + x;
        if (!open[i]) continue;
        if (x + 1 < L && open[i + 1]) union(i, i + 1);
        if (y + 1 < L && open[i + L]) union(i, i + L);
      }
    }
    let clusters = 0, largest = 0, largestRoot = -1;
    for (let i = 0; i < n; i++) {
      if (!open[i]) continue;
      if (find(i) === i) {
        clusters++;
        if (sz[i] > largest) { largest = sz[i]; largestRoot = i; }
      }
    }
    this.nClusters = clusters;
    this.largestSize = largest;
    this.largestRoot = largestRoot;
    // Exact spanning: does any cluster own a top-row site and a bottom-row one?
    this.spans = false;
    const tops = new Set();
    for (let x = 0; x < L; x++) if (open[x]) tops.add(find(x));
    for (let x = 0; x < L && !this.spans; x++) {
      const i = (L - 1) * L + x;
      if (open[i] && tops.has(find(i))) this.spans = true;
    }
    this._find = find;
  }

  /** Root of the cluster containing site i (open sites only). Valid until the
   *  next _recut(). The renderer colours clusters with it. */
  clusterRoot(i) { return this._find(i); }

  /** The exact breakthrough level of THIS rock: insert sites in order of
   *  level, union as you go, and return the level u at which top first meets
   *  bottom. As L grows, this number converges on p_c = 0.592746. O(n log n),
   *  called on demand (dry-run, tooltips), not per frame. */
  criticalP() {
    const L = this.L, n = L * L;
    const order = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => this.level[a] - this.level[b]);
    const par = new Int32Array(n + 2), sz = new Int32Array(n + 2).fill(1);
    for (let i = 0; i < n + 2; i++) par[i] = i;
    const TOP = n, BOT = n + 1;
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const union = (a, b) => {
      let ra = find(a), rb = find(b);
      if (ra === rb) return;
      if (sz[ra] < sz[rb]) { const t = ra; ra = rb; rb = t; }
      par[rb] = ra; sz[ra] += sz[rb];
    };
    const added = new Uint8Array(n);
    for (const i of order) {
      added[i] = 1;
      const x = i % L, y = (i / L) | 0;
      if (y === 0) union(i, TOP);
      if (y === L - 1) union(i, BOT);
      if (x > 0 && added[i - 1]) union(i, i - 1);
      if (x + 1 < L && added[i + 1]) union(i, i + 1);
      if (y > 0 && added[i - L]) union(i, i - L);
      if (y + 1 < L && added[i + L]) union(i, i + L);
      if (find(TOP) === find(BOT)) return this.level[i];
    }
    return 1;
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  /** Move the water table. Raising p keeps every wet site wet and lets the
   *  water probe the newly opened pores from its whole body; lowering p is a
   *  fresh pour into a tighter rock. */
  setP(v) {
    const np = Math.max(0, Math.min(1, +v));
    if (np === this.p) return;
    const rising = np > this.p;
    this.p = np;
    this._recut();
    if (!rising) { this.pour(); return; }
    // Rising water table: re-arm the front from every wet site that now has a
    // dry open neighbour (new pores may have opened anywhere along the body).
    const L = this.L, n = L * L;
    const frontier = [];
    let wetCount = 0;
    for (let i = 0; i < n; i++) {
      if (this.wet[i] < 0) continue;
      wetCount++;
      const x = i % L, y = (i / L) | 0;
      if ((x > 0 && this.open[i - 1] && this.wet[i - 1] < 0) ||
          (x + 1 < L && this.open[i + 1] && this.wet[i + 1] < 0) ||
          (y > 0 && this.open[i - L] && this.wet[i - L] < 0) ||
          (y + 1 < L && this.open[i + L] && this.wet[i + L] < 0)) frontier.push(i);
    }
    // New top-row openings are new inlets.
    for (let x = 0; x < L; x++) {
      if (this.open[x] && this.wet[x] < 0) { this.wet[x] = 0; frontier.push(x); wetCount++; }
    }
    this._frontier = frontier;
    this.wetCount = wetCount;
    this.pourDone = frontier.length === 0;
  }

  setSize(v) {
    const s = Math.max(20, Math.min(240, Math.round(v)));
    if (s === this.L) return;
    this.L = s;
    this._alloc();
    this.randomize(this.seedIndex);
  }

  setLayersPerFrame(v) { this.layersPerFrame = Math.max(1, Math.round(v)); }
  setSeed(k) { this.randomize(k); }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('percolation:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  // ── Readouts ──────────────────────────────────────────────────────────────

  get pc() { return P_C; }
  get openFraction() { return this.openCount / (this.L * this.L); }
  get largestFraction() { return this.openCount ? this.largestSize / (this.L * this.L) : 0; }
  get wetFraction() { return this.wetCount / (this.L * this.L); }
  /** How far down the water has reached, 0…1. A fact about this pour. */
  get depthFraction() { return this.depthReached < 0 ? 0 : this.depthReached / (this.L - 1); }

  /** Measured verdict about the pour in progress — what happened, never what
   *  will: the water is still moving, it broke through, or it stopped. */
  get state() {
    if (this.percolated) return 'percolates';
    if (this.pourDone) return 'sealed';
    return 'pouring';
  }

  // ── One frame ─────────────────────────────────────────────────────────────

  step() {
    if (this.paused || this.pourDone) return;
    const L = this.L;
    for (let layer = 0; layer < this.layersPerFrame; layer++) {
      if (!this._frontier.length) break;
      const next = [];
      for (const i of this._frontier) {
        const x = i % L, y = (i / L) | 0, d = this.wet[i] + 1;
        // 4-neighbour wetting. Diagonals never touch: that is the model.
        if (x > 0 && this.open[i - 1] && this.wet[i - 1] < 0) { this.wet[i - 1] = d; next.push(i - 1); }
        if (x + 1 < L && this.open[i + 1] && this.wet[i + 1] < 0) { this.wet[i + 1] = d; next.push(i + 1); }
        if (y > 0 && this.open[i - L] && this.wet[i - L] < 0) { this.wet[i - L] = d; next.push(i - L); }
        if (y + 1 < L && this.open[i + L] && this.wet[i + L] < 0) { this.wet[i + L] = d; next.push(i + L); }
      }
      for (const i of next) {
        const y = (i / L) | 0;
        if (y > this.depthReached) this.depthReached = y;
        if (y === L - 1 && !this.percolated) {
          this.percolated = true;
          // The level of the pour that broke through — recorded the moment it
          // happens. On a slow ramp this pins the rock's own threshold.
          if (this.breakthroughP === null) this.breakthroughP = this.p;
        }
      }
      this.wetCount += next.length;
      this._frontier = next;
    }
    if (!this._frontier.length) this.pourDone = true;
  }
}
