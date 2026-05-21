// Double-pendulum engine — analytical Lagrangian equations integrated with RK4.
//
// State per pendulum: [θ1, θ2, ω1, ω2]
//   θ1, θ2 : angles from vertical (radians, 0 = hanging straight down)
//   ω1, ω2 : angular velocities (rad/s)
//
// The engine can run one OR two pendulums simultaneously. When the second
// is enabled, its initial state is the first state plus an infinitesimal
// angular offset (EPSILON_DIVERGE) — the canonical chaos demo.

export const DEFAULTS = {
  L1: 1.6,
  L2: 1.4,
  m1: 1.0,
  m2: 1.0,
  theta1: Math.PI * 0.66,   // ~119°
  theta2: Math.PI * 0.55,   // ~99°
  damping: 0,
  twinEnabled: false,
};

export const GRAVITY = 9.81;
export const EPSILON_DIVERGE = 1e-4;   // 0.0001 rad ≈ 0.0057°

export class DoublePendulumEngine {
  constructor() {
    this.params = { ...DEFAULTS };
    this.paused = false;
    this.t = 0;
    // Each pendulum keeps a trail of the bob tip in pixel/world units.
    this.trailA = [];
    this.trailB = [];
    this.trailMax = 600;
    this._reset(this.params.theta1, this.params.theta2);
  }

  _reset(th1, th2) {
    this.A = [th1, th2, 0, 0];
    this.B = [th1 + EPSILON_DIVERGE, th2, 0, 0];
    this.trailA.length = 0;
    this.trailB.length = 0;
    this.t = 0;
  }

  reset() {
    this.params = { ...this.params, theta1: DEFAULTS.theta1, theta2: DEFAULTS.theta2 };
    this._reset(this.params.theta1, this.params.theta2);
  }

  setParam(name, value) {
    this.params[name] = value;
    // If the user moves any angle slider, re-seed the simulation immediately
    // so the change is visible. Mass/length changes affect dynamics only —
    // no re-seed.
    if (name === 'theta1' || name === 'theta2') {
      this._reset(this.params.theta1, this.params.theta2);
    }
  }

  setTwinEnabled(on) {
    this.params.twinEnabled = on;
    if (on) {
      // Re-seed twin from the current state of A so divergence starts now.
      this.B = [this.A[0] + EPSILON_DIVERGE, this.A[1], this.A[2], this.A[3]];
      this.trailB.length = 0;
    }
  }

  clearTrails() {
    this.trailA.length = 0;
    this.trailB.length = 0;
  }

  // ---- Equations of motion -------------------------------------------------
  // Standard Lagrangian formulation. Inputs: state s = [θ1, θ2, ω1, ω2].
  // Returns ds/dt = [ω1, ω2, α1, α2].
  _derivs(s) {
    const { L1, L2, m1, m2, damping } = this.params;
    const [th1, th2, w1, w2] = s;
    const d = th1 - th2;
    const sd = Math.sin(d);
    const cd = Math.cos(d);
    const denom = 2 * m1 + m2 - m2 * Math.cos(2 * d);
    const num1 = (
      -GRAVITY * (2 * m1 + m2) * Math.sin(th1)
      - m2 * GRAVITY * Math.sin(th1 - 2 * th2)
      - 2 * sd * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * cd)
    );
    const num2 = (
      2 * sd * (w1 * w1 * L1 * (m1 + m2) + GRAVITY * (m1 + m2) * Math.cos(th1) + w2 * w2 * L2 * m2 * cd)
    );
    let a1 = num1 / (L1 * denom);
    let a2 = num2 / (L2 * denom);
    // Optional linear damping on the angular velocities.
    if (damping > 0) {
      a1 -= damping * w1;
      a2 -= damping * w2;
    }
    return [w1, w2, a1, a2];
  }

  // ---- RK4 stepper ---------------------------------------------------------
  _rk4(s, dt) {
    const k1 = this._derivs(s);
    const k2 = this._derivs([s[0] + 0.5 * dt * k1[0], s[1] + 0.5 * dt * k1[1], s[2] + 0.5 * dt * k1[2], s[3] + 0.5 * dt * k1[3]]);
    const k3 = this._derivs([s[0] + 0.5 * dt * k2[0], s[1] + 0.5 * dt * k2[1], s[2] + 0.5 * dt * k2[2], s[3] + 0.5 * dt * k2[3]]);
    const k4 = this._derivs([s[0] + dt * k3[0], s[1] + dt * k3[1], s[2] + dt * k3[2], s[3] + dt * k3[3]]);
    return [
      s[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      s[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      s[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      s[3] + (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
    ];
  }

  // ---- One simulation tick (called by renderer/main at canvas frame rate) --
  step() {
    if (this.paused) return;
    // 4 sub-steps per frame for numerical stability with large amplitudes.
    const SUBSTEPS = 4;
    const dt = 1 / 60 / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) {
      this.A = this._rk4(this.A, dt);
      if (this.params.twinEnabled) {
        this.B = this._rk4(this.B, dt);
      }
      this.t += dt;
    }
  }

  // ---- Bob tip positions (in physics units; renderer scales to canvas) ----
  tipA() {
    const { L1, L2 } = this.params;
    const x1 = L1 * Math.sin(this.A[0]);
    const y1 = L1 * Math.cos(this.A[0]);
    const x2 = x1 + L2 * Math.sin(this.A[1]);
    const y2 = y1 + L2 * Math.cos(this.A[1]);
    return { x1, y1, x2, y2 };
  }
  tipB() {
    const { L1, L2 } = this.params;
    const x1 = L1 * Math.sin(this.B[0]);
    const y1 = L1 * Math.cos(this.B[0]);
    const x2 = x1 + L2 * Math.sin(this.B[1]);
    const y2 = y1 + L2 * Math.cos(this.B[1]);
    return { x1, y1, x2, y2 };
  }

  // ---- Total energy — useful as a sanity check that RK4 conserves it ------
  energy(s = this.A) {
    const { L1, L2, m1, m2 } = this.params;
    const [th1, th2, w1, w2] = s;
    const y1 = -L1 * Math.cos(th1);
    const y2 = y1 - L2 * Math.cos(th2);
    const v1x = L1 * w1 * Math.cos(th1);
    const v1y = L1 * w1 * Math.sin(th1);
    const v2x = v1x + L2 * w2 * Math.cos(th2);
    const v2y = v1y + L2 * w2 * Math.sin(th2);
    const ke = 0.5 * m1 * (v1x * v1x + v1y * v1y) + 0.5 * m2 * (v2x * v2x + v2y * v2y);
    const pe = m1 * GRAVITY * y1 + m2 * GRAVITY * y2;
    return ke + pe;
  }
}
