#version 300 es
precision mediump float;

// in vs
layout(location = 0) in vec2 a_cityPosition;
layout(location = 1) in vec3 a_cityColor;

uniform mat4 viewMatrix;
uniform float cityRadius;
out vec3 cityColor;

void main() {
  gl_PointSize = cityRadius;
  gl_Position = vec4(a_cityPosition, 0.0, 1.0) * viewMatrix;
  cityColor = a_cityColor;
}

// in fs
in vec3 cityColor;
out vec4 color;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5, 0.5);
  float f = 1.0 - smoothstep(0.3, 0.5, length(d));
  color = vec4(cityColor * f, 1.0);
}