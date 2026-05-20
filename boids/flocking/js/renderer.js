// Canvas renderer — "mini video-game" look. Procedural flapping birds, a
// raptor predator, feather trails, flee sparks, a flock-following spotlight,
// and a game HUD. Pure Canvas 2D. Simulation logic untouched.
//
// Performance: live bird shapes (which contain 3 gradient allocations each)
// are pre-rendered into a (density × flap) sprite cache; per-frame draws
// become drawImage blits. Particles use a fixed-size pool with in-place
// compaction; trails use per-boid ring buffers — no per-frame allocations.

const BG = '#0d0d0f';
const DENSE_AT = 14;        // neighbor count mapped to the warm end
const DPR_CAP = 1.5;        // cap device pixel ratio for fill-rate headroom
const TAU = Math.PI * 2;
const PARTICLE_CAP = 200;

// --- Photorealistic assets -------------------------------------------------
// Top-down photo sprites (starling, hawk, agricultural ground) loaded once
// at module init. _drawBird / _drawRaptor / _paintAmbiance blit these when
// available; while images are still loading the renderer falls back to its
// procedural shapes (see _drawBirdShape below) so first paint is never blank.
const PHOTO_BIRD_PX = 28;     // displayed bird size in logical px
const PHOTO_PRED_PX = 78;     // displayed predator size in logical px
const ASSET_BASE = new URL('../sprites/', import.meta.url).href;
const STARLING_IMG = new Image();
const HAWK_IMG = new Image();
const GROUND_IMG = new Image();
STARLING_IMG.src = ASSET_BASE + 'starling.png';
HAWK_IMG.src     = ASSET_BASE + 'hawk.png';
GROUND_IMG.src   = ASSET_BASE + 'ground.jpg';

// Sprite-cache bucketing. 8×16 = 128 lazy sprites max (≈ 4 MB worst case
// at 96×96 RGBA), but in practice only the visited buckets are created.
const DENSITY_BUCKETS = 8;
const FLAP_BUCKETS = 16;
const FLAP_RANGE = 1.6;     // max |flap| ≈ maxSpeed * 0.2 with maxSpeed=8
const SPRITE_SIZE = 48;     // logical px box around a bird with wings extended
const SPRITE_HALF = SPRITE_SIZE / 2;
const SPRITE_OVERSAMPLE = 2;

// Density color stops (sRGB). body + wing + belly per tier.
const TIER = {
  iso:  { body: [179, 229, 252], wing: [79, 195, 247], belly: [225, 245, 254] },
  mid:  { body: [77, 182, 172],  wing: [38, 198, 166], belly: [178, 223, 219] },
  dense:{ body: [255, 204, 128], wing: [255, 183, 77], belly: [255, 248, 225] },
};

const lerp = (a, b, t) => a + (b - a) * t;
const lerpC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c, a) => (a == null
  ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
  : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
const darken = (c, f = 0.7) => [c[0] * f, c[1] * f, c[2] * f];

export class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.engine = engine;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.showVision = false;

    this._fps = 60;
    this._spot = { x: 0, y: 0 };
    this._predatorPhase = Math.random() * TAU;
    this._predActive = false;
    this._bannerStart = -1e9;
    this._bannerUntil = -1e9;
    this._survivalStart = 0;
    this._lastT = performance.now();
    this.obstacleCursor = null;

    // ---- Color table (built once) and sprite cache (lazy) ------------------
    this._colorTable = new Array(DENSITY_BUCKETS);
    for (let i = 0; i < DENSITY_BUCKETS; i++) {
      const d = (i + 0.5) / DENSITY_BUCKETS;
      this._colorTable[i] = this._buildDensityColor(d);
    }
    this._spriteCache = new Array(DENSITY_BUCKETS * FLAP_BUCKETS); // lazy

    // ---- Particle pool (fixed size, in-place compaction) -------------------
    this._particles = new Array(PARTICLE_CAP);
    for (let i = 0; i < PARTICLE_CAP; i++) {
      this._particles[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, warm: false };
    }
    this._particleCount = 0;

    // The old DOM overlay is replaced by the on-canvas game HUD.
    const dom = document.querySelector('.overlay');
    if (dom) dom.style.display = 'none';

    this.resize();
    this._spot = { x: this.w / 2, y: this.h / 2 };
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
    this.engine.resize(cssW, cssH);
    this.ctx.fillStyle = BG;
    this.ctx.fillRect(0, 0, cssW, cssH);
  }

  // ---- Main frame ----------------------------------------------------------

  draw() {
    const ctx = this.ctx;
    const now = Date.now();
    const t = performance.now();
    let dt = t - this._lastT;
    this._lastT = t;
    if (dt > 100) dt = 100; // clamp after tab stalls

    const boids = this.engine.boids;
    const pred = this.engine.predator;
    const vision = this.engine.params.visionRadius;
    const visionSq = vision * vision;

    this._followFlock(boids);
    this._paintAmbiance(ctx);

    this._drawObstacles(ctx);

    // Birds + flee-spark emission in one pass over the flock.
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      this._drawBird(ctx, b, now);
      if (pred) {
        const dx = b.x - pred.x;
        const dy = b.y - pred.y;
        if (dx * dx + dy * dy < visionSq && Math.random() < 0.07) {
          this._emitSparks(b);
        }
      }
    }

    this._updateAndDrawParticles(ctx, dt);

    if (pred) this._drawRaptor(ctx, pred, now);
    if (this.showVision) this._drawVision(ctx);

    this._trackPredator(!!pred, now);
    this._drawHUD(ctx, boids.length, !!pred, now);
  }

  // ---- Ambiance: flock-following spotlight + trail fade --------------------

  _followFlock(boids) {
    if (!boids.length) return;
    let mx = 0, my = 0;
    for (let i = 0; i < boids.length; i++) { mx += boids[i].x; my += boids[i].y; }
    mx /= boids.length; my /= boids.length;
    this._spot.x += (mx - this._spot.x) * 0.02;
    this._spot.y += (my - this._spot.y) * 0.02;
  }

  _paintAmbiance(ctx) {
    // Per-frame clear: paint the photo ground (covers full canvas) then a
    // soft dark vignette at the corners so the boids stay legible.
    ctx.globalCompositeOperation = 'source-over';
    if (GROUND_IMG.complete && GROUND_IMG.naturalWidth) {
      ctx.drawImage(GROUND_IMG, 0, 0, this.w, this.h);
    } else {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    // Vignette — darker at corners, transparent in the central zone where
    // the flock typically sits. Keeps the photo visible but unobtrusive.
    const cx = this.w / 2, cy = this.h / 2;
    const r = Math.max(this.w, this.h) * 0.7;
    const v = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  // ---- Sprite cache -------------------------------------------------------

  _buildDensityColor(d) {
    let body, wing, belly;
    if (d < 0.5) {
      const t = d / 0.5;
      body = lerpC(TIER.iso.body, TIER.mid.body, t);
      wing = lerpC(TIER.iso.wing, TIER.mid.wing, t);
      belly = lerpC(TIER.iso.belly, TIER.mid.belly, t);
    } else {
      const t = (d - 0.5) / 0.5;
      body = lerpC(TIER.mid.body, TIER.dense.body, t);
      wing = lerpC(TIER.mid.wing, TIER.dense.wing, t);
      belly = lerpC(TIER.mid.belly, TIER.dense.belly, t);
    }
    return { body, wing, belly, line: darken(body, 0.7) };
  }

  _dBucket(n) {
    const d = n / DENSE_AT;
    const b = (d * DENSITY_BUCKETS) | 0;
    return b < 0 ? 0 : b >= DENSITY_BUCKETS ? DENSITY_BUCKETS - 1 : b;
  }

  _fBucket(flap) {
    const t = (flap + FLAP_RANGE) / (2 * FLAP_RANGE);
    const b = (t * FLAP_BUCKETS) | 0;
    return b < 0 ? 0 : b >= FLAP_BUCKETS ? FLAP_BUCKETS - 1 : b;
  }

  _fBucketToFlap(fB) {
    return -FLAP_RANGE + ((fB + 0.5) / FLAP_BUCKETS) * 2 * FLAP_RANGE;
  }

  _getSprite(dB, fB) {
    const key = dB * FLAP_BUCKETS + fB;
    let sprite = this._spriteCache[key];
    if (sprite) return sprite;

    sprite = document.createElement('canvas');
    sprite.width = SPRITE_SIZE * SPRITE_OVERSAMPLE;
    sprite.height = SPRITE_SIZE * SPRITE_OVERSAMPLE;
    const sctx = sprite.getContext('2d');
    // Logical origin at sprite center; one logical px = SPRITE_OVERSAMPLE backing px.
    sctx.setTransform(
      SPRITE_OVERSAMPLE, 0, 0, SPRITE_OVERSAMPLE,
      SPRITE_HALF * SPRITE_OVERSAMPLE,
      SPRITE_HALF * SPRITE_OVERSAMPLE);
    this._drawBirdShape(sctx, this._colorTable[dB], this._fBucketToFlap(fB));
    this._spriteCache[key] = sprite;
    return sprite;
  }

  // ---- Birds (sprite blit) ------------------------------------------------

  _drawBird(ctx, b, now) {
    // If the photoreal starling sprite has loaded, blit it with a subtle
    // wing-flap squish (scale_y oscillates with the existing flap phase).
    // The original head-pointing-up sprite needs an extra +PI/2 rotation
    // since the engine's heading vector is along +x in canvas space.
    if (STARLING_IMG.complete && STARLING_IMG.naturalWidth) {
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      const phase = b.phase || ((b.x * 0.1) % TAU);
      // 0.85 .. 1.0 — gentle vertical squish, never inverts.
      const flap = 0.92 + 0.08 * Math.sin(phase + now * 0.012);
      const size = PHOTO_BIRD_PX;
      const half = size / 2;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.scale(1, flap);
      ctx.drawImage(STARLING_IMG, -half, -half, size, size);
      ctx.restore();
      return;
    }
    // Fallback — original procedural sprite cache.
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    const phase = b.phase || ((b.x * 0.1) % TAU);
    const flap = Math.sin(phase + now * 0.006) * (speed * 0.2);
    const sprite = this._getSprite(this._dBucket(b.n), this._fBucket(flap));
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.drawImage(sprite, -SPRITE_HALF, -SPRITE_HALF, SPRITE_SIZE, SPRITE_SIZE);
    ctx.restore();
  }

  // Path-and-gradient shape — called only at sprite-cache misses (≤128 total).
  _drawBirdShape(ctx, c, flap) {
    const wingY = 2;
    const tipY = 9;
    const tipDY = flap * 6;

    // Ailes
    for (const s of [1, -1]) {
      const wingGrad = ctx.createLinearGradient(0, wingY * s, 0, (tipY + tipDY) * s);
      wingGrad.addColorStop(0, `rgba(${c.wing[0]|0},${c.wing[1]|0},${c.wing[2]|0},0.2)`);
      wingGrad.addColorStop(1, `rgba(${c.wing[0]|0},${c.wing[1]|0},${c.wing[2]|0},1)`);

      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.moveTo(3, wingY * s);
      ctx.lineTo(-3, wingY * s);
      ctx.quadraticCurveTo(-2, (tipY + tipDY) * s, -5, (tipY + tipDY) * s);
      ctx.quadraticCurveTo(1, (tipY + tipDY * 0.5) * s, 3, wingY * s);
      ctx.fill();
    }

    // Queue
    ctx.strokeStyle = `rgba(${c.wing[0]|0},${c.wing[1]|0},${c.wing[2]|0},1)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-10.8, 1);
    ctx.moveTo(-7, 0);
    ctx.lineTo(-10.8, -1);
    ctx.stroke();

    // Corps
    const bodyGrad = ctx.createLinearGradient(0, -2.5, 0, 2.5);
    bodyGrad.addColorStop(0, rgb(c.body));
    bodyGrad.addColorStop(1, rgb(c.belly));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.bezierCurveTo(7, 2.5, 0, 2.5, -7, 0);
    ctx.bezierCurveTo(0, -2.5, 7, -2.5, 7, 0);
    ctx.fill();

    // Tête
    ctx.fillStyle = rgb(c.body);
    ctx.beginPath();
    ctx.arc(8, 0, 2.5, 0, TAU);
    ctx.fill();

    // Bec
    ctx.strokeStyle = rgb(c.belly);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10.5, 0);
    ctx.lineTo(12.5, 0);
    ctx.stroke();

    // Contour
    ctx.strokeStyle = `rgba(${c.line[0]|0},${c.line[1]|0},${c.line[2]|0},0.4)`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.bezierCurveTo(7, 2.5, 0, 2.5, -7, 0);
    ctx.bezierCurveTo(0, -2.5, 7, -2.5, 7, 0);
    ctx.stroke();
  }

  // ---- Raptor predator -----------------------------------------------------

  _drawRaptor(ctx, p, now) {
    // Photoreal hawk sprite if loaded, with subtle scale-Y flap.
    if (HAWK_IMG.complete && HAWK_IMG.naturalWidth) {
      const angle = Math.atan2(p.vy, p.vx);
      const phase = p.phase || ((p.x * 0.1) % TAU);
      // Slow, dramatic flap — bigger amplitude than prey.
      const flap = 0.85 + 0.15 * Math.sin(phase + now * 0.008);
      const size = PHOTO_PRED_PX;
      const half = size / 2;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.scale(1, flap);
      ctx.drawImage(HAWK_IMG, -half, -half, size, size);
      ctx.restore();
      return;
    }
    // Fallback — original procedural raptor.
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const angle = Math.atan2(p.vy, p.vx);
    const phase = p.phase || ((p.x * 0.1) % TAU);
    const flap = Math.sin(phase + now * 0.005) * 0.6;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.scale(1, 1);

    const body = '#4e342e';
    const belly = '#a1887f';
    const wingTop = '#5d4037';
    const gold = '#fdd835';

    // Queue en éventail
    ctx.strokeStyle = wingTop;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.17;
      ctx.moveTo(-10, 0);
      ctx.lineTo(-10 - 6 * Math.cos(a), 6 * Math.sin(a));
    }
    ctx.stroke();

    // Ailes en W
    ctx.fillStyle = wingTop;
    for (const s of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(2, 4 * s);
      const elbowX = 2 + flap * 3;
      const elbowY = 12 * s;
      ctx.quadraticCurveTo(5, 8 * s, elbowX, elbowY);
      const tipX = -6 - flap * 6;
      const tipY = 25 * s;
      ctx.quadraticCurveTo(0, 18 * s, tipX, tipY);
      ctx.lineTo(-8, 14 * s);
      ctx.lineTo(-5, 4 * s);
      ctx.fill();

      // Doigts
      ctx.strokeStyle = wingTop;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        ctx.moveTo(tipX, tipY);
        const dx = -2 - j;
        const dy = (3 + j) * s;
        ctx.lineTo(tipX + dx, tipY + dy);
      }
      ctx.stroke();
    }

    // Corps
    const grad = ctx.createLinearGradient(0, -4, 0, 4);
    grad.addColorStop(0, body);
    grad.addColorStop(1, belly);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.bezierCurveTo(10, 4, 3, 4, -10, 0);
    ctx.bezierCurveTo(3, -4, 10, -4, 10, 0);
    ctx.fill();

    // Tête
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(10, 0, 5, 0, TAU);
    ctx.fill();

    // Bec
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(14, -1.5);
    ctx.lineTo(19, 0);
    ctx.quadraticCurveTo(17, 3, 14, 1.5);
    ctx.fill();

    // Serres
    if (speed < 2) {
      ctx.strokeStyle = gold;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const s of [1, -1]) {
        ctx.moveTo(0, 3 * s);
        ctx.quadraticCurveTo(2, 5 * s, 1, 6 * s);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // ---- Flee particles (fixed-size pool, in-place compaction) --------------

  _emitSparks(b) {
    let n = 2 + (Math.random() < 0.5 ? 1 : 0);
    while (n-- > 0 && this._particleCount < PARTICLE_CAP) {
      const p = this._particles[this._particleCount++];
      const a = Math.random() * TAU;
      const sp = 0.6 + Math.random() * 1.2;
      p.x = b.x; p.y = b.y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.life = 500; p.max = 500;
      p.warm = Math.random() < 0.5;
    }
  }

  _updateAndDrawParticles(ctx, dt) {
    if (this._particleCount === 0) return;
    ctx.globalCompositeOperation = 'lighter';
    const ps = this._particles;
    let w = 0;
    for (let r = 0; r < this._particleCount; r++) {
      const p = ps[r];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx;
      p.y += p.vy;
      const a = p.life / p.max;
      const rad = 0.6 + a * 1.8;
      ctx.fillStyle = p.warm
        ? `rgba(255, 224, 130, ${a})`
        : `rgba(255, 255, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, TAU);
      ctx.fill();
      if (w !== r) {              // compact by swapping pool slots (refs only)
        const tmp = ps[w];
        ps[w] = p;
        ps[r] = tmp;
      }
      w++;
    }
    this._particleCount = w;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- Kept features -------------------------------------------------------

  _drawVision(ctx) {
    ctx.strokeStyle = 'rgba(120, 170, 255, 0.10)';
    ctx.lineWidth = 1;
    const r = this.engine.params.visionRadius;
    const boids = this.engine.boids;
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, TAU);
      ctx.stroke();
    }
  }

  _drawObstacles(ctx) {
    const obs = this.engine.obstacles;
    for (let i = 0; i < obs.length; i++) {
      const ob = obs[i];
      ctx.beginPath();
      ctx.arc(ob.x, ob.y, ob.r, 0, TAU);
      ctx.fillStyle = 'rgba(150, 150, 165, 0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(190, 190, 210, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (this.obstacleCursor) {
      ctx.beginPath();
      ctx.arc(this.obstacleCursor.x, this.obstacleCursor.y, 20, 0, TAU);
      ctx.fillStyle = 'rgba(150, 150, 165, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(190, 190, 210, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ---- Game HUD ------------------------------------------------------------

  _trackPredator(active, now) {
    if (active && !this._predActive) {
      this._bannerStart = now;
      this._bannerUntil = now + 2000;
      this._survivalStart = now;
    }
    this._predActive = active;
  }

  _drawHUD(ctx, count, predActive, now) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.textBaseline = 'middle';

    // FPS — small counter, top-left, color-coded by health.
    const fps = Math.round(this._fps);
    const fpsColor = fps > 50 ? '#00e676' : fps >= 30 ? '#ffa726' : '#ff5252';
    ctx.font = "bold 16px 'JetBrains Mono', Consolas, monospace";
    ctx.textAlign = 'left';
    ctx.fillStyle = fpsColor;
    ctx.fillText(`${fps} FPS`, 14, 20);

    // Bird counter.
    ctx.fillStyle = '#cdd0d8';
    ctx.font = "15px 'Noto Color Emoji', 'JetBrains Mono', monospace";
    ctx.fillText(`🐦 ${count}`, 14, 42);

    // Predator warning (blinks every 500ms).
    if (predActive) {
      const on = Math.floor(now / 500) % 2 === 0;
      ctx.font = "bold 15px 'JetBrains Mono', Consolas, monospace";
      ctx.fillStyle = `rgba(255, 60, 60, ${on ? 1 : 0.25})`;
      ctx.fillText('⚠ PRÉDATEUR', 14, 66);

      // Survival score, top-right.
      const secs = Math.floor((now - this._survivalStart) / 1000);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd54f';
      ctx.font = "bold 16px 'JetBrains Mono', Consolas, monospace";
      ctx.fillText(`SURVIE: ${secs}s`, this.w - 14, 20);
    }

    // Centered "PREDATOR DETECTED!" banner for 2s.
    if (now < this._bannerUntil) {
      const e = now - this._bannerStart;
      const scale = e < 300 ? 1.3 - 0.3 * (e / 300) : 1.0;
      const alpha = e > 1600 ? Math.max(0, (2000 - e) / 400) : 1;
      ctx.save();
      ctx.translate(this.w / 2, this.h / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3b3b';
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.fillText('PRÉDATEUR DÉTECTÉ !', 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'left';
  }

  // Called by the main loop after draw(); feeds the on-canvas HUD next frame.
  updateOverlay(fps) {
    this._fps = fps;
  }
}
