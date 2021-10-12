uniform sampler2D uTerrain;

uniform vec2 size;

float getHeight(vec2 texcoord, float s, float t) {
    vec2 coord = texcoord + vec2(s, t) / size;
    return texture2D(uTerrain, coord).x;
}

void main() {
    vec2 texcoord = gl_FragCoord.xy / size;
    float height = getHeight(texcoord, 0.0, 0.0);
    float left = getHeight(texcoord, -1.0, 0.0);
    float right = getHeight(texcoord, 1.0, 0.0);
    float bottom = getHeight(texcoord, 0.0, -1.0);
    float top = getHeight(texcoord, 0.0, 1.0);
    float dS = (right - left) * 0.5;
    float dT = (top - bottom) * 0.5;
    pc_fragColor = vec4(height, dS * size.s, dT * size.t, 1.0);
}
