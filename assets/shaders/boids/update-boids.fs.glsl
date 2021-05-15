#version 300 es

precision mediump float;

#define HALF_PI 1.570796
#define TURN_FACTOR 0.2

#include "../noise2d.glsl"

#include "boids-uniforms.glsl"

in vec2 texcoord;

layout(location = 0) out vec4 newTargetHeading;

float randomTurn(const float boidIndex, const float prob) {
  vec2 npos = vec2(u_time * 0.4, boidIndex);
  float n = snoise(npos); // -1.0 .. 1.0
  float absn = abs(n);
  float lim = 1.0 - prob;
  return step(lim, absn) * ((absn - lim) / prob) * sign(n);
}

/**
 * FS creating new boids target heading from current boids data.
 */
void main() {
  int boidIndex = int(gl_FragCoord.x);
  vec4 boidData = texelFetch(u_boidData, ivec2(boidIndex, 0), 0);
  float speed = texelFetch(u_boidSpeed, ivec2(boidIndex, 0), 0).x;
  vec2 targetHeading = texelFetch(u_targetHeadings, ivec2(boidIndex, 0), 0).xy;

  // float angle = atan(targetHeading.y, targetHeading.x);
  // angle += randomTurn(gl_FragCoord.x, 0.5) * TURN_FACTOR;
  // targetHeading = vec2(cos(angle), sin(angle));

  for (int i = 0; i < u_boidCount; i++) {
    vec4 scanData = texelFetch(u_scanData, ivec2(i, boidIndex), 0);
    float dist = scanData.z;
    // dist / u_speedConfig.
    // vec4 target = texelFetch(u_boidData, ivec2(i, 0), 0);
    targetHeading -= scanData.xy;
  }
  targetHeading = normalize(targetHeading);

  float turnDist = (HALF_PI / u_speedConfig.z) * speed;
  vec2 targetPos = boidData.xy + targetHeading * turnDist;
  if (abs(targetPos.x) >= 1.0) {
    targetHeading.x *= -1.0;
  }
  if (abs(targetPos.y) >= 1.0) {
    targetHeading.y *= -1.0;
  }

  newTargetHeading = vec4(targetHeading, 0.0, 0.0);
}
