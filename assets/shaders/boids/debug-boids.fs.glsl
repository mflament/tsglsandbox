#version 300 es
precision mediump float;

#include "boids-uniforms.glsl"

in vec2 texcoord;
out vec4 color;

void main() {
  int maxBoids = textureSize(u_boidData, 0).x;
  int boidIndex = int(texcoord.x * float(maxBoids));
  color = boidIndex < u_boidCount ? texelFetch(u_boidData, ivec2(boidIndex, 0), 0) : vec4(0.0, 0.0, 0.0, 1.0);
  // color = texture(u_boidData, texcoord);
  // color = vec4(texcoord, 0.0, 1.0);
}