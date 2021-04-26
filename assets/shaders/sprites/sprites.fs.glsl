#version 300 es

precision mediump float;

#define REGIONS_COUNT 1
#define TEXTURES_COUNT 3

in vec2 spriteUV;
flat in int regionIndex;
flat in int textureIndex;
in vec2 textureUV;

uniform sampler2D u_textures[TEXTURES_COUNT];

out vec4 color;

void main() {
  switch (textureIndex) {
    case 0:
      color = texture(u_textures[0], textureUV);
      break;
    case 1:
      color = texture(u_textures[1], textureUV);
      break;
    case 2:
      color = texture(u_textures[2], textureUV);
      break;
  }
}