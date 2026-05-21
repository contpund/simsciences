// Canvas 2D renderer for the double pendulum.
//
// Visual language:
//   - Dark gradient background (matches simsciences brand).
//   - Cyan pendulum A, optional orange pendulum B (the chaos twin).
//   - Trails: per-bob ring buffers, drawn with alpha decay so older trail
//     fades out (most intense at the tip's current position).
//   - Subtle pivot marker. Discreet HUD top-left with elapsed time and
//     bottom-of-bob trail length.

const BG_TOP = '#10131a';
const BG_BOTTOM = '#06070a';
const CYAN = '#00d4ff';
const ORANGE = '#ff9844';
const TAU = Math.PI * 2;
const DPR_CAP = 1.75;

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.engine = engine;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this._lastT = performance.now();
    this._fps = 60;
    this.showTrace = true;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(rect.width, 320);
    const cssH = Math.max(rect.height, 240);
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = cssW;
    this.h = cssH;
    this._paintBackground();
  }

  _paintBackground() {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, BG_TOP);
    g.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  // Convert physics units (meters from pivot) to canvas pixels.
  _project(px, py) {
    const cx = this.w / 2;
    const cy = this.h * 0.32;   // pivot near the top-third
    const { L1, L2 } = this.engine.params;
    // Fit the maximum reach (L1 + L2) into ~38% of the smaller dimension.
    const maxReach = (L1 + L2) * 1.05;
    const scale = (Math.min(this.w, this.h) * 0.38) / maxReach;
    return [cx + px * scale, cy + py * scale];
  }

  draw() {
    const ctx = this.ctx;
    const t = performance.now();
    let dt = t - this._lastT;
    this._lastT = t;
    if (dt > 100) dt = 100;
    if (dt > 0) this._fps += ((1000 / dt) - this._fps) * 0.1;

    this._paintBackground();

    // --- Update + push trail samples ---
    const a = this.engine.tipA();
    const [axA, ayA] = this._project(a.x2, a.y2);
    if (this.showTrace) {
      this.engine.trailA.push(axA, ayA);
      while (this.engine.trailA.length > this.engine.trailMax * 2) this.engine.trailA.shift();
    }
    let b, axB, ayB;
    if (this.engine.params.twinEnabled) {
      b = this.engine.tipB();
      [axB, ayB] = this._project(b.x2, b.y2);
      if (this.showTrace) {
        this.engine.trailB.push(axB, ayB);
        while (this.engine.trailB.length > this.engine.trailMax * 2) this.engine.trailB.shift();
      }
    }

    // --- Draw trails first (so pendulums sit on top) ---
    if (this.showTrace) {
      this._drawTrail(this.engine.trailA, CYAN, 2);
      if (this.engine.params.twinEnabled) {
        this._drawTrail(this.engine.trailB, ORANGE, 2);
      }
    }

    // --- Pivot ---
    const [pivotX, pivotY] = this._project(0, 0);
    ctx.fillStyle = '#cfd2d8';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 10, 0, TAU);
    ctx.stroke();

    // --- Pendulum A (cyan) — draw on top of B if both are present ---
    if (this.engine.params.twinEnabled) {
      this._drawPendulum(a, CYAN, 0.55);   // dimmed slightly so they don't merge
      this._drawPendulum(b, ORANGE, 1.0);
    } else {
      this._drawPendulum(a, CYAN, 1.0);
    }

    // --- HUD ---
    this._drawHUD(ctx);
  }

  _drawTrail(buf, color, lineWidth) {
    if (buf.length < 4) return;
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Trail is drawn in N short segments with increasing alpha so older
    // points fade. We sample every ~6 points to keep stroke count reasonable.
    const STEP = 6;
    const total = buf.length / 2;
    ctx.lineWidth = lineWidth;
    for (let i = STEP; i < total; i += STEP) {
      const a = Math.max(0.04, i / total);
      ctx.globalAlpha = a;
      ctx.strokeStyle = color;
      ctx.beginPath();
      const x0 = buf[(i - STEP) * 2];
      const y0 = buf[(i - STEP) * 2 + 1];
      const x1 = buf[i * 2];
      const y1 = buf[i * 2 + 1];
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawPendulum(tip, color, alpha) {
    const ctx = this.ctx;
    const [pivotX, pivotY] = this._project(0, 0);
    const [x1, y1] = this._project(tip.x1, tip.y1);
    const [x2, y2] = this._project(tip.x2, tip.y2);
    ctx.globalAlpha = alpha;
    // Arms — subtle gradient from pivot to bob.
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(220, 224, 232, 0.85)';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Top bob (smaller) — glowing color.
    const { m1, m2 } = this.engine.params;
    const r1 = 6 + 4 * Math.sqrt(m1);
    const r2 = 8 + 5 * Math.sqrt(m2);

    this._drawBob(x1, y1, r1, color);
    this._drawBob(x2, y2, r2, color);

    ctx.globalAlpha = 1;
  }

  _drawBob(x, y, radius, color) {
    const ctx = this.ctx;
    // Outer glow
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
    g.addColorStop(0, color);
    g.addColorStop(0.45, color + '40');  // 40 = 25% alpha hex
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.6, 0, TAU);
    ctx.fill();
    // Core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    // Specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.32, 0, TAU);
    ctx.fill();
  }

  _drawHUD(ctx) {
    const fps = Math.round(this._fps);
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`${fps} FPS`, 14, 20);
    ctx.fillStyle = '#cfd2d8';
    ctx.fillText(`t = ${this.engine.t.toFixed(1)} s`, 14, 36);
    if (this.engine.params.twinEnabled) {
      // Show the runtime divergence (Euclidean distance between bob tips
      // in physics units). This is the entire point of the demo.
      const a = this.engine.tipA();
      const b = this.engine.tipB();
      const dx = a.x2 - b.x2;
      const dy = a.y2 - b.y2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      ctx.fillStyle = '#ff9844';
      ctx.fillText(`Δ(A,B) = ${dist.toFixed(3)} m`, 14, 52);
    }
  }
}
