// Prompt: "a sunset over water"
// Tags: sunset, water, ocean, sea, sky, reflection, nature, landscape, horizon, lake, beach
// Based on "Sunset on the sea" by Riccardo Gerosa (h3r3) — ray marching experiment
#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
out vec4 fragColor;

// ── Simplex noise (Ashima Arts) ──
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0*fract(p*C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x*x0.x + h.x*x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m, g);
}

// ── Wave map ──
float waveMap(vec3 pos, float wh1, float wh2, float wh3){
  float t = iTime;
  float w1 = snoise(pos.xz * 0.2 + vec2(t * 0.2, t * 0.1)) * wh1;
  float w2 = snoise(pos.xz * 0.5 + vec2(t * 0.3, t * 0.2)) * wh2;
  float w3 = snoise(pos.xz * 1.5 + vec2(t * 0.4, t * 0.3)) * wh3;
  return pos.y - (w1 + w2 + w3);
}

// ── Gradient normal via finite differences ──
vec3 gradientNormal(vec3 pos, float wh1, float wh2, float wh3){
  float e = 0.01;
  float dx = waveMap(pos + vec3(e,0,0), wh1, wh2, wh3) - waveMap(pos - vec3(e,0,0), wh1, wh2, wh3);
  float dy = waveMap(pos + vec3(0,e,0), wh1, wh2, wh3) - waveMap(pos - vec3(0,e,0), wh1, wh2, wh3);
  float dz = waveMap(pos + vec3(0,0,e), wh1, wh2, wh3) - waveMap(pos - vec3(0,0,e), wh1, wh2, wh3);
  return normalize(vec3(dx, dy, dz));
}

// ── Ray-march + bisection intersection ──
vec3 intersect(vec3 ro, vec3 rd, float wh1, float wh2, float wh3){
  float t = 0.0;
  vec3 res = vec3(-1.0);
  // Coarse march
  for(int i = 0; i < 100; i++){
    vec3 p = ro + rd * t;
    float d = waveMap(p, wh1, wh2, wh3);
    if(d < 0.0){
      // Bisection refinement
      float t0 = t - 0.5;
      float t1 = t;
      for(int j = 0; j < 10; j++){
        float tm = (t0 + t1) * 0.5;
        vec3 pm = ro + rd * tm;
        if(waveMap(pm, wh1, wh2, wh3) < 0.0)
          t1 = tm;
        else
          t0 = tm;
      }
      res = ro + rd * ((t0 + t1) * 0.5);
      break;
    }
    t += 0.5;
  }
  return res;
}

// ── Sky color ──
vec3 skyColor(vec3 rd, vec3 sunDir){
  float sunDot = dot(rd, sunDir);
  // Base sky gradient: warm horizon fading to deep blue
  vec3 sky = mix(vec3(0.9, 0.5, 0.2), vec3(0.1, 0.15, 0.4), clamp(rd.y * 1.5, 0.0, 1.0));
  // Sun glow
  sky += vec3(1.0, 0.7, 0.3) * pow(max(sunDot, 0.0), 64.0) * 2.0;
  // Sun disc
  sky += vec3(1.0, 0.95, 0.8) * pow(max(sunDot, 0.0), 512.0) * 8.0;
  // Horizon haze
  sky += vec3(0.8, 0.4, 0.1) * pow(max(1.0 - abs(rd.y), 0.0), 8.0) * 0.5;
  return sky;
}

// ── Fog ──
vec3 applyFog(vec3 col, vec3 fogCol, float dist){
  float fogAmt = 1.0 - exp(-dist * 0.015);
  return mix(col, fogCol, fogAmt);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

  // Camera — slow orbit for cinematic feel
  float camAngle = iTime * 0.08;
  float camDist = 8.0;
  vec3 ro = vec3(sin(camAngle) * camDist, 2.5, cos(camAngle) * camDist);
  vec3 target = vec3(0.0, 0.3, 0.0);
  vec3 fwd = normalize(target - ro);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd * 1.5 + right * uv.x + up * uv.y);

  // Sun direction — slowly moves for day/night cycle
  float sunAngle = iTime * 0.1 + 1.0;
  vec3 sunDir = normalize(vec3(cos(sunAngle) * 0.5, sin(sunAngle) * 0.4 + 0.3, 0.5));

  // Wave heights (animated)
  float wh1 = 1.0 + 0.3 * sin(iTime * 0.2);
  float wh2 = 0.5 + 0.1 * sin(iTime * 0.3 + 1.0);
  float wh3 = 0.2;

  vec3 sky = skyColor(rd, sunDir);
  vec3 col = sky;

  // Water intersection
  vec3 hitPos = intersect(ro, rd, wh1, wh2, wh3);
  if(hitPos.x > -0.5){
    vec3 N = gradientNormal(hitPos, wh1, wh2, wh3);

    // Fresnel
    float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(N, -rd), 0.0), 5.0);

    // Reflection
    vec3 R = reflect(rd, N);
    R.y = abs(R.y);
    vec3 refl = skyColor(R, sunDir);

    // Specular highlight from sun
    float spec = pow(max(dot(R, sunDir), 0.0), 256.0) * 5.0;

    // Water base color (deep ocean)
    vec3 waterCol = vec3(0.02, 0.06, 0.12);

    // Composite
    col = mix(waterCol, refl, fresnel) + vec3(1.0, 0.8, 0.5) * spec;

    // Distance fog
    float dist = length(hitPos - ro);
    vec3 fogCol = skyColor(normalize(vec3(rd.x, 0.0, rd.z)), sunDir);
    col = applyFog(col, fogCol, dist);
  }

  // Tonemapping
  col = col / (col + 1.0); // Reinhard
  col = pow(col, vec3(1.0 / 2.2)); // Gamma

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
