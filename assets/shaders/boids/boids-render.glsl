#version 300 es
precision mediump float;

// in vs
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_boidData;  // xy: pos, z: heading (angle)

uniform vec2 u_boidScale;
uniform vec4 u_boidColor;
uniform sampler2D u_scanTexture;

out vec4 boidColor;

void main() {
  mat4 scale = mat4(u_boidScale.x, 0.0, 0.0, 0.0,  // col 0
                    0.0, u_boidScale.y, 0.0, 0.0,  // col 1
                    0.0, 0.0, 1.0, 0.0,            //
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
    boidColor = texelFetch(u_scanTexture, scorePos, 0);
  }
}

// in fs
in vec4 boidColor;
out vec4 color;

void main() { color = boidColor; }