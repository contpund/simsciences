// Schelling's segregation model — Thomas Schelling, 1971.
//
// A grid of cells. Each holds one of two kinds of agent, or nobody. An agent
// looks at its eight neighbours and counts how many are the same kind as it.
// If that fraction falls below its tolerance τ, it is unhappy, and it moves to
// a random empty cell. Repeat until nobody wants to move.
//
// That is the whole model. There is no bigotry in it: an agent with τ = 0.3 is
// perfectly content to be outnumbered seven to three. Nobody is trying to
// segregate anything.
//
//   Schelling, T. C. (1971). Dynamic models of segregation.
//   Journal of Mathematical Sociology 1(2), 143–186.
//
// Two numbers matter, and the gap between them is the whole episode:
//
//   τ  what each agent asks for — the minimum share of like neighbours
//   S  what the neighbourhood delivers — the mean share of like neighbours,
//      averaged over every agent that has any
//
// A random scatter of two equally sized groups gives S ≈ 0.5. Nothing in the
// code pushes S higher. It goes there anyway.
//
// Everything is driven by a seeded RNG, so the capture pipeline renders
// identical frames between runs.

export const EMPTY = 0, A = 1, B = 2;

// Whether a grid will *ever* settle is not something a finite window can tell
// you, and two calibrated detectors died proving it. A level test ("still
// moving a lot") misses the slow bleed of a grid with almost no empty homes:
// τ = 0.60 with 2% vacancy never settles while relocating under 3% of agents a
// round. A trend test ("moves per round have stopped falling") misfires the
// other way: τ = 0.71 with 5% vacancy settles at round 429, yet its move count
// *rises* over a 20-round lag on the way there. Held-out configurations broke
// every threshold that separated the fit set.
//
// So this state claims nothing about the future. `settled` is a fact — nobody
// moved. `restless` is a fact too: it is round N, and they are still moving.
// The prediction lives in the copy, where it can cite the only evidence there
// is: τ ≥ 0.76 at 10% vacancy was run for 2000 rounds and never settled.
const RESTLESS_ROUNDS = 120;
const RESTLESS_WINDOW = 20;
const RESTLESS_FLOOR = 0.005;   // still relocating ≥ 0.5% of agents per round

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export class SchellingEngine {
  constructor(size = 60) {
    this.n = size;
    this.tau = 0.30;
    this.emptyFrac = 0.10;
    this.stepsPerFrame = 240;   // cells visited per frame, not moves
    this.paused = false;

    this.cells = new Int8Array(size * size);
    this.happy = new Uint8Array(size * size);
    this.order = new Int32Array(size * size);

    this.randomize();
  }

  idx(x, y) { return x + y * this.n; }

  // ── Setup ─────────────────────────────────────────────────────────────────

  /** Scatter two equally sized groups at random, leaving `emptyFrac` empty. */
  randomize() {
    const n = this.n, total = n * n;
    this.rng = makeRng(0x5c4e1176);
    this.cells.fill(EMPTY);

    const nEmpty = Math.round(total * this.emptyFrac);
    const nAgents = total - nEmpty;
    const nA = nAgents >> 1;

    // Fill, then Fisher–Yates with the seeded stream: a genuinely random
    // arrangement, which is the baseline S ≈ 0.5 the whole episode measures against.
    for (let i = 0; i < total; i++) this.cells[i] = i < nA ? A : (i < nAgents ? B : EMPTY);
    for (let i = total - 1; i > 0; i--) {
      const j = (this.rng() * (i + 1)) | 0;
      const t = this.cells[i]; this.cells[i] = this.cells[j]; this.cells[j] = t;
    }

    this._rebuildEmpty();
    this.rounds = 0;
    this.movedThisRound = 0;
    this.movedLastRound = -1;
    this.settled = false;
    this.ptr = 0;
    this.movedHistory = [];
    this._shuffleOrder();
    this._recomputeStats();
    this.initialSegregation = this.seg;
  }

  _rebuildEmpty() {
    const total = this.n * this.n;
    this.emptyList = [];
    this.emptyAt = new Int32Array(total).fill(-1);
    for (let i = 0; i < total; i++) {
      if (this.cells[i] === EMPTY) {
        this.emptyAt[i] = this.emptyList.length;
        this.emptyList.push(i);
      }
    }
  }

  _shuffleOrder() {
    const total = this.n * this.n;
    for (let i = 0; i < total; i++) this.order[i] = i;
    for (let i = total - 1; i > 0; i--) {
      const j = (this.rng() * (i + 1)) | 0;
      const t = this.order[i]; this.order[i] = this.order[j]; this.order[j] = t;
    }
  }

  // ── The rule ──────────────────────────────────────────────────────────────

  /** Share of this agent's occupied neighbours that are its own kind, and how
   *  many neighbours it has at all. An agent with no neighbours is content. */
  _like(i) {
    const n = this.n;
    const x = i % n, y = (i / n) | 0;
    const me = this.cells[i];
    let same = 0, occupied = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= n) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        if (xx < 0 || xx >= n) continue;
        const c = this.cells[xx + yy * n];
        if (c === EMPTY) continue;
        occupied++;
        if (c === me) same++;
      }
    }
    return { frac: occupied ? same / occupied : 1, occupied };
  }

  isHappy(i) {
    if (this.cells[i] === EMPTY) return true;
    return this._like(i).frac >= this.tau - 1e-9;
  }

  /** One pass gives happiness, S and the unhappy share. The renderer wants all
   *  three every frame; three separate O(n²·8) sweeps would be silly. */
  _recomputeStats() {
    const total = this.n * this.n;
    let sum = 0, withNeighbours = 0, unhappy = 0, agents = 0;
    for (let i = 0; i < total; i++) {
      if (this.cells[i] === EMPTY) { this.happy[i] = 1; continue; }
      agents++;
      const { frac, occupied } = this._like(i);
      const ok = frac >= this.tau - 1e-9;
      this.happy[i] = ok ? 1 : 0;
      if (!ok) unhappy++;
      if (occupied) { sum += frac; withNeighbours++; }
    }
    this.seg = withNeighbours ? sum / withNeighbours : 0;
    this.unhappy = agents ? unhappy / agents : 0;
    this.agents = agents;
  }

  /** Move the agent at `i` to a uniformly random empty cell. */
  _relocate(i) {
    const k = (this.rng() * this.emptyList.length) | 0;
    const dest = this.emptyList[k];
    this.cells[dest] = this.cells[i];
    this.cells[i] = EMPTY;
    // The destination leaves the empty list; the origin takes its slot.
    this.emptyList[k] = i;
    this.emptyAt[i] = k;
    this.emptyAt[dest] = -1;
  }

  // ── Readouts ──────────────────────────────────────────────────────────────

  /** S — the mean share of like neighbours, over every agent that has any.
   *  This is what the neighbourhood delivers, as opposed to what anyone asked
   *  for. A random scatter of two equal groups gives 0.5. */
  get segregation() { return this.seg; }
  get unhappyFraction() { return this.unhappy; }
  get agentCount() { return this.agents; }

  /** Not a prediction: an observation. It is round `RESTLESS_ROUNDS` or later
   *  and people are still relocating, in numbers, every round. Whether they
   *  ever stop is a question this grid answers by running, not by being asked. */
  get restless() {
    if (this.settled) return false;
    const h = this.movedHistory;
    if (this.rounds < RESTLESS_ROUNDS || h.length < RESTLESS_WINDOW) return false;
    const recent = h.slice(h.length - RESTLESS_WINDOW);
    return recent.reduce((x, y) => x + y, 0) / RESTLESS_WINDOW > RESTLESS_FLOOR;
  }

  /** Share of agents relocating per round, averaged over the recent window.
   *  Watch it fall to zero, or watch it not. */
  get churnRate() {
    const h = this.movedHistory;
    if (this.settled || !h.length) return 0;
    const w = Math.min(h.length, RESTLESS_WINDOW);
    return h.slice(h.length - w).reduce((x, y) => x + y, 0) / w;
  }

  get state() {
    if (this.settled) return 'settled';
    if (this.restless) return 'restless';
    if (this.rounds === 0 && this.movedThisRound === 0) return 'fresh';
    return 'moving';
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  /** Changing τ does not reshuffle anyone: it changes what they want, and the
   *  grid they are already standing on has to answer for it. */
  setTau(v) {
    this.tau = Math.max(0, Math.min(1, +v));
    this.settled = false;
    this.rounds = 0;
    this.movedThisRound = 0;
    this.movedLastRound = -1;
    this.movedHistory = [];
    this._recomputeStats();
  }

  setEmptyFrac(v) {
    this.emptyFrac = Math.max(0.02, Math.min(0.4, +v));
    this.randomize();
  }

  setSize(v) {
    const s = Math.max(20, Math.min(120, Math.round(v)));
    if (s === this.n) return;
    this.n = s;
    this.cells = new Int8Array(s * s);
    this.happy = new Uint8Array(s * s);
    this.order = new Int32Array(s * s);
    this.randomize();
  }

  setStepsPerFrame(v) { this.stepsPerFrame = Math.max(1, Math.round(v)); }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('schelling:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  // ── One frame ─────────────────────────────────────────────────────────────

  /** Visit `stepsPerFrame` cells in a shuffled order; move whoever is unhappy.
   *  A round is one full sweep of the grid. Updates are sequential — an agent
   *  that lands next to you changes your mind before the round is over — which
   *  is exactly Schelling's own procedure, and not a detail we can skip. */
  step() {
    if (this.paused || this.settled) return;
    const total = this.n * this.n;
    let budget = Math.min(this.stepsPerFrame, total);

    while (budget-- > 0) {
      if (this.ptr >= total) {
        // End of a round.
        this.rounds++;
        this.movedLastRound = this.movedThisRound;
        this.movedHistory.push(this.agents ? this.movedThisRound / this.agents : 0);
        if (this.movedHistory.length > RESTLESS_WINDOW) this.movedHistory.shift();
        if (this.movedThisRound === 0) {
          this.settled = true;
          this._recomputeStats();
          return;
        }
        this.movedThisRound = 0;
        this.ptr = 0;
        this._shuffleOrder();
      }
      const i = this.order[this.ptr++];
      if (this.cells[i] === EMPTY) continue;
      if (this.isHappy(i)) continue;
      if (this.emptyList.length === 0) continue;   // nowhere to go
      this._relocate(i);
      this.movedThisRound++;
    }
    this._recomputeStats();
  }
}
