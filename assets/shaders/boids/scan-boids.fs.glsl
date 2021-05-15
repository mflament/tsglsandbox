#version 300 es

precision mediump float;

#include "boids-uniforms.glsl"

in vec2 texcoord;

// xy: normalized dir to target, z: dist to target
layout(location = 0) out vec4 scanData;

void main() {
  int boidIndex = int(gl_FragCoord.y);
  int targetIndex = int(gl_FragCoord.x);
  vec4 boidData = texelFetch(u_boidData, ivec2(boidIndex, 0), 0);
  vec4 targetData = texelFetch(u_boidData, ivec2(targetIndex, 0), 0);
  vec2 toTarget = targetData.xy - boidData.xy;

  scanData = vec4(0.0);
  float dist = length(toTarget);
  if (boidIndex != targetIndex && dist <= u_scanConfig.x) {
    toTarget = normalize(toTarget);
    float d = dot(boidData.zw, toTarget);
    float s = step(u_scanConfig.y, d);
    scanData = vec4(toTarget, dist, 1.0) * s;
  }
}
