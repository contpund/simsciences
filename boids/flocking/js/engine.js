// Flocking engine: Reynolds' three rules + predator + obstacles, accelerated
// with a uniform spatial-hash grid so neighbor queries stay ~O(n) at n=300.

export const DEFAULTS = {
  count: 120,
  cohesion: 1.0,
  separation: 1.5,
  alignment: 1.0,
  visionRadius: 60,
  maxSpeed: 3,
};

const MAX_FORCE = 0.06;        // steering acceleration cap per rule (pre-weight)
const SEPARATION_RATIO = 0.55; // separation acts within this fraction of vision
const EDGE_MARGIN = 80;        // px from edge where inward steering kicks in
const EDGE_TURN = 0.35;        // strength of the inward edge force
const PREDATOR_FLEE = 2.4;     // flee weight (overrides flocking near a predator)
const AVOID_RADIUS = 60;       // detection buffer around obstacle surface
const AVOID_FORCE = 2.5;       // peak repulsion magnitude (overrides flocking)
const BOID_RADIUS = 5;         // default entity radius for obstacle collision math
const PREDATOR_RADIUS = 8;     // raptor body radius for obstacle collision math
const MIN_SPEED_RATIO = 0.4;   // keep boids gliding rather than stalling

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export class FlockingEngine {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.params = { ...DEFAULTS };
    this.boids = [];
    this.predator = null;
    this.obstacles = [];
    this.paused = false;
    this.avgGroupSize = 1;
    this.grid = new Map();
    this.cellSize = this.params.visionRadius;
    this.init(this.params.count);
  }

  init(count) {
    this.boids = [];
    for (let i = 0; i < count; i++) this.boids.push(this._spawn());
    this.params.count = count;
  }

  _spawn() {
    const angle = rand(0, Math.PI * 2);
    const sp = this.params.maxSpeed;
    return {
      x: rand(0, this.width),
      y: rand(0, this.height),
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      n: 0, // neighbor count, refreshed each step (drives density coloring)
      phase: rand(0, Math.PI * 2), // render-only: desyncs wing-flap, no physics effect
    };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    for (const b of this.boids) {
      b.x = Math.min(Math.max(b.x, 0), width);
      b.y = Math.min(Math.max(b.y, 0), height);
    }
  }

  // ---- Runtime parameter setters --------------------------------------------

  setParam(name, value) {
    if (name === 'count') return this.setCount(value);
    this.params[name] = value;
  }

  setCount(n) {
    n = Math.round(n);
    const cur = this.boids.length;
    if (n > cur) for (let i = cur; i < n; i++) this.boids.push(this._spawn());
    else if (n < cur) this.boids.length = n;
    this.params.count = n;
  }

  setPredator(enabled) {
    if (enabled && !this.predator) {
      this.predator = {
        x: this.width / 2,
        y: this.height / 2,
        vx: rand(-1, 1),
        vy: rand(-1, 1),
        radius: PREDATOR_RADIUS,
      };
    } else if (!enabled) {
      this.predator = null;
    }
  }

  addObstacle(x, y, r = 38) {
    this.obstacles.push({ x, y, r });
  }

  clearObstacles() {
    this.obstacles = [];
  }

  reset() {
    this.params = { ...DEFAULTS };
    this.obstacles = [];
    this.predator = null;
    this.paused = false;
    this.init(this.params.count);
  }

  applyPreset(preset) {
    Object.assign(this.params, preset);
    this.setCount(this.params.count);
  }

  // ---- Spatial-hash grid ----------------------------------------------------

  _rebuildGrid() {
    this.cellSize = Math.max(this.params.visionRadius, 10);
    this.grid.clear();
    const cs = this.cellSize;
    for (let i = 0; i < this.boids.length; i++) {
      const b = this.boids[i];
      const key = ((b.x / cs) | 0) + ',' + ((b.y / cs) | 0);
      let cell = this.grid.get(key);
      if (!cell) this.grid.set(key, (cell = []));
      cell.push(i);
    }
  }

  _forEachNeighbor(b, fn) {
    const cs = this.cellSize;
    const cx = (b.x / cs) | 0;
    const cy = (b.y / cs) | 0;
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const cell = this.grid.get(gx + ',' + gy);
        if (!cell) continue;
        for (let k = 0; k < cell.length; k++) fn(this.boids[cell[k]]);
      }
    }
  }

  // ---- Simulation step ------------------------------------------------------

  step() {
    if (this.paused) return;
    this._rebuildGrid();

    const p = this.params;
    const vision = p.visionRadius;
    const visionSq = vision * vision;
    const sepDist = vision * SEPARATION_RATIO;
    const sepDistSq = sepDist * sepDist;
    const maxSpeed = p.maxSpeed;
    const minSpeed = maxSpeed * MIN_SPEED_RATIO;
    let groupSum = 0;

    for (const b of this.boids) {
      let cx = 0, cy = 0;          // cohesion: neighbor centroid
      let ax = 0, ay = 0;          // alignment: neighbor velocity sum
      let sx = 0, sy = 0;          // separation: weighted away vector
      let count = 0;

      this._forEachNeighbor(b, (o) => {
        if (o === b) return;
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > visionSq || d2 === 0) return;
        count++;
        cx += o.x; cy += o.y;
        ax += o.vx; ay += o.vy;
        if (d2 < sepDistSq) {
          const d = Math.sqrt(d2);
          sx -= dx / d;
          sy -= dy / d;
        }
      });

      b.n = count;
      groupSum += count + 1;

      let accX = 0, accY = 0;

      if (count > 0) {
        // Cohesion — steer toward the average neighbor position.
        const desCX = cx / count - b.x;
        const desCY = cy / count - b.y;
        const [coX, coY] = steer(desCX, desCY, maxSpeed, b.vx, b.vy);
        accX += coX * p.cohesion;
        accY += coY * p.cohesion;

        // Alignment — steer toward the average neighbor heading.
        const [alX, alY] = steer(ax / count, ay / count, maxSpeed, b.vx, b.vy);
        accX += alX * p.alignment;
        accY += alY * p.alignment;

        // Separation — steer away from close neighbors.
        if (sx !== 0 || sy !== 0) {
          const [seX, seY] = steer(sx, sy, maxSpeed, b.vx, b.vy);
          accX += seX * p.separation;
          accY += seY * p.separation;
        }
      }

      // Predator avoidance (overrides flocking when close).
      if (this.predator) {
        const dx = b.x - this.predator.x;
        const dy = b.y - this.predator.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < visionSq && d2 > 0) {
          const d = Math.sqrt(d2);
          const [fX, fY] = steer(dx / d, dy / d, maxSpeed, b.vx, b.vy);
          const urgency = 1 - d / vision; // closer → stronger
          accX += fX * PREDATOR_FLEE * (0.5 + urgency);
          accY += fY * PREDATOR_FLEE * (0.5 + urgency);
        }
      }

      // Obstacle avoidance — proportional repulsion, prioritised over flocking.
      const av = avoidObstacles(b, this.obstacles);
      accX += av.x;
      accY += av.y;

      // Soft edge steering — keeps the flock framed for recording.
      if (b.x < EDGE_MARGIN) accX += EDGE_TURN;
      else if (b.x > this.width - EDGE_MARGIN) accX -= EDGE_TURN;
      if (b.y < EDGE_MARGIN) accY += EDGE_TURN;
      else if (b.y > this.height - EDGE_MARGIN) accY -= EDGE_TURN;

      b._ax = accX;
      b._ay = accY;
    }

    // Integrate (second pass so all forces read the same frame state).
    for (const b of this.boids) {
      b.vx += b._ax;
      b.vy += b._ay;

      let sp = Math.hypot(b.vx, b.vy);
      if (sp > maxSpeed) {
        b.vx = (b.vx / sp) * maxSpeed;
        b.vy = (b.vy / sp) * maxSpeed;
      } else if (sp < minSpeed && sp > 0) {
        b.vx = (b.vx / sp) * minSpeed;
        b.vy = (b.vy / sp) * minSpeed;
      } else if (sp === 0) {
        const a = rand(0, Math.PI * 2);
        b.vx = Math.cos(a) * minSpeed;
        b.vy = Math.sin(a) * minSpeed;
      }

      b.x += b.vx;
      b.y += b.vy;

      // Hard stop — no boid can penetrate an obstacle no matter the speed.
      resolveObstacleCollision(b, this.obstacles);

      // Safety wrap so a boid can never permanently leave the canvas.
      if (b.x < -5) b.x = this.width + 5;
      else if (b.x > this.width + 5) b.x = -5;
      if (b.y < -5) b.y = this.height + 5;
      else if (b.y > this.height + 5) b.y = -5;
    }

    this.avgGroupSize = this.boids.length ? groupSum / this.boids.length : 1;
    this._stepPredator(maxSpeed);
  }

  _stepPredator(maxSpeed) {
    const pr = this.predator;
    if (!pr) return;
    // Pursue the local center of mass of the nearest boids.
    let tx = 0, ty = 0, c = 0;
    for (const b of this.boids) {
      const d2 = (b.x - pr.x) ** 2 + (b.y - pr.y) ** 2;
      if (d2 < 220 * 220) { tx += b.x; ty += b.y; c++; }
    }
    // Predator max speed and steer force scaled to 80% of the prey baseline.
    const pSpeed = maxSpeed * 0.8;
    if (c > 0) {
      const dx = tx / c - pr.x;
      const dy = ty / c - pr.y;
      const d = Math.hypot(dx, dy) || 1;
      pr.vx += (dx / d) * 0.4;
      pr.vy += (dy / d) * 0.4;
    } else {
      pr.vx += rand(-0.24, 0.24);
      pr.vy += rand(-0.24, 0.24);
    }
    // Obstacle avoidance — prioritised over the chase.
    const av = avoidObstacles(pr, this.obstacles);
    pr.vx += av.x;
    pr.vy += av.y;
    const s = Math.hypot(pr.vx, pr.vy) || 1;
    pr.vx = (pr.vx / s) * pSpeed;
    pr.vy = (pr.vy / s) * pSpeed;
    pr.x += pr.vx;
    pr.y += pr.vy;
    // Hard stop — the raptor can never enter an obstacle either.
    resolveObstacleCollision(pr, this.obstacles);
    if (pr.x < 0) pr.x = this.width;
    else if (pr.x > this.width) pr.x = 0;
    if (pr.y < 0) pr.y = this.height;
    else if (pr.y > this.height) pr.y = 0;
  }
}

// Soft steering force away from every obstacle within AVOID_RADIUS of the
// entity's surface; magnitude grows as the entity gets closer.
function avoidObstacles(entity, obstacles) {
  const er = entity.radius || BOID_RADIUS;
  let sx = 0, sy = 0;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const dx = entity.x - obs.x;
    const dy = entity.y - obs.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = obs.r + er + AVOID_RADIUS;
    if (dist < minDist && dist > 0) {
      const strength = (minDist - dist) / minDist;
      sx += (dx / dist) * strength * AVOID_FORCE;
      sy += (dy / dist) * strength * AVOID_FORCE;
    }
  }
  return { x: sx, y: sy };
}

// Hard collision response: snap the entity back to the obstacle surface and
// zero the velocity component pointing into it. Guarantees no penetration.
function resolveObstacleCollision(entity, obstacles) {
  const er = entity.radius || BOID_RADIUS;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const dx = entity.x - obs.x;
    const dy = entity.y - obs.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = obs.r + er;
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      entity.x = obs.x + nx * minDist;
      entity.y = obs.y + ny * minDist;
      const dot = entity.vx * nx + entity.vy * ny;
      if (dot < 0) {
        entity.vx -= dot * nx;
        entity.vy -= dot * ny;
      }
    }
  }
}

// Reynolds steering: desired velocity (along the given direction at maxSpeed)
// minus current velocity, capped to MAX_FORCE.
function steer(dirX, dirY, maxSpeed, vx, vy) {
  const m = Math.hypot(dirX, dirY);
  if (m === 0) return [0, 0];
  let fx = (dirX / m) * maxSpeed - vx;
  let fy = (dirY / m) * maxSpeed - vy;
  const fm = Math.hypot(fx, fy);
  if (fm > MAX_FORCE) {
    fx = (fx / fm) * MAX_FORCE;
    fy = (fy / fm) * MAX_FORCE;
  }
  return [fx, fy];
}
