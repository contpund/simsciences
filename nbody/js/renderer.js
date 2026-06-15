// N-body renderer — face-on view painted on a 2-D canvas. Particles are
// drawn with additive ('lighter') blending so dense regions bloom into a
// bright galactic core on their own. Motion trails come from fading the
// previous frame instead of clearing it, which gives the silky streaks
// that read as orbital paths. The view recenters on the centre of mass so
// the system stays framed even as it drifts or two galaxies merge.

// Galaxy palette — warm-white core → cyan mid → deep blue rim.
const CORE = [255, 241, 207];
const MID  = [111, 182, 255];
const RIM  = [49, 86, 168];

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.engine = engine;
    this.trails = true;       // fade-not-clear → motion trails
    this.colorByRadius = true;
    this._firstFrame = true;
    this.scale = 0;           // adaptive; 0 ⇒ snap to target on next frame
    this._rbuf = null;        // reused distance buffer
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
    this._baseHalf = Math.min(this.W, this.H) / 2;
    this.scale = 0;          // re-snap the zoom after a resize
    this._firstFrame = true; // repaint background after a resize
  }

  /** Robust on-screen extent: 90th-percentile radius from the COM. Reuses
   *  the per-index distance buffer (filled by draw) so framing ignores the
   *  handful of slingshot ejecta that would wreck a min/max or rms fit. */
  _updateZoom(n) {
    const sorted = this._rbuf.slice(0, n).sort();
    const p90 = sorted[Math.min(n - 1, Math.floor(0.90 * n))] || 1;
    const ext = Math.max(60, Math.min(3000, p90));
    const target = (this._baseHalf * 0.90) / ext;
    if (this.scale <= 0) this.scale = target;          // snap on first frame
    else this.scale += (target - this.scale) * 0.05;   // otherwise ease in
    return p90;
  }

  setTrails(on) { this.trails = !!on; this._firstFrame = true; }
  setColorByRadius(on) { this.colorByRadius = !!on; }

  draw() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const e = this.engine;
    const n = e.N;
    const x = e.x, y = e.y;

    // Recenter on the centre of mass, then fit the zoom to the swarm.
    const [comx, comy] = e.centerOfMass();
    if (!this._rbuf || this._rbuf.length < n) this._rbuf = new Float64Array(n);
    const rbuf = this._rbuf;
    for (let i = 0; i < n; i++) rbuf[i] = Math.hypot(x[i] - comx, y[i] - comy);
    const p90 = this._updateZoom(n);
    const s = this.scale;
    const ox = W / 2 - comx * s;
    const oy = H / 2 - comy * s;

    // Background / trail handling.
    if (this.trails && !this._firstFrame) {
      // Translucent veil leaves glowing tails behind moving particles.
      ctx.fillStyle = 'rgba(5, 6, 12, 0.16)';
      ctx.fillRect(0, 0, W, H);
    } else {
      this._paintBackdrop(ctx, W, H);
      this._firstFrame = false;
    }

    // Faint galactic bulge glow at the centre of mass. Its radius tracks the
    // zoom so it reads as the actual core rather than a fixed blob: tight and
    // bright when the swarm collapses, smaller when the disk spreads out.
    const gr = Math.max(34, Math.min(130, 78 * this.scale));
    const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, gr);
    glow.addColorStop(0, 'rgba(255, 238, 200, 0.18)');
    glow.addColorStop(1, 'rgba(255, 238, 200, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Particles. Colour normalised against the same robust extent used for
    // framing, so the palette stays consistent as the view zooms.
    const invColor = 1 / Math.max(p90 * 0.9, 1);
    const pr = n > 1000 ? 0.9 : 1.25;
    for (let i = 0; i < n; i++) {
      const sx = ox + x[i] * s;
      const sy = oy + y[i] * s;
      if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
      ctx.fillStyle = this._starColor(Math.min(1, rbuf[i] * invColor));
      ctx.beginPath();
      ctx.arc(sx, sy, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    this._drawHud(ctx);
  }

  _paintBackdrop(ctx, W, H) {
    const bg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.04,
      W / 2, H / 2, Math.max(W, H) * 0.85);
    bg.addColorStop(0, '#0a0c16');
    bg.addColorStop(1, '#04050a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    this._drawStars(ctx, W, H);
  }

  _drawStars(ctx, W, H) {
    let s = 987654321 >>> 0;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 110; i++) {
      const x = rng() * W, y = rng() * H, r = rng() * 0.9 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _starColor(t) {
    // Two-stop lerp: CORE→MID for t<0.5, MID→RIM beyond.
    let c0, c1, f;
    if (t < 0.5) { c0 = CORE; c1 = MID; f = t / 0.5; }
    else { c0 = MID; c1 = RIM; f = (t - 0.5) / 0.5; }
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
    const a = this.colorByRadius ? (0.95 - t * 0.45) : 0.85;
    return this.colorByRadius
      ? `rgba(${r}, ${g}, ${b}, ${a})`
      : `rgba(120, 190, 255, ${a})`;
  }

  _drawHud(ctx) {
    const e = this.engine;
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const lines = [
      `N  = ${e.N}`,
      `G  = ${e.G.toFixed(2)}`,
      `ε  = ${e.soft.toFixed(1)}`,
      `t  = ${e.time.toFixed(1)}`,
    ];
    let y = 22;
    for (const ln of lines) { ctx.fillText(ln, 14, y); y += 16; }
  }
}
