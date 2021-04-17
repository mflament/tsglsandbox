#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_cityPosition;
layout(location = 1) in vec3 a_cityColor;

uniform mat4 viewMatrix;

uniform float cityRadius;

out vec3 cityColor;

void main() {
  gl_PointSize = cityRadius;
  gl_Position = vec4(a_cityPosition, 0.0, 1.0) * viewMatrix;
  cityColor = a_cityColor;
}