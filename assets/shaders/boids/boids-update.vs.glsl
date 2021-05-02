#version 300 es

#define BOIDS 1
#define ANGLE_RANGE 0.174533
#define HALF_ANGLE_RANGE 0.0872665

precision mediump float;

layout(location = 1) in vec4 a_boidData;  // xy: pos, z: angle, w: speed
layout(location = 2) in vec4 a_boidColor;

out vec4 newData;  // xy: pos, z: angle, w: speed
out vec4 newColor;

// x: view distance, y: acceleration, z: max speed, w: rot speed
uniform vec4 u_boidConfig;
uniform sampler2D u_boidsMap;
uniform float u_elapsedSeconds;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  newData = a_boidData;
  float angle = a_boidData.z;
  float v = a_boidData.w;
  float a = u_boidConfig.y;

  float maxturn = u_boidConfig.w * 10.0 * u_elapsedSeconds;
  angle += rand(a_boidData.xy) * maxturn - maxturn / 2.0;
  vec2 heading = vec2(sin(angle), cos(angle));
  float stopDist = (v * v) / (2.0 * a);
  vec2 target = a_boidData.xy + heading * stopDist;
  vec2 velocity;
  if (target.x <= -1.0 || target.y <= -1.0 || target.x >= 1.0 ||
      target.y >= 1.0) {
    angle += u_boidConfig.w * u_elapsedSeconds;
    heading = vec2(sin(angle), cos(angle));
  }

  velocity = heading * v + heading * a * u_elapsedSeconds;
  velocity = clamp(velocity, vec2(0), heading * u_boidConfig.z);
  newData.xy += velocity * u_elapsedSeconds;
  newData.z = angle;
  newData.w = length(velocity);
  // newData.z += rand(a_boidData.xy) * 0.261799 - 0.1309;
  // newData.z += stopDist * 0.1;
  newColor = a_boidColor;
}