#include "shaders/noise2d.glsl"

uniform vec2 size;
uniform vec2 offset;
uniform vec2 scale;
uniform vec2 range;
uniform int octaves;
uniform float persistence;

void main() {
    vec2 pos = gl_FragCoord.xy / size * scale + offset;
    float n = 0.0;
    float freq = 1.0;
    float amp = 1.0;
    float samp = 0.0;
    for (int i = 0; i < octaves; i++) {
        n += (snoise(pos * freq) + 1.0) / 2.0 * amp;
        samp += amp;
        amp *= persistence;
        freq *= 2.0;
    }
    n /= samp;
    n = mix(range.x, range.y, n);
    pc_fragColor = vec4(n);
}
