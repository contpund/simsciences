// The Kuramoto model — Yoshiki Kuramoto, 1975.
//
// N oscillators, each a point running around a circle. Left alone, oscillator i
// turns at its own natural frequency ω_i — some fast, some slow, drawn once at
// random and never changed. Then couple them: every oscillator feels a gentle
// pull toward the average phase of all the others, with strength K.
//
//   dθ_i/dt = ω_i + (K/N) · Σ_j sin(θ_j − θ_i)
//
// That sum is a mean field. Define the order parameter
//
//   r · e^{iψ} = (1/N) · Σ_j e^{iθ_j}
//
// and the whole coupling collapses to a single term, the same for everyone:
//
//   dθ_i/dt = ω_i + K · r · sin(ψ − θ_i)
//
// r is what the episode is about. r = 0 means the phases are scattered around
// the circle and cancel out — incoherence. r = 1 means every oscillator sits at
// the same phase — perfect synchrony. Nobody sets r. It is what the crowd does.
//
// Kuramoto solved the mean-field model exactly. For natural frequencies drawn
// from a Lorentzian of half-width γ, nothing synchronises until the coupling
// crosses a sharp threshold
//
//   K_c = 2γ
//
// and above it the steady coherence is
//
//   r = √(1 − K_c/K).
//
// This engine samples that same Lorentzian, integrates the real system with
// RK4, and measures r. The measured r lands on √(1 − K_c/K). Nobody put that
// curve in — it falls out of N springs that each only feel an average.
//
//   Kuramoto, Y. (1975). Self-entrainment of a population of coupled non-linear
//   oscillators. In: International Symposium on Mathematical Problems in
//   Theoretical Physics. Lecture Notes in Physics 39, 420–422. Springer.
//
// Everything is driven by a seeded RNG, so the capture pipeline renders
// identical frames between runs.

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const TAU = Math.PI * 2;

export class KuramotoEngine {
  constructor(n = 300) {
    this.n = n;
    this.gamma = 0.60;      // Lorentzian half-width of the natural frequencies
    this.K = 0.60;          // coupling strength
    this.dt = 0.05;         // integration step (time units)
    this.stepsPerFrame = 3; // RK4 steps advanced per rendered frame
    this.paused = false;

    this.theta = new Float64Array(n);
    this.omega = new Float64Array(n);
    // Scratch for RK4.
    this._k1 = new Float64Array(n);
    this._k2 = new Float64Array(n);
    this._k3 = new Float64Array(n);
    this._k4 = new Float64Array(n);
    this._tmp = new Float64Array(n);

    this.randomize();
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  /** Draw natural frequencies from a Lorentzian (Cauchy) of half-width γ,
   *  centred on zero, and scatter the phases uniformly. Seeded, so it is the
   *  same population every run — the baseline the whole episode measures. */
  randomize() {
    const rng = makeRng(0x9e3779b1);
    for (let i = 0; i < this.n; i++) {
      // Inverse-CDF of the standard Cauchy, scaled by γ. Median frequency 0.
      const u = rng() * 0.9998 + 0.0001;
      this.omega[i] = this.gamma * Math.tan(Math.PI * (u - 0.5));
      this.theta[i] = rng() * TAU;
    }
    this.time = 0;
    this.rHistory = [];
    this._recompute();
  }

  /** r·e^{iψ} = mean of e^{iθ}. Fills this.r and this.psi, plus the mean phase
   *  velocity, and returns nothing — the renderer reads the fields. */
  _recompute() {
    let C = 0, S = 0;
    const th = this.theta, n = this.n;
    for (let i = 0; i < n; i++) { C += Math.cos(th[i]); S += Math.sin(th[i]); }
    C /= n; S /= n;
    this.r = Math.hypot(C, S);
    this.psi = Math.atan2(S, C);
  }

  // ── The rule ──────────────────────────────────────────────────────────────

  /** dθ_i/dt for the whole system, written into `out`. Uses the mean field, so
   *  it is O(N), not O(N²): compute r and ψ once, then pull every oscillator
   *  toward ψ. Exactly equivalent to (K/N)·Σ_j sin(θ_j − θ_i). */
  _deriv(th, out) {
    let C = 0, S = 0;
    const n = this.n;
    for (let i = 0; i < n; i++) { C += Math.cos(th[i]); S += Math.sin(th[i]); }
    C /= n; S /= n;
    const r = Math.hypot(C, S), psi = Math.atan2(S, C);
    const Kr = this.K * r;
    const om = this.omega;
    for (let i = 0; i < n; i++) out[i] = om[i] + Kr * Math.sin(psi - th[i]);
  }

  /** One RK4 step of size dt. */
  _rk4(dt) {
    const th = this.theta, tmp = this._tmp, n = this.n;
    const k1 = this._k1, k2 = this._k2, k3 = this._k3, k4 = this._k4;

    this._deriv(th, k1);
    for (let i = 0; i < n; i++) tmp[i] = th[i] + 0.5 * dt * k1[i];
    this._deriv(tmp, k2);
    for (let i = 0; i < n; i++) tmp[i] = th[i] + 0.5 * dt * k2[i];
    this._deriv(tmp, k3);
    for (let i = 0; i < n; i++) tmp[i] = th[i] + dt * k3[i];
    this._deriv(tmp, k4);

    for (let i = 0; i < n; i++) {
      let v = th[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      // Keep phases in [0, 2π) so cos/sin stay well-conditioned over long runs.
      v %= TAU; if (v < 0) v += TAU;
      th[i] = v;
    }
    this.time += dt;
  }

  // ── Readouts ──────────────────────────────────────────────────────────────

  /** r — the coherence, in [0, 1]. Zero when the phases cancel, one when they
   *  all agree. This is what the coupling produces, as opposed to what it asks
   *  for. A scatter of N random phases sits near √(π)/2 / √N, not zero. */
  get coherence() { return this.r; }
  get meanPhase() { return this.psi; }

  /** The exact threshold for a Lorentzian population: K_c = 2γ. */
  get Kc() { return 2 * this.gamma; }

  /** Kuramoto's exact steady coherence above threshold: r = √(1 − K_c/K).
   *  Below threshold the only steady state is incoherence, r → 0. */
  get rTheory() {
    const Kc = this.Kc;
    return this.K > Kc ? Math.sqrt(1 - Kc / this.K) : 0;
  }

  /** Expected coherence of N *independent* random phases — the incoherent
   *  floor a finite population never falls below. E[r] ≈ √(π)/2 / √N. */
  get incoherentFloor() { return Math.sqrt(Math.PI) / 2 / Math.sqrt(this.n); }

  /** A measured verdict, not one inferred from K: is the crowd near its
   *  incoherent floor, still climbing, or holding a high coherence? The
   *  thresholds are multiples of the finite-N floor, which is itself measured
   *  (see kuramoto page dry-run). */
  get state() {
    const h = this.rHistory;
    // Classify on a smoothed r, not the instantaneous one: a finite population's
    // incoherent r fluctuates up to ~3× its mean, and a single spike must not
    // read as synchrony. The incoherent ceiling scales with the floor, so it is
    // right at any N.
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const sm = h.length ? mean(h.slice(-10)) : this.r;
    const ceil = Math.max(0.10, 3.2 * this.incoherentFloor);
    if (sm < ceil) return 'incoherent';
    if (h.length >= 20) {
      const recent = mean(h.slice(-10));
      const before = mean(h.slice(-20, -10));
      if (recent > before + 0.03) return 'synchronizing';
    }
    return 'locked';
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  /** Changing K does not reshuffle anyone: same oscillators, same phases, new
   *  pull. The population it is already running has to answer for it. */
  setK(v) {
    this.K = Math.max(0, +v);
    this.rHistory = [];
  }

  /** The frequency spread is an initial condition: a new γ means a freshly
   *  sampled population, which is what a visitor expects and what K_c = 2γ
   *  requires. */
  setGamma(v) {
    this.gamma = Math.max(0.05, Math.min(2, +v));
    this.randomize();
  }

  setSize(v) {
    const s = Math.max(20, Math.min(1000, Math.round(v)));
    if (s === this.n) return;
    this.n = s;
    this.theta = new Float64Array(s);
    this.omega = new Float64Array(s);
    this._k1 = new Float64Array(s); this._k2 = new Float64Array(s);
    this._k3 = new Float64Array(s); this._k4 = new Float64Array(s);
    this._tmp = new Float64Array(s);
    this.randomize();
  }

  setStepsPerFrame(v) { this.stepsPerFrame = Math.max(1, Math.round(v)); }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('kuramoto:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  // ── One frame ─────────────────────────────────────────────────────────────

  step() {
    if (this.paused) return;
    for (let s = 0; s < this.stepsPerFrame; s++) this._rk4(this.dt);
    this._recompute();
    this.rHistory.push(this.r);
    if (this.rHistory.length > 90) this.rHistory.shift();
  }
}
