// N-body gravity engine — every particle attracts every other through
// Newton's law of universal gravitation:
//
//   a_i = Σ_{j≠i}  G · m_j · (r_j − r_i) / (|r_j − r_i|² + ε²)^{3/2}
//
// Integrated with velocity-Verlet (symplectic, energy-stable — plain Euler
// would make every orbit spiral outward artificially). Forces are summed
// directly in O(N²), exploiting Newton's third law so each pair is touched
// once. The simulation is 2-D and face-on, so a self-gravitating disk grows
// the spiral density waves that make galaxies look like galaxies.
//
// Everything is deterministic: positions seed from a seeded LCG and step()
// uses a fixed dt with no wall-clock input, so the capture pipeline renders
// identical frames between runs.

// Fixed total mass — folding the scale in here keeps the on-screen G slider
// in a friendly 0.1–3 range. Per-particle mass is MTOT / N (equal masses).
const MTOT = 1.0e6;
const R0 = 230;          // nominal disk radius in world units
export const WORLD = 340; // half-extent the renderer scales to fit the canvas

const DEFAULTS = Object.freeze({
  N: 600,
  G: 1.0,
  spin: 1.0,            // fraction of circular velocity (0 = radial in-fall)
  soft: 16,            // softening length ε, world units
  distribution: 'disk',
  dt: 0.04,            // velocity-Verlet step
});

// ── Seeded RNG (LCG) + Box–Muller, so captures are reproducible ──────────
function makeRng(seed) {
  let s = seed >>> 0;
  const unit = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const gauss = () => {
    const u = Math.max(unit(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * unit());
  };
  return { unit, gauss };
}

export class NBodyEngine {
  constructor(initial = {}) {
    this.G = initial.G ?? DEFAULTS.G;
    this.soft = initial.soft ?? DEFAULTS.soft;
    this.spin = initial.spin ?? DEFAULTS.spin;
    this.distribution = initial.distribution ?? DEFAULTS.distribution;
    this.dt = DEFAULTS.dt;
    this.speed = 1.0;
    this.paused = false;
    this.time = 0;
    this.seed = 0x9e3779b1;

    this._seed(initial.N ?? DEFAULTS.N);
  }

  get N() { return this._n; }

  // ── Allocation + initial conditions ──────────────────────────────────
  _alloc(n) {
    this._n = n;
    this.m = MTOT / n;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.ax = new Float64Array(n);
    this.ay = new Float64Array(n);
    this.bx = new Float64Array(n); // scratch for the new acceleration
    this.by = new Float64Array(n);
  }

  /** Rebuild the whole system from the current distribution + parameters. */
  _seed(n) {
    this._alloc(n);
    const rng = makeRng(this.seed);
    this.time = 0;
    switch (this.distribution) {
      case 'collision': this._seedCollision(rng); break;
      case 'cloud':     this._seedCloud(rng); break;
      case 'cluster':   this._seedCluster(rng); break;
      default:          this._seedDisk(rng); break;
    }
    // Zero the net momentum so the whole system doesn't drift off-frame.
    this._removeDrift();
    this._computeAccel(this.ax, this.ay);
  }

  /** Lay particles on a uniform-density disk and give them near-circular
   *  orbits from the enclosed mass (spherical approximation — good enough
   *  to start the disk near equilibrium; the mismatch just seeds motion). */
  _seedDisk(rng, {
    cx = 0, cy = 0, bvx = 0, bvy = 0, radius = R0,
    i0 = 0, i1 = this._n, mass = MTOT, spin = this.spin,
  } = {}) {
    const count = i1 - i0;
    const idx = [];
    for (let k = 0; k < count; k++) {
      const r = radius * Math.sqrt(rng.unit());      // uniform areal density
      const th = rng.unit() * 2 * Math.PI;
      const i = i0 + k;
      this.x[i] = cx + r * Math.cos(th);
      this.y[i] = cy + r * Math.sin(th);
      idx.push({ i, r, th });
    }
    // Enclosed mass by rank once sorted on radius.
    idx.sort((a, b) => a.r - b.r);
    const soft2 = this.soft * this.soft;
    for (let rank = 0; rank < count; rank++) {
      const { i, r, th } = idx[rank];
      const mEnc = ((rank + 0.5) / count) * mass;
      // Circular velocity for the *softened* point-mass potential, so the
      // disk is seeded near equilibrium with the same forces step() uses:
      // v² = G·M_enc·r² / (r²+ε²)^{3/2}.
      const vc = spin * Math.sqrt(this.G * mEnc) * r / Math.pow(r * r + soft2, 0.75);
      // Tangential (counter-clockwise) + ~5% velocity dispersion (cool but
      // not frozen — enough to seed arms without fragmenting).
      const disp = 0.05 * vc;
      this.vx[i] = bvx - vc * Math.sin(th) + disp * rng.gauss();
      this.vy[i] = bvy + vc * Math.cos(th) + disp * rng.gauss();
    }
  }

  _seedCollision(rng) {
    const half = this._n >> 1;
    this._seedDisk(rng, {
      cx: -150, cy: -30, bvx: 20, bvy: 3, radius: 120,
      i0: 0, i1: half, mass: MTOT / 2,
    });
    this._seedDisk(rng, {
      cx: 150, cy: 30, bvx: -20, bvy: -3, radius: 120,
      i0: half, i1: this._n, mass: MTOT / 2,
    });
  }

  /** Cold cloud, no rotation — collapses dramatically toward the centre. */
  _seedCloud(rng) {
    for (let i = 0; i < this._n; i++) {
      const r = R0 * 0.85 * Math.sqrt(rng.unit());
      const th = rng.unit() * 2 * Math.PI;
      this.x[i] = r * Math.cos(th);
      this.y[i] = r * Math.sin(th);
      this.vx[i] = 1.5 * rng.gauss();
      this.vy[i] = 1.5 * rng.gauss();
    }
  }

  /** Gaussian blob with mild rotation — virialises into a star cluster. */
  _seedCluster(rng) {
    const sigma = 70;
    for (let i = 0; i < this._n; i++) {
      const px = sigma * rng.gauss();
      const py = sigma * rng.gauss();
      this.x[i] = px;
      this.y[i] = py;
      const r = Math.hypot(px, py);
      const vc = 0.35 * this.spin * Math.sqrt((this.G * MTOT) / Math.max(r, 12));
      const th = Math.atan2(py, px);
      this.vx[i] = -vc * Math.sin(th) + 4 * rng.gauss();
      this.vy[i] = vc * Math.cos(th) + 4 * rng.gauss();
    }
  }

  _removeDrift() {
    let mvx = 0, mvy = 0;
    for (let i = 0; i < this._n; i++) { mvx += this.vx[i]; mvy += this.vy[i]; }
    mvx /= this._n; mvy /= this._n;
    for (let i = 0; i < this._n; i++) { this.vx[i] -= mvx; this.vy[i] -= mvy; }
  }

  // ── Force evaluation: direct O(N²), symmetric ────────────────────────
  _computeAccel(outx, outy) {
    const n = this._n;
    const x = this.x, y = this.y;
    const Gm = this.G * this.m;          // equal masses → common factor
    const soft2 = this.soft * this.soft;
    outx.fill(0); outy.fill(0);
    for (let i = 0; i < n; i++) {
      const xi = x[i], yi = y[i];
      let axi = 0, ayi = 0;
      for (let j = i + 1; j < n; j++) {
        const dx = x[j] - xi;
        const dy = y[j] - yi;
        const r2 = dx * dx + dy * dy + soft2;
        const inv = 1 / Math.sqrt(r2);
        const f = Gm * inv / r2;          // G·m · r⁻³
        const fx = f * dx, fy = f * dy;
        axi += fx; ayi += fy;
        outx[j] -= fx; outy[j] -= fy;
      }
      outx[i] += axi; outy[i] += ayi;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────
  setG(v) { this.G = Math.max(0, +v); }
  setSoft(v) { this.soft = Math.max(0.5, +v); }
  setSpeed(v) { this.speed = Math.max(0.1, +v); }

  /** These are initial conditions — changing them re-seeds the system. */
  setN(v) {
    const n = Math.max(50, Math.floor(+v));
    if (n !== this._n) this._seed(n);
  }
  setSpin(v) { this.spin = Math.max(0, +v); this._seed(this._n); }
  setDistribution(name) { this.distribution = name; this._seed(this._n); }

  restart() { this._seed(this._n); }
  reset(cfg = {}) {
    if (cfg.G != null) this.G = cfg.G;
    if (cfg.soft != null) this.soft = cfg.soft;
    if (cfg.spin != null) this.spin = cfg.spin;
    if (cfg.distribution != null) this.distribution = cfg.distribution;
    this._seed(cfg.N ?? this._n);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('nbody:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  /** Centre of mass — the renderer recenters on it to keep the action framed. */
  centerOfMass() {
    let cx = 0, cy = 0;
    const n = this._n;
    for (let i = 0; i < n; i++) { cx += this.x[i]; cy += this.y[i]; }
    return [cx / n, cy / n];
  }

  /** One velocity-Verlet step. `ax/ay` always hold the current acceleration. */
  step() {
    if (this.paused) return;
    const n = this._n;
    const h = this.dt * this.speed;
    const h2 = 0.5 * h * h;
    const x = this.x, y = this.y, vx = this.vx, vy = this.vy;
    const ax = this.ax, ay = this.ay, bx = this.bx, by = this.by;

    // Drift positions using the current acceleration.
    for (let i = 0; i < n; i++) {
      x[i] += vx[i] * h + ax[i] * h2;
      y[i] += vy[i] * h + ay[i] * h2;
    }
    // New acceleration at the updated positions.
    this._computeAccel(bx, by);
    // Kick velocities with the average of old and new acceleration.
    const hh = 0.5 * h;
    for (let i = 0; i < n; i++) {
      vx[i] += (ax[i] + bx[i]) * hh;
      vy[i] += (ay[i] + by[i]) * hh;
    }
    // New acceleration becomes current (swap buffers, no allocation).
    this.ax = bx; this.ay = by; this.bx = ax; this.by = ay;
    this.time += h;
  }
}
