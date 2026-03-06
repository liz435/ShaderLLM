// Prompt: "glowing orbital rope with particle points"
// Tags: orb, orbit, particle, glow, rope, energy, abstract, neon, circle, loop, point, motion
#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
out vec4 fragColor;

#define TWO_PI 6.28318530718
#define NBP 50.
#define NBPS (1.0 / (NBP - 1.0))

// Animation parameters
#define ANIM_SPEED (1.0 / 60.0)
#define ANIM_ORIGIN vec2(0.0, 0.0)
#define ANIM_SCALE vec2((NBP - 1.0) * TWO_PI)

// Orbit radii and speeds for the two endpoints
#define RADIUS vec2(0.90, 0.3)
#define SPEED vec2(0.10, -0.05)

// Point glow: inverse-distance falloff
float point_add(float col, vec2 uv, vec2 dir) {
  float d = length(uv - dir);
  return col + 0.02 / d - 0.04;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y * 2.0;

  vec3 col = vec3(0.0);

  // Variation force: slow drift + time-based animation
  vec2 delai = ANIM_ORIGIN + iTime * ANIM_SPEED * ANIM_SCALE;

  // Constant orbital rotation
  vec2 angle = fract(iTime * SPEED) * TWO_PI;

  // Iterate points along the rope
  for(float i = 0.0; i <= 1.0; i += NBPS) {
    // Per-point angle influenced by variation force
    vec2 a = angle + i * delai;

    // Two orbital endpoints
    vec2 p1 = RADIUS.s * vec2(cos(a.s), sin(a.s));
    vec2 p2 = RADIUS.t * vec2(cos(a.t), sin(a.t));

    // Interpolate between endpoints to form the rope
    vec2 p = mix(p1, p2, i);

    // Accumulate glow from this point
    col.r = point_add(col.r, uv, p);
  }

  fragColor = vec4(col, 1.0);
}
