#version 300 es

precision mediump float;

// in vs
layout(location = 0) in vec3 a_boidData;  // xy: pos, z angle

out vec3 newData;

// x: boid speed, y: turn speed
uniform vec2 u_boidConfig;
uniform float u_elapsedSeconds;

void main() {
  newData = a_boidData;
  vec2 heading = vec2(sin(a_boidData.z), cos(a_boidData.z));
  vec2 velocity = heading * u_boidConfig.x;
  newData.xy += velocity * u_elapsedSeconds;

  vec2 o = newData.xy + vec2(1.0);
  if (o.x < 0.0) newData.x = 1.0 + o.x;
  if (o.y < 0.0) newData.y = 1.0 + o.y;

  o = newData.xy - vec2(1.0);
  if (o.x >= 0.0) newData.x = -1.0 + o.x;
  if (o.y >= 0.0) newData.y = -1.0 + o.y;
}

// in fs
out vec4 color;

void main() { color = vec4(1.0); }