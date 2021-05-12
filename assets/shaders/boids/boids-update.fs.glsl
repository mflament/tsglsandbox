#version 300 es

precision mediump float;

in vec2 texcoord;

uniform sampler2D u_boidData;
uniform int u_boidCount;
uniform vec4 u_boidConfig;    // xy: scale, z:  view distance, w: fov
uniform vec2 u_updateConfig;  // x: boid speed, y: turn speed
uniform float u_elapsedSeconds;

out vec4 boidData;

void main() {
  int boidIndex = int(gl_FragCoord.x);
  boidData = texelFetch(u_boidData, ivec2(boidIndex, 0), 0);
  vec2 heading = vec2(cos(boidData.z), -sin(boidData.z));
  vec2 velocity = heading * u_updateConfig.x;
  boidData.xy += velocity * u_elapsedSeconds;

  int i;
  for (i = 0; i < u_boidCount; i++) {
    if (i != boidIndex) {
      vec4 targetData = texelFetch(u_boidData, ivec2(i, 0), 0);
      vec2 targetDir = targetData.xy - boidData.xy;
      float dist = length(targetDir);
      targetDir = normalize(targetDir);
      float d = dot(heading, targetDir);
      if (dist < u_boidConfig.y * 4.0 && d > 0.9) {
        heading = reflect(-targetDir, heading);
        boidData.z = atan(heading.y / heading.x);
        break;
      }

      //     vec2 toTarget = targetData.xy - boidData.xy;
      //     float targetDist = length(targetData);
      //     if (targetDist < u_boidConfig.w) {
      //     }
      //     float df = clamp(1.0 - scanData.z / u_boidConfig.w, 0.0, 1.0);
      //     // vec2 heading = vec2(sin(boidData.z), cos(boidData.z));
    }
  }

  // boidData.z = heading;

  vec2 o = boidData.xy + vec2(1.0);
  if (o.x < 0.0) boidData.x = 1.0 + o.x;
  if (o.y < 0.0) boidData.y = 1.0 + o.y;

  o = boidData.xy - vec2(1.0);
  if (o.x >= 0.0) boidData.x = -1.0 + o.x;
  if (o.y >= 0.0) boidData.y = -1.0 + o.y;

  // newData = a_boidData;
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
}
