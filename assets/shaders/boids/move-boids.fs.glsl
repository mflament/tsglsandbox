#version 300 es

precision mediump float;

#include "boids-uniforms.glsl"

in vec2 texcoord;

layout(location = 0) out vec4 newBoidData;
layout(location = 1) out vec4 newBoidSpeed;

/**
 * FS creating new boids data to target headings, update velocity & position.
 **/
void main() {
  int boidIndex = int(gl_FragCoord.x);
  vec4 boidData = texelFetch(u_boidData, ivec2(boidIndex, 0), 0);
  vec2 targetHeading = texelFetch(u_targetHeadings, ivec2(boidIndex, 0), 0).xy;
  vec2 heading = boidData.zw;
  float speed = texelFetch(u_boidSpeed, ivec2(boidIndex, 0), 0).x;

  float dotHeading = dot(heading, targetHeading);
  float angleDiff = acos(dotHeading);
  float dotRight = dot(vec2(heading.y, -heading.x), targetHeading);

  float angle = atan(heading.y, heading.x);
  angle += clamp(u_speedConfig.z * u_deltaTime, 0.0, angleDiff) * (dotRight < 0.0 ? 1.0 : -1.0);
  heading = vec2(cos(angle), sin(angle));

  float a = u_speedConfig.x * dot(heading, targetHeading);
  speed = clamp(speed + a * u_deltaTime, 0.0, u_speedConfig.y);

  vec2 velocity = heading * speed;
  newBoidData = vec4(boidData.xy + velocity * u_deltaTime, heading);
  newBoidSpeed = vec4(speed);
}
