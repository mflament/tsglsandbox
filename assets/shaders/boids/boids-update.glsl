#version 300 es

precision mediump float;

// in vs
layout(location = 0) in vec3 a_boidData;  // xy: pos, z angle

out vec3 newData;

uniform int u_boidsCount;
// xy: scale, z: fov, w: view distance
uniform vec4 u_boidConfig;
// x: boid speed, y: turn speed
uniform vec2 u_updateConfig;

uniform float u_elapsedSeconds;
uniform sampler2D u_scanTexture;

// void move

void main() {
  newData = a_boidData;
  vec2 heading = vec2(sin(a_boidData.z), cos(a_boidData.z));
  // float dangerZone = 3.0 * u_boidConfig.y / 2.0;
  // bool blocked;
  // for (int i = 0; i < u_boidsCount; i++) {
  //   if (i != gl_InstanceID) {
  //     ivec2 scanPos = ivec2(i, gl_InstanceID);
  //     // xy: target heading , z: target dist, w: dot(boid,target)
  //     vec4 scanData = texelFetch(u_scanTexture, scanPos, 0);
  //     float df = clamp(1.0 - scanData.z / u_boidConfig.w, 0.0, 1.0);
  //     float da = (scanData.w - u_boidConfig.z) / (1.0 - u_boidConfig.z);
  //     if (scanData.w >= 0.9 && df >= 0.5) {
  //     }

  //     if (scanData.w >= 0.9 && scanData.z <= dangerZone) {
  //     }
  //     // boidColor = vec4(vec3(df * da), 1.0);
  //   }
  // }
  vec2 velocity = heading * u_boidConfig.x;
  newData.xy += velocity * u_elapsedSeconds;

  vec2 o = newData.xy + vec2(1.0);
  if (o.x < 0.0) newData.x = 1.0 + o.x;
  if (o.y < 0.0) newData.y = 1.0 + o.y;

  o = newData.xy - vec2(1.0);
  if (o.x >= 0.0) newData.x = -1.0 + o.x;
  if (o.y >= 0.0) newData.y = -1.0 + o.y;
}

// in fs
out vec4 color;

void main() { color = vec4(1.0); }