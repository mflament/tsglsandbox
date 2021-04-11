#version 300 es
precision mediump float;

uniform sampler2D data;

in vec2 texcoord;
out vec4 color;

void main() {
  float c = texture(data, texcoord).x;
  color = vec4(c);
}