// Double-slit engine — Young's experiment, the quantum way.
//
// Particles (photons / electrons) are emitted one at a time from a source,
// pass the two-slit barrier, and land on a screen. Each landing position is
// drawn from the probability distribution |ψ|² on the screen:
//
//   quantum, unobserved : I(u) ∝ cos²(πF·u) · sinc²(πE·u)   ← interference fringes
//   which-path observed : I(u) ∝ sinc²(πE·u)                ← fringes wash out
//   classical balls      : two narrow bands behind the slits  ← never interfere
//
// where u ∈ [-1,1] is the normalised screen coordinate, F is the fringe
// density (F ∝ d/λL) and E the single-slit diffraction envelope (E ∝ a/λL).
// The screen histogram accumulates hits, so the fringe pattern builds up dot
// by dot — the iconic result. Everything is deterministic (seeded RNG) so the
// capture pipeline renders identical frames between runs.

const DEFAULTS = Object.freeze({
  lambda: 1.0,    // wavelength (0.5 short/violet … 2.0 long/red)
  d: 1.0,         // slit separation
  L: 1.0,         // slit-to-screen distance
  observe: false, // which-path detector on/off
  mode: 'photon', // 'photon' | 'electron' | 'ball'
  rate: 2,        // particles launched per step
});

const A_SLIT = 0.22;   // slit width (fixed) — sets the diffraction envelope
const KF = 7.0;        // fringe-density constant
const KE = 2.3;        // envelope-width constant
const K_BALL = 0.42;   // classical band offset ∝ d
const BINS = 220;      // screen histogram resolution
const MAX_FLIGHT = 90; // cap simultaneous in-flight particles

function sinc(x) { return x === 0 ? 1 : Math.sin(x) / x; }

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export class DoubleSlitEngine {
  constructor(initial = {}) {
    this.lambda = initial.lambda ?? DEFAULTS.lambda;
    this.d = initial.d ?? DEFAULTS.d;
    this.L = initial.L ?? DEFAULTS.L;
    this.observe = initial.observe ?? DEFAULTS.observe;
    this.mode = initial.mode ?? DEFAULTS.mode;
    this.rate = initial.rate ?? DEFAULTS.rate;
    this.speed = 1.0;
    this.paused = false;

    this.rng = makeRng(0x1bd11bda);
    this.bins = new Float64Array(BINS);   // accumulated hits per screen bin
    this.binsMax = 1;                     // running max, for renderer scaling
    this.flight = [];                     // particles in transit
    this.count = 0;                       // total particles landed
    this.time = 0;

    this._pdf = new Float64Array(BINS);
    this._cdf = new Float64Array(BINS);
    this._rebuildPdf();
  }

  // Screen position of bin i → u ∈ [-1, 1].
  static binToU(i) { return (i / (BINS - 1)) * 2 - 1; }

  /** Theoretical (normalised-ish) intensity at screen coord u, for the curve
   *  overlay and for sampling. Depends on mode + observe. */
  intensityAt(u) {
    const env = sinc(Math.PI * this.envE() * u);
    const envSq = env * env;
    if (this.mode === 'ball') {
      // Two narrow bands behind the slits — no diffraction, no interference.
      const o = this.ballOffset();
      const w = 0.16;
      const g1 = Math.exp(-((u - o) * (u - o)) / (2 * w * w));
      const g2 = Math.exp(-((u + o) * (u + o)) / (2 * w * w));
      return g1 + g2;
    }
    if (this.observe) return envSq;                 // which-path → envelope only
    const c = Math.cos(Math.PI * this.fringeF() * u);
    return c * c * envSq;                           // interference fringes
  }

  fringeF() { return KF * this.d / (this.lambda * this.L); }
  envE()    { return KE * A_SLIT / (this.lambda * this.L); }
  ballOffset() { return Math.min(0.7, Math.max(0.12, K_BALL * this.d)); }

  _rebuildPdf() {
    let acc = 0;
    for (let i = 0; i < BINS; i++) {
      const v = Math.max(0, this.intensityAt(DoubleSlitEngine.binToU(i))) + 1e-4;
      this._pdf[i] = v;
      acc += v;
      this._cdf[i] = acc;
    }
    const inv = 1 / acc;
    for (let i = 0; i < BINS; i++) this._cdf[i] *= inv;
  }

  /** Inverse-CDF sample of a screen bin index from the current pattern. */
  _sampleBin() {
    const r = this.rng();
    // binary search in the normalised CDF
    let lo = 0, hi = BINS - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this._cdf[mid] < r) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  // ── Parameter setters (rebuild the pattern; in-flight particles keep going) ──
  setLambda(v) { this.lambda = Math.max(0.4, +v); this._rebuildPdf(); }
  setD(v) { this.d = Math.max(0.2, +v); this._rebuildPdf(); }
  setL(v) { this.L = Math.max(0.4, +v); this._rebuildPdf(); }
  setRate(v) { this.rate = Math.max(0, +v); }
  setSpeed(v) { this.speed = Math.max(0.1, +v); }
  setObserve(on) { this.observe = !!on; this._rebuildPdf(); }
  setMode(m) { this.mode = m; this._rebuildPdf(); }

  clearScreen() {
    this.bins.fill(0);
    this.binsMax = 1;
    this.flight.length = 0;
    this.count = 0;
  }

  reset(cfg = {}) {
    if (cfg.lambda != null) this.lambda = cfg.lambda;
    if (cfg.d != null) this.d = cfg.d;
    if (cfg.L != null) this.L = cfg.L;
    if (cfg.observe != null) this.observe = cfg.observe;
    if (cfg.mode != null) this.mode = cfg.mode;
    if (cfg.rate != null) this.rate = cfg.rate;
    this.rng = makeRng(0x1bd11bda);
    this.clearScreen();
    this._rebuildPdf();
    this.time = 0;
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('dslit:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  _emit() {
    const bin = this._sampleBin();
    const u = DoubleSlitEngine.binToU(bin);
    // Which slit does the particle visually pass through?
    //  - ball: the slit on the same side as its destination (classical path)
    //  - quantum: indeterminate → pick at random ("both")
    let slit;
    if (this.mode === 'ball') slit = u >= 0 ? 1 : 0;
    else slit = this.rng() < 0.5 ? 0 : 1;
    this.flight.push({ p: 0, slit, u, bin });
  }

  /** Advance one frame: emit new particles, move those in flight, land hits. */
  step() {
    if (this.paused) return;
    const dp = 0.022 * this.speed;   // path progress per step

    // Emit (fractional rate accumulates).
    this._emitAcc = (this._emitAcc || 0) + this.rate * this.speed;
    while (this._emitAcc >= 1 && this.flight.length < MAX_FLIGHT) {
      this._emit();
      this._emitAcc -= 1;
    }

    // Advance + land.
    const next = [];
    for (const pt of this.flight) {
      pt.p += dp;
      if (pt.p >= 1) {
        const c = this.bins[pt.bin] + 1;
        this.bins[pt.bin] = c;
        if (c > this.binsMax) this.binsMax = c;
        this.count++;
      } else {
        next.push(pt);
      }
    }
    this.flight = next;
    this.time += dp;
  }
}
