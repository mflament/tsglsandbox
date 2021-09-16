#version 300 es
precision mediump float;

const vec3 FLOWERS_COLORS[2] = vec3[](vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));

#define MODE_PREDS 0
#define MODE_SAMPLES_ONLY 1

// r: target, g : pred, b: is sample
uniform sampler2D u_flowers;
uniform int u_mode;

in vec2 texcoord;
out vec4 color;

float circleMask() {
    ivec2 dim = textureSize(u_flowers, 0);
    vec2 size = 1.0 / vec2(dim);
    vec2 rtc = mod(texcoord, size) / size;
    vec2 d = rtc - vec2(0.5);
    return 1.0 - smoothstep(0.3, 0.5, length(d));
}

void main() {
    // r: target, g : pred, b: is sample
    vec3 inputs = texture(u_flowers, texcoord).rgb;

    int target = int(inputs.r * 255.0);
    int pred = int(inputs.g * 255.0);
    float error = float(abs(target - pred));

    vec3 c = FLOWERS_COLORS[inputs.b == 1.0 ? pred : target];
    float mask = 0.25 + (1.0 - error) * 0.4;
    if (u_mode == MODE_SAMPLES_ONLY) {
        c *= inputs.b * mask;
    } else {
        mask += inputs.b * 0.35;
        c *= mask;
    }

    color = vec4(c, 1.0);
    color.rgb *= circleMask();
}