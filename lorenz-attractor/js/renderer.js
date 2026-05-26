// Lorenz renderer — paints the 3D attractor onto a 2D canvas with a
// simple yaw-rotated perspective projection. The camera orbits around
// the attractor's vertical axis (z) at a gentle rate; auto-orbit can
// be toggled off so the user can pin a viewing angle.

const CYAN = '#5fb0ff';        // main trajectory
const AMBER = '#ffae45';       // twin trajectory
const MUTED = 'rgba(255, 255, 255, 0.12)';

// Centre the attractor vertically on z ≈ 25 (its typical mean height for
// the classic σ=10, ρ=28, β=8/3 parameters). Slightly shifted upward for
// visual balance against the HUD area at the top-left.
const Z_CENTER = 24;

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.engine = engine;

    // Camera state.
    this.yaw = 0.4;              // radians around z
    this.tilt = -0.25;           // vertical tilt
    this.autoRotate = true;
    this.orbitSpeed = 0.10;      // rad / second
    this.zoom = 11;              // pixels per world unit (before perspective)
    this.focal = 100;            // perspective focal "depth"

    this._lastTime = performance.now();

    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(2, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(2, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = rect.width;
    this.H = rect.height;
  }

  setAutoRotate(on) { this.autoRotate = !!on; }
  /** Manual yaw drag — clamps within reasonable bounds. */
  bumpYaw(delta) { this.yaw += delta; }
  bumpTilt(delta) {
    this.tilt = Math.max(-1.2, Math.min(1.2, this.tilt + delta));
  }

  /** Project a world point (x, y, z) to screen coordinates. Returns
   *  { sx, sy, depth, scale } — depth/scale used for line-width falloff
   *  and Z-ordering hints. */
  project(p) {
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    // Rotate around z (vertical) axis.
    const xr = p[0] * cosY - p[1] * sinY;
    const yr = p[0] * sinY + p[1] * cosY;
    const zCentered = p[2] - Z_CENTER;
    // Tilt: rotate around screen-X axis.
    const cosT = Math.cos(this.tilt);
    const sinT = Math.sin(this.tilt);
    const zT = zCentered * cosT - yr * sinT;
    const yT = zCentered * sinT + yr * cosT;
    // Perspective.
    const scale = this.focal / (this.focal + yT);
    const sx = this.W / 2 + xr * this.zoom * scale;
    const sy = this.H / 2 - zT * this.zoom * scale;
    return { sx, sy, depth: yT, scale };
  }

  draw() {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;

    // Update camera.
    const now = performance.now();
    const elapsed = (now - this._lastTime) / 1000;
    this._lastTime = now;
    if (this.autoRotate && !this.engine.paused) {
      this.yaw += this.orbitSpeed * elapsed;
    }

    // Background — radial gradient from deep navy to near-black.
    const bg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.05,
                                        W / 2, H / 2, Math.max(W, H) * 0.85);
    bg.addColorStop(0, '#10131a');
    bg.addColorStop(1, '#04050a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle starfield — deterministic from a single PRNG seed so the
    // captures stay reproducible.
    this._drawStars(ctx, W, H);

    // 3D axes (faint).
    this._drawAxes(ctx);

    // Main trajectory in cyan.
    this._drawTrail(ctx, this.engine.trail, CYAN, true);

    // Twin trajectory in amber (drawn on top so divergence is obvious).
    if (this.engine.twinActive) {
      this._drawTrail(ctx, this.engine.twinTrail, AMBER, false);
    }

    // Current point markers.
    this._drawHead(ctx, this.engine.state, CYAN);
    if (this.engine.twinActive) {
      this._drawHead(ctx, this.engine.twinState, AMBER);
    }

    // HUD: time, current state, divergence.
    this._drawHud(ctx);
  }

  _drawTrail(ctx, points, color, fade) {
    if (points.length < 2) return;
    const n = points.length;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Draw in segments so each segment can have its own alpha (fading
    // tail towards the oldest end). Use additive blending so overlapping
    // strokes glow softly.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < n; i++) {
      const a = this.project(points[i - 1]);
      const b = this.project(points[i]);
      // Skip degenerate.
      if (!isFinite(a.sx) || !isFinite(b.sx)) continue;
      const ageNorm = i / n;
      const alpha = fade ? Math.min(0.9, 0.05 + ageNorm * 0.85) : 0.9;
      // Scale line width with perspective so closer parts of the trail
      // look thicker. Average the two endpoint scales.
      const ls = (a.scale + b.scale) / 2;
      ctx.strokeStyle = this._withAlpha(color, alpha);
      ctx.lineWidth = Math.max(0.6, 1.6 * ls);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  _drawHead(ctx, state, color) {
    const p = this.project(state);
    if (!isFinite(p.sx)) return;
    const r = Math.max(2.2, 4 * p.scale);
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawAxes(ctx) {
    const ORIGIN = [0, 0, Z_CENTER];
    const axes = [
      { end: [22, 0, Z_CENTER], label: 'X' },
      { end: [0, 22, Z_CENTER], label: 'Y' },
      { end: [0, 0, Z_CENTER + 22], label: 'Z' },
    ];
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (const a of axes) {
      const o = this.project(ORIGIN);
      const e = this.project(a.end);
      ctx.beginPath();
      ctx.moveTo(o.sx, o.sy);
      ctx.lineTo(e.sx, e.sy);
      ctx.stroke();
      ctx.fillText(a.label, e.sx + 4, e.sy + 4);
    }
  }

  _drawStars(ctx, W, H) {
    // Deterministic LCG starfield.
    let s = 1234567;
    const rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 90; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const r = rng() * 0.9 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawHud(ctx) {
    const e = this.engine;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const lines = [
      `t  = ${e.time.toFixed(2)}`,
      `σ  = ${e.params.sigma.toFixed(2)}`,
      `ρ  = ${e.params.rho.toFixed(2)}`,
      `β  = ${e.params.beta.toFixed(3)}`,
    ];
    let y = 22;
    for (const ln of lines) { ctx.fillText(ln, 14, y); y += 16; }

    if (e.twinActive) {
      const d = e.divergence();
      ctx.fillStyle = 'rgba(255, 174, 69, 0.85)';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(`Δ = ${d.toExponential(2)}`, 14, y + 6);
    }
  }

  _withAlpha(hex, alpha) {
    // Accepts "#rrggbb".
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
