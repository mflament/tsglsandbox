#version 300 es

precision mediump float;

in vec2 texcoord;

uniform sampler2D u_boidData;
uniform vec2 u_scanConfig; // x:  view distance, y: fov

// xy: normalized dir to target, z: dist to target
layout(location = 0) out vec4 scanData;

void main() {
  int boidIndex = int(gl_FragCoord.y);
  int targetIndex = int(gl_FragCoord.x);
  vec4 boidData = texelFetch(u_boidData, ivec2(boidIndex, 0), 0);
  vec4 targetData = texelFetch(u_boidData, ivec2(targetIndex, 0), 0);
  vec2 toTarget = targetData.xy - boidData.xy;

  scanData = vec4(0.0);

  float dist = length(toTarget);
  if (dist > 0.00001 && dist < u_scanConfig.x) {
    toTarget = normalize(toTarget);
    float d = dot(boidData.zw, toTarget);
    scanData.w = step(u_scanConfig.y, d);
    scanData.xyz = vec3(toTarget, dist) * scanData.w;
  }
}
