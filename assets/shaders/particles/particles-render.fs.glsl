#version 300 es

precision mediump float;

in float normalizedSpeed;

out vec4 color;

void main() { color = vec4(1.0 - normalizedSpeed, normalizedSpeed, 0.0, 1.0); }