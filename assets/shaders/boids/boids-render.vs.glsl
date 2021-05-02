#version 300 es
precision mediump float;

#define PI 3.1415926538

in vec2 a_position;

in vec4 a_boidData;  // xy: pos, z: angle, w: speed
in vec4 a_boidColor;

uniform vec2 u_boidScale;

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
  // gl_Position = vec4(vec3(a_position, 0.0), 1.0);
  boidColor = a_boidColor;
}