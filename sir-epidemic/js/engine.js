// SIR engine — Kermack & McKendrick (1927), simulated agent by agent.
//
// The compartmental model splits a population of N into Susceptible, Infected
// and Recovered, and moves people between them:
//
//   dS/dt = -β·S·I/N
//   dI/dt =  β·S·I/N − γ·I
//   dR/dt =  γ·I
//
// Rather than integrate those equations and animate the result, we simulate N
// individuals walking around and infecting their neighbours. The rates are
// calibrated so the *mean-field limit* of the agent model is exactly the system
// above:
//
//   • a susceptible within radius r of an infected catches it, per step, with
//     probability  p = β·dt·Area / (N·π·r²).
//     A susceptible has on average  I·π·r²/Area  infected neighbours, so its
//     expected force of infection is  I·π·r²/Area · p = β·I·dt/N.       ✓
//   • an infected recovers with probability  1 − exp(−γ·dt)  per step, giving
//     an exponentially distributed infectious period of mean 1/γ.        ✓
//
// So the curves *emerge* from individuals; the ODE (integrated in parallel by
// RK4) is overlaid as a reference. Where they part ways is itself the lesson:
// spatial clustering means contacts are not well-mixed, so a real epidemic runs
// slower and infects fewer people than the classical equations predict.
//
// The whole thing is driven by a seeded RNG, so the capture pipeline renders
// identical frames between runs.

export const S = 0, I = 1, R = 2;

const DEFAULTS = Object.freeze({
  beta: 0.45,    // transmission rate (per day)
  gamma: 0.15,   // recovery rate (per day) → 1/γ ≈ 6.7 days infectious
  vax: 0,        // fraction immunised before day 0
  N: 700,        // population
  speed: 1.0,    // time multiplier
});

const DT = 0.05;          // days per step
const RADIUS = 0.028;     // infection radius, in normalised domain units
const SPEED_AGENT = 0.055; // agent walking speed, domain units per day
const I0 = 3;             // index cases
const MAX_SAMPLES = 4000; // history cap (≈200 simulated days)

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export class SIREngine {
  constructor(initial = {}) {
    this.beta = initial.beta ?? DEFAULTS.beta;
    this.gamma = initial.gamma ?? DEFAULTS.gamma;
    this.vax = initial.vax ?? DEFAULTS.vax;
    this.N = initial.N ?? DEFAULTS.N;
    this.speed = initial.speed ?? DEFAULTS.speed;
    this.paused = false;

    this.reset();
  }

  // ── Epidemiological readouts ───────────────────────────────────────────────

  /** Basic reproduction number: mean secondary cases from one case in a fully
   *  susceptible population. Above 1 the epidemic grows, below 1 it dies. */
  get R0() { return this.gamma > 0 ? this.beta / this.gamma : Infinity; }

  /** Effective reproduction number: what R0 becomes once part of the population
   *  is no longer susceptible. The epidemic peaks exactly when this hits 1. */
  get Reff() { return this.R0 * (this.counts[S] / this.N); }

  /** Herd-immunity threshold: the immune fraction needed to keep Reff below 1
   *  from day zero, so the epidemic never takes off. vc = 1 − 1/R0. */
  get herdThreshold() { return Math.max(0, 1 - 1 / this.R0); }

  /** Fraction of the population that has been infected at some point. */
  get attackRate() { return this.everInfected / this.N; }

  get finished() { return this.counts[I] === 0 && this.time > 0; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  reset(cfg = {}) {
    if (cfg.beta != null) this.beta = cfg.beta;
    if (cfg.gamma != null) this.gamma = cfg.gamma;
    if (cfg.vax != null) this.vax = cfg.vax;
    if (cfg.N != null) this.N = Math.round(cfg.N);
    if (cfg.speed != null) this.speed = cfg.speed;

    this.rng = makeRng(0x5152b17e);
    this.time = 0;
    this.everInfected = 0;
    this.peakI = 0;
    this.peakTime = 0;
    this.turningPoint = null;   // time at which Reff crossed 1 downward
    this._prevReff = null;      // cleared, or a stale value would fake a crossing

    const n = this.N;
    const nVax = Math.min(n - I0, Math.round(this.vax * n));

    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.state = new Uint8Array(n);
    this.isVax = new Uint8Array(n);   // cosmetic: immune by vaccine, not illness

    for (let i = 0; i < n; i++) {
      this.x[i] = this.rng();
      this.y[i] = this.rng();
      const a = this.rng() * Math.PI * 2;
      this.vx[i] = Math.cos(a) * SPEED_AGENT;
      this.vy[i] = Math.sin(a) * SPEED_AGENT;
      this.state[i] = S;
    }

    // Index cases first, then vaccinate from the remainder.
    for (let i = 0; i < I0 && i < n; i++) { this.state[i] = I; this.everInfected++; }
    for (let i = I0; i < I0 + nVax && i < n; i++) { this.state[i] = R; this.isVax[i] = 1; }

    this.counts = new Int32Array(3);
    this._recount();

    // Parallel ODE, seeded with the same initial compartments.
    this.ode = { S: this.counts[S], I: this.counts[I], R: this.counts[R] };

    this.history = [];   // { t, S, I, R }
    this.odeHistory = [];
    this._sample();

    this._buildGrid();
  }

  _recount() {
    this.counts[S] = this.counts[I] = this.counts[R] = 0;
    for (let i = 0; i < this.N; i++) this.counts[this.state[i]]++;
  }

  // ── Setters ───────────────────────────────────────────────────────────────
  // β, γ and speed retune the running epidemic. N and vaccination coverage are
  // initial conditions, so changing them restarts the outbreak.

  setBeta(v) { this.beta = Math.max(0, +v); }
  setGamma(v) { this.gamma = Math.max(0.01, +v); }
  setSpeed(v) { this.speed = Math.max(0.1, +v); }
  setVax(v) { this.reset({ vax: Math.min(0.99, Math.max(0, +v)) }); }
  setN(v) { this.reset({ N: Math.max(50, Math.round(+v)) }); }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('sir:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  // ── Spatial hash, so neighbour lookup stays O(N) instead of O(N²) ─────────

  _buildGrid() {
    this.cols = Math.max(1, Math.floor(1 / RADIUS));
    this.cellCount = this.cols * this.cols;
    this.cellHead = new Int32Array(this.cellCount);
    this.cellNext = new Int32Array(this.N);
  }

  _cellOf(i) {
    const cx = Math.min(this.cols - 1, Math.max(0, (this.x[i] * this.cols) | 0));
    const cy = Math.min(this.cols - 1, Math.max(0, (this.y[i] * this.cols) | 0));
    return cy * this.cols + cx;
  }

  _fillGrid() {
    this.cellHead.fill(-1);
    for (let i = 0; i < this.N; i++) {
      const c = this._cellOf(i);
      this.cellNext[i] = this.cellHead[c];
      this.cellHead[c] = i;
    }
  }

  // ── ODE reference (classical RK4) ────────────────────────────────────────

  _deriv(s, i) {
    const inf = this.beta * s * i / this.N;
    const rec = this.gamma * i;
    return [-inf, inf - rec, rec];
  }

  _stepOde(dt) {
    const o = this.ode;
    const k1 = this._deriv(o.S, o.I);
    const k2 = this._deriv(o.S + dt / 2 * k1[0], o.I + dt / 2 * k1[1]);
    const k3 = this._deriv(o.S + dt / 2 * k2[0], o.I + dt / 2 * k2[1]);
    const k4 = this._deriv(o.S + dt * k3[0], o.I + dt * k3[1]);
    o.S += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    o.I += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    o.R += dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    o.S = Math.max(0, o.S); o.I = Math.max(0, o.I); o.R = Math.max(0, o.R);
  }

  _sample() {
    if (this.history.length >= MAX_SAMPLES) return;
    this.history.push({ t: this.time, S: this.counts[S], I: this.counts[I], R: this.counts[R] });
    this.odeHistory.push({ t: this.time, S: this.ode.S, I: this.ode.I, R: this.ode.R });
  }

  // ── One simulation step ──────────────────────────────────────────────────

  step() {
    if (this.paused || this.finished) return;

    const dt = DT * this.speed;
    const n = this.N;

    // 1. Move everyone, bouncing off the walls of the domain.
    for (let i = 0; i < n; i++) {
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      if (this.x[i] < 0) { this.x[i] = -this.x[i]; this.vx[i] = -this.vx[i]; }
      else if (this.x[i] > 1) { this.x[i] = 2 - this.x[i]; this.vx[i] = -this.vx[i]; }
      if (this.y[i] < 0) { this.y[i] = -this.y[i]; this.vy[i] = -this.vy[i]; }
      else if (this.y[i] > 1) { this.y[i] = 2 - this.y[i]; this.vy[i] = -this.vy[i]; }

      // Slow angular drift keeps the crowd well mixed without teleporting anyone.
      const a = (this.rng() - 0.5) * 0.6 * dt * 20;
      const c = Math.cos(a), s = Math.sin(a);
      const vx = this.vx[i], vy = this.vy[i];
      this.vx[i] = vx * c - vy * s;
      this.vy[i] = vx * s + vy * c;
    }

    // 2. Transmission. Per-contact probability calibrated so that the mean-field
    //    limit is exactly −β·S·I/N (see header).
    this._fillGrid();
    const r2 = RADIUS * RADIUS;
    const expectedNeighbours = n * Math.PI * r2;   // domain area = 1
    const pContact = expectedNeighbours > 0
      ? Math.min(1, this.beta * dt / expectedNeighbours)
      : 0;

    const newly = [];
    for (let i = 0; i < n; i++) {
      if (this.state[i] !== S) continue;
      const cx = Math.min(this.cols - 1, Math.max(0, (this.x[i] * this.cols) | 0));
      const cy = Math.min(this.cols - 1, Math.max(0, (this.y[i] * this.cols) | 0));

      let infected = false;
      for (let gy = cy - 1; gy <= cy + 1 && !infected; gy++) {
        if (gy < 0 || gy >= this.cols) continue;
        for (let gx = cx - 1; gx <= cx + 1 && !infected; gx++) {
          if (gx < 0 || gx >= this.cols) continue;
          for (let j = this.cellHead[gy * this.cols + gx]; j !== -1; j = this.cellNext[j]) {
            if (this.state[j] !== I) continue;
            const dx = this.x[i] - this.x[j], dy = this.y[i] - this.y[j];
            if (dx * dx + dy * dy > r2) continue;
            if (this.rng() < pContact) { infected = true; break; }
          }
        }
      }
      if (infected) newly.push(i);
    }

    // 3. Recovery — exponential infectious period of mean 1/γ.
    const pRecover = 1 - Math.exp(-this.gamma * dt);
    for (let i = 0; i < n; i++) {
      if (this.state[i] === I && this.rng() < pRecover) {
        this.state[i] = R;
        this.counts[I]--; this.counts[R]++;
      }
    }

    // Commit infections after recovery so an agent cannot be infected and
    // recover within the same step.
    for (const i of newly) {
      this.state[i] = I;
      this.counts[S]--; this.counts[I]++;
      this.everInfected++;
    }

    // 4. Reference ODE + bookkeeping.
    this._stepOde(dt);

    const prevReff = this._prevReff;
    this.time += dt;

    if (this.counts[I] > this.peakI) { this.peakI = this.counts[I]; this.peakTime = this.time; }
    const reff = this.Reff;
    if (this.turningPoint === null && prevReff != null && prevReff >= 1 && reff < 1) {
      this.turningPoint = this.time;
    }
    this._prevReff = reff;

    this._sample();
  }
}
