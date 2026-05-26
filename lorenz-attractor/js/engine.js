// Lorenz attractor engine — three coupled ODEs integrated with RK4.
//
//   dx/dt = σ (y - x)
//   dy/dt = x (ρ - z) - y
//   dz/dt = x y - β z
//
// Defaults σ=10, ρ=28, β=8/3 reproduce the iconic 1963 butterfly.
// The engine maintains TWO trajectories — the second ("twin") starts
// at a tiny offset ε from the first and is used to visualise sensitivity
// to initial conditions. The twin is enabled on demand by controls.

const DEFAULTS = Object.freeze({
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  dt: 0.005,            // RK4 step
  substepsPerFrame: 8,  // ~0.04 simulated seconds per real frame at 60fps
  trailMax: 2500,       // points kept for the polyline
});

const TWIN_EPS = 1e-5;  // initial offset for the twin trajectory

function deriv(state, p) {
  const [x, y, z] = state;
  return [
    p.sigma * (y - x),
    x * (p.rho - z) - y,
    x * y - p.beta * z,
  ];
}

function rk4(state, h, p) {
  const k1 = deriv(state, p);
  const s2 = [state[0] + (h / 2) * k1[0], state[1] + (h / 2) * k1[1], state[2] + (h / 2) * k1[2]];
  const k2 = deriv(s2, p);
  const s3 = [state[0] + (h / 2) * k2[0], state[1] + (h / 2) * k2[1], state[2] + (h / 2) * k2[2]];
  const k3 = deriv(s3, p);
  const s4 = [state[0] + h * k3[0], state[1] + h * k3[1], state[2] + h * k3[2]];
  const k4 = deriv(s4, p);
  return [
    state[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    state[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    state[2] + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
}

export class LorenzEngine {
  constructor(initial = {}) {
    this.params = {
      sigma: initial.sigma ?? DEFAULTS.sigma,
      rho: initial.rho ?? DEFAULTS.rho,
      beta: initial.beta ?? DEFAULTS.beta,
    };
    this.dt = DEFAULTS.dt;
    this.substeps = DEFAULTS.substepsPerFrame;
    this.speed = 1.0;
    this.trailMax = DEFAULTS.trailMax;
    this.paused = false;
    this.twinActive = false;

    // Main + twin state vectors (x, y, z). The classic non-trivial seed
    // (1, 1, 1) lands on the attractor within ~1 second.
    this.state = [1, 1, 1];
    this.twinState = [1 + TWIN_EPS, 1, 1];

    // Circular trails (newest at the end, oldest at the start).
    this.trail = [];
    this.twinTrail = [];

    this.time = 0;
  }

  setParam(name, value) {
    if (name in this.params) this.params[name] = +value;
  }

  setSpeed(multiplier) { this.speed = Math.max(0.05, +multiplier); }
  setTrailMax(n) {
    this.trailMax = Math.max(50, Math.floor(+n));
    while (this.trail.length > this.trailMax) this.trail.shift();
    while (this.twinTrail.length > this.trailMax) this.twinTrail.shift();
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() { this.paused = !this.paused; this.dispatchPause(); return this.paused; }
  dispatchPause() {
    window.dispatchEvent(new CustomEvent('lorenz:pause-state', { detail: { paused: this.paused } }));
  }

  /** Spawn the twin at current main state + ε on the x axis. */
  enableTwin() {
    this.twinState = [this.state[0] + TWIN_EPS, this.state[1], this.state[2]];
    this.twinTrail = [];
    this.twinActive = true;
  }
  disableTwin() {
    this.twinActive = false;
    this.twinTrail = [];
  }

  reset(initial = {}) {
    this.params.sigma = initial.sigma ?? DEFAULTS.sigma;
    this.params.rho = initial.rho ?? DEFAULTS.rho;
    this.params.beta = initial.beta ?? DEFAULTS.beta;
    this.state = [1, 1, 1];
    this.twinState = [1 + TWIN_EPS, 1, 1];
    this.trail = [];
    this.twinTrail = [];
    this.time = 0;
    this.twinActive = false;
  }

  /** Advance one rendered frame. Pushes one trail point every other
   *  substep so the trail fills in quickly even at default speed. */
  step() {
    if (this.paused) return;
    const h = this.dt * this.speed;
    for (let i = 0; i < this.substeps; i++) {
      this.state = rk4(this.state, h, this.params);
      if (this.twinActive) {
        this.twinState = rk4(this.twinState, h, this.params);
      }
      this.time += h;
      // Sample every 2nd substep — keeps the trail visually dense without
      // exploding memory.
      if ((i & 1) === 0) {
        this.trail.push([this.state[0], this.state[1], this.state[2]]);
        if (this.trail.length > this.trailMax) this.trail.shift();
        if (this.twinActive) {
          this.twinTrail.push([this.twinState[0], this.twinState[1], this.twinState[2]]);
          if (this.twinTrail.length > this.trailMax) this.twinTrail.shift();
        }
      }
    }
  }

  /** Euclidean distance between main and twin in 3D state space. */
  divergence() {
    if (!this.twinActive) return 0;
    const dx = this.state[0] - this.twinState[0];
    const dy = this.state[1] - this.twinState[1];
    const dz = this.state[2] - this.twinState[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
