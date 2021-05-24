#version 300 es
precision mediump float;

#include "../noise2d.glsl"
#include "./boids.glsl"

uniform vec2 u_time; // x: time, y: delta time
uniform int u_boidsCount;

// xy: pos , zw: velocity
layout(location = 0) out vec4 data;

// http://www.red3d.com/cwr/boids/
// http://www.vergenet.net/~conrad/boids/pseudocode.html
void main() {
  int boidIndex = int(gl_FragCoord.x);
  Boid boid = getBoid(boidIndex);
  vec3 radii = boidFamilly.radii.xyz;
  vec4 weights = boidFamilly.weights;

  vec2 velocity = boid.velocity;
  float speed = length(velocity);
  vec2 heading = velocity / speed;

  vec2 com = vec2(0.0);       // center of mass
  vec2 c = vec2(0.0);         // separation vector
  vec2 pv = vec2(0.0);        // perceived velocity
  vec3 neighbors = vec3(0.0); // count per rules
  Boid neighbor;
  for (int i = 0; i < u_boidsCount; i++) {
    if (i != boidIndex) {
      getBoid(i, neighbor);
      vec2 dir = neighbor.pos - boid.pos;
      float dist = length(dir);
      // dir /= dist;
      vec3 steps = vec3(1.0) - step(radii, vec3(dist));

      float d = dot(dir / dist, heading);
      steps *= step(boidFamilly.fov, d);

      // cohesion
      com += neighbor.pos * steps.x;

      // separation
      c -= (dir / dist) * steps.y;

      // aligment
      pv += neighbor.velocity * steps.z;

      neighbors += vec3(1.0) * steps;
    }
  }

  com = neighbors.x > 0.0 ? (com / neighbors.x) - boid.pos : vec2(0.0);
  // pv = neighbors.z > 0.0 ? pv / neighbors.z : vec2(0.0);

  float boundRadius = boidFamilly.radii.w;
  vec2 boundSteps = vec2(1.0) - step(vec2(-1.0 - boundRadius), boid.pos);
  vec2 bounding = vec2(1.0) * boundSteps;
  boundSteps = step(vec2(1.0 + boundRadius), boid.pos);
  bounding -= vec2(1.0) * boundSteps;

  vec2 targetVelocity = velocity + com * weights.x + c * weights.y + pv * weights.z + bounding * weights.w;
  float targetSpeed = length(targetVelocity);
  vec2 targetHeading = targetVelocity / targetSpeed;
  targetSpeed = clamp(targetSpeed, 0.0, boidFamilly.maxSpeed);
  targetVelocity = targetSpeed * targetHeading;

  speed += boidFamilly.acceleration * u_time.y * sign(targetSpeed - speed);
  speed = clamp(speed, 0.1, targetSpeed);

  float d = dot(heading, targetHeading);
  float rd = dot(vec2(heading.y, -heading.x), targetHeading);
  float angle = clamp(boidFamilly.turnSpeed * u_time.y, 0.0, acos(d)) * sign(rd) * -1.0;
  float noise = snoise(vec2(gl_FragCoord.x * 10.0, u_time.x));
  angle += noise * 0.05;

  float ca = cos(angle);
  float sa = sin(angle);
  heading.x = heading.x * ca - heading.y * sa;
  heading.y = heading.x * sa + heading.y * ca;

  velocity = heading * speed;

  vec2 pos = boid.pos + velocity * u_time.y;
  data = vec4(pos, velocity);
}