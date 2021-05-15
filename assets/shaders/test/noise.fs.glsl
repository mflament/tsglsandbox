#version 300 es
precision mediump float;

#include "../noise2d.glsl"

uniform sampler2D u_sampler;
uniform float u_time;
in vec2 texcoord;
out vec4 color;

float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

float randomTurn(const float boidIndex, const float prob) {
  vec2 npos = vec2(u_time * 0.3, boidIndex);
  float n = snoise(npos); // -1.0 .. 1.0
  float absn = abs(n);
  float lim = 1.0 - prob;
  return step(lim, absn) * ((absn - lim) / prob) * sign(n);
}

void main() {
  color = vec4(0.0, 0.0, 0.0, 1.0);
  float a = randomTurn(0.0, 0.5);
  color.r = abs(a) * step(0.0, a);
  color.g = abs(a) * (1.0 - step(0.0, a));
}
