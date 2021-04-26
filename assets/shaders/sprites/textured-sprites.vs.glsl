#version 300 es
precision mediump float;

// vertex attributes
in vec2 a_vertexPos;
in vec2 a_vertexUV;

// sprite attributes
in mat4 a_spriteMatrix;
// offset, size
in int a_textureRegion;

uniform mat4 u_viewMatrix;

out vec2 spriteUV;
out vec2 textureUV;

void main() {
  gl_Position = u_viewMatrix * a_spriteMatrix * vec4(a_vertexPos, 0.0, 1.0);
  spriteUV = a_vertexUV;
  textureUV = a_textureRegion.xy + spriteUV * a_textureRegion.zw;
}