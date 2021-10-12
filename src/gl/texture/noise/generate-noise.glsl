#version 300 es

precision mediump float;

#include "shaders/noise2d.glsl"
in vec2 texcoord;

uniform vec2 offset;
uniform vec2 scale;
uniform vec2 range;
uniform int octaves;
uniform float persistence;

out vec4 color;

void main() {
    vec2 pos = texcoord * scale + offset;
    float n = 0.0;
    float freq = 1.0;
    float amp = 1.0;
    float samp = 0.0;
    for (int i = 0; i < octaves; i++) {
        n += (snoise(pos * freq) * 0.5 + 0.5) * amp;
        samp += amp;
        amp *= persistence;
        freq *= 2.0;
    }
    n /= samp;
    n = mix(range.x, range.y, n);
    color = vec4(n);
}
