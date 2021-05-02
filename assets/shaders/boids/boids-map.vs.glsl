#version 300 es
precision mediump float;

in vec4 a_boidData;  // xy: pos, z: angle, w: speed

out vec4 boidColor;

void main() {
  gl_PointSize = 1.0;
  gl_Position = vec4(a_boidData.xy, 0.0, 1.0);
  boidColor = vec4(1.0, 0.0, 0.0, 1.0);
}