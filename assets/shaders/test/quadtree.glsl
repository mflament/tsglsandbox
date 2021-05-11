#version 300 es
precision mediump float;

// in vs
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec4 a_color;

out vec4 point_color;

void main() {
  gl_PointSize = 4.0;
  gl_Position = vec4(a_position, 0.0, 1.0);
  point_color = a_color;
}

// in fs
in vec4 point_color;
out vec4 color;

void main() { color = point_color; }