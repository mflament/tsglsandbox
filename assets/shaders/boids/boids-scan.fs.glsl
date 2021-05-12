#version 300 es

precision mediump float;

in vec2 texcoord;

uniform sampler2D u_boidData;
uniform vec4 u_boidConfig;  // xy: scale, z:  view distance, w: fov

// xy: target heading , z: target dist, w: dot(boid,target)
out vec4 scanData;

void main() {
  int boidIndex = int(gl_FragCoord.y);
  int targetIndex = int(gl_FragCoord.x);
  if (boidIndex != targetIndex) {
    vec4 boidData = texelFetch(u_boidData, ivec2(boidIndex, 0), 0);
    vec4 targetData = texelFetch(u_boidData, ivec2(targetIndex, 0), 0);
    vec2 toTarget = targetData.xy - boidData.xy;
    float dist = length(toTarget);

    float angle = boidData.z;
    vec2 heading = vec2(cos(angle), -sin(angle));

    float d = dot(heading, normalize(toTarget));

    angle = targetData.z;
    vec2 targetHeading = vec2(cos(angle), -sin(angle));
    float s = (1.0 - step(u_boidConfig.z, dist)) * step(u_boidConfig.w, d);
    scanData = vec4(targetHeading.xy, dist, d) * vec4(s);
  } else {
    scanData = vec4(1.0, 0.0, 1.0, 0.0);
  }
}
