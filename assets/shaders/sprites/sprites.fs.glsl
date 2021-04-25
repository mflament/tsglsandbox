#version 300 es

precision mediump float;

in vec2 spriteUV;

out vec4 color;

void main() { color = vec4(spriteUV.x, spriteUV.y, 0.0, 1.0); }