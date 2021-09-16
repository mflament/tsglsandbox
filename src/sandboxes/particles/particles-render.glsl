#version 300 es
precision mediump float;

// in vs
layout(location = 0) in vec2 position;
layout(location = 1) in vec2 speed;
uniform float maxSpeed;

out float normalizedSpeed;

void main() {
  gl_PointSize = 1.0;
  gl_Position = vec4(position, 0.0, 1.0);
  normalizedSpeed = length(speed) / maxSpeed;
}

// in fs
in float normalizedSpeed;
out vec4 color;
void main() { color = vec4(1.0 - normalizedSpeed, normalizedSpeed, 0.0, 1.0); }