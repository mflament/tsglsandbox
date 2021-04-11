#version 300 es
precision mediump float;

#define TOP_LEFT ivec2(-1, 1)
#define TOP ivec2(0, 1)
#define TOP_RIGHT ivec2(1, 1)
#define RIGHT ivec2(1, 0)
#define BOTTOM_RIGHT ivec2(1, -1)
#define BOTTOM ivec2(0, -1)
#define BOTTOM_LEFT ivec2(-1, -1)
#define LEFT ivec2(-1, 0)

uniform sampler2D data;
/**
 * 2 x 9 states (0 or 8) 1 for each neighbor count (0 ... 8)
 * [0..8]  from dead cell
 * [9..17] from live cell
 */
uniform uint[18] states_matrix;

in vec2 texcoord;
out vec4 color;

int countNeighbors(ivec2 pos) {
  float n = texelFetch(data, pos + TOP_LEFT, 0).r;
  n += texelFetch(data, pos + TOP, 0).r;
  n += texelFetch(data, pos + TOP_RIGHT, 0).r;
  n += texelFetch(data, pos + RIGHT, 0).r;
  n += texelFetch(data, pos + BOTTOM_RIGHT, 0).r;
  n += texelFetch(data, pos + BOTTOM, 0).r;
  n += texelFetch(data, pos + BOTTOM_LEFT, 0).r;
  n += texelFetch(data, pos + LEFT, 0).r;
  return int(n);
}

void main() {
  ivec2 pos = ivec2(gl_FragCoord);
  int state = int(texelFetch(data, pos, 0).r);
  int neighbors = countNeighbors(pos);
  uint nextState = states_matrix[state * 9 + neighbors];
  color = vec4(float(nextState));
  // vec4(, 0.0, 0.0, 0.0);

  // ivec2 dataSize = textureSize(data, 0);
  // ivec2 pos = ivec2(int(gl_FragCoord.x), dataSize.y - int(gl_FragCoord.y));
  // int index = pos.y * dataSize.x + pos.x;
  // if (index == current_index)
  //   color = vec4(1.0);
  // else
  //   color = vec4(0.0);
}
