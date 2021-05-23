
// [boids, 1 ] xy: pos , zw: velocity
uniform sampler2D u_boidData;
// [boids, 1] : x : familly index
uniform sampler2D u_boidFamilies;

// [families, 1] : xy:  size, z: max speed
uniform sampler2D u_families;

// [families, 1] : rgba
uniform sampler2D u_famillyColors;

// [familly, 1] : x: cohesion , y:  separation, z:aligment
uniform sampler2D u_famillyRadii;
// [familly, 1] : x: cohesion , y:  separation, z:aligment, w: bounding
uniform sampler2D u_famillyWeights;

struct Boid {
  vec2 pos;
  vec2 velocity;
  int familly;
};

struct Familly {
  vec2 size;
  float maxSpeed;
};

struct Rules {
  vec3 radii;
  vec4 weights;
};

void getBoid(const int index, out Boid boid) {
  vec4 p = texelFetch(u_boidData, ivec2(index, 0), 0);
  boid.pos = p.xy;
  boid.velocity = p.zw;

  p = texelFetch(u_boidFamilies, ivec2(index, 0), 0);
  boid.familly = int(p.x * 255.0);
}

Familly getFamilly(const int index) {
  vec4 p = texelFetch(u_families, ivec2(index, 0), 0);
  Familly familly;
  familly.size = p.xy;
  familly.maxSpeed = p.z;
  return familly;
}

vec4 getFamillyColor(const int index) { return texelFetch(u_famillyColors, ivec2(index, 0), 0); }

Rules getFamillyRules(const int index) {
  Rules rules;
  rules.radii = texelFetch(u_famillyRadii, ivec2(index, 0), 0).rgb;
  rules.weights = texelFetch(u_famillyWeights, ivec2(index, 0), 0);
  return rules;
}