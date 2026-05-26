// WebGL2 Gray-Scott reaction-diffusion engine.
//
//   ∂A/∂t = D_A ∇²A - A B² + f (1 − A)
//   ∂B/∂t = D_B ∇²B + A B² − (k + f) B
//
// State is held in two RG32F textures; we ping-pong between them every
// substep. The display shader reads the most recent state and remaps
// B to an RGB palette. Designed to run smoothly at 512×512 on integrated
// graphics; bumps up to 1024×1024 on discrete GPUs.

import { VS_QUAD, FS_UPDATE, FS_DISPLAY, FS_SEED } from './shaders.js';

const DEFAULT_PRESET = { feed: 0.0367, kill: 0.0649, dA: 1.0, dB: 0.5 };

const PALETTES = {
  leopard: {
    c0: [0.10, 0.08, 0.07],   // dark background fur
    c1: [0.94, 0.71, 0.32],   // warm tan
    c2: [0.20, 0.10, 0.05],   // black spot core
  },
  zebra: {
    c0: [0.04, 0.04, 0.04],
    c1: [0.95, 0.95, 0.95],
    c2: [0.02, 0.02, 0.02],
  },
  coral: {
    c0: [0.02, 0.06, 0.10],
    c1: [0.16, 0.71, 0.86],
    c2: [1.00, 0.86, 0.55],
  },
  emerald: {
    c0: [0.02, 0.03, 0.05],
    c1: [0.10, 0.55, 0.45],
    c2: [0.96, 0.92, 0.55],
  },
  lava: {
    c0: [0.05, 0.02, 0.04],
    c1: [0.87, 0.20, 0.05],
    c2: [1.00, 0.86, 0.40],
  },
  sim: { // SimSciences brand
    c0: [0.02, 0.03, 0.05],
    c1: [0.37, 0.69, 1.00],   // cyan accent
    c2: [1.00, 0.67, 0.27],   // amber accent
  },
};

function compile(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('shader compile failed: ' + log);
  }
  return sh;
}
function link(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error('program link failed: ' + log);
  }
  return prog;
}

export class TuringEngine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 not supported on this device.');
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('Float colour-buffer textures are required (EXT_color_buffer_float).');
    }

    this.feed = DEFAULT_PRESET.feed;
    this.kill = DEFAULT_PRESET.kill;
    this.dA = DEFAULT_PRESET.dA;
    this.dB = DEFAULT_PRESET.dB;
    this.dt = 1.0;
    this.substeps = 6;
    this.paused = false;
    this.palette = PALETTES.sim;

    // Fullscreen quad.
    this.quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1,  1, -1, -1,  1,  -1,  1,  1, -1,  1,  1]),
      gl.STATIC_DRAW);

    this.progUpdate = link(gl, VS_QUAD, FS_UPDATE);
    this.progDisplay = link(gl, VS_QUAD, FS_DISPLAY);
    this.progSeed = link(gl, VS_QUAD, FS_SEED);

    this.loc = {
      updatePos:   gl.getAttribLocation(this.progUpdate, 'a_pos'),
      displayPos:  gl.getAttribLocation(this.progDisplay, 'a_pos'),
      seedPos:     gl.getAttribLocation(this.progSeed, 'a_pos'),
      uState_u:    gl.getUniformLocation(this.progUpdate, 'u_state'),
      uTexel:      gl.getUniformLocation(this.progUpdate, 'u_texel'),
      uFeed:       gl.getUniformLocation(this.progUpdate, 'u_feed'),
      uKill:       gl.getUniformLocation(this.progUpdate, 'u_kill'),
      uDA:         gl.getUniformLocation(this.progUpdate, 'u_dA'),
      uDB:         gl.getUniformLocation(this.progUpdate, 'u_dB'),
      uDt:         gl.getUniformLocation(this.progUpdate, 'u_dt'),
      uState_d:    gl.getUniformLocation(this.progDisplay, 'u_state'),
      uC0:         gl.getUniformLocation(this.progDisplay, 'u_c0'),
      uC1:         gl.getUniformLocation(this.progDisplay, 'u_c1'),
      uC2:         gl.getUniformLocation(this.progDisplay, 'u_c2'),
      uState_s:    gl.getUniformLocation(this.progSeed, 'u_state'),
      uSeedPos:    gl.getUniformLocation(this.progSeed, 'u_pos'),
      uSeedRadius: gl.getUniformLocation(this.progSeed, 'u_radius'),
      uSeedInt:    gl.getUniformLocation(this.progSeed, 'u_intensity'),
    };

    this.simSize = 512;
    this._allocate();
    this.resetSeed('random');
  }

  _allocate() {
    const gl = this.gl;
    const N = this.simSize;
    if (this.texA) gl.deleteTexture(this.texA);
    if (this.texB) gl.deleteTexture(this.texB);
    if (this.fboA) gl.deleteFramebuffer(this.fboA);
    if (this.fboB) gl.deleteFramebuffer(this.fboB);

    // Linear filtering on float textures requires OES_texture_float_linear,
    // which is NOT in WebGL2 core. Without it, texture() silently returns 0
    // (we hit this — A and B were both reading as 0). NEAREST is safe; if
    // the device happens to support linear floats we upgrade in display
    // for nicer scaling.
    const linearFloat = !!gl.getExtension('OES_texture_float_linear');
    const filter = linearFloat ? gl.LINEAR : gl.NEAREST;
    this._linearFloat = linearFloat;
    const make = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, N, N, 0, gl.RG, gl.FLOAT, null);
      return t;
    };
    const makeFbo = (tex) => {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return f;
    };
    this.texA = make();
    this.texB = make();
    this.fboA = makeFbo(this.texA);
    this.fboB = makeFbo(this.texB);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Initialise the field. Modes:
   *   'random' — A=1 everywhere, B = random splatter (default, organic look)
   *   'center' — single central disc of B
   *   'clear'  — A=1, B=0 (no pattern — used before user paints)
   */
  resetSeed(mode = 'random') {
    const gl = this.gl;
    const N = this.simSize;
    const arr = new Float32Array(N * N * 2);
    if (mode === 'center') {
      // Central square of B=1.0 + faint perimeter noise. Square (not disc)
      // is the canonical Karl Sims seed — produces the iconic "mitosis"
      // and "coral" patterns most cleanly.
      const halfSq = 0.06; // half-side in UV
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 2;
          const ux = x / N - 0.5, uy = y / N - 0.5;
          const inSq = Math.abs(ux) < halfSq && Math.abs(uy) < halfSq;
          arr[i] = 1.0;
          arr[i + 1] = inSq ? 1.0 : 0.0;
        }
      }
    } else if (mode === 'clear') {
      for (let i = 0; i < N * N; i++) {
        arr[i * 2] = 1.0;
        arr[i * 2 + 1] = 0.0;
      }
    } else { // random
      // Layered seed: a few large central blobs + sparse high-intensity
      // pixel noise everywhere. Pixel noise guarantees pattern initiation
      // regardless of f/k; the large blobs give the pattern an obvious
      // anchor in the centre. Deterministic LCG so capture frames repeat.
      let s = 0x9e3779b1 >>> 0;
      const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
      const blobs = [];
      const count = 4 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        blobs.push({
          x: 0.30 + rand() * 0.40,
          y: 0.30 + rand() * 0.40,
          r: 0.045 + rand() * 0.030,
        });
      }
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 2;
          const ux = x / N, uy = y / N;
          let B = 0;
          for (const b of blobs) {
            const dd = (ux - b.x) * (ux - b.x) + (uy - b.y) * (uy - b.y);
            const rr = b.r * b.r;
            if (dd < rr) {
              const fall = 1 - Math.sqrt(dd) / b.r;
              B = Math.max(B, fall);
            }
          }
          // 1.5% of pixels get a strong B kick — this is the "noise floor"
          // that lets any parameter combination kick off a pattern.
          if (rand() < 0.015) B = Math.max(B, 0.85);
          arr[i] = 1.0;
          arr[i + 1] = B;
        }
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texA);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RG, gl.FLOAT, arr);
    gl.bindTexture(gl.TEXTURE_2D, this.texB);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RG, gl.FLOAT, arr);
    this._readFrom = this.texA;
    this._readFbo = this.fboA;
    this._writeFrom = this.texB;
    this._writeFbo = this.fboB;
  }

  setParam(name, value) {
    if (name === 'feed') this.feed = +value;
    else if (name === 'kill') this.kill = +value;
    else if (name === 'dA') this.dA = +value;
    else if (name === 'dB') this.dB = +value;
    else if (name === 'speed') this.substeps = Math.max(1, Math.round(+value));
  }
  setPalette(name) {
    if (PALETTES[name]) this.palette = PALETTES[name];
  }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  togglePause() {
    this.paused = !this.paused;
    window.dispatchEvent(new CustomEvent('turing:pause-state', { detail: { paused: this.paused } }));
    return this.paused;
  }

  /** Paint a blob of B at canvas (px, py). Useful for the click-to-seed
   *  interaction; coords are page-relative (0..1). */
  paintAt(u, v, radius = 0.04, intensity = 0.7) {
    this._splatter(u, v, radius, intensity);
  }

  _splatter(u, v, radius, intensity) {
    const gl = this.gl;
    // Read from _readFrom, write to _writeFrom, then swap.
    gl.useProgram(this.progSeed);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.enableVertexAttribArray(this.loc.seedPos);
    gl.vertexAttribPointer(this.loc.seedPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._readFrom);
    gl.uniform1i(this.loc.uState_s, 0);
    gl.uniform2f(this.loc.uSeedPos, u, v);
    gl.uniform1f(this.loc.uSeedRadius, radius);
    gl.uniform1f(this.loc.uSeedInt, intensity);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._writeFbo);
    gl.viewport(0, 0, this.simSize, this.simSize);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this._swap();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _swap() {
    const tr = this._readFrom, fr = this._readFbo;
    this._readFrom = this._writeFrom;
    this._readFbo = this._writeFbo;
    this._writeFrom = tr;
    this._writeFbo = fr;
  }

  /** Run one or more substeps. */
  tick(substeps = this.substeps) {
    if (this.paused) return;
    const gl = this.gl;
    gl.useProgram(this.progUpdate);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.enableVertexAttribArray(this.loc.updatePos);
    gl.vertexAttribPointer(this.loc.updatePos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.loc.uTexel, 1.0 / this.simSize, 1.0 / this.simSize);
    gl.uniform1f(this.loc.uFeed, this.feed);
    gl.uniform1f(this.loc.uKill, this.kill);
    gl.uniform1f(this.loc.uDA, this.dA);
    gl.uniform1f(this.loc.uDB, this.dB);
    gl.uniform1f(this.loc.uDt, this.dt);
    gl.viewport(0, 0, this.simSize, this.simSize);
    for (let i = 0; i < substeps; i++) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this._readFrom);
      gl.uniform1i(this.loc.uState_u, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._writeFbo);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this._swap();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Render the current state to the canvas with the active palette. */
  render() {
    const gl = this.gl;
    this._resizeCanvas();
    gl.useProgram(this.progDisplay);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.enableVertexAttribArray(this.loc.displayPos);
    gl.vertexAttribPointer(this.loc.displayPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._readFrom);
    gl.uniform1i(this.loc.uState_d, 0);
    gl.uniform3fv(this.loc.uC0, this.palette.c0);
    gl.uniform3fv(this.loc.uC1, this.palette.c1);
    gl.uniform3fv(this.loc.uC2, this.palette.c2);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(2, Math.floor(rect.width * dpr));
    const h = Math.max(2, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }
}

export const PRESETS = {
  // All presets use the 'center' seed (square of B=1.0). It ignites the
  // reaction reliably for every (f, k) combo; from there the equations
  // dictate the topology. 'random' is reserved for the default page load
  // where the goal is a screen full of cells immediately.
  leopard:    { feed: 0.0250, kill: 0.0600, dA: 1.0, dB: 0.5, palette: 'leopard',  seed: 'center' },
  zebra:      { feed: 0.0400, kill: 0.0600, dA: 1.0, dB: 0.5, palette: 'zebra',    seed: 'center' },
  coral:      { feed: 0.0620, kill: 0.0620, dA: 1.0, dB: 0.5, palette: 'coral',    seed: 'center' },
  mitosis:    { feed: 0.0367, kill: 0.0649, dA: 1.0, dB: 0.5, palette: 'sim',      seed: 'center' },
  labyrinth:  { feed: 0.0290, kill: 0.0570, dA: 1.0, dB: 0.5, palette: 'emerald',  seed: 'center' },
  solitons:   { feed: 0.0140, kill: 0.0450, dA: 1.0, dB: 0.5, palette: 'lava',     seed: 'center' },
};
