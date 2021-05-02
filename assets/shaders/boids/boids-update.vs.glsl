#version 300 es

#define BOIDS 1

precision mediump float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_heading;

out vec2 newVelocity;

uniform float viewDistance;
uniform sampler2D u_world;

void main() {
  vec2 pos = a_position;
  for (int i = 0; i < viewDistance; i++) {
  }
}