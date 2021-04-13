#version 300 es

precision mediump float;
precision lowp int;

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 speed;

out vec2 outputPosition;
out vec2 outputSpeed;

uniform float maxSpeed;
uniform float acceleration;
uniform int mode;

uniform float elapsed;

uniform vec2 target;

const int MODE_REPULSE = 1;
const int MODE_RELAX = 2;

void main() {
  vec2 heading;
  switch (mode) {
    case MODE_REPULSE:
      heading = -normalize(target - position);
      break;
    case MODE_RELAX:
      heading = normalize(speed);
      break;
    default:
      // attract
      heading = normalize(target - position);
      break;
  }

  outputSpeed = speed + heading * (acceleration * elapsed);
  if (length(outputSpeed) > maxSpeed)
    outputSpeed = normalize(outputSpeed) * maxSpeed;
  outputPosition = position + outputSpeed * elapsed;
}