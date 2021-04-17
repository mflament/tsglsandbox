#version 300 es

precision mediump float;

in vec3 cityColor;

out vec4 color;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5, 0.5);
  float f = 1.0 - smoothstep(0.3, 0.5, length(d));
  color = vec4(cityColor * f, 1.0);
}