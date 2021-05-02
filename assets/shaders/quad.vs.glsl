#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;

out vec2 texcoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  texcoord = (a_position + vec2(1.0)) / 2.0;
}