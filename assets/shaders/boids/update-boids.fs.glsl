#version 300 es

precision mediump float;

#define HALF_PI 1.57079632679

in vec2 texcoord;

// xy: pos , zw: heading
uniform sampler2D u_boidData;
// x: speed
uniform sampler2D u_boidSpeed;
// xy: heading
uniform sampler2D u_targetHeadings;
uniform sampler2D u_scanData;

uniform vec3 u_boidConfig; // x: acceleration, y: max speed, z: turn speed

layout(location = 0) out vec4 newTargetHeading;

/**
 * FS creating new boids target heading from current boids data.
 */
void main() {
  int boidIndex = int(gl_FragCoord.x);
  vec4 boidData = texelFetch(u_boidData, ivec2(boidIndex, 0), 0);
  float speed = texelFetch(u_boidSpeed, ivec2(boidIndex, 0), 0).x;
  newTargetHeading = texelFetch(u_targetHeadings, ivec2(boidIndex, 0), 0);

  vec2 targetHeading = newTargetHeading.xy;
  float turnDist = (HALF_PI / u_boidConfig.z) * speed;
  vec2 targetPos = boidData.xy + targetHeading * turnDist;

  if (abs(targetPos.x) >= 1.0) {
    newTargetHeading.x *= -1.0;
  }
  if (abs(targetPos.y) >= 1.0) {
    newTargetHeading.y *= -1.0;
  }
  //  else if (distance(targetHeading, boidData.zw) < 0.00001) {
  //   targetHeading += 1.5;
  // }

  // vec2 n = vec2(0.0);
  // n += vec2(-1.0, 0.0) * step(1.0, targetPos.x);         // 1.0 if stopPos.x >= 1.0
  // n += vec2(0.0, -1.0) * step(1.0, targetPos.y);         // 1.0 if stopPos.y >= 1.0
  // n += vec2(1.0, 0.0) * (1.0 - step(-1.0, targetPos.x)); // 1.0 if stopPos.x < -1
  // n += vec2(0.0, 1.0) * (1.0 - step(-1.0, targetPos.y)); // 1.0 if stopPos.y < -1
  // if (length(n) > 0.00000001)
  //   heading = reflect(heading, normalize(n));
}
