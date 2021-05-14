#version 300 es
precision mediump float;

uniform sampler2D u_sampler;
in vec2 texcoord;
out vec4 color;

void main() { color = texture(u_sampler, texcoord); }