// SIR renderer (Canvas 2D). Two panes: a field of individuals walking around
// and infecting each other, and the epidemic curves those individuals produce.
// The classical ODE solution is overlaid as a faint dashed line, so you can
// watch the crowd drift away from the textbook prediction.
//
// Wide viewports put the panes side by side; narrow ones stack them.

import { S, I, R } from './engine.js';
import { t } from './i18n.js';

const COL_S = [95, 176, 255];    // susceptible — brand blue
const COL_I = [255, 82, 82];     // infected — red
const COL_R = [76, 211, 148];    // recovered — green
const COL_V = [155, 125, 255];   // vaccinated — violet

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** A radial-gradient halo, rendered once into an offscreen canvas. Blitting this
 *  sprite per infected agent is far cheaper than building a gradient each time,
 *  which matters when half the population is red. */
function makeHaloSprite(col, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, rgba(col, 0.30));
  grad.addColorStop(1, rgba(col, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Trace one series through the history, drawing at most ~1400 points. The
 *  history holds 20 samples per simulated day, far more than the chart is
 *  wide, so a stride costs nothing visually and a lot of lineTo calls. */
function tracePath(ctx, samples, key, X, Y) {
  const len = samples.length;
  if (len === 0) return;
  const stride = Math.max(1, Math.ceil(len / 1400));
  let k = 0;
  for (; k < len; k += stride) {
    const p = samples[k];
    const x = X(p.t), y = Y(p[key]);
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  // The stride usually overshoots the final sample; the curve must still reach
  // the present moment or it visibly lags the crowd.
  if (k - stride !== len - 1) {
    const p = samples[len - 1];
    ctx.lineTo(X(p.t), Y(p[key]));
  }
}

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
    this.showTheory = true;
    this.halo = makeHaloSprite(COL_I);
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

  setShowTheory(on) { this.showTheory = !!on; }

  /** Field rect and chart rect, chosen from the aspect ratio. */
  _geom() {
    const W = this.W, H = this.H, pad = 14;
    if (W / H > 1.35) {
      const fieldW = Math.min(H - pad * 2, W * 0.52);
      return {
        field: { x: pad, y: pad, w: fieldW, h: H - pad * 2 },
        chart: { x: pad * 2 + fieldW, y: pad, w: W - fieldW - pad * 3, h: H - pad * 2 },
      };
    }
    const fieldH = H * 0.56;
    return {
      field: { x: pad, y: pad, w: W - pad * 2, h: fieldH - pad * 1.5 },
      chart: { x: pad, y: fieldH + pad * 0.5, w: W - pad * 2, h: H - fieldH - pad * 1.5 },
    };
  }

  draw() {
    const ctx = this.ctx, W = this.W, H = this.H;
    const g = this._geom();

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0c12');
    bg.addColorStop(1, '#05060a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this._drawField(ctx, g.field);
    this._drawChart(ctx, g.chart);
  }

  // ── The crowd ────────────────────────────────────────────────────────────

  _drawField(ctx, f) {
    const e = this.engine;

    ctx.save();
    roundRectPath(ctx, f.x, f.y, f.w, f.h, 10);
    ctx.clip();

    ctx.fillStyle = '#080a10';
    ctx.fillRect(f.x, f.y, f.w, f.h);

    const rBase = Math.max(1.6, Math.min(3.4, f.w / 260));

    // Infection halos first, so dots sit on top of their own glow.
    const hr = rBase * 5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < e.N; i++) {
      if (e.state[i] !== I) continue;
      const px = f.x + e.x[i] * f.w, py = f.y + e.y[i] * f.h;
      ctx.drawImage(this.halo, px - hr, py - hr, hr * 2, hr * 2);
    }
    ctx.restore();

    // Draw susceptible → recovered → infected, so the red stays legible.
    for (const pass of [S, R, I]) {
      for (let i = 0; i < e.N; i++) {
        if (e.state[i] !== pass) continue;
        const col = pass === S ? COL_S : pass === I ? COL_I : (e.isVax[i] ? COL_V : COL_R);
        const px = f.x + e.x[i] * f.w, py = f.y + e.y[i] * f.h;
        ctx.fillStyle = rgba(col, pass === R ? 0.55 : 0.95);
        ctx.beginPath();
        ctx.arc(px, py, pass === I ? rBase * 1.25 : rBase, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, f.x, f.y, f.w, f.h, 10);
    ctx.stroke();

    this._drawFieldHud(ctx, f);
  }

  _drawFieldHud(ctx, f) {
    const e = this.engine;
    ctx.save();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    let y = f.y + 20;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`${t('hud.day')} ${e.time.toFixed(0)}`, f.x + 12, y);
    y += 17;

    const reff = e.Reff;
    ctx.fillStyle = reff >= 1 ? rgba(COL_I, 0.95) : rgba(COL_R, 0.95);
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`Rₑ = ${reff.toFixed(2)}`, f.x + 12, y);

    // The one sentence that explains the whole model.
    ctx.font = '11.5px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fillText(t(reff >= 1 ? 'hud.spreading' : 'hud.dying'), f.x + 12, y + 16);

    if (e.finished) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(t('hud.over'), f.x + f.w / 2, f.y + f.h - 34);
      ctx.font = '12.5px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(t('hud.attack').replace('{p}', (e.attackRate * 100).toFixed(1)),
        f.x + f.w / 2, f.y + f.h - 15);
    }
    ctx.restore();
  }

  // ── The curves ───────────────────────────────────────────────────────────

  _drawChart(ctx, c) {
    const e = this.engine;
    const pad = { l: 44, r: 12, t: 16, b: 26 };
    const px = c.x + pad.l, py = c.y + pad.t;
    const pw = Math.max(10, c.w - pad.l - pad.r);
    const ph = Math.max(10, c.h - pad.t - pad.b);

    const tMax = Math.max(40, e.time * 1.06);
    const X = (t) => px + (t / tMax) * pw;
    const Y = (v) => py + ph - (v / e.N) * ph;

    // Grid + axes.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const v = (e.N * k) / 4;
      const yy = Y(v);
      ctx.beginPath();
      ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy);
      ctx.stroke();
      ctx.fillText(k === 0 ? '0' : `${Math.round(v)}`, px - 7, yy);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(t('chart.days'), px + pw / 2, py + ph + 9);
    ctx.restore();

    if (e.history.length < 2) return;

    // Peak marker: the instant Reff crossed 1 is the instant I(t) turned over.
    if (e.turningPoint !== null) {
      const tx = X(e.turningPoint);
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, py); ctx.lineTo(tx, py + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = tx > px + pw * 0.75 ? 'right' : 'left';
      ctx.fillText('Rₑ = 1', tx + (tx > px + pw * 0.75 ? -5 : 5), py + 9);
      ctx.restore();
    }

    // Theoretical ODE curves — what the classical equations predict.
    if (this.showTheory) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
      for (const [key, col] of [['S', COL_S], ['I', COL_I], ['R', COL_R]]) {
        ctx.beginPath();
        tracePath(ctx, e.odeHistory, key, X, Y);
        ctx.strokeStyle = rgba(col, 0.30);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Measured curves, with a soft fill under the infected one.
    ctx.save();
    ctx.beginPath();
    tracePath(ctx, e.history, 'I', X, Y);
    ctx.lineTo(X(e.history[e.history.length - 1].t), Y(0));
    ctx.lineTo(X(e.history[0].t), Y(0));
    ctx.closePath();
    ctx.fillStyle = rgba(COL_I, 0.13);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 1.9;
    ctx.lineJoin = 'round';
    for (const [key, col] of [['S', COL_S], ['R', COL_R], ['I', COL_I]]) {
      ctx.beginPath();
      tracePath(ctx, e.history, key, X, Y);
      ctx.strokeStyle = rgba(col, 0.95);
      ctx.stroke();
    }

    // Legend. It sits top-left, where the S curve starts, so it rides on a
    // translucent plate rather than fighting the line for contrast.
    ctx.save();
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const items = [
      [COL_S, `S ${e.counts[S]}`],
      [COL_I, `I ${e.counts[I]}`],
      [COL_R, `R ${e.counts[R]}`],
    ];
    const GAP = 26, DOT = 11;
    const total = items.reduce((w, [, label]) => w + DOT + ctx.measureText(label).width + GAP, 0) - GAP;

    const ly = py + 13;
    ctx.fillStyle = 'rgba(8,10,16,0.72)';
    roundRectPath(ctx, px + 2, ly - 11, total + 16, 22, 6);
    ctx.fill();

    let lx = px + 10;
    for (const [col, label] of items) {
      ctx.fillStyle = rgba(col, 0.95);
      ctx.beginPath();
      ctx.arc(lx + 3, ly, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText(label, lx + DOT, ly + 0.5);
      lx += DOT + ctx.measureText(label).width + GAP;
    }
    ctx.restore();
  }
}
