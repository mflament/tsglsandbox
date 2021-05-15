#version 300 es
precision mediump float;

// in vs
#include "boids-uniforms.glsl"

layout(location = 0) in vec2 a_position;

out vec4 boidColor;

mat4 scaleMatrix() {
  return mat4(u_boidScale.x, 0.0, 0.0, 0.0, // col 0
              0.0, u_boidScale.y, 0.0, 0.0, // col 1
              0.0, 0.0, 1.0, 0.0,           //
              0.0, 0.0, 0.0, 1.0);
}

mat4 translateMatrix(const vec2 pos) {
  return mat4(1.0, 0.0, 0.0, 0.0, // col 0
              0.0, 1.0, 0.0, 0.0, // col 1
              0.0, 0.0, 1.0, 0.0, //
              pos.x, pos.y, 0.0, 1.0);
}

mat4 rotationMatrix(const vec2 heading) {
  float angle = atan(heading.y, heading.x);
  float c = cos(angle);
  float s = sin(angle);
  return mat4(c, s, 0.0, 0.0,     // col 0
              -s, c, 0.0, 0.0,    // col 1
              0.0, 0.0, 1.0, 0.0, //
              0.0, 0.0, 0.0, 1.0);
}

mat4 transformMatrix(const vec2 position, const vec2 heading) {
  return translateMatrix(position) * scaleMatrix() * rotationMatrix(heading);
}

void main() {
  int boidIndex = gl_InstanceID;
  vec4 boidData = texelFetch(u_boidData, ivec2(gl_InstanceID, 0), 0);
  gl_Position = transformMatrix(boidData.xy, boidData.zw) * vec4(a_position, 0.0, 1.0);

  boidColor = u_boidColor;
  if (boidIndex != 0) {
    // xy: boid to target unit vector , z: target dist
    vec4 scanData = texelFetch(u_scanData, ivec2(boidIndex, 0), 0);
    vec4 refBoid = texelFetch(u_boidData, ivec2(0, 0), 0);
    float d = dot(refBoid.zw, scanData.xy);
    boidColor.r = 1.0 - scanData.w;
    boidColor.g = 0.0;
    boidColor.b = scanData.w;
  }
}

// in fs
in vec4 boidColor;
out vec4 color;

void main() { color = boidColor; }