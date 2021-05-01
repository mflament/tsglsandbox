#version 300 es
precision mediump float;

in vec4 point_color;
out vec4 color;

void main() { color = point_color; }