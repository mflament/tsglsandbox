#version 300 es

precision mediump float;

uniform sampler2D u_textures[];

in vec2 spriteUV;
in vec2 textureUV;

out vec4 color;

void main() { color = texture(u_texture, textureUV); }