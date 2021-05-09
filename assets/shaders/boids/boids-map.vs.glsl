#version 300 es

precision mediump float;

layout(location = 0) in vec3 a_boidData;    // xy: pos, z: angle
layout(location = 1) in vec3 a_targetData;  // xy: pos, z: angle

out float target_dist;  // -1 if not in sight

uniform vec2 u_boidConfig;  // x: fov, y: view distance

void main() {
  vec2 td = a_targetData.xy - a_boidData.xy;
  float dist = length(td);
  if (dist > u_boidConfig.y) {
    target_dist = -1.0;
  } else {
    float angle = a_boidData.z;
    vec2 heading = vec2(sin(angle), cos(angle));
    target_dist = dot(heading, normalize(td)) > u_boidConfig.y ? -1.0 : dist;
  }
}