#version 300 es
precision mediump float;

// in vs
layout(location = 0) in vec2 a_position;

out vec4 boidColor;

#include "./boids.glsl"

mat4 transformMatrix(const in Boid boid) {
  mat4 translate = mat4(1.0, 0.0, 0.0, 0.0, // col 0
                        0.0, 1.0, 0.0, 0.0, // col 1
                        0.0, 0.0, 1.0, 0.0, // col 2
                        boid.pos.x, boid.pos.y, 0.0, 1.0);

  mat4 scale = mat4(boidFamilly.scale.x, 0.0, 0.0, 0.0, // col 0
                    0.0, boidFamilly.scale.y, 0.0, 0.0, // col 1
                    0.0, 0.0, 1.0, 0.0,                 // col 2
                    0.0, 0.0, 0.0, 1.0);

  vec2 heading = normalize(boid.velocity);
  float angle = atan(heading.y, heading.x);
  float c = cos(angle);
  float s = sin(angle);
  mat4 rotate = mat4(c, s, 0.0, 0.0,     // col 0
                     -s, c, 0.0, 0.0,    // col 1
                     0.0, 0.0, 1.0, 0.0, // col 2
                     0.0, 0.0, 0.0, 1.0);

  return translate * scale * rotate;
}

void main() {
  int boidIndex = gl_InstanceID;
  Boid boid = getBoid(boidIndex);
  gl_Position = transformMatrix(boid) * vec4(a_position, 0.0, 1.0);
  boidColor = boidFamilly.color;
}

// in fs
in vec4 boidColor;
out vec4 color;

void main() { color = boidColor; }