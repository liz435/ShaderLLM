// Prompt: "hypnotic spiral tunnel with rainbow colors"
// Tags: tunnel, spiral, hypnotic, abstract, rainbow, psychedelic, vortex, trippy, warp, portal, colorful
// Based on "Spiral of Spirals" by Frank Force (2018)
#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
out vec4 fragColor;

const float pi = 3.14159265359;

vec3 hsv2rgb(vec3 c) {
    float s = c.y * c.z;
    float s_n = c.z - s * 0.5;
    return vec3(s_n) + vec3(s) * cos(2.0 * pi * (c.x + vec3(1.0, 0.6666, 0.3333)));
}

vec3 GetSpiralColor(float a, float i, float t) {
    a += 2.0 * pi * floor(i);

    // Hue
    float h = a;
    h *= 1.003 * t;
    h = 0.5 * (sin(h) + 1.0);
    h = pow(h, 3.0);
    h += 1.222 * t + 0.4;

    // Saturation
    float s = a;
    s *= 1.01 * t;
    s = 0.5 * (sin(s) + 1.0);
    s = pow(s, 2.0);

    // Value
    float v = a;
    v *= t;
    v = sin(v);
    v = 0.5 * (v + 1.0);
    v = pow(v, 3.0);

    return vec3(h, s, v);
}

void main() {
    vec2 uv = gl_FragCoord.xy;
    uv -= iResolution.xy / 2.0;
    uv /= iResolution.x;

    uv *= 40.0;

    float a = atan(uv.y, uv.x);
    float d = length(uv);

    // Apply slight pow so center is smaller
    d = pow(10.0 * d, 0.7);

    // Make spiral
    float i = d;
    i -= a / (2.0 * pi) + 0.5;

    // Change over time (auto-animated, no mouse)
    float t = 0.05 * (iTime + 80.0);

    vec3 c1 = hsv2rgb(GetSpiralColor(a, i, t));
    vec3 c2 = hsv2rgb(GetSpiralColor(a, i + 1.0, t));

    float p = fract(i);
    vec3 c3 = mix(c1, c2, p);

    fragColor = vec4(c3, 1.0);
}
