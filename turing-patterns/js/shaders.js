// GLSL shaders for the Gray-Scott reaction-diffusion simulator.
// WebGL2 + GLSL ES 3.00. We use RG32F textures so A and B can each be
// stored at full 32-bit precision — Gray-Scott is sensitive to numerical
// drift, and 8-bit quantisation produces visible banding.
//
// State texture encoding:
//   .r  = A concentration (chemical reservoir, starts at ~1.0)
//   .g  = B concentration (catalyst, starts near 0, drives the pattern)

export const VS_QUAD = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Gray-Scott step. Uses a 9-point Laplacian stencil
// (corners 0.05, edges 0.2, centre -1.0) — same kernel as Karl Sims'
// classic CA shader. dt is built into the substep loop on the JS side.
export const FS_UPDATE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_state;
uniform vec2  u_texel;
uniform float u_feed;
uniform float u_kill;
uniform float u_dA;
uniform float u_dB;
uniform float u_dt;
out vec4 outColor;

vec2 fetch(vec2 uv) { return texture(u_state, uv).rg; }

void main() {
  vec2 c  = fetch(v_uv);
  float A = c.r;
  float B = c.g;
  vec2 dx = vec2(u_texel.x, 0.0);
  vec2 dy = vec2(0.0, u_texel.y);

  vec2 n  = fetch(v_uv + dy);
  vec2 s  = fetch(v_uv - dy);
  vec2 e  = fetch(v_uv + dx);
  vec2 w  = fetch(v_uv - dx);
  vec2 ne = fetch(v_uv + dx + dy);
  vec2 nw = fetch(v_uv - dx + dy);
  vec2 se = fetch(v_uv + dx - dy);
  vec2 sw = fetch(v_uv - dx - dy);

  vec2 lap = 0.05 * (ne + nw + se + sw) + 0.2 * (n + s + e + w) - 1.0 * c;

  float reaction = A * B * B;
  float dA = u_dA * lap.r - reaction + u_feed * (1.0 - A);
  float dB = u_dB * lap.g + reaction - (u_kill + u_feed) * B;

  outColor = vec4(
    clamp(A + u_dt * dA, 0.0, 1.0),
    clamp(B + u_dt * dB, 0.0, 1.0),
    0.0,
    1.0
  );
}
`;

// Display shader. Maps B concentration to a 3-stop palette so the same
// simulation can look like leopard skin, zebra stripes, coral, etc.
export const FS_DISPLAY = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_state;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
out vec4 outColor;

void main() {
  float B = texture(u_state, v_uv).g;
  // Two-stop smoothstep ramp gives crisper edges than a linear mix and
  // makes the patterns POP on a dark page. The exact stops were tuned
  // to land just inside the typical Gray-Scott B distribution (≈0–0.45).
  float t1 = smoothstep(0.06, 0.20, B);
  float t2 = smoothstep(0.20, 0.40, B);
  vec3 col = mix(u_c0, u_c1, t1);
  col = mix(col, u_c2, t2);
  outColor = vec4(col, 1.0);
}
`;

// Seed shader. Splatters a small disc of B at world coordinate u_pos
// onto the current state. Used both for the initial central seed and
// for the user's click-to-paint interaction.
export const FS_SEED = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_state;
uniform vec2  u_pos;       // 0..1 in texture space
uniform float u_radius;    // 0..1
uniform float u_intensity; // 0..1 — additive on B
out vec4 outColor;

void main() {
  vec2 c = texture(u_state, v_uv).rg;
  float d = distance(v_uv, u_pos);
  float blob = smoothstep(u_radius, u_radius * 0.4, d);
  outColor = vec4(c.r, clamp(c.g + blob * u_intensity, 0.0, 1.0), 0.0, 1.0);
}
`;
