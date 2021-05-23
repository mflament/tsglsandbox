#version 300 es
precision mediump float;

//#define REPEAT false

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

int getNeighbor(ivec2 pos, ivec2 dataSize) {
#ifdef REPEAT
  if (pos.x < 0)
    pos.x = dataSize.x + pos.x;
  if (pos.x >= dataSize.x)
    pos.x = pos.x - dataSize.x;
  if (pos.y < 0)
    pos.y = dataSize.y + pos.y;
  if (pos.y >= dataSize.y)
    pos.y = pos.y - dataSize.y;
#endif
  return int(texelFetch(data, pos, 0).r);
}

int countNeighbors(ivec2 pos, ivec2 dataSize) {
  int n = getNeighbor(pos + TOP_LEFT, dataSize);
  n += getNeighbor(pos + TOP, dataSize);
  n += getNeighbor(pos + TOP_RIGHT, dataSize);
  n += getNeighbor(pos + RIGHT, dataSize);
  n += getNeighbor(pos + BOTTOM_RIGHT, dataSize);
  n += getNeighbor(pos + BOTTOM, dataSize);
  n += getNeighbor(pos + BOTTOM_LEFT, dataSize);
  n += getNeighbor(pos + LEFT, dataSize);
  return n;
}

void main() {
  ivec2 pos = ivec2(gl_FragCoord);
  int state = int(texelFetch(data, pos, 0).r);
  ivec2 dataSize = textureSize(data, 0);
  int neighbors = countNeighbors(pos, dataSize);
  uint nextState = states_matrix[state * 9 + neighbors];
  color = vec4(float(nextState));
}
