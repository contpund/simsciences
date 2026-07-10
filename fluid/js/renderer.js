// Fluid renderer (Canvas 2D). One pane: the channel, painted cell by cell into
// an ImageData and blitted up to the stage. No WebGL — a 300×120 lattice is
// 36 000 pixels, which is nothing.
//
// Three fields, three stories:
//   vorticity  the curl of the velocity. Vortices are the whole point, and
//              only this field makes them visible. Diverging: blue spins one
//              way, amber the other, black is irrotational.
//   speed      |u|. Shows the boundary layer and the wake deficit.
//   pressure   ρ − 1. Shows the stagnation point and the low-pressure cores
//              of the vortices.

import { U0 } from './engine.js';
import { t } from './i18n.js';

const COL_BAR = [42, 47, 62];        // the obstacle
const COL_PROBE = [255, 255, 255];

// Measured on the shipped cylinder at Re = 120:
//   |u|   spans 0.000 … 0.147, free stream 0.0986
//   ρ − 1 spans −0.0268 … +0.021
// The old scales (1.7·U0 and 0.012) put the free stream at 58% of the speed
// ramp — a blinding pale-blue field — and clipped the pressure at twice over.
const VORT_SCALE = 0.09;    // |curl| that saturates the colour ramp
const PRESS_SCALE = 0.030;  // |ρ−1| that saturates
const SPEED_SCALE = 0.150;  // |u| that saturates (1.5·U0)

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

/** Diverging ramp: cool at −1, near-black at 0, warm at +1. Built once into a
 *  512-entry lookup so the per-pixel loop never touches a Math call. */
function buildDiverging(cool, warm) {
  const N = 512, lut = new Uint8Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = (i / (N - 1)) * 2 - 1;            // −1 … +1
    const a = Math.abs(u);
    const c = u < 0 ? cool : warm;
    // ease so the weak field stays dark and the cores stay saturated
    const k = Math.pow(a, 0.75);
    lut[i * 3 + 0] = 8 + (c[0] - 8) * k;
    lut[i * 3 + 1] = 10 + (c[1] - 10) * k;
    lut[i * 3 + 2] = 16 + (c[2] - 16) * k;
  }
  return lut;
}

/** Sequential ramp: near-black → accent → white.
 *
 *  Most of a channel flow sits at the free-stream speed, so a linear ramp
 *  paints almost the whole frame at its brightest colour and the picture
 *  disappears. The gamma pushes the free stream (0.66 of full scale) down to
 *  a dark blue and reserves the bright end for the accelerated flow around
 *  the shoulders — which is the part worth looking at. */
function buildSequential(mid, gamma = 2.4, knee = 0.75) {
  const N = 512, lut = new Uint8Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.pow(i / (N - 1), gamma);
    let r, g, b;
    if (u < knee) {
      const k = u / knee;
      r = 8 + (mid[0] - 8) * k; g = 10 + (mid[1] - 10) * k; b = 16 + (mid[2] - 16) * k;
    } else {
      const k = (u - knee) / (1 - knee);
      r = mid[0] + (255 - mid[0]) * k; g = mid[1] + (255 - mid[1]) * k; b = mid[2] + (255 - mid[2]) * k;
    }
    lut[i * 3 + 0] = r; lut[i * 3 + 1] = g; lut[i * 3 + 2] = b;
  }
  return lut;
}

const LUT_VORT = buildDiverging([95, 176, 255], [255, 174, 69]);
const LUT_PRESS = buildDiverging([95, 176, 255], [255, 82, 82]);
const LUT_SPEED = buildSequential([95, 176, 255]);

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.engine = engine;
    this.mode = 'vorticity';

    // Brush preview: you cannot choose a thickness you cannot see.
    this.brush = 3;
    this.erasing = false;
    this.hover = null;

    this.off = document.createElement('canvas');
    this.off.width = engine.w;
    this.off.height = engine.h;
    this.offCtx = this.off.getContext('2d');
    this.img = this.offCtx.createImageData(engine.w, engine.h);
    this.img.data.fill(255);   // alpha

    this.resize();
  }

  setMode(m) { this.mode = m; }
  setBrush(r) { this.brush = Math.max(0, r | 0); }
  setTool(erasing) { this.erasing = !!erasing; }
  /** Canvas coords of the pointer over the field, or null when it is away. */
  setHover(px, py) { this.hover = (px == null) ? null : { px, py }; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(2, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(2, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = rect.width;
    this.H = rect.height;
  }

  /** The channel, letterboxed to fit the stage without distorting a vortex. */
  _fit() {
    const pad = 14;
    const aw = this.W - pad * 2, ah = this.H - pad * 2;
    const s = Math.min(aw / this.engine.w, ah / this.engine.h);
    const dw = this.engine.w * s, dh = this.engine.h * s;
    return { x: pad + (aw - dw) / 2, y: pad + (ah - dh) / 2, w: dw, h: dh, s };
  }

  /** Canvas coords → lattice cell. y flips: the lattice counts upward. */
  toGrid(px, py) {
    const f = this._fit();
    const gx = Math.floor((px - f.x) / f.s);
    const gy = Math.floor((f.y + f.h - py) / f.s);
    return { x: gx, y: gy };
  }

  hitField(px, py) {
    const f = this._fit();
    return px >= f.x && px <= f.x + f.w && py >= f.y && py <= f.y + f.h;
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.W, this.H);

    this._paintField();
    const f = this._fit();

    ctx.save();
    roundRectPath(ctx, f.x, f.y, f.w, f.h, 8);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.off, f.x, f.y, f.w, f.h);
    if (this.engine.showTracers) this._drawTracers(ctx, f);
    this._drawProbe(ctx, f);
    this._drawBrush(ctx, f);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, f.x, f.y, f.w, f.h, 8);
    ctx.stroke();

    this._drawHud(ctx, f);
  }

  _paintField() {
    const e = this.engine, d = this.img.data, w = e.w, h = e.h;
    const lut = this.mode === 'speed' ? LUT_SPEED : this.mode === 'pressure' ? LUT_PRESS : LUT_VORT;

    // The two outermost cells are forced to equilibrium every step, so the
    // seam between them and the interior carries a sheet of spurious vorticity
    // — a numerical artefact, not a boundary layer. Sample the field from just
    // inside instead of painting the seam.
    const cx = (x) => (x < 2 ? 2 : x > w - 3 ? w - 3 : x);
    const cy = (y) => (y < 2 ? 2 : y > h - 3 ? h - 3 : y);

    for (let y = 0; y < h; y++) {
      // The lattice's +y points up; ImageData's +y points down.
      const row = (h - 1 - y) * w;
      const sy = cy(y);
      for (let x = 0; x < w; x++) {
        const o = (row + x) * 4;
        if (e.barrier[x + y * w]) {
          d[o] = COL_BAR[0]; d[o + 1] = COL_BAR[1]; d[o + 2] = COL_BAR[2];
          continue;
        }
        const sx = cx(x);
        const i = sx + sy * w;
        let u;
        if (this.mode === 'speed') {
          u = Math.min(1, Math.hypot(e.ux[i], e.uy[i]) / SPEED_SCALE);
          const k = (u * 511) | 0;
          d[o] = lut[k * 3]; d[o + 1] = lut[k * 3 + 1]; d[o + 2] = lut[k * 3 + 2];
          continue;
        }
        if (this.mode === 'pressure') u = (e.rho[i] - 1) / PRESS_SCALE;
        else u = e.curl(sx, sy) / VORT_SCALE;
        u = Math.max(-1, Math.min(1, u));
        const k = (((u + 1) / 2) * 511) | 0;
        d[o] = lut[k * 3]; d[o + 1] = lut[k * 3 + 1]; d[o + 2] = lut[k * 3 + 2];
      }
    }
    this.offCtx.putImageData(this.img, 0, 0);
  }

  _drawTracers(ctx, f) {
    const t2 = this.engine.tracers, n = t2.x.length, h = this.engine.h;
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    const r = Math.max(0.7, f.s * 0.32);
    for (let k = 0; k < n; k++) {
      const px = f.x + t2.x[k] * f.s;
      const py = f.y + (h - t2.y[k]) * f.s;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }

  /** Where the shedding frequency is read. Showing it keeps the Strouhal
   *  number from looking like a number the page invented. */
  _drawProbe(ctx, f) {
    const e = this.engine;
    if (!e.D) return;
    const px = f.x + (e.probeX + 0.5) * f.s;
    const py = f.y + (e.h - e.probeY - 0.5) * f.s;
    ctx.save();
    ctx.strokeStyle = `rgba(${COL_PROBE.join(',')},0.55)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - 9, py); ctx.lineTo(px - 6, py);
    ctx.moveTo(px + 6, py); ctx.lineTo(px + 9, py);
    ctx.stroke();
    ctx.restore();
  }

  /** The brush footprint, exactly as engine.paint() will stamp it: a disc of
   *  radius `brush` cells, so the outline sits half a cell beyond the last
   *  cell it will touch. */
  _drawBrush(ctx, f) {
    if (!this.hover) return;
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = this.erasing ? 'rgba(255,82,82,0.75)' : 'rgba(255,174,69,0.75)';
    ctx.beginPath();
    ctx.arc(this.hover.px, this.hover.py, (this.brush + 0.5) * f.s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawHud(ctx, f) {
    const e = this.engine;
    ctx.save();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`Re = ${Math.round(e.effectiveRe)}`, f.x + 12, f.y + 20);

    ctx.font = 'bold 13px Inter, sans-serif';
    const r = e.regime;
    const col = r === 'shedding' ? 'rgba(255,174,69,0.95)'
      : r === 'settling' ? 'rgba(255,255,255,0.45)'
      : 'rgba(95,176,255,0.95)';
    ctx.fillStyle = col;
    ctx.fillText(t('regime.' + r), f.x + 12, f.y + 38);

    // Shedding, but not yet timed: St is genuinely unknown for a moment.
    const st = e.strouhal;
    if (e.isShedding && st != null) {
      ctx.font = '11.5px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(`St = ${st.toFixed(3)}`, f.x + 12, f.y + 54);
    }

    if (e.unstable) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,82,82,0.95)';
      ctx.fillText(t('hud.unstable'), f.x + f.w / 2, f.y + f.h / 2);
    }

    ctx.textAlign = 'center';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillText(t('hud.hint'), f.x + f.w / 2, f.y + f.h + 20 > this.H ? f.y + f.h - 10 : f.y + f.h + 18);
    ctx.restore();
  }
}
