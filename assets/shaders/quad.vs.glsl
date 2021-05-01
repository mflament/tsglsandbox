#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec4 a_color;

out vec2 texcoord;
out vec4 point_color;

void main() {
  gl_PointSize = 4.0;
  gl_Position = vec4(a_position, 0.0, 1.0);
  texcoord = (a_position + vec2(1.0)) / 2.0;
  point_color = a_color;
}