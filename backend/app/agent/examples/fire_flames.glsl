// Prompt: "realistic fire and flames"
// Tags: fire, flame, flames, burning, hot, warm, emissive, torch, campfire, inferno, heat, lava
// Based on "Volumetric Fire" by myth0genesis — adapted from nimitz's Protean clouds
#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
out vec4 fragColor;

const mat3 m3 = mat3( 0.3338,  0.56034, -0.71817,
                     -0.87887, 0.32651, -0.15323,
                      0.15162, 0.69596,  0.61339) * 1.93;

float LinStep(float mn, float mx, float x) {
    return clamp((x - mn) / (mx - mn), 0.0, 1.0);
}

mat2 rotate(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

// Gyroid-based fBm (nimitz)
float gyroidFBM3D(vec3 p, float cl) {
    float d = 0.0;
    p *= 0.185;
    p.z -= iTime;
    float z = 1.0;
    float trk = 1.0;
    float dspAmp = 0.1;
    for(int i = 0; i < 5; i++) {
        p += sin(p.yzx * 1.5 * trk) * dspAmp;
        d -= abs(dot(cos(p), sin(p.zxy)) * z);
        z *= 0.7;
        trk *= 1.4;
        p = p * m3;
        p -= iTime * 2.0;
    }
    return (cl + d * 6.5) * 0.5;
}

// Volumetric ray marcher
vec3 transRender(vec3 ro, vec3 rd) {
    vec4 rez = vec4(0.0);
    float t = 20.0;
    for(int i = 0; i < 100; i++) {
        if(rez.w > 0.99) break;
        vec3 pos = ro + t * rd;
        float mpv = gyroidFBM3D(pos, -pos.z);
        float den = clamp(mpv - 0.2, 0.0, 1.0) * 0.71;
        float dn = clamp(mpv * 2.0, 0.0, 3.0);
        vec4 col = vec4(0.0);
        if(mpv > 0.6) {
            col = vec4(11.0, 1.0, 0.0, 0.08);
            col *= den;
            col.xyz *= LinStep(3.0, -1.0, mpv) * 3.0;
            float dif = clamp((den - mpv + 1.5) * 0.125, 0.08, 1.0);
            col.xyz *= den * (1.5 * vec3(0.005, 0.045, 0.075) + 1.5 * vec3(0.033, 0.05, 0.030) * dif);
        }
        rez += col * (1.0 - rez.w);
        t += clamp(0.25 - dn * dn * 0.05, 0.15, 1.4);
    }
    return clamp(rez.xyz, 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(uv.x, 1.0, uv.y));

    // Slow gentle rotation for visual interest
    rd.xy *= rotate(sin(iTime * 0.5) * 0.15);

    vec3 col = transRender(ro, rd);
    fragColor = vec4(col, 1.0);
}
