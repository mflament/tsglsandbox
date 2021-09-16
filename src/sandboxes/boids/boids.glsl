
// [boids, 1 ] xy: pos , zw: velocity
uniform sampler2D u_boidData;

struct Boid {
  vec2 pos;
  vec2 velocity;
};

layout(std140) uniform u_familly {

  vec4 scale; // keep vec4 alignment

  float acceleration;
  // screen unit/s
  float maxSpeed;
  // rad/s
  float turnSpeed;
  // fov threshold = acos(fov)
  float fov;

  vec4 color;
  // x: cohesion , y:  separation, z:aligment, w: bounding
  vec4 radii;
  // x: cohesion , y:  separation, z:aligment, w: bounding
  vec4 weights;
}
boidFamilly;

void getBoid(const int index, out Boid boid) {
  vec4 p = texelFetch(u_boidData, ivec2(index, 0), 0);
  boid.pos = p.xy;
  boid.velocity = p.zw;
}

Boid getBoid(const int index) {
  Boid boid;
  getBoid(index, boid);
  return boid;
}
