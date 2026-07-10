// Kuramoto renderer (Canvas 2D). Two panes: the phase circle — N oscillators
// running around a ring, each a dot coloured by its own natural frequency —
// and, beside it, the two numbers that matter:
//
//   K  the coupling you set
//   r  the coherence the crowd produces
//
// The order parameter is drawn as an arrow from the centre. Its length IS r:
// a stub when the phases cancel, a full radius when they all agree. A faint
// dashed ring marks Kuramoto's predicted r = √(1 − K_c/K); watch the arrow tip
// reach it.

import { t } from './i18n.js';

const COL_SLOW = [95, 176, 255];    // brand blue — slowest oscillators (ω < 0)
const COL_MID  = [232, 233, 238];   // near-zero frequency
const COL_FAST = [255, 174, 69];    // brand amber — fastest (ω > 0)
const COL_ARROW = [120, 255, 214];  // the order parameter, its own bright hue

const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

/** Diverging blue→white→amber by frequency, clamped to ±clip. */
function freqColor(omega, clip) {
  let u = omega / clip;                     // roughly [-1, 1]
  u = Math.max(-1, Math.min(1, u));
  return u < 0 ? lerp(COL_MID, COL_SLOW, -u) : lerp(COL_MID, COL_FAST, u);
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
      const side = Math.min(H - pad * 2, W * 0.58);
      const cx = pad + Math.max(0, (W * 0.58 - side) / 2) + side / 2;
      return {
        disc: { cx, cy: pad + (H - pad * 2) / 2, R: side / 2 * 0.86 },
        panel: { x: W * 0.60, y: pad, w: W - W * 0.60 - pad, h: H - pad * 2 },
        wide: true,
      };
    }
    const side = Math.min(W - pad * 2, H * 0.56);
    return {
      disc: { cx: W / 2, cy: pad + side / 2, R: side / 2 * 0.86 },
      panel: { x: pad, y: pad + side + 6, w: W - pad * 2, h: H - side - pad * 2 - 6 },
      wide: false,
    };
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.W, this.H);

    const g = this._geom();
    this._drawDisc(ctx, g.disc);
    this._drawPanel(ctx, g);
  }

  _drawDisc(ctx, d) {
    const e = this.engine;
    const { cx, cy, R } = d;

    // Guide ring — the circle every phase lives on.
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // Predicted-coherence ring: r = √(1 − K_c/K). The arrow tip should reach it.
    const rTh = e.rTheory;
    if (rTh > 0.001) {
      ctx.save();
      ctx.strokeStyle = rgba(COL_ARROW, 0.30);
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R * rTh, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // The oscillators. Colour by natural frequency; the fastest never lock.
    const clip = 2.2 * e.gamma;
    const th = e.theta, om = e.omega, n = e.n;
    const dotR = Math.max(1.4, Math.min(3.2, 900 / n * 0.18 + 1.4));
    for (let i = 0; i < n; i++) {
      const a = th[i];
      const x = cx + R * Math.cos(a);
      const y = cy - R * Math.sin(a);
      const c = freqColor(om[i], clip);
      ctx.fillStyle = rgba(c, 0.92);
      ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2); ctx.fill();
    }

    // The order parameter, drawn from the centre. Length = r, angle = ψ.
    const r = e.coherence, psi = e.meanPhase;
    const tx = cx + R * r * Math.cos(psi);
    const ty = cy - R * r * Math.sin(psi);
    ctx.save();
    ctx.strokeStyle = rgba(COL_ARROW, 0.95);
    ctx.lineWidth = 3;
    ctx.shadowColor = rgba(COL_ARROW, 0.6);
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = rgba(COL_ARROW, 0.98);
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Centre pip.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();

    // HUD.
    ctx.save();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${e.n} ${t('hud.oscillators')}`, cx - R, cy - R - 6);
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

    const K = e.K, r = e.coherence, Kc = e.Kc, rTh = e.rTheory;
    let y = p.y + top;

    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(t('panel.coupling').toUpperCase(), cx, y);
    y += big * 0.92;
    ctx.font = `600 ${big}px Inter, sans-serif`;
    ctx.fillStyle = K > Kc ? rgba(COL_FAST, 0.96) : 'rgba(255,255,255,0.92)';
    ctx.fillText(K.toFixed(2), cx, y);

    y += big * gap;
    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(t('panel.coherence').toUpperCase(), cx, y);
    y += big * 0.92;
    ctx.font = `600 ${big}px Inter, sans-serif`;
    // Bright when the crowd has locked, dim when it is still noise.
    ctx.fillStyle = r > 0.25 ? rgba(COL_ARROW, 0.97) : 'rgba(255,255,255,0.55)';
    ctx.fillText(r.toFixed(2), cx, y);

    y += small * 2.2;
    ctx.font = `${small}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`${t('panel.threshold')} K_c = ${Kc.toFixed(2)}`, cx, y);

    y += small * 1.7;
    if (rTh > 0.001) {
      ctx.fillStyle = rgba(COL_ARROW, 0.6);
      ctx.fillText(`${t('panel.predicts')} r = ${rTh.toFixed(2)}`, cx, y);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(t('panel.below'), cx, y);
    }

    y += small * 2.4;
    ctx.font = `600 ${small * 1.05}px Inter, sans-serif`;
    const st = e.state;
    ctx.fillStyle = st === 'locked' ? rgba(COL_ARROW, 0.95)
      : st === 'synchronizing' ? rgba(COL_FAST, 0.95)
      : 'rgba(255,255,255,0.45)';
    ctx.fillText(t('state.' + st), cx, y);

    ctx.restore();
  }
}
