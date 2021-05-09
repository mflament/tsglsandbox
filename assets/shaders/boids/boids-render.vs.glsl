#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_boidData;  // xy: pos, z: heading (angle)

uniform vec2 u_boidScale;
uniform vec4 u_boidColor;

out vec4 boidColor;

void main() {
  mat4 scale = mat4(u_boidScale.x, 0.0, 0.0, 0.0,  // col 0
                    0.0, u_boidScale.y, 0.0, 0.0,  // col 1
                    0.0, 0.0, 1.0, 0.0,            //
                    0.0, 0.0, 0.0, 1.0);
  float a = a_boidData.z;
  float c = cos(a);
  float s = sin(a);
  mat4 rot = mat4(c, -s, 0.0, 0.0,     // col 0
                  s, c, 0.0, 0.0,      // col 1
                  0.0, 0.0, 1.0, 0.0,  //
                  0.0, 0.0, 0.0, 1.0);

  mat4 translate = mat4(1.0, 0.0, 0.0, 0.0,  // col 0
                        0.0, 1.0, 0.0, 0.0,  // col 1
                        0.0, 0.0, 1.0, 0.0,  //
                        a_boidData.x, a_boidData.y, 0.0, 1.0);

  gl_Position = translate * scale * rot * vec4(a_position, 0.0, 1.0);
  // gl_Position = vec4(vec3(a_position, 0.0), 1.0);
  boidColor = u_boidColor;
}