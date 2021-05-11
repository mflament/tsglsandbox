#version 300 es
precision mediump float;

uniform float seconds;
uniform sampler2D u_sampler;

in vec2 texcoord;
out vec4 color;

void main() {
  vec2 tc = vec2(texcoord.x + sin(seconds * 6.0 + texcoord.y * 3.0) * 0.06,
                 texcoord.y);
  color = texture(u_sampler, tc);
}