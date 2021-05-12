#version 300 es
precision mediump float;

// in vs
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_boidData;  // xy: pos, z: heading (angle)

uniform vec4 u_boidConfig;  // xy: scale, z: fov, w: view distance
uniform vec4 u_boidColor;
uniform sampler2D u_scanTexture;

out vec4 boidColor;

void main() {
  mat4 scale = mat4(u_boidConfig.x, 0.0, 0.0, 0.0,  // col 0
                    0.0, u_boidConfig.y, 0.0, 0.0,  // col 1
                    0.0, 0.0, 1.0, 0.0,             //
                    0.0, 0.0, 0.0, 1.0);
  float c = cos(a_boidData.z);
  float s = sin(a_boidData.z);
  mat4 rot = mat4(c, -s, 0.0, 0.0,     // col 0
                  s, c, 0.0, 0.0,      // col 1
                  0.0, 0.0, 1.0, 0.0,  //
                  0.0, 0.0, 0.0, 1.0);
  mat4 translate = mat4(1.0, 0.0, 0.0, 0.0,  // col 0
                        0.0, 1.0, 0.0, 0.0,  // col 1
                        0.0, 0.0, 1.0, 0.0,  //
                        a_boidData.x, a_boidData.y, 0.0, 1.0);

  gl_Position = translate * scale * rot * vec4(a_position, 0.0, 1.0);

  int boidIndex = gl_InstanceID;
  boidColor = u_boidColor;
  if (boidIndex != 0) {
    ivec2 scorePos = ivec2(boidIndex, 0);
    // xy: target heading , z: target dist, w: dot(boid,target)
    vec4 scanData = texelFetch(u_scanTexture, scorePos, 0);
    float df = clamp(1.0 - scanData.z / u_boidConfig.w, 0.0, 1.0);
    float da = (scanData.w - u_boidConfig.z) / (1.0 - u_boidConfig.z);
    boidColor = vec4(vec3(df * da), 1.0);
  }
}

// in fs
in vec4 boidColor;
out vec4 color;

void main() { color = boidColor; }