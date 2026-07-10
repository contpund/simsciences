// Fourier engine — every closed curve is a sum of rotating circles.
//
// Take any closed path f(t), t ∈ [0,1], as a complex-valued function
// f(t) = x(t) + i·y(t). Its Fourier coefficients are
//
//   c_n = ∫₀¹ f(t) · e^(−2πi n t) dt          (n ∈ ℤ)
//
// and the curve is rebuilt by summing the terms back:
//
//   f(t) = Σ_n c_n · e^(2πi n t)
//
// Each term is a vector of length |c_n| spinning at n turns per cycle. Chain
// them tip to tail and the last tip traces the curve. That is the whole idea:
// a drawing is a stack of circles, and n is how fast each one turns.
//
// We sample the path at SAMPLES points and take the full DFT, so the 512
// coefficients reproduce those samples exactly. The slider then keeps only
// |n| ≤ N of them, and the error readout is not an estimate — by Parseval's
// theorem the discarded energy is exactly Σ_{|n|>N} |c_n|², so
//
//   error(N) = √( Σ_{|n|>N}|c_n|² / Σ_{n≠0}|c_n|² )
//
// which is what the "reconstruction error" panel reports. Nothing here is
// random, so the capture pipeline renders identical frames between runs.

export const NMAX = 200;      // harmonics the slider can reach (2N+1 = 401 circles)
const SAMPLES = 512;          // path resampling + DFT size (n from -256..255)
const HALF = SAMPLES / 2;
const RECON = 512;            // samples of the reconstructed curve we draw
const DT = 1 / 360;           // cycle fraction per substep (≈6 s per loop at 60 fps)
const MAX_SUBSTEPS = 32;
const TRAIL = 0.34;           // fraction of the cycle drawn as a bright trail

const TAU = Math.PI * 2;

// ── Parametric presets. Each returns a closed loop of {x, y}, maths axes. ────

function sampleSquare(n = 400) {
  const pts = [];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const per = Math.floor(n / 4);
  for (let s = 0; s < 4; s++) {
    const [ax, ay] = corners[s], [bx, by] = corners[(s + 1) % 4];
    for (let k = 0; k < per; k++) {
      const u = k / per;
      pts.push({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u });
    }
  }
  return pts;
}

function sampleStar(n = 400) {
  const pts = [];
  const V = 10, R = 1, r = 0.382;   // 5-pointed star, golden inner radius
  const per = Math.floor(n / V);
  for (let s = 0; s < V; s++) {
    const a1 = (s / V) * TAU - Math.PI / 2, a2 = ((s + 1) / V) * TAU - Math.PI / 2;
    const r1 = s % 2 === 0 ? R : r, r2 = s % 2 === 0 ? r : R;
    const ax = Math.cos(a1) * r1, ay = Math.sin(a1) * r1;
    const bx = Math.cos(a2) * r2, by = Math.sin(a2) * r2;
    for (let k = 0; k < per; k++) {
      const u = k / per;
      pts.push({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u });
    }
  }
  return pts;
}

function sampleHeart(n = 512) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * TAU;
    const s = Math.sin(t);
    pts.push({
      x: 16 * s * s * s,
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    });
  }
  return pts;
}

/** Lemniscate of Gerono. Analytic and smooth, so its coefficients die off
 *  fast and a handful of circles already nail it — the opposite of the square,
 *  whose corners keep demanding more. (Sampled in its own parameter it would
 *  be exactly n = ±1, ±2; we resample by arc length like every other path, so
 *  the spectrum spreads a little. The error readout reports what is actually
 *  left out — no need to guess.) */
function sampleInfinity(n = 512) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * TAU;
    pts.push({ x: Math.cos(t), y: Math.sin(t) * Math.cos(t) });
  }
  return pts;
}

export const PRESETS = {
  square: sampleSquare,
  star: sampleStar,
  heart: sampleHeart,
  infinity: sampleInfinity,
};

// ── Geometry helpers ────────────────────────────────────────────────────────

/** Resample a closed polyline to `count` points spaced evenly along its arc
 *  length. Hand-drawn strokes have wildly uneven point density; without this
 *  the parameterisation — and therefore every coefficient — is junk. */
function resampleClosed(pts, count) {
  const n = pts.length;
  if (n < 2) return [];
  const seg = new Float64Array(n);   // seg[i] = |p[i+1] - p[i]|, wrapping
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    seg[i] = Math.hypot(b.x - a.x, b.y - a.y);
    total += seg[i];
  }
  if (total === 0) return [];

  const out = [];
  let i = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (acc + seg[i] < target && i < n - 1) { acc += seg[i]; i++; }
    const u = seg[i] > 0 ? (target - acc) / seg[i] : 0;
    const a = pts[i], b = pts[(i + 1) % n];
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  }
  return out;
}

export class FourierEngine {
  constructor() {
    this.N = 40;
    this.speed = 1;
    this.paused = false;
    this.t = 0;
    this._acc = 0;

    this.showCircles = true;
    this.showOriginal = true;

    // Freehand drawing state, owned by controls.js, read by the renderer.
    this.isDrawing = false;
    this.ink = [];             // raw stroke in canvas coords, for live feedback

    // Filled by setPath().
    this.path = [];            // SAMPLES points, centred & normalised
    this.re = new Float64Array(SAMPLES);   // c_n real, indexed by n + HALF
    this.im = new Float64Array(SAMPLES);
    this.amp = new Float64Array(SAMPLES);
    this.phase = new Float64Array(SAMPLES);
    this.order = [];           // indices of |n| ≤ NMAX, by descending amplitude
    this.energyUpTo = new Float64Array(NMAX + 1);  // Σ_{1≤|n|≤m} |c_n|²
    this.totalEnergy = 0;

    this.reconRe = new Float64Array(RECON);
    this.reconIm = new Float64Array(RECON);
    this._builtN = -1;

    this.preset = 'infinity';
    this.setPath(PRESETS.infinity());
  }

  // ── Readouts ──────────────────────────────────────────────────────────────

  get circles() { return 2 * this.N + 1; }

  /** Amplitude |c_n| of harmonic n. */
  ampAt(n) { return this.amp[n + HALF]; }

  /** Exact fraction of the curve's energy left out by keeping |n| ≤ N.
   *  Parseval: the residual is Σ_{|n|>N}|c_n|², no reconstruction needed. */
  get error() {
    if (this.totalEnergy <= 0) return 0;
    const kept = this.energyUpTo[Math.min(this.N, NMAX)];
    const residual = Math.max(0, this.totalEnergy - kept);
    return Math.sqrt(residual / this.totalEnergy) * 100;
  }

  /** The harmonic carrying the most amplitude (ignoring the n = 0 offset). */
  get dominantHarmonic() {
    let best = 0, bestAmp = -1;
    for (let n = -NMAX; n <= NMAX; n++) {
      if (n === 0) continue;
      const a = this.amp[n + HALF];
      if (a > bestAmp) { bestAmp = a; best = n; }
    }
    return best;
  }

  // ── Path → coefficients ───────────────────────────────────────────────────

  setPath(rawPts) {
    const pts = resampleClosed(rawPts, SAMPLES);
    if (pts.length < SAMPLES) return false;

    // Centre on the centroid, then scale so the curve fits the unit circle.
    let mx = 0, my = 0;
    for (const p of pts) { mx += p.x; my += p.y; }
    mx /= SAMPLES; my /= SAMPLES;
    let maxR = 1e-9;
    for (const p of pts) {
      p.x -= mx; p.y -= my;
      const r = Math.hypot(p.x, p.y);
      if (r > maxR) maxR = r;
    }
    for (const p of pts) { p.x /= maxR; p.y /= maxR; }
    this.path = pts;

    this._dft();
    this._builtN = -1;
    this._rebuildRecon();
    this.t = 0;
    this._acc = 0;
    return true;
  }

  /** Full DFT of the sampled path. O(SAMPLES²) — a few ms, run once per path. */
  _dft() {
    const M = SAMPLES;
    this.re.fill(0); this.im.fill(0);
    for (let n = -HALF; n < HALF; n++) {
      let sr = 0, si = 0;
      for (let k = 0; k < M; k++) {
        const a = (-TAU * n * k) / M;
        const c = Math.cos(a), s = Math.sin(a);
        const zr = this.path[k].x, zi = this.path[k].y;
        sr += zr * c - zi * s;
        si += zr * s + zi * c;
      }
      const idx = n + HALF;
      this.re[idx] = sr / M;
      this.im[idx] = si / M;
      this.amp[idx] = Math.hypot(this.re[idx], this.im[idx]);
      this.phase[idx] = Math.atan2(this.im[idx], this.re[idx]);
    }

    // Energy carried by every harmonic up to m (n = 0 is the centre offset,
    // which after centring is ~0 and carries no shape information).
    let acc = 0;
    this.energyUpTo[0] = 0;
    for (let m = 1; m <= NMAX; m++) {
      acc += this.amp[m + HALF] ** 2 + this.amp[-m + HALF] ** 2;
      this.energyUpTo[m] = acc;
    }
    let total = 0;
    for (let n = -HALF; n < HALF; n++) {
      if (n === 0) continue;
      total += this.amp[n + HALF] ** 2;
    }
    this.totalEnergy = total;

    // Draw order: biggest circles first, the classic look.
    const idxs = [];
    for (let n = -NMAX; n <= NMAX; n++) idxs.push(n);
    idxs.sort((a, b) => this.amp[b + HALF] - this.amp[a + HALF]);
    this.order = idxs;
  }

  /** Reconstructed curve for the current N. Adding or removing a harmonic only
   *  touches RECON samples, so dragging the slider is cheap. */
  _rebuildRecon() {
    const N = this.N;
    if (this._builtN === N) return;

    if (this._builtN < 0) {
      this.reconRe.fill(0); this.reconIm.fill(0);
      this._addHarmonic(0, +1);
      this._builtN = 0;
    }
    while (this._builtN < N) {
      const m = this._builtN + 1;
      this._addHarmonic(m, +1);
      this._addHarmonic(-m, +1);
      this._builtN = m;
    }
    while (this._builtN > N) {
      const m = this._builtN;
      this._addHarmonic(m, -1);
      this._addHarmonic(-m, -1);
      this._builtN = m - 1;
    }
  }

  _addHarmonic(n, sign) {
    const idx = n + HALF;
    const a = this.amp[idx], ph = this.phase[idx];
    if (a === 0) return;
    for (let k = 0; k < RECON; k++) {
      const ang = TAU * n * (k / RECON) + ph;
      this.reconRe[k] += sign * a * Math.cos(ang);
      this.reconIm[k] += sign * a * Math.sin(ang);
    }
  }

  /** Chain of epicycle tips at phase t: [{x,y,r}, …], last entry is the pen. */
  chain(t = this.t) {
    const out = [];
    let x = 0, y = 0;
    out.push({ x, y, r: 0, n: 0 });
    for (const n of this.order) {
      if (Math.abs(n) > this.N) continue;
      const idx = n + HALF;
      const a = this.amp[idx];
      if (a < 1e-6) continue;
      const ang = TAU * n * t + this.phase[idx];
      x += a * Math.cos(ang);
      y += a * Math.sin(ang);
      out.push({ x, y, r: a, n });
    }
    return out;
  }

  /** Indices into the reconstructed curve for the bright trailing segment. */
  trailRange() {
    const end = Math.floor(this.t * RECON) % RECON;
    const len = Math.max(2, Math.floor(TRAIL * RECON));
    return { end, len, total: RECON };
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  setN(v) {
    this.N = Math.max(1, Math.min(NMAX, Math.round(v)));
    this._rebuildRecon();
  }
  setSpeed(v) { this.speed = Math.max(0.05, +v); }
  setShowCircles(on) { this.showCircles = !!on; }
  setShowOriginal(on) { this.showOriginal = !!on; }

  loadPreset(name) {
    const gen = PRESETS[name];
    if (!gen) return false;
    this.preset = name;
    return this.setPath(gen());
  }

  reset() {
    this.setN(40);
    this.setSpeed(1);
    this.showCircles = true;
    this.showOriginal = true;
    this.paused = false;
    this.loadPreset('infinity');
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('fourier:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  // ── Time ──────────────────────────────────────────────────────────────────

  /** t is a pure phase, so `speed` only changes how fast you watch the same
   *  curve get drawn — but the substep stays fixed anyway, matching ep07. */
  step() {
    if (this.paused) return;
    this._acc += DT * this.speed;
    let budget = MAX_SUBSTEPS;
    while (this._acc >= DT - 1e-12 && budget-- > 0) {
      this.t = (this.t + DT) % 1;
      this._acc -= DT;
    }
  }
}
