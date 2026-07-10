// Fourier renderer (Canvas 2D). Two panes: the epicycle chain drawing the
// curve, and the amplitude spectrum |c_n| that feeds it.
//
// The spectrum is the point of the second pane: bars within |n| ≤ N are the
// circles you can see turning; the dimmed bars beyond N are exactly what the
// error readout is measuring. Drag the slider and watch them light up.
//
// Wide viewports put the panes side by side; narrow ones stack them.

import { NMAX } from './engine.js';
import { t } from './i18n.js';

const COL_ACCENT = [95, 176, 255];    // reconstructed curve, kept harmonics
const COL_PEN = [255, 174, 69];       // the pen and its trail
const COL_DROP = [255, 82, 82];       // harmonics thrown away
const COL_GHOST = [255, 255, 255];    // the original path

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function roundRectPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

  _geom() {
    const W = this.W, H = this.H, pad = 14;
    if (W / H > 1.35) {
      const drawW = Math.min(H - pad * 2, W * 0.60);
      return {
        draw: { x: pad, y: pad, w: drawW, h: H - pad * 2 },
        spec: { x: pad * 2 + drawW, y: pad, w: W - drawW - pad * 3, h: H - pad * 2 },
      };
    }
    const drawH = H * 0.66;
    return {
      draw: { x: pad, y: pad, w: W - pad * 2, h: drawH - pad * 1.5 },
      spec: { x: pad, y: drawH + pad * 0.5, w: W - pad * 2, h: H - drawH - pad * 1.5 },
    };
  }

  /** Engine space is the unit disc, maths axes (y up). */
  _frame(d) {
    return { cx: d.x + d.w / 2, cy: d.y + d.h / 2, s: Math.min(d.w, d.h) * 0.38 };
  }
  _toScreen(f, x, y) { return [f.cx + x * f.s, f.cy - y * f.s]; }

  /** Canvas coords → engine coords. Used by the drawing tool. */
  toEngine(px, py) {
    const f = this._frame(this._geom().draw);
    return { x: (px - f.cx) / f.s, y: -(py - f.cy) / f.s };
  }

  /** Is this canvas point inside the drawing pane? */
  hitDrawArea(px, py) {
    const d = this._geom().draw;
    return px >= d.x && px <= d.x + d.w && py >= d.y && py <= d.y + d.h;
  }

  draw() {
    const ctx = this.ctx, W = this.W, H = this.H;
    const g = this._geom();

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0c12');
    bg.addColorStop(1, '#05060a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this._drawPane(ctx, g.draw);
    this._drawSpectrum(ctx, g.spec);
  }

  // ── Epicycles ─────────────────────────────────────────────────────────────

  _drawPane(ctx, d) {
    const e = this.engine;
    const f = this._frame(d);

    ctx.save();
    roundRectPath(ctx, d.x, d.y, d.w, d.h, 10);
    ctx.clip();
    ctx.fillStyle = '#080a10';
    ctx.fillRect(d.x, d.y, d.w, d.h);

    // A stroke in progress: show the raw ink, nothing else.
    if (e.isDrawing && e.ink && e.ink.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < e.ink.length; i++) {
        const [sx, sy] = [e.ink[i].px, e.ink[i].py];
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = rgba(COL_PEN, 0.95);
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
      this._paneFrame(ctx, d);
      this._drawHint(ctx, d);
      return;
    }

    if (e.path.length) {
      if (e.showOriginal) this._strokeOriginal(ctx, f);
      this._strokeRecon(ctx, f);
      if (e.showCircles) this._strokeChain(ctx, f);
      this._strokeTrail(ctx, f);
    }

    ctx.restore();
    this._paneFrame(ctx, d);
    this._drawHud(ctx, d);
    this._drawHint(ctx, d);
  }

  _paneFrame(ctx, d) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, d.x, d.y, d.w, d.h, 10);
    ctx.stroke();
  }

  _strokeOriginal(ctx, f) {
    const p = this.engine.path;
    ctx.beginPath();
    for (let i = 0; i < p.length; i++) {
      const [sx, sy] = this._toScreen(f, p[i].x, p[i].y);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(COL_GHOST, 0.20);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _strokeRecon(ctx, f) {
    const e = this.engine, n = e.reconRe.length;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const [sx, sy] = this._toScreen(f, e.reconRe[k], e.reconIm[k]);
      if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.strokeStyle = rgba(COL_ACCENT, 0.30);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  /** The bright segment just behind the pen — the "it is drawing it" feel. */
  _strokeTrail(ctx, f) {
    const e = this.engine;
    const { end, len, total } = e.trailRange();
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const k = (end - len + 1 + i + total * 2) % total;
      const [sx, sy] = this._toScreen(f, e.reconRe[k], e.reconIm[k]);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = rgba(COL_PEN, 0.95);
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // The pen itself.
    const chain = e.chain();
    const tip = chain[chain.length - 1];
    const [px, py] = this._toScreen(f, tip.x, tip.y);
    ctx.save();
    ctx.shadowColor = rgba(COL_PEN, 0.9);
    ctx.shadowBlur = 14;
    ctx.fillStyle = rgba(COL_PEN, 1);
    ctx.beginPath();
    ctx.arc(px, py, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _strokeChain(ctx, f) {
    const chain = this.engine.chain();
    ctx.lineWidth = 1;

    // Circles, faint. Skip the ones too small to read.
    ctx.strokeStyle = rgba(COL_GHOST, 0.11);
    for (let i = 0; i < chain.length - 1; i++) {
      const c = chain[i], nx = chain[i + 1];
      const r = Math.hypot(nx.x - c.x, nx.y - c.y) * f.s;
      if (r < 1.2) continue;
      const [sx, sy] = this._toScreen(f, c.x, c.y);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radii, tip to tail.
    ctx.beginPath();
    for (let i = 0; i < chain.length; i++) {
      const [sx, sy] = this._toScreen(f, chain[i].x, chain[i].y);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = rgba(COL_ACCENT, 0.55);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  _drawHud(ctx, d) {
    const e = this.engine;
    ctx.save();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`${e.circles} ${t('hud.circles')}`, d.x + 12, d.y + 20);
    ctx.font = 'bold 13px Inter, sans-serif';
    const err = e.error;
    ctx.fillStyle = err < 1 ? rgba(COL_ACCENT, 0.95) : rgba(COL_DROP, 0.95);
    ctx.fillText(`${t('hud.error')} ${err.toFixed(1)} %`, d.x + 12, d.y + 38);
    ctx.restore();
  }

  _drawHint(ctx, d) {
    if (this.engine.isDrawing) return;
    ctx.save();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillText(t('hud.hint'), d.x + d.w / 2, d.y + d.h - 14);
    ctx.restore();
  }

  // ── Spectrum ──────────────────────────────────────────────────────────────

  _drawSpectrum(ctx, s) {
    const e = this.engine;
    if (!e.path.length) return;
    const pad = { l: 44, r: 14, t: 30, b: 32 };
    const px = s.x + pad.l, py = s.y + pad.t;
    const pw = Math.max(10, s.w - pad.l - pad.r);
    const ph = Math.max(10, s.h - pad.t - pad.b);

    // Biggest bar sets the scale; the n = 0 offset is ~0 after centring.
    let maxA = 1e-12;
    for (let n = -NMAX; n <= NMAX; n++) {
      if (n === 0) continue;
      const a = e.ampAt(n);
      if (a > maxA) maxA = a;
    }

    // The spectrum of a real shape collapses fast: |c_n| ~ 1/n² for a square,
    // ~1/n³ for a smooth curve. On a linear axis spanning ±200 everything but
    // the fundamental is a sub-pixel smear. So: log amplitude over DECADES
    // decades, and an x range that follows the slider instead of the maximum.
    const DECADES = 3;
    const xMax = Math.min(NMAX, Math.max(12, Math.ceil(e.N * 1.35)));
    const count = 2 * xMax + 1;
    const bw = pw / count;
    const X = (n) => px + (n + xMax) * bw;
    const Y = (a) => {
      const rel = a / maxA;
      if (!(rel > 0)) return null;
      const u = 1 + Math.log10(rel) / DECADES;   // 1 at the peak, 0 at the floor
      return u <= 0 ? null : py + ph - u * ph;
    };

    ctx.save();
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(t('spec.title'), s.x + 4, s.y + 14);
    ctx.restore();

    // Decade gridlines.
    ctx.save();
    ctx.font = '9.5px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let d = 0; d <= DECADES; d++) {
      const yy = py + (d / DECADES) * ph;
      ctx.strokeStyle = d === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(['1', '10⁻¹', '10⁻²', '10⁻³'][d] ?? `1e-${d}`, px - 6, yy);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.moveTo(px, py + ph); ctx.lineTo(px + pw, py + ph);
    ctx.stroke();
    ctx.restore();

    // Bars. A harmonic below the floor simply is not drawn — which is exactly
    // how the symmetry gaps become visible (a square has energy only at
    // n ≡ 1 mod 4, a five-pointed star only at n ≡ 1 mod 5).
    const w = Math.max(1, Math.min(bw * 0.72, 9));
    for (let n = -xMax; n <= xMax; n++) {
      if (n === 0) continue;
      const yTop = Y(e.ampAt(n));
      if (yTop === null) continue;
      const kept = Math.abs(n) <= e.N;
      ctx.fillStyle = kept ? rgba(COL_ACCENT, 0.85) : rgba(COL_DROP, 0.42);
      ctx.fillRect(X(n) - w / 2, yTop, w, py + ph - yTop);
    }

    // The cutoff, |n| = N — the line the slider is really moving.
    if (e.N < xMax) {
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      for (const n of [-e.N, e.N]) {
        const x = X(n);
        ctx.beginPath();
        ctx.moveTo(x, py); ctx.lineTo(x, py + ph);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`|n| = ${e.N}`, X(e.N) + 4, py + 2);
      ctx.restore();
    }

    ctx.save();
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const n of [-xMax, 0, xMax]) ctx.fillText(String(n), X(n), py + ph + 7);
    ctx.fillText(t('spec.axis'), px + pw / 2, py + ph + 19);
    ctx.restore();
  }
}
