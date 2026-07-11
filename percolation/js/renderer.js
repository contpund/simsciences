// Percolation renderer (Canvas 2D). Two panes: the rock — an L×L lattice of
// sites, closed sites dark, open pores slate, water sweeping down from the top
// — and, beside it, the two numbers that matter:
//
//   p      the porosity you set
//   depth  how far down the water actually got
//
// The lattice is painted into an ImageData at one pixel per site, then scaled
// up with image smoothing off, so every site stays a crisp square at any grid
// size. A toggle recolours the open sites by cluster instead: every connected
// pocket its own hue, the largest in amber — big is not the same as through.

import { t } from './i18n.js';
import { P_C } from './engine.js';

const COL_ROCK = [10, 12, 18];       // closed sites — the rock itself
const COL_PORE = [46, 52, 68];       // open, still dry
const COL_WATER = [95, 176, 255];    // brand blue — freshly wet
const COL_DEEP = [120, 255, 214];    // the through-glow once it breaks
const COL_LARGEST = [255, 174, 69];  // brand amber — largest cluster
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/** Muted, stable palette for the cluster view: hue from the cluster root. */
function clusterColor(root) {
  const h = (root * 0.61803398875) % 1;
  const s = 0.42, v = 0.62;
  const i = (h * 6) | 0, f = h * 6 - i;
  const q = v * (1 - s * f), pp = v * (1 - s), tt = v * (1 - s * (1 - f));
  const rgb = [[v, tt, pp], [q, v, pp], [pp, v, tt], [pp, q, v], [tt, pp, v], [v, pp, q]][i % 6];
  return [rgb[0] * 255, rgb[1] * 255, rgb[2] * 255];
}

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.engine = engine;
    this.showClusters = false;
    this.frame = 0;
    this._cell = document.createElement('canvas');
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
    const W = this.W, H = this.H, pad = 16;
    // Room above the lattice for the inlet bar, below for the outlet bar.
    const bars = 14;
    if (W / H > 1.35) {
      const side = Math.min(H - pad * 2 - bars * 2, W * 0.58);
      const gx = pad + Math.max(0, (W * 0.58 - side) / 2);
      return {
        grid: { x: gx, y: pad + bars + (H - pad * 2 - bars * 2 - side) / 2, s: side },
        panel: { x: W * 0.62, y: pad, w: W - W * 0.62 - pad, h: H - pad * 2 },
        bars, wide: true,
      };
    }
    const side = Math.min(W - pad * 2, H * 0.62 - bars * 2);
    return {
      grid: { x: (W - side) / 2, y: pad + bars, s: side },
      panel: { x: pad, y: pad + bars * 2 + side + 8, w: W - pad * 2, h: H - side - bars * 2 - pad * 2 - 8 },
      bars, wide: false,
    };
  }

  draw() {
    this.frame++;
    const ctx = this.ctx;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.W, this.H);
    const g = this._geom();
    this._drawGrid(ctx, g);
    this._drawPanel(ctx, g);
  }

  _drawGrid(ctx, g) {
    const e = this.engine, L = e.L;
    const { x, y, s } = g.grid;

    // Paint the lattice at 1px per site.
    if (this._cell.width !== L) { this._cell.width = L; this._cell.height = L; }
    const cctx = this._cell.getContext('2d');
    const img = cctx.createImageData(L, L);
    const d = img.data;
    const pulse = 0.5 + 0.5 * Math.sin(this.frame * 0.06);
    const perc = e.percolated;
    const maxDepth = Math.max(1, e.depthReached);
    const front = e.pourDone ? -2 : maxDepth;

    for (let i = 0; i < L * L; i++) {
      let c;
      if (!e.open[i]) c = COL_ROCK;
      else if (this.showClusters) {
        const root = e.clusterRoot(i);
        c = root === e.largestRoot ? COL_LARGEST : clusterColor(root);
      } else if (e.wet[i] >= 0) {
        // Water: brand blue, warming toward the through-glow with depth once
        // it has broken out — the winning path lights up whole.
        const u = Math.min(1, ((i / L) | 0) / maxDepth);
        c = perc ? lerp(COL_WATER, COL_DEEP, u * (0.55 + 0.45 * pulse))
                 : lerp(lerp(COL_PORE, COL_WATER, 0.85), COL_WATER, u);
        // The advancing front glints.
        if (!e.pourDone && ((i / L) | 0) >= front - 1) c = lerp(c, [235, 245, 255], 0.35 + 0.3 * pulse);
      } else c = COL_PORE;
      const o = i * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    cctx.putImageData(img, 0, 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._cell, x, y, s, s);
    ctx.restore();

    // Frame around the rock.
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, s + 1, s + 1);

    // Inlet bar: the reservoir the pour starts from.
    ctx.fillStyle = rgba(COL_WATER, 0.75);
    ctx.fillRect(x, y - g.bars + 2, s, g.bars - 6);

    // Outlet bar: dark until the day the water actually arrives.
    if (e.percolated) {
      ctx.save();
      ctx.shadowColor = rgba(COL_DEEP, 0.9);
      ctx.shadowBlur = 14 + 10 * pulse;
      ctx.fillStyle = rgba(COL_DEEP, 0.8 + 0.2 * pulse);
      ctx.fillRect(x, y + s + 4, s, g.bars - 6);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, y + s + 4, s, g.bars - 6);
    }

    // HUD.
    ctx.save();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${L} × ${L} ${t('hud.sites')}`, x, y - g.bars - 4 < 10 ? y + 14 : y - g.bars - 4);
    ctx.restore();
  }

  /** The two numbers, and the threshold between them. */
  _drawPanel(ctx, g) {
    const e = this.engine, p = g.panel;
    const cx = p.x + p.w / 2;

    const gap = g.wide ? 0.60 : 0.48;
    const top = g.wide ? p.h * 0.16 : 20;
    const smallOf = (b) => Math.max(11, Math.min(15, b * 0.16));
    const blockH = (b) => top + b * (0.92 + gap + 0.92) + smallOf(b) * 5.2;

    let big = Math.min(p.w * 0.30, g.wide ? 92 : 62);
    while (big > 22 && blockH(big) > p.h - 6) big -= 1;
    const small = smallOf(big);

    ctx.save();
    ctx.textAlign = 'center';

    let y = p.y + top;
    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(t('panel.porosity').toUpperCase(), cx, y);
    y += big * 0.92;
    ctx.font = `600 ${big}px Inter, sans-serif`;
    ctx.fillStyle = e.p > P_C ? rgba(COL_LARGEST, 0.96) : 'rgba(255,255,255,0.92)';
    ctx.fillText(e.p.toFixed(3), cx, y);

    y += big * gap;
    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(t('panel.depth').toUpperCase(), cx, y);
    y += big * 0.92;
    ctx.font = `600 ${big}px Inter, sans-serif`;
    const df = e.depthFraction;
    ctx.fillStyle = e.percolated ? rgba(COL_DEEP, 0.97)
      : df > 0.5 ? rgba(COL_WATER, 0.95) : 'rgba(255,255,255,0.55)';
    ctx.fillText(`${Math.round(df * 100)}%`, cx, y);

    y += small * 2.2;
    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`${t('panel.threshold')} p_c = ${P_C.toFixed(4)}`, cx, y);

    y += small * 1.7;
    if (e.breakthroughP !== null) {
      ctx.fillStyle = rgba(COL_DEEP, 0.6);
      ctx.fillText(`${t('panel.broke')} p = ${e.breakthroughP.toFixed(3)}`, cx, y);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(t('panel.nobreak'), cx, y);
    }

    y += small * 2.4;
    ctx.font = `600 ${small * 1.05}px Inter, sans-serif`;
    const st = e.state;
    ctx.fillStyle = st === 'percolates' ? rgba(COL_DEEP, 0.95)
      : st === 'pouring' ? rgba(COL_WATER, 0.95)
      : 'rgba(255,255,255,0.45)';
    ctx.fillText(t('state.' + st), cx, y);

    ctx.restore();
  }
}
