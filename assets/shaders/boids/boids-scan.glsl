#version 300 es

precision mediump float;

// boid data layout : xy: pos, z: angle from vec2(0.0 , 1.0)
// in vs
layout(location = 0) in vec3 a_targetData;
layout(location = 1) in vec3 a_boidData;

out vec3 boidData;
out vec3 targetData;

uniform int u_boidsCount;

void main() {
  vec2 pos = vec2(float(gl_VertexID), float(gl_InstanceID));
  vec2 s = vec2(2.0 / float(u_boidsCount));
  pos = vec2(-1.0) + pos * s + s / vec2(2.0);
  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = 1.0;
  boidData = a_boidData;
  targetData = a_targetData;
}

// in fs
in vec4 neighbourData;

in vec3 boidData;    // xy: heading, z: distance,
in vec3 targetData;  // xy: heading, z: distance,

// xy: target heading , z: target dist, w: dot(boid,target)
out vec4 neigborData;

void main() {
  // vector from boid to target
  vec2 toTarget = targetData.xy - boidData.xy;
  float dist = length(toTarget);
  float angle = boidData.z;
  vec2 heading = vec2(sin(angle), cos(angle));
  angle = targetData.z;
  vec2 targetHeading = vec2(sin(angle), cos(angle));
  neigborData.xy = targetHeading;
  neigborData.z = dist;
  neigborData.w = dot(heading, normalize(toTarget));
}