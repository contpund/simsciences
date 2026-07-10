// Lattice-Boltzmann engine — Navier–Stokes out of nine numbers per cell.
//
// Instead of solving the Navier–Stokes equations, we track how many fictitious
// particles at each grid cell are moving in each of nine directions (D2Q9):
//
//        NW   N   NE          weights:  4/9  (rest)
//          ↖  ↑  ↗                      1/9  (N, S, E, W)
//        W ← • → E                      1/36 (NE, NW, SE, SW)
//          ↙  ↓  ↘
//        SW   S   SE
//
// Each step does exactly two things:
//
//   collide()  each cell relaxes its nine numbers toward the local equilibrium
//              distribution, at a rate ω. That is the BGK approximation.
//   stream()   every number slides one cell along its own direction.
//
// Chapman–Enskog analysis shows this recovers the incompressible Navier–Stokes
// equations with kinematic viscosity ν = (1/ω − 1/2)/3, in lattice units. So
// fluid dynamics is not programmed here — it emerges from bookkeeping.
//
// Origin: Frisch, Hasslacher & Pomeau (1986) showed a lattice gas could give
// Navier–Stokes; Qian, d'Humières & Lallemand (1992) gave the D2Q9 BGK scheme
// implemented here. Everything is deterministic: no RNG anywhere, so the
// capture pipeline renders identical frames between runs.
//
// One physical knob is exposed: the Reynolds number Re = U·D/ν. The inflow
// speed U is held fixed and ν is derived, so the slider moves the physics and
// nothing else. `stepsPerFrame` moves only your patience.

const w0 = 4 / 9, w1 = 1 / 9, w2 = 1 / 36;

export const U0 = 0.1;            // inflow speed, lattice units (Mach ≈ 0.17)
export const NU_MIN = 0.0045;     // below this, BGK goes unstable at this scale
export const NU_MAX = 0.60;     // ω = 0.43 — very viscous, still stable; lets Re reach the creeping regime
export const SETTLE_STEPS = 8000;   // the kick transient peaks near 6000; only after that does the wake commit

// Measured on this geometry (D = 19, 16% blockage), 70 000-step runs:
//   Re 48 → amplitude decays, σ = −4.3e−5 per step   (steady)
//   Re 50 → saturates at 0.047·U                     (limit cycle)
//   Re 52 → 0.100·U    Re 55 → 0.162·U    Re 58 → 0.208·U
// A² is linear in Re, so the bifurcation is a supercritical Hopf and its
// threshold extrapolates to Re_c ≈ 50. A saturated wake therefore sits well
// above AMP_MIN, and a dying one falls through it — but only the *decay rate*
// separates them early, so both tests are needed.
const AMP_MIN = 0.02;        // limit cycle at Re_c is 0.047; a dying wake passes below
// The kick's sub-critical transient never rises above ≈0.05·U. Anything past
// 0.12 is a wake that means it, and needs no patience to confirm.
const AMP_FAST = 0.12;
// Judging the trend needs an amplitude with no memory and no ripple. An EMA
// has both: it lags the true envelope by its own time constant (so it is still
// climbing when the wake has already turned over), and it ripples at twice the
// shedding frequency. Both flaws made a dying wake at Re = 48 read as a vortex
// street. Instead: a plain RMS over a fixed window, several ripples long,
// compared with the window before it.
// Window-to-window ratios are too noisy to separate Re 48 (mean 0.91) from
// Re 50 (mean 0.97) — a 2000-step window holds only ~1.7 shedding periods.
// Measured against a baseline three windows back, they part cleanly: 0.73 vs
// 0.94. Baselines are only collected once the transient is over.
const DECAY_WINDOW = 2000;
const DECAY_BASELINE = 3;    // windows back → a 6000-step baseline
const DECAY_TOL = 0.85;

/** Nine populations, one Float32Array each — far friendlier to the cache than
 *  an array of structs, and this loop is the whole cost of the episode. */
export class FluidEngine {
  constructor(width = 300, height = 120) {
    this.w = width;
    this.h = height;
    this.stepsPerFrame = 8;
    this.paused = false;
    this.Re = 120;
    this.showTracers = true;
    this.unstable = false;

    const n = width * height;
    for (const k of ['n0', 'nN', 'nS', 'nE', 'nW', 'nNE', 'nSE', 'nNW', 'nSW']) {
      this[k] = new Float32Array(n);
    }
    this.rho = new Float32Array(n);
    this.ux = new Float32Array(n);
    this.uy = new Float32Array(n);
    this.barrier = new Uint8Array(n);

    this.tracers = { x: new Float32Array(0), y: new Float32Array(0) };

    this.preset('cylinder');
  }

  idx(x, y) { return x + y * this.w; }

  // ── Geometry ──────────────────────────────────────────────────────────────

  clearBarriers() {
    this.barrier.fill(0);
    this._geomDirty = true;
  }

  /** The obstacle's vertical extent in cells — the characteristic length D
   *  in Re = U·D/ν. Measured from whatever the user actually drew. */
  _measureGeometry() {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, count = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.barrier[this.idx(x, y)]) continue;
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (!count) {
      this.D = 0; this.obsCx = 0; this.obsCy = (this.h / 2) | 0; this.obsMaxX = 0;
    } else {
      this.D = maxY - minY + 1;
      this.obsCx = ((minX + maxX) / 2) | 0;
      this.obsCy = ((minY + maxY) / 2) | 0;
      this.obsMaxX = maxX;
    }
    // The probe sits two diameters downstream on the wake centreline; that is
    // where the transverse velocity oscillates most cleanly.
    this.probeX = Math.min(this.w - 3, this.obsMaxX + Math.max(6, 2 * this.D));
    this.probeY = this.obsCy;
    this._geomDirty = false;
    this._resetMeasurement();
  }

  preset(name) {
    this.clearBarriers();
    const cx = Math.round(this.w * 0.26);
    const cy = Math.round(this.h / 2);
    // D ≈ 19 cells at h = 120: enough to resolve the boundary layer, and a
    // blockage ratio of 16% — measured to put the shedding threshold at
    // Re ≈ 50, against the textbook 47 for an unconfined cylinder.
    const R = Math.max(4, Math.round(this.h * 0.075));

    const put = (x, y) => {
      if (x > 1 && x < this.w - 2 && y > 1 && y < this.h - 2) this.barrier[this.idx(x, y)] = 1;
    };

    if (name === 'cylinder') {
      for (let y = -R; y <= R; y++) {
        for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R) put(cx + x, cy + y);
      }
    } else if (name === 'plate') {
      for (let y = -R; y <= R; y++) for (let x = -1; x <= 1; x++) put(cx + x, cy + y);
    } else if (name === 'wedge') {
      for (let y = -R; y <= R; y++) {
        const half = Math.round((1 - Math.abs(y) / R) * R);
        for (let x = 0; x <= half; x++) put(cx + x, cy + y);
      }
    } else if (name === 'airfoil') {
      // NACA-0018-ish half-thickness, tilted a few degrees. Not a real wing —
      // just something with a rounded nose and a sharp trailing edge.
      const chord = Math.round(R * 3.4), t = 0.18, aoa = 8 * Math.PI / 180;
      for (let i = 0; i <= chord; i++) {
        const s = i / chord;
        const yt = 5 * t * chord * (0.2969 * Math.sqrt(s) - 0.1260 * s - 0.3516 * s * s
          + 0.2843 * s * s * s - 0.1015 * s * s * s * s);
        for (let dy = -yt; dy <= yt; dy += 0.5) {
          const px = i - chord * 0.35, py = dy;
          const rx = px * Math.cos(aoa) + py * Math.sin(aoa);
          const ry = -px * Math.sin(aoa) + py * Math.cos(aoa);
          put(cx + Math.round(rx), cy + Math.round(ry));
        }
      }
    }
    this.preset_ = name;
    this._measureGeometry();
    this.reset();
  }

  paint(x, y, radius, erase) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const px = x + dx, py = y + dy;
        if (px <= 1 || px >= this.w - 2 || py <= 1 || py >= this.h - 2) continue;
        this.barrier[this.idx(px, py)] = erase ? 0 : 1;
      }
    }
    this.preset_ = 'custom';
    this._geomDirty = true;
  }

  // ── Physics parameters ────────────────────────────────────────────────────

  /** Kinematic viscosity in lattice units, derived from the Reynolds number.
   *  Clamped: too small and BGK blows up, too large and nothing happens. */
  get nu() {
    if (!this.D) return 0.02;
    return Math.min(NU_MAX, Math.max(NU_MIN, (U0 * this.D) / this.Re));
  }
  get omega() { return 1 / (3 * this.nu + 0.5); }

  /** The Reynolds number the simulation is *actually* running at, once ν has
   *  been clamped. Honest: it can differ from the slider at the extremes. */
  get effectiveRe() { return this.D ? (U0 * this.D) / this.nu : 0; }

  /** Only the period history is stale after an Re change; the mean and the
   *  amplitude EMAs adapt on their own, and wiping them would make the regime
   *  read "steady" for a second every time the slider twitches. */
  setRe(v) {
    this.Re = Math.max(1, +v);
    this._periods = [];
    this._lastCross = -1;
  }
  setStepsPerFrame(v) { this.stepsPerFrame = Math.max(1, Math.round(v)); }
  setShowTracers(on) { this.showTracers = !!on; }

  // ── Initialisation ────────────────────────────────────────────────────────

  _setEquil(i, ux, uy, rho) {
    const ux3 = 3 * ux, uy3 = 3 * uy;
    const ux2 = ux * ux, uy2 = uy * uy;
    const uxuy2 = 2 * ux * uy;
    const u2 = ux2 + uy2, u215 = 1.5 * u2;
    const a = w1 * rho, b = w2 * rho;
    this.n0[i] = w0 * rho * (1 - u215);
    this.nE[i] = a * (1 + ux3 + 4.5 * ux2 - u215);
    this.nW[i] = a * (1 - ux3 + 4.5 * ux2 - u215);
    this.nN[i] = a * (1 + uy3 + 4.5 * uy2 - u215);
    this.nS[i] = a * (1 - uy3 + 4.5 * uy2 - u215);
    this.nNE[i] = b * (1 + ux3 + uy3 + 4.5 * (u2 + uxuy2) - u215);
    this.nSE[i] = b * (1 + ux3 - uy3 + 4.5 * (u2 - uxuy2) - u215);
    this.nNW[i] = b * (1 - ux3 + uy3 + 4.5 * (u2 - uxuy2) - u215);
    this.nSW[i] = b * (1 - ux3 - uy3 + 4.5 * (u2 + uxuy2) - u215);
    this.rho[i] = rho;
    this.ux[i] = ux;
    this.uy[i] = uy;
  }

  reset() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) this._setEquil(this.idx(x, y), U0, 0, 1);
    }
    this.steps = 0;
    this.unstable = false;
    this._resetMeasurement();
    this._seedTracers();
    if (this._geomDirty) this._measureGeometry();
  }

  _seedTracers(n = 420) {
    const xs = new Float32Array(n), ys = new Float32Array(n);
    const cols = Math.ceil(Math.sqrt(n * this.w / this.h));
    const rows = Math.ceil(n / cols);
    let k = 0;
    for (let r = 0; r < rows && k < n; r++) {
      for (let c = 0; c < cols && k < n; c++) {
        xs[k] = ((c + 0.5) / cols) * (this.w - 2) + 1;
        ys[k] = ((r + 0.5) / rows) * (this.h - 2) + 1;
        k++;
      }
    }
    this.tracers = { x: xs, y: ys };
  }

  // ── Vortex-shedding measurement (Strouhal number) ────────────────────────
  //
  // The wake's transverse velocity oscillates once per shed vortex pair. We
  // time the upward zero crossings at the probe and average the last few
  // periods. St = f·D/U = D/(T·U) with T in lattice steps.

  _resetMeasurement() {
    this._mean = 0;        // slow EMA of uy at the probe
    this._var = 0;         // slow EMA of (uy − mean)², i.e. amplitude²
    this._sign = -1;       // Schmitt-trigger state
    this._lastCross = -1;
    this._periods = [];
    this._shedding = false;
    this._winSum = 0;      // Σ(uy − mean)² over the current window
    this._winN = 0;
    this._ring = [];       // window RMS history, post-settling only
    this._ampWin = 0;      // RMS of the last completed window
    // Redrawing an obstacle throws the wake into a fresh transient, exactly as
    // a reset does. Restart the settling window from wherever the clock is.
    this._settleUntil = (this.steps || 0) + SETTLE_STEPS;
  }

  _sample() {
    if (!this.D) return;
    const v = this.uy[this.idx(this.probeX, this.probeY)];

    // A shed wake oscillates about a mean that is NOT zero — the obstacle sits
    // a half-cell off the channel centreline, and a drawn shape can be far
    // worse. Detecting crossings of zero therefore mistimes (or misses) the
    // period entirely. Track the mean and cross *that*.
    this._mean += (v - this._mean) * 2.5e-4;      // τ ≈ 4000 steps
    const d = v - this._mean;
    this._var += (d * d - this._var) * 6.7e-4;    // τ ≈ 1500 steps

    // Schmitt trigger at ±0.3σ: immune to the numerical ripple of a steady wake.
    const sigma = Math.sqrt(this._var);
    const gate = 0.3 * sigma;
    if (this._sign < 0 && d > gate) {
      this._sign = 1;
      if (this._lastCross >= 0) {
        const T = this.steps - this._lastCross;
        if (T > 20) {
          this._periods.push(T);
          if (this._periods.length > 8) this._periods.shift();
        }
      }
      this._lastCross = this.steps;
    } else if (this._sign > 0 && d < -gate) {
      this._sign = -1;
    }

    // Below the threshold the kick still rings the wake: it oscillates, and it
    // dies. Amplitude alone cannot tell that from a genuine limit cycle — just
    // above Re_c the wake *also* decays, down onto its cycle rather than to
    // zero. What separates them is how fast: a dying wake sheds 2% of its
    // amplitude every 500 steps, a saturated one less than 0.5%.
    this._winSum += d * d;
    this._winN++;
    if (this.steps % DECAY_WINDOW === 0 && this._winN) {
      this._ampWin = Math.sqrt(this._winSum / this._winN) / U0;
      if (this.steps > this._settleUntil) {
        this._ring.push(this._ampWin);
        if (this._ring.length > DECAY_BASELINE + 1) this._ring.shift();
      }
      this._winSum = 0;
      this._winN = 0;
    }

    if (this.steps > this._settleUntil) {
      const rms = this._ampWin;
      const baseline = this._ring.length > DECAY_BASELINE ? this._ring[0] : 0;
      const holding = baseline > 0 && rms >= baseline * DECAY_TOL;
      if (!this._shedding && this._periodsConsistent
          && (rms > AMP_FAST || (rms > AMP_MIN && holding))) {
        this._shedding = true;
      } else if (this._shedding && rms < AMP_MIN * 0.5) {
        this._shedding = false;
      }
    }
  }

  /** True while the kick's transient is still washing out and no verdict on the
   *  wake can be trusted. */
  get settling() { return this.steps <= this._settleUntil; }

  /** RMS transverse velocity at the probe, as a fraction of the inflow speed.
   *  Measured: ~0.0005 for a steady wake, ~0.06 the moment shedding starts. */
  get wakeAmplitude() { return Math.sqrt(this._var) / U0; }

  /** A real oscillation keeps a steady beat; a transient does not. */
  get _periodsConsistent() {
    if (this._periods.length < 3) return false;
    const lo = Math.min(...this._periods), hi = Math.max(...this._periods);
    return hi / lo < 1.25;
  }

  get isShedding() { return this._shedding; }

  /** Shedding period in lattice steps, or null while the wake is steady. */
  get period() {
    if (!this.isShedding) return null;
    return this._periods.reduce((a, b) => a + b, 0) / this._periods.length;
  }

  /** Strouhal number St = f·D/U. Dimensionless, ≈0.2 for a cylinder over a
   *  huge range of Re — a fact this code was never told. */
  get strouhal() {
    const T = this.period;
    if (!T || !this.D) return null;
    return this.D / (T * U0);
  }

  get regime() {
    if (!this.D) return 'empty';
    if (this.settling) return 'settling';
    if (this.isShedding) return 'shedding';
    if (this.effectiveRe < 5) return 'creeping';
    return 'steady';
  }

  // ── One lattice step ──────────────────────────────────────────────────────

  _collide() {
    const { w, h, n0, nN, nS, nE, nW, nNE, nSE, nNW, nSW, rho, ux, uy } = this;
    const omega = this.omega;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        const r = n0[i] + nN[i] + nS[i] + nE[i] + nW[i] + nNE[i] + nSE[i] + nNW[i] + nSW[i];
        rho[i] = r;
        const inv = 1 / r;
        const vx = (nE[i] + nNE[i] + nSE[i] - nW[i] - nNW[i] - nSW[i]) * inv;
        const vy = (nN[i] + nNE[i] + nNW[i] - nS[i] - nSE[i] - nSW[i]) * inv;
        ux[i] = vx; uy[i] = vy;

        const a = w1 * r, b = w2 * r;
        const ux3 = 3 * vx, uy3 = 3 * vy;
        const ux2 = vx * vx, uy2 = vy * vy;
        const uxuy2 = 2 * vx * vy;
        const u2 = ux2 + uy2, u215 = 1.5 * u2;

        n0[i] += omega * (w0 * r * (1 - u215) - n0[i]);
        nE[i] += omega * (a * (1 + ux3 + 4.5 * ux2 - u215) - nE[i]);
        nW[i] += omega * (a * (1 - ux3 + 4.5 * ux2 - u215) - nW[i]);
        nN[i] += omega * (a * (1 + uy3 + 4.5 * uy2 - u215) - nN[i]);
        nS[i] += omega * (a * (1 - uy3 + 4.5 * uy2 - u215) - nS[i]);
        nNE[i] += omega * (b * (1 + ux3 + uy3 + 4.5 * (u2 + uxuy2) - u215) - nNE[i]);
        nSE[i] += omega * (b * (1 + ux3 - uy3 + 4.5 * (u2 - uxuy2) - u215) - nSE[i]);
        nNW[i] += omega * (b * (1 - ux3 + uy3 + 4.5 * (u2 - uxuy2) - u215) - nNW[i]);
        nSW[i] += omega * (b * (1 - ux3 - uy3 + 4.5 * (u2 + uxuy2) - u215) - nSW[i]);
      }
    }
    // Outflow: copy the leftward-moving populations from the neighbour, so the
    // right edge lets vortices leave instead of reflecting them back.
    for (let y = 1; y < h - 1; y++) {
      const i = w - 1 + y * w, j = w - 2 + y * w;
      nW[i] = nW[j]; nNW[i] = nNW[j]; nSW[i] = nSW[j];
    }
  }

  _stream() {
    const { w, h, nN, nS, nE, nW, nNE, nSE, nNW, nSW, barrier } = this;
    for (let y = h - 2; y > 0; y--) {
      for (let x = 1; x < w - 1; x++) {
        nN[x + y * w] = nN[x + (y - 1) * w];
        nNW[x + y * w] = nNW[x + 1 + (y - 1) * w];
      }
    }
    for (let y = h - 2; y > 0; y--) {
      for (let x = w - 2; x > 0; x--) {
        nE[x + y * w] = nE[x - 1 + y * w];
        nNE[x + y * w] = nNE[x - 1 + (y - 1) * w];
      }
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = w - 2; x > 0; x--) {
        nS[x + y * w] = nS[x + (y + 1) * w];
        nSE[x + y * w] = nSE[x - 1 + (y + 1) * w];
      }
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        nW[x + y * w] = nW[x + 1 + y * w];
        nSW[x + y * w] = nSW[x + 1 + (y + 1) * w];
      }
    }
    // No-slip walls: whatever hits a barrier leaves the way it came.
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        if (!barrier[i]) continue;
        nE[x + 1 + y * w] = nW[i];
        nW[x - 1 + y * w] = nE[i];
        nN[x + (y + 1) * w] = nS[i];
        nS[x + (y - 1) * w] = nN[i];
        nNE[x + 1 + (y + 1) * w] = nSW[i];
        nNW[x - 1 + (y + 1) * w] = nSE[i];
        nSE[x + 1 + (y - 1) * w] = nNW[i];
        nSW[x - 1 + (y - 1) * w] = nNE[i];
        nN[i] = nS[i] = nE[i] = nW[i] = nNE[i] = nNW[i] = nSE[i] = nSW[i] = 0;
      }
    }
  }

  _boundaries() {
    const { w, h } = this;
    for (let x = 0; x < w; x++) {
      this._setEquil(this.idx(x, 0), U0, 0, 1);
      this._setEquil(this.idx(x, h - 1), U0, 0, 1);
    }
    for (let y = 1; y < h - 1; y++) this._setEquil(this.idx(0, y), U0, 0, 1);
  }

  _advectTracers() {
    const t = this.tracers, n = t.x.length;
    for (let k = 0; k < n; k++) {
      const xi = Math.min(this.w - 2, Math.max(1, t.x[k] | 0));
      const yi = Math.min(this.h - 2, Math.max(1, t.y[k] | 0));
      const i = this.idx(xi, yi);
      t.x[k] += this.ux[i];
      t.y[k] += this.uy[i];
      if (t.x[k] >= this.w - 2 || t.x[k] < 1 || t.y[k] < 1 || t.y[k] >= this.h - 2 || this.barrier[i]) {
        // Re-inject on the left edge, keeping the row so the seeding stays even.
        t.x[k] = 1.5;
        t.y[k] = 1 + ((k * 37) % (this.h - 3));
      }
    }
  }

  /** A brief, deterministic transverse blip just behind the obstacle, applied
   *  once shortly after a reset.
   *
   *  A perfectly symmetric simulation of a perfectly symmetric cylinder never
   *  sheds: nothing breaks the mirror symmetry. Real flows are nudged by noise;
   *  numerically we have to nudge them ourselves. This is not cheating — it is
   *  how the threshold is *measured*: below the critical Reynolds number the
   *  blip decays away, above it the blip grows into the vortex street. */
  _kick() {
    if (!this.D) return;
    const x = Math.min(this.w - 3, this.obsMaxX + 2);
    for (let dy = 1; dy <= 3; dy++) {
      const y = this.obsCy + dy;
      if (y > 0 && y < this.h - 1) this._setEquil(this.idx(x, y), U0, 0.06, 1);
    }
  }

  /** One lattice step. dt is fixed by the lattice; `stepsPerFrame` only decides
   *  how many of them a frame contains — it cannot change the flow. */
  _substep() {
    this._boundaries();
    if (this.steps >= 20 && this.steps < 40) this._kick();
    this._collide();
    this._stream();
    this.steps++;
    this._sample();
  }

  step() {
    if (this.paused || this.unstable) return;
    if (this._geomDirty) this._measureGeometry();
    for (let s = 0; s < this.stepsPerFrame; s++) this._substep();
    if (this.showTracers) this._advectTracers();

    // BGK diverges rather than degrading. Catch it and say so, instead of
    // painting a screen of NaN.
    const probe = this.rho[this.idx(this.w >> 1, this.h >> 1)];
    if (!Number.isFinite(probe) || probe <= 0) this.unstable = true;
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('fluid:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  /** Curl of the velocity field at (x,y) — the thing that makes a vortex
   *  visible. Central differences, zero on the boundary. */
  curl(x, y) {
    if (x < 1 || y < 1 || x >= this.w - 1 || y >= this.h - 1) return 0;
    return (this.uy[this.idx(x + 1, y)] - this.uy[this.idx(x - 1, y)])
         - (this.ux[this.idx(x, y + 1)] - this.ux[this.idx(x, y - 1)]);
  }
}
