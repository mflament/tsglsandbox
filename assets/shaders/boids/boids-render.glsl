#version 300 es
precision mediump float;

// in vs
layout(location = 0) in vec2 a_position;

uniform vec4 u_boidConfig;  // xy: scale, z:  view distance, w: fov
uniform vec4 u_boidColor;
uniform sampler2D u_boidData;
uniform sampler2D u_scanTexture;

out vec4 boidColor;

mat4 scaleMatrix() {
  return mat4(u_boidConfig.x, 0.0, 0.0, 0.0,  // col 0
              0.0, u_boidConfig.y, 0.0, 0.0,  // col 1
              0.0, 0.0, 1.0, 0.0,             //
              0.0, 0.0, 0.0, 1.0);
}

mat4 translateMatrix(const vec2 pos) {
  return mat4(1.0, 0.0, 0.0, 0.0,  // col 0
              0.0, 1.0, 0.0, 0.0,  // col 1
              0.0, 0.0, 1.0, 0.0,  //
              pos.x, pos.y, 0.0, 1.0);
}

mat4 rotationMatrix(const float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat4(c, -s, 0.0, 0.0,     // col 0
              s, c, 0.0, 0.0,      // col 1
              0.0, 0.0, 1.0, 0.0,  //
              0.0, 0.0, 0.0, 1.0);
}

void main() {
  int boidIndex = gl_InstanceID;
  vec4 boidData = texelFetch(u_boidData, ivec2(gl_InstanceID, 0), 0);
  gl_Position = translateMatrix(boidData.xy) * scaleMatrix() *
                rotationMatrix(boidData.z) * vec4(a_position, 0.0, 1.0);
  boidColor = u_boidColor;
  if (boidIndex != 0) {
    // xy: target heading , z: target dist, w: dot(boid,target)
    vec4 scanData = texelFetch(u_scanTexture, ivec2(boidIndex, 0), 0);
    float df = 1.0 - scanData.z / u_boidConfig.z;
    float da = (scanData.w - u_boidConfig.w) / (1.0 - u_boidConfig.w);
    boidColor = vec4(vec3(df * da), 1.0);
  }
}

// in fs
in vec4 boidColor;
out vec4 color;

void main() { color = boidColor; }