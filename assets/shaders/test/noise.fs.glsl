#version 300 es
precision mediump float;

uniform sampler2D u_sampler;

in vec2 texcoord;
out vec4 color;

void main() { color = vec4(vec3(texture(u_sampler, texcoord).r), 1.0); }