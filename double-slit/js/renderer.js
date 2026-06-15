// Double-slit renderer (Canvas 2D). Left→right layout: a source, the two-slit
// barrier, the flight region, and the detector screen. Photons stream across
// and accumulate on the screen as a brightness strip + a live intensity
// profile that grows into interference fringes. A which-path detector at the
// slits visibly collapses the pattern.

const ELECTRON_COL = [120, 190, 255];
const BALL_COL = [255, 174, 69];

// Approximate visible-spectrum colour for a wavelength in nm (380–720).
function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  let f = 1;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) f = 0.3 + 0.7 * (720 - nm) / 20;
  return [Math.round(255 * r * f), Math.round(255 * g * f), Math.round(255 * b * f)];
}

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.engine = engine;
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

  beamColor() {
    const e = this.engine;
    if (e.mode === 'ball') return BALL_COL;
    if (e.mode === 'electron') return ELECTRON_COL;
    // photon: wavelength → colour (λ 0.4 short/violet … 2.0 long/red)
    const nm = 400 + (e.lambda - 0.4) / (2.0 - 0.4) * (700 - 400);
    return wavelengthRGB(nm);
  }

  // Layout anchors.
  _geom() {
    const W = this.W, H = this.H;
    const cy = H * 0.5;
    return {
      cy,
      xSrc: W * 0.07,
      xBar: W * 0.34,
      xScr: W * 0.84,
      half: H * 0.40,                                  // screen half-height
      gap: H * 0.045 * (0.6 + 0.4 * this.engine.d),    // slit half-separation
    };
  }

  draw() {
    const ctx = this.ctx, W = this.W, H = this.H, e = this.engine;
    const col = this.beamColor();
    const rgb = (a) => `rgba(${col[0]},${col[1]},${col[2]},${a})`;
    const g = this._geom();

    // Background.
    const bg = ctx.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, '#0a0c12');
    bg.addColorStop(1, '#05060a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this._drawWavefronts(ctx, g, col);
    this._drawApparatus(ctx, g, col);
    this._drawFlight(ctx, g, rgb);
    this._drawScreen(ctx, g, col);
    this._drawHud(ctx);
  }

  // Subtle expanding wavefronts from the slits (unobserved only) — the "why".
  _drawWavefronts(ctx, g, col) {
    if (this.engine.observe || this.engine.mode === 'ball') return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.05)`;
    ctx.lineWidth = 1;
    const spacing = 26 + 30 * (this.engine.lambda - 1);
    const phase = (this.engine.time * 40) % spacing;
    const slits = [g.cy - g.gap, g.cy + g.gap];
    const maxR = g.xScr - g.xBar;
    for (const sy of slits) {
      for (let r = phase; r < maxR; r += Math.max(10, spacing)) {
        ctx.beginPath();
        ctx.arc(g.xBar, sy, r, -1.0, 1.0);  // forward-facing arc toward screen
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawApparatus(ctx, g, col) {
    const e = this.engine;
    // Source.
    ctx.save();
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.95)`;
    ctx.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},0.9)`;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(g.xSrc, g.cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Barrier with two slits.
    const slitH = Math.max(6, this.H * 0.02);
    ctx.fillStyle = '#2a2f3e';
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    const bx = g.xBar - 5, bw = 10;
    const segs = [
      [0, g.cy - g.gap - slitH / 2],
      [g.cy - g.gap + slitH / 2, g.cy + g.gap - slitH / 2],
      [g.cy + g.gap + slitH / 2, this.H],
    ];
    for (const [y0, y1] of segs) {
      if (y1 > y0) { ctx.fillRect(bx, y0, bw, y1 - y0); ctx.strokeRect(bx, y0, bw, y1 - y0); }
    }

    // Which-path detectors at the slits when observing.
    if (e.observe && e.mode !== 'ball') {
      for (const sy of [g.cy - g.gap, g.cy + g.gap]) {
        ctx.save();
        ctx.strokeStyle = '#ff5252';
        ctx.fillStyle = 'rgba(255,82,82,0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(g.xBar, sy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Detector screen (vertical line).
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(g.xScr, g.cy - g.half, 2, g.half * 2);
  }

  _drawFlight(ctx, g, rgb) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of this.engine.flight) {
      const sy = g.cy + (pt.slit === 0 ? -g.gap : g.gap);
      const ey = g.cy + pt.u * g.half;
      let x, y;
      if (pt.p < 0.45) {
        const t = pt.p / 0.45;
        x = g.xSrc + (g.xBar - g.xSrc) * t;
        y = g.cy + (sy - g.cy) * t;
      } else {
        const t = (pt.p - 0.45) / 0.55;
        x = g.xBar + (g.xScr - g.xBar) * t;
        y = sy + (ey - sy) * t;
      }
      ctx.fillStyle = rgb(0.9);
      ctx.beginPath();
      ctx.arc(x, y, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Screen brightness strip + live intensity profile + faint theory curve.
  _drawScreen(ctx, g, col) {
    const e = this.engine;
    const bins = e.bins;
    const n = bins.length;
    const invMax = 1 / Math.max(1, e.binsMax);
    const stripW = 12;

    // Brightness strip on the screen plane.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const y = g.cy + u * g.half;
      const b = Math.min(1, bins[i] * invMax * 1.15);
      if (b <= 0.01) continue;
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${b})`;
      ctx.fillRect(g.xScr + 2, y - g.half / n - 0.5, stripW, (g.half * 2) / n + 1);
    }
    ctx.restore();

    // Live histogram profile (counts) growing rightward from the strip.
    const x0 = g.xScr + 2 + stripW + 6;
    const profW = Math.max(40, this.W - x0 - 16);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const y = g.cy + u * g.half;
      const x = x0 + bins[i] * invMax * profW;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.9)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Faint theoretical target pattern (what it converges to).
    let peak = 1e-9;
    const th = new Float64Array(n);
    for (let i = 0; i < n; i++) { th[i] = Math.max(0, e.intensityAt((i / (n - 1)) * 2 - 1)); if (th[i] > peak) peak = th[i]; }
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const y = g.cy + u * g.half;
      const x = x0 + (th[i] / peak) * profW;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawHud(ctx) {
    const e = this.engine;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const lines = [
      `mode = ${e.mode}`,
      `λ = ${e.lambda.toFixed(2)}`,
      `d = ${e.d.toFixed(2)}`,
      `count = ${e.count}`,
    ];
    let y = 22;
    for (const ln of lines) { ctx.fillText(ln, 14, y); y += 16; }
    if (e.observe && e.mode !== 'ball') {
      ctx.fillStyle = 'rgba(255,82,82,0.9)';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('● WATCHING — which path?', 14, y + 4);
    }
  }
}
