#version 300 es
precision mediump float;

#include "./boids.glsl"

uniform vec2 u_time; // x: time, y: delta time
uniform int u_boidsCount;

// xy: pos , zw: velocity
layout(location = 0) out vec4 data;

void main() {
  int boidIndex = int(gl_FragCoord.x);
  Boid boid;
  getBoid(boidIndex, boid);
  Familly familly = getFamilly(boid.familly);
  Rules rules = getFamillyRules(boid.familly);
  // Rules rules;
  // rules.radii = vec3(0.5, 0.0, 0.0);
  // rules.weights = vec3(1.0);

  vec2 velocity = boid.velocity;

  vec2 com = vec2(0.0);       // center of mass
  vec2 c = vec2(0.0);         // separation vector
  vec2 pv = vec2(0.0);        // perceived velocity
  vec3 neighbors = vec3(0.0); // count per rules
  Boid neighbor;
  for (int i = 0; i < u_boidsCount; i++) {
    getBoid(i, neighbor);
    if (i != boidIndex && neighbor.familly == boid.familly) {
      vec2 dir = neighbor.pos - boid.pos;
      float dist = length(dir);
      vec3 steps = vec3(1.0) - step(rules.radii, vec3(dist));

      // cohesion
      com += neighbor.pos * steps.x;

      // separation
      c -= dir * steps.y;

      // aligment
      pv += neighbor.velocity * steps.z;

      neighbors += vec3(1.0) * steps;
    }
  }

  com = neighbors.x > 0.0 ? (com / neighbors.x) - boid.pos : vec2(0.0);
  pv = neighbors.z > 0.0 ? pv / neighbors.z : vec2(0.0);

  float boundWeight = clamp(length(boid.pos) - 1.0, 0.0, 1.0);
  vec2 bounding = -boid.pos * boundWeight;

  velocity += com * rules.weights.x + c * rules.weights.y + pv * rules.weights.z + bounding * rules.weights.w;

  float speed = clamp(length(velocity), 0.0, familly.maxSpeed);
  vec2 heading = normalize(velocity);
  velocity = heading * speed;

  vec2 pos = boid.pos + velocity * u_time.y;

  data = vec4(pos, velocity);
}