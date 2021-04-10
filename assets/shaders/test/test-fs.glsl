#version 300 es
precision mediump float;

uniform float seconds;
uniform vec2 viewportSize;
out vec4 color;

void main() {
  float blue = (sin(seconds * 8.0) + 1.0) / 2.0;
  color = vec4(gl_FragCoord.x / viewportSize.x,
               1.0 - (gl_FragCoord.y / viewportSize.y), blue, 0.0);
}