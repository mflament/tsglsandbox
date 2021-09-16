#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;

// xy: offset, zw: scale
uniform vec2 u_transform;

out vec2 texcoord;

void main() {
  vec2 pos = a_position * u_transform.xy;
  gl_Position = vec4(pos, 0.0, 1.0);
  texcoord = (a_position + vec2(1.0)) / 2.0;
}