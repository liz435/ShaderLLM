// Prompt: "abstract corridor with flat-shaded mesh look"
// Tags: corridor, tunnel, raymarching, abstract, 3d, hallway, sdf, lighting, ao
#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
out vec4 fragColor;

#define PI 3.1415926535898
#define FH 1.0

float getGrey(vec3 p){ return p.x*0.299 + p.y*0.587 + p.z*0.114; }

vec3 hash33(vec3 p){
  float n = sin(dot(p, vec3(7.0, 157.0, 113.0)));
  return fract(vec3(2097152.0, 262144.0, 32768.0)*n);
}

mat2 rot2(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}

// Triangle noise function (Nimitz)
vec3 tri(in vec3 x){ return abs(x - floor(x) - 0.5); }

float surfFunc(in vec3 p){
  return dot(tri(p*0.5 + tri(p*0.25).yzx), vec3(0.666));
}

// Procedural texture replacing iChannel lookups
float hash21(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453);
}
float pnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0 - 2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x),
             mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y);
}
vec3 procTex(vec3 p, vec3 n){
  // Tri-planar procedural stone texture
  n = max((abs(n) - 0.2)*7.0, 0.001);
  n /= (n.x + n.y + n.z);
  float tx = pnoise(p.yz*4.0)*0.5 + pnoise(p.yz*8.0)*0.25 + 0.35;
  float ty = pnoise(p.zx*4.0)*0.5 + pnoise(p.zx*8.0)*0.25 + 0.35;
  float tz = pnoise(p.xy*4.0)*0.5 + pnoise(p.xy*8.0)*0.25 + 0.35;
  return vec3(tx*n.x + ty*n.y + tz*n.z) * vec3(0.7, 0.65, 0.6);
}
vec3 procTexFloor(vec3 p, vec3 n){
  n = max((abs(n) - 0.2)*7.0, 0.001);
  n /= (n.x + n.y + n.z);
  float tx = pnoise(p.yz*2.0)*0.4 + pnoise(p.yz*6.0)*0.3 + 0.3;
  float ty = pnoise(p.zx*2.0)*0.4 + pnoise(p.zx*6.0)*0.3 + 0.3;
  float tz = pnoise(p.xy*2.0)*0.4 + pnoise(p.xy*6.0)*0.3 + 0.3;
  return vec3(tx*n.x + ty*n.y + tz*n.z) * vec3(0.55, 0.5, 0.45);
}

// Tunnel path
vec2 path(in float z){ return vec2(sin(z/24.0)*cos(z/12.0)*12.0, 0.0); }

// SDF distance function (square tunnel + floor)
float map(vec3 p){
  float sf = surfFunc(p - vec3(0.0, cos(p.z/3.0)*0.15, 0.0));
  vec2 tun = abs(p.xy - path(p.z))*vec2(0.5, 0.7071);
  float n = 1.0 - max(tun.x, tun.y) + (0.5 - sf);
  return min(n, p.y + FH);
}

vec3 getNormal(in vec3 p){
  const float eps = 0.001;
  return normalize(vec3(
    map(vec3(p.x+eps, p.y, p.z)) - map(vec3(p.x-eps, p.y, p.z)),
    map(vec3(p.x, p.y+eps, p.z)) - map(vec3(p.x, p.y-eps, p.z)),
    map(vec3(p.x, p.y, p.z+eps)) - map(vec3(p.x, p.y, p.z-eps))
  ));
}

// Procedural bump mapping
vec3 doBumpMap(vec3 p, vec3 nor, float bumpfactor, bool isFloor){
  const float eps = 0.001;
  float ref = isFloor ? getGrey(procTexFloor(p, nor)) : getGrey(procTex(p, nor));
  vec3 grad = vec3(
    (isFloor ? getGrey(procTexFloor(vec3(p.x-eps,p.y,p.z), nor)) : getGrey(procTex(vec3(p.x-eps,p.y,p.z), nor))) - ref,
    (isFloor ? getGrey(procTexFloor(vec3(p.x,p.y-eps,p.z), nor)) : getGrey(procTex(vec3(p.x,p.y-eps,p.z), nor))) - ref,
    (isFloor ? getGrey(procTexFloor(vec3(p.x,p.y,p.z-eps), nor)) : getGrey(procTex(vec3(p.x,p.y,p.z-eps), nor))) - ref
  )/eps;
  grad -= nor*dot(nor, grad);
  return normalize(nor + grad*bumpfactor);
}

// Ambient occlusion (IQ)
float calculateAO(vec3 p, vec3 n){
  float r = 0.0, w = 1.0;
  for(float i = 1.0; i < 6.0; i++){
    float d = i/5.0;
    r += w*(d - map(p + n*d));
    w *= 0.5;
  }
  return 1.0 - clamp(r, 0.0, 1.0);
}

// Curvature (Nimitz)
float curve(in vec3 p, in float w){
  vec2 e = vec2(-1.0, 1.0)*w;
  float t1 = map(p+e.yxx), t2 = map(p+e.xxy);
  float t3 = map(p+e.xyx), t4 = map(p+e.yyy);
  return 0.125/(w*w) * (t1+t2+t3+t4 - 4.0*map(p));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - iResolution.xy*0.5)/iResolution.y;

  // Camera
  vec3 camPos = vec3(0.0, 0.0, iTime*5.0);
  vec3 lookAt = camPos + vec3(0.0, 0.1, 0.5);
  vec3 lp1 = camPos + vec3(0.0, 0.125, -0.125);
  vec3 lp2 = camPos + vec3(0.0, 0.0, 6.0);

  lookAt.xy += path(lookAt.z);
  camPos.xy += path(camPos.z);
  lp1.xy += path(lp1.z);
  lp2.xy += path(lp2.z);

  float FOV = PI/3.0;
  vec3 forward = normalize(lookAt - camPos);
  vec3 right = normalize(vec3(forward.z, 0.0, -forward.x));
  vec3 up = cross(forward, right);
  vec3 rd = normalize(forward + FOV*uv.x*right + FOV*uv.y*up);
  rd.xy = rot2(path(lookAt.z).x/32.0)*rd.xy;

  // Ray marching
  float t = 0.0, dt;
  for(int i = 0; i < 128; i++){
    dt = map(camPos + rd*t);
    if(dt < 0.005 || t > 150.0) break;
    t += dt*0.75;
  }

  vec3 sceneCol = vec3(0.0);

  if(dt < 0.005){
    vec3 sp = camPos + rd*t;
    vec3 sn = getNormal(sp);
    bool isFloor = sp.y < -(FH - 0.005);

    // Bump mapping
    sn = doBumpMap(sp, sn, 0.025, isFloor);

    float ao = calculateAO(sp, sn);

    vec3 ld = lp1 - sp;
    vec3 ld2 = lp2 - sp;
    float dist1 = max(length(ld), 0.001);
    float dist2 = max(length(ld2), 0.001);
    ld /= dist1;
    ld2 /= dist2;

    float atten = min(1.0/dist1 + 1.0/dist2, 1.0);
    float diff = max(dot(sn, ld), 0.0);
    float diff2 = max(dot(sn, ld2), 0.0);
    float spec = pow(max(dot(reflect(-ld, sn), -rd), 0.0), 8.0);
    float spec2 = pow(max(dot(reflect(-ld2, sn), -rd), 0.0), 8.0);
    float crv = clamp(curve(sp, 0.125)*0.5 + 0.5, 0.0, 1.0);
    float fre = pow(clamp(dot(sn, rd) + 1.0, 0.0, 1.0), 1.0);

    vec3 texCol = isFloor ? procTexFloor(sp, sn) : procTex(sp, sn);
    float shading = crv*0.5 + 0.5;

    // Combine lighting
    sceneCol = getGrey(texCol)*((diff+diff2)*0.75 + 0.0625) +
               (spec+spec2)*texCol*2.0 + fre*crv*texCol.zyx*2.0;
    sceneCol *= atten*shading*ao;

    // Edge lines from curvature
    sceneCol *= clamp(1.0 - abs(curve(sp, 0.0125)), 0.0, 1.0);
  }

  fragColor = vec4(clamp(sceneCol, 0.0, 1.0), 1.0);
}
