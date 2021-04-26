#version 300 es

#define REGIONS_COUNT 1

precision mediump float;

// vertex attributes
in vec2 a_vertexPos;
in vec2 a_vertexUV;

// sprite attributes
in mat4 a_spriteMatrix;
in float a_textureRegion;

uniform mat4 u_viewMatrix;
uniform vec4 u_regions[REGIONS_COUNT];
uniform int u_region_textures[REGIONS_COUNT];

out vec2 spriteUV;
flat out int regionIndex;
flat out int textureIndex;
out vec2 textureUV;

void main() {
  gl_Position = u_viewMatrix * a_spriteMatrix * vec4(a_vertexPos, 0.0, 1.0);
  spriteUV = a_vertexUV;
  regionIndex = int(a_textureRegion);
  textureIndex = u_region_textures[regionIndex];
  vec4 region = u_regions[regionIndex];
  textureUV = region.xy + spriteUV * region.zw;
}