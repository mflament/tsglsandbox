#version 300 es

precision mediump float;

// in vs
layout(location = 0) in vec3 a_targetData;  // xy: pos, z: angle
layout(location = 1) in vec3 a_boidData;    // xy: pos, z: angle

out vec4 neighbourData;  // xy: heading, z: distance,

uniform int u_boidsCount;
uniform vec2 u_boidConfig;  // x: fov, y: view distance

// https://stackoverflow.com/questions/2931573/determining-if-two-rays-intersect
bool couldCollide(vec2 as, vec2 ad, vec2 bs, vec2 bd) {
  vec2 d = bs - as;
  float det = bd.x * ad.y - bd.y * ad.x;
  if (det == 0.0) return false;
  float u = (d.y * bd.x - d.x * bd.y) / det;
  float v = (d.y * ad.x - d.x * ad.y) / det;
  return u > 0.0 && v > 0.0;
}

void main() {
  vec2 s = vec2(2.0 / float(u_boidsCount));
  vec2 pos = vec2(-1.0) + vec2(float(gl_VertexID), float(gl_InstanceID)) * s +
             s / vec2(2.0);
  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = 1.0;
  float score = 0.0;
  if (gl_VertexID != gl_InstanceID) {
    vec2 td = a_targetData.xy - a_boidData.xy;
    float ds = clamp(1.0 - length(td) / u_boidConfig.y, 0.0, 1.0);
    if (ds > 0.0) {
      float angle = a_boidData.z;
      vec2 heading = vec2(sin(angle), cos(angle));
      float d = dot(heading, normalize(td));
      if (d > u_boidConfig.x) {
        angle = a_targetData.z;
        vec2 targetHeading = vec2(sin(angle), cos(angle));
        if (couldCollide(a_boidData.xy, heading, a_targetData.xy,
                         targetHeading)) {
          score = ds;
        }
      }
    }
  }
  neighbourData = vec4(score, 0.0, 0.0, 1);
}

// in fs
in vec4 neighbourData;
out vec4 color;

void main() { color = neighbourData; }