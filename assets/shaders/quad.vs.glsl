#version 300 es
precision mediump float;

layout(location = 0) in vec2 position;
out vec2 texcoord;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  texcoord = (position + vec2(1.0)) / 2.0;
}