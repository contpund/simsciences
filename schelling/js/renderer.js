// Schelling renderer (Canvas 2D). Two panes: the neighbourhood, painted one
// pixel per cell into an ImageData and blitted up with smoothing off so the
// cells stay square; and, beside it, the only two numbers that matter.
//
//   τ  what every agent asks for
//   S  what the neighbourhood delivers
//
// The gap between them is the episode. Putting them side by side, huge, is the
// whole design: no chart can say it better than the two numbers can.

import { EMPTY, A } from './engine.js';
import { t } from './i18n.js';

const COL_EMPTY = [11, 14, 20];
const COL_A = [95, 176, 255];      // brand blue
const COL_B = [255, 174, 69];      // brand amber
const DIM = 0.42;                  // unhappy agents, still restless

const dim = (c) => [c[0] * DIM + 8, c[1] * DIM + 10, c[2] * DIM + 14];
const COL_A_SAD = dim(COL_A);
const COL_B_SAD = dim(COL_B);

const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

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
    this._makeOffscreen();
    this.resize();
  }

  _makeOffscreen() {
    const n = this.engine.n;
    this.off = document.createElement('canvas');
    this.off.width = n;
    this.off.height = n;
    this.offCtx = this.off.getContext('2d');
    this.img = this.offCtx.createImageData(n, n);
    this.img.data.fill(255);   // alpha
    this._offN = n;
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
      const side = Math.min(H - pad * 2, W * 0.58);
      const gx = pad + Math.max(0, (W * 0.58 - side) / 2);
      return {
        grid: { x: gx, y: pad + (H - pad * 2 - side) / 2, w: side, h: side },
        panel: { x: W * 0.60, y: pad, w: W - W * 0.60 - pad, h: H - pad * 2 },
        wide: true,
      };
    }
    const side = Math.min(W - pad * 2, H * 0.56);
    return {
      grid: { x: (W - side) / 2, y: pad, w: side, h: side },
      panel: { x: pad, y: pad + side + 6, w: W - pad * 2, h: H - side - pad * 2 - 6 },
      wide: false,
    };
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.W, this.H);

    if (this.engine.n !== this._offN) this._makeOffscreen();
    this._paintGrid();

    const g = this._geom();
    ctx.save();
    roundRectPath(ctx, g.grid.x, g.grid.y, g.grid.w, g.grid.h, 8);
    ctx.clip();
    // Cells are cells, not a texture: never interpolate between two people.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.off, g.grid.x, g.grid.y, g.grid.w, g.grid.h);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, g.grid.x, g.grid.y, g.grid.w, g.grid.h, 8);
    ctx.stroke();

    this._drawPanel(ctx, g);
    this._drawGridHud(ctx, g.grid);
  }

  _paintGrid() {
    const e = this.engine, d = this.img.data, n = e.n;
    for (let i = 0; i < n * n; i++) {
      const c = e.cells[i];
      let col;
      if (c === EMPTY) col = COL_EMPTY;
      else if (c === A) col = e.happy[i] ? COL_A : COL_A_SAD;
      else col = e.happy[i] ? COL_B : COL_B_SAD;
      const o = i * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2];
    }
    this.offCtx.putImageData(this.img, 0, 0);
  }

  _drawGridHud(ctx, r) {
    const e = this.engine;
    ctx.save();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    // The HUD sits on top of the cells, so it needs its own contrast.
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`${t('hud.round')} ${e.rounds}`, r.x + 10, r.y + 18);
    ctx.fillText(`${(e.unhappyFraction * 100).toFixed(1)} % ${t('hud.unhappy')}`, r.x + 10, r.y + 34);
    ctx.restore();
  }

  /** The two numbers, and nothing else. */
  _drawPanel(ctx, g) {
    const e = this.engine, p = g.panel;
    const cx = p.x + p.w / 2;

    // The type is sized to the room it actually has. In portrait the panel is a
    // short strip under the grid, and a fixed 64 px ran the last two lines off
    // the bottom of the canvas.
    const gap = g.wide ? 0.62 : 0.5;
    const top = g.wide ? p.h * 0.20 : 22;
    const smallOf = (b) => Math.max(11, Math.min(15, b * 0.16));
    const blockH = (b) => top + b * (0.92 + gap + 0.92) + smallOf(b) * 4.4;

    let big = Math.min(p.w * 0.30, g.wide ? 96 : 64);
    while (big > 24 && blockH(big) > p.h - 6) big -= 1;
    const small = smallOf(big);

    ctx.save();
    ctx.textAlign = 'center';

    const asked = e.tau * 100;
    const got = e.segregation * 100;

    let y = p.y + top;

    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(t('panel.asked').toUpperCase(), cx, y);
    y += big * 0.92;
    ctx.font = `600 ${big}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(`${asked.toFixed(0)} %`, cx, y);

    y += big * gap;
    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(t('panel.got').toUpperCase(), cx, y);
    y += big * 0.92;
    ctx.font = `600 ${big}px Inter, sans-serif`;
    // Amber once the neighbourhood has gone further than anyone asked it to.
    ctx.fillStyle = got > asked + 5 ? rgba(COL_B, 0.96) : rgba(COL_A, 0.96);
    // One decimal, matching the sidebar: 99.5% is not 100%, and on a channel
    // that measures everything the hero number must not round a wall into a
    // perfect split.
    ctx.fillText(`${got.toFixed(1)} %`, cx, y);

    y += small * 2.0;
    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(t('panel.baseline'), cx, y);

    y += small * 2.4;
    ctx.font = `600 ${small * 1.05}px Inter, sans-serif`;
    const st = e.state;
    ctx.fillStyle = st === 'restless' ? 'rgba(255,82,82,0.95)'
      : st === 'settled' ? rgba(COL_A, 0.95)
      : 'rgba(255,255,255,0.45)';
    ctx.fillText(t('state.' + st), cx, y);

    ctx.restore();
  }
}
